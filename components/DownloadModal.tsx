import React, { useState, useCallback } from 'react';
import { X, Download, Folder, FolderOpen, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { GeneratedImage, SavedEntity, ScriptData } from '../types';

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectName: string;
    globalHistory: GeneratedImage[];
    libraryAssets: SavedEntity[];
    scriptData?: ScriptData;
    showNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type OrganizationMode = 'by-type' | 'by-beat' | 'flat';
type ImageFormat = 'png' | 'jpg';
type ImageQuality = 'original' | 'optimized';

interface DownloadProgress {
    current: number;
    total: number;
    currentFile: string;
    phase: 'preparing' | 'processing' | 'compressing' | 'complete' | 'error';
}

const DownloadModal: React.FC<DownloadModalProps> = ({
    isOpen,
    onClose,
    projectName,
    globalHistory,
    libraryAssets,
    scriptData,
    showNotification
}) => {
    const [organization, setOrganization] = useState<OrganizationMode>('by-type');
    const [format, setFormat] = useState<ImageFormat>('png');
    const [quality, setQuality] = useState<ImageQuality>('original');
    const [includeScript, setIncludeScript] = useState(true);
    const [includePanels, setIncludePanels] = useState(true);
    const [includeCharacters, setIncludeCharacters] = useState(true);
    const [includeLocations, setIncludeLocations] = useState(true);
    const [includeLibrary, setIncludeLibrary] = useState(true);
    const [includeGenerations, setIncludeGenerations] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);
    const [progress, setProgress] = useState<DownloadProgress | null>(null);

    // Helper to sanitize filenames
    const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);

    // Convert base64 to blob for potential format conversion
    const base64ToBlob = async (base64: string, mimeType: string = 'image/png'): Promise<Blob> => {
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    };

    // Get file extension based on format selection
    const getExtension = () => format === 'jpg' ? 'jpg' : 'png';

    // Calculate total items to process
    const calculateTotalItems = useCallback(() => {
        let total = 0;

        if (includePanels && scriptData?.beats) {
            scriptData.beats.forEach(beat => {
                if (beat.generatedImageIds) total += beat.generatedImageIds.length;
                if (beat.sequenceGrid) total += 1;
            });
        }

        if (includeCharacters && scriptData?.characters) {
            scriptData.characters.forEach(char => {
                if (char.characterSheet) total += 1;
                if (char.expressionBank?.grid) total += 1;
            });
        }

        if (includeLocations && scriptData?.locations) {
            scriptData.locations.forEach(loc => {
                if (loc.anchorImage) total += 1;
            });
        }

        if (includeLibrary) {
            total += libraryAssets.length;
        }

        if (includeGenerations) {
            total += globalHistory.filter(img => !img.linkedBeatId).length;
        }

        return total;
    }, [includePanels, includeCharacters, includeLocations, includeLibrary, includeGenerations, scriptData, libraryAssets, globalHistory]);

    const handleDownload = async () => {
        setIsDownloading(true);
        const totalItems = calculateTotalItems();
        let processedItems = 0;

        setProgress({
            current: 0,
            total: totalItems,
            currentFile: 'Initializing...',
            phase: 'preparing'
        });

        try {
            const zip = new JSZip();
            const folderName = sanitize(projectName) || 'project';
            const root = zip.folder(folderName);
            if (!root) throw new Error('Failed to create ZIP folder');

            const ext = getExtension();

            // Update progress helper
            const updateProgress = (filename: string) => {
                processedItems++;
                setProgress({
                    current: processedItems,
                    total: totalItems,
                    currentFile: filename,
                    phase: 'processing'
                });
            };

            // === PANELS (Storyboard Frames) ===
            if (includePanels && scriptData?.beats) {
                setProgress(prev => prev ? { ...prev, currentFile: 'Processing storyboard panels...', phase: 'processing' } : null);

                const panelsFolder = organization === 'flat' ? root : root.folder('panels');
                let panelCounter = 1;

                for (const beat of scriptData.beats) {
                    const beatName = beat.visualSummary
                        ? sanitize(beat.visualSummary.slice(0, 20))
                        : `beat_${panelCounter}`;

                    // Process generated images for this beat
                    if (beat.generatedImageIds && beat.generatedImageIds.length > 0) {
                        for (let shotIdx = 0; shotIdx < beat.generatedImageIds.length; shotIdx++) {
                            const imgId = beat.generatedImageIds[shotIdx];
                            const img = globalHistory.find(h => h.id === imgId);
                            if (img) {
                                const base64Data = img.url.split(',')[1];
                                if (base64Data) {
                                    const shotSuffix = beat.generatedImageIds.length > 1 ? `.${shotIdx + 1}` : '';
                                    const paddedNum = String(panelCounter).padStart(3, '0');
                                    const filename = `${paddedNum}${shotSuffix}_${beatName}.${ext}`;
                                    panelsFolder?.file(filename, base64Data, { base64: true });
                                    updateProgress(filename);
                                }
                            }
                        }
                    }

                    // Process sequence grid
                    if (beat.sequenceGrid) {
                        const base64Data = beat.sequenceGrid.split(',')[1];
                        if (base64Data) {
                            const paddedNum = String(panelCounter).padStart(3, '0');
                            const filename = `${paddedNum}_${beatName}_grid.${ext}`;
                            panelsFolder?.file(filename, base64Data, { base64: true });
                            updateProgress(filename);
                        }
                    }

                    panelCounter++;
                }

                // Linked beat images (start/end frames)
                const linkedImages = globalHistory.filter(img => img.linkedBeatId);
                const beatImageGroups = new Map<string, GeneratedImage[]>();

                linkedImages.forEach(img => {
                    if (img.linkedBeatId) {
                        const existing = beatImageGroups.get(img.linkedBeatId) || [];
                        existing.push(img);
                        beatImageGroups.set(img.linkedBeatId, existing);
                    }
                });

                let linkedPanelCounter = panelCounter;
                beatImageGroups.forEach((images, beatId) => {
                    const beat = scriptData?.beats.find(b => b.id === beatId);
                    const beatName = beat?.visualSummary
                        ? sanitize(beat.visualSummary.slice(0, 20))
                        : `linked_${linkedPanelCounter}`;

                    images.forEach((img, frameIdx) => {
                        const base64Data = img.url.split(',')[1];
                        if (base64Data) {
                            const paddedNum = String(linkedPanelCounter).padStart(3, '0');
                            const frameSuffix = images.length > 1 ? `.${frameIdx + 1}` : '';
                            const filename = `${paddedNum}${frameSuffix}_${beatName}_linked.${ext}`;
                            panelsFolder?.file(filename, base64Data, { base64: true });
                            updateProgress(filename);
                        }
                    });
                    linkedPanelCounter++;
                });
            }

            // === CHARACTERS ===
            if (includeCharacters && scriptData?.characters && scriptData.characters.length > 0) {
                setProgress(prev => prev ? { ...prev, currentFile: 'Processing character sheets...', phase: 'processing' } : null);

                const charactersFolder = organization === 'flat' ? root : root.folder('characters');

                scriptData.characters.forEach((char, idx) => {
                    if (char.characterSheet) {
                        const base64Data = char.characterSheet.split(',')[1];
                        if (base64Data) {
                            const paddedIdx = String(idx + 1).padStart(2, '0');
                            const filename = `${paddedIdx}_${sanitize(char.name)}_sheet.${ext}`;
                            charactersFolder?.file(filename, base64Data, { base64: true });
                            updateProgress(filename);
                        }
                    }

                    if (char.expressionBank?.grid) {
                        const base64Data = char.expressionBank.grid.split(',')[1];
                        if (base64Data) {
                            const paddedIdx = String(idx + 1).padStart(2, '0');
                            const filename = `${paddedIdx}_${sanitize(char.name)}_expressions.${ext}`;
                            charactersFolder?.file(filename, base64Data, { base64: true });
                            updateProgress(filename);
                        }
                    }
                });
            }

            // === LOCATIONS ===
            if (includeLocations && scriptData?.locations && scriptData.locations.length > 0) {
                setProgress(prev => prev ? { ...prev, currentFile: 'Processing location plates...', phase: 'processing' } : null);

                const locationsFolder = organization === 'flat' ? root : root.folder('locations');

                scriptData.locations.forEach((loc, idx) => {
                    if (loc.anchorImage) {
                        const base64Data = loc.anchorImage.split(',')[1];
                        if (base64Data) {
                            const paddedIdx = String(idx + 1).padStart(2, '0');
                            const filename = `${paddedIdx}_${sanitize(loc.name || 'location')}_plate.${ext}`;
                            locationsFolder?.file(filename, base64Data, { base64: true });
                            updateProgress(filename);
                        }
                    }
                });
            }

            // === LIBRARY ASSETS ===
            if (includeLibrary && libraryAssets.length > 0) {
                setProgress(prev => prev ? { ...prev, currentFile: 'Processing library assets...', phase: 'processing' } : null);

                const libraryFolder = organization === 'flat' ? root : root.folder('library');

                libraryAssets.forEach((asset, idx) => {
                    const base64Data = asset.data.split(',')[1];
                    if (base64Data) {
                        const paddedIdx = String(idx + 1).padStart(3, '0');
                        const filename = `${paddedIdx}_${asset.type}_${sanitize(asset.name)}.${ext}`;
                        libraryFolder?.file(filename, base64Data, { base64: true });
                        updateProgress(filename);
                    }
                });
            }

            // === GENERATIONS (non-beat linked) ===
            if (includeGenerations) {
                setProgress(prev => prev ? { ...prev, currentFile: 'Processing generations...', phase: 'processing' } : null);

                const generationsFolder = organization === 'flat' ? root : root.folder('generations');

                globalHistory
                    .filter(img => !img.linkedBeatId)
                    .forEach((img, idx) => {
                        const base64Data = img.url.split(',')[1];
                        if (base64Data) {
                            const paddedIdx = String(idx + 1).padStart(3, '0');
                            const promptSlug = sanitize(img.prompt.slice(0, 20));
                            const filename = `${paddedIdx}_${promptSlug}.${ext}`;
                            generationsFolder?.file(filename, base64Data, { base64: true });
                            updateProgress(filename);
                        }
                    });
            }

            // === SCRIPT DATA (JSON) ===
            if (includeScript && scriptData) {
                root.file('script.json', JSON.stringify(scriptData, null, 2));
            }

            // Generate ZIP
            setProgress(prev => prev ? { ...prev, currentFile: 'Compressing archive...', phase: 'compressing' } : null);

            const content = await zip.generateAsync(
                { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
                (metadata) => {
                    setProgress(prev => prev ? {
                        ...prev,
                        currentFile: `Compressing: ${Math.round(metadata.percent)}%`,
                        phase: 'compressing'
                    } : null);
                }
            );

            // Download using file-saver
            saveAs(content, `${folderName}_archive.zip`);

            setProgress({
                current: totalItems,
                total: totalItems,
                currentFile: 'Download complete!',
                phase: 'complete'
            });

            showNotification(`Downloaded ${totalItems} files in ZIP archive`, 'success');

            // Auto-close after success
            setTimeout(() => {
                setIsDownloading(false);
                setProgress(null);
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Download failed:', error);
            setProgress(prev => prev ? {
                ...prev,
                currentFile: 'Download failed',
                phase: 'error'
            } : null);
            showNotification('Failed to create ZIP archive', 'error');

            setTimeout(() => {
                setIsDownloading(false);
                setProgress(null);
            }, 2000);
        }
    };

    if (!isOpen) return null;

    const totalItems = calculateTotalItems();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Download className="w-5 h-5 text-violet-400" />
                            Download Project
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1">
                            {totalItems} files ready to export
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isDownloading}
                        className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress View */}
                {isDownloading && progress && (
                    <div className="p-6 bg-zinc-950/50 border-b border-zinc-800">
                        <div className="space-y-3">
                            {/* Progress Bar */}
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        progress.phase === 'complete' ? 'bg-emerald-500' :
                                        progress.phase === 'error' ? 'bg-red-500' :
                                        'bg-violet-500'
                                    }`}
                                    style={{
                                        width: progress.phase === 'compressing'
                                            ? '90%'
                                            : `${Math.round((progress.current / progress.total) * 100)}%`
                                    }}
                                />
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400 truncate max-w-[70%]">
                                    {progress.currentFile}
                                </span>
                                <span className="text-zinc-500">
                                    {progress.current}/{progress.total}
                                </span>
                            </div>

                            {/* Phase indicator */}
                            <div className="flex items-center gap-2 text-xs">
                                {progress.phase === 'complete' && (
                                    <><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-emerald-400">Complete!</span></>
                                )}
                                {progress.phase === 'error' && (
                                    <><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-red-400">Error</span></>
                                )}
                                {(progress.phase === 'preparing' || progress.phase === 'processing' || progress.phase === 'compressing') && (
                                    <><Loader2 className="w-4 h-4 text-violet-400 animate-spin" /><span className="text-zinc-400 capitalize">{progress.phase}...</span></>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Options (hidden during download) */}
                {!isDownloading && (
                    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                        {/* Organization Mode */}
                        <div>
                            <label className="text-sm font-medium text-white mb-3 block">Organization</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setOrganization('by-type')}
                                    className={`p-3 rounded-xl border text-center transition-all ${
                                        organization === 'by-type'
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                                >
                                    <FolderOpen className="w-5 h-5 mx-auto mb-1" />
                                    <span className="text-xs">By Type</span>
                                </button>
                                <button
                                    onClick={() => setOrganization('by-beat')}
                                    className={`p-3 rounded-xl border text-center transition-all ${
                                        organization === 'by-beat'
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                                >
                                    <Folder className="w-5 h-5 mx-auto mb-1" />
                                    <span className="text-xs">By Beat</span>
                                </button>
                                <button
                                    onClick={() => setOrganization('flat')}
                                    className={`p-3 rounded-xl border text-center transition-all ${
                                        organization === 'flat'
                                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    }`}
                                >
                                    <Image className="w-5 h-5 mx-auto mb-1" />
                                    <span className="text-xs">Flat</span>
                                </button>
                            </div>
                        </div>

                        {/* Format Options */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-white mb-2 block">Format</label>
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as ImageFormat)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="png">PNG (Lossless)</option>
                                    <option value="jpg">JPG (Smaller)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-white mb-2 block">Quality</label>
                                <select
                                    value={quality}
                                    onChange={(e) => setQuality(e.target.value as ImageQuality)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="original">Original</option>
                                    <option value="optimized">Optimized</option>
                                </select>
                            </div>
                        </div>

                        {/* Include Options */}
                        <div>
                            <label className="text-sm font-medium text-white mb-3 block">Include in Export</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includePanels}
                                        onChange={(e) => setIncludePanels(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-sm text-zinc-300">Storyboard Panels</span>
                                    <span className="text-xs text-zinc-500 ml-auto">
                                        {scriptData?.beats?.reduce((acc, b) => acc + (b.generatedImageIds?.length || 0) + (b.sequenceGrid ? 1 : 0), 0) || 0} files
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeCharacters}
                                        onChange={(e) => setIncludeCharacters(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-sm text-zinc-300">Character Sheets</span>
                                    <span className="text-xs text-zinc-500 ml-auto">
                                        {scriptData?.characters?.filter(c => c.characterSheet || c.expressionBank?.grid).length || 0} files
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeLocations}
                                        onChange={(e) => setIncludeLocations(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-sm text-zinc-300">Location Plates</span>
                                    <span className="text-xs text-zinc-500 ml-auto">
                                        {scriptData?.locations?.filter(l => l.anchorImage).length || 0} files
                                    </span>
                                </label>
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeLibrary}
                                        onChange={(e) => setIncludeLibrary(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-sm text-zinc-300">Library Assets</span>
                                    <span className="text-xs text-zinc-500 ml-auto">{libraryAssets.length} files</span>
                                </label>
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeGenerations}
                                        onChange={(e) => setIncludeGenerations(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-sm text-zinc-300">All Generations</span>
                                    <span className="text-xs text-zinc-500 ml-auto">{globalHistory.length} files</span>
                                </label>
                                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeScript}
                                        onChange={(e) => setIncludeScript(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
                                    />
                                    <span className="text-sm text-zinc-300">Script Data (JSON)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
                    {!isDownloading ? (
                        <button
                            onClick={handleDownload}
                            disabled={totalItems === 0}
                            className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                        >
                            <Download className="w-5 h-5" />
                            Download ZIP ({totalItems} files)
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full py-3 px-4 bg-zinc-800 text-zinc-400 rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Downloading...
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DownloadModal;
