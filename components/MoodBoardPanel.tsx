import React, { useState, useCallback, useRef } from 'react';
import {
    Plus, Trash2, Image as ImageIcon, Sparkles, X, ChevronLeft,
    Upload, Palette, Sun, Layout, Tag, Wand2, Check, Loader2,
    Eye, Copy, Link2
} from 'lucide-react';
import { MoodBoard, MoodBoardImage, StyleDNA, GeneratedImage } from '../types';

interface MoodBoardPanelProps {
    moodBoards: MoodBoard[];
    globalHistory: GeneratedImage[];
    onCreateMoodBoard: (name: string, purpose: MoodBoard['purpose']) => void;
    onDeleteMoodBoard: (id: string) => void;
    onAddImageToBoard: (boardId: string, image: MoodBoardImage) => void;
    onRemoveImageFromBoard: (boardId: string, imageId: string) => void;
    onUpdateImageNotes: (boardId: string, imageId: string, notes: string) => void;
    onExtractStyleDNA: (boardId: string) => Promise<void>;
    onAnalyzeImage: (boardId: string, imageId: string) => Promise<void>;
}

const PURPOSE_OPTIONS: { value: MoodBoard['purpose']; label: string; icon: React.ReactNode }[] = [
    { value: 'overall-aesthetic', label: 'Overall Aesthetic', icon: <Palette className="w-4 h-4" /> },
    { value: 'character-style', label: 'Character Style', icon: <ImageIcon className="w-4 h-4" /> },
    { value: 'location-vibe', label: 'Location Vibe', icon: <Layout className="w-4 h-4" /> },
    { value: 'lighting-ref', label: 'Lighting Reference', icon: <Sun className="w-4 h-4" /> },
    { value: 'product-style', label: 'Product Style', icon: <Tag className="w-4 h-4" /> },
];

const MoodBoardPanel: React.FC<MoodBoardPanelProps> = ({
    moodBoards,
    globalHistory,
    onCreateMoodBoard,
    onDeleteMoodBoard,
    onAddImageToBoard,
    onRemoveImageFromBoard,
    onUpdateImageNotes,
    onExtractStyleDNA,
    onAnalyzeImage
}) => {
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [newBoardPurpose, setNewBoardPurpose] = useState<MoodBoard['purpose']>('overall-aesthetic');
    const [isExtracting, setIsExtracting] = useState(false);
    const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);
    const [showGalleryPicker, setShowGalleryPicker] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedBoard = moodBoards.find(b => b.id === selectedBoardId);

    // Handle file upload
    const handleFileUpload = useCallback(async (files: FileList | null) => {
        if (!files || !selectedBoardId) return;

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                const newImage: MoodBoardImage = {
                    id: `mbi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    url: base64,
                    source: 'upload',
                    addedAt: Date.now()
                };
                onAddImageToBoard(selectedBoardId, newImage);
            };
            reader.readAsDataURL(file);
        }
    }, [selectedBoardId, onAddImageToBoard]);

    // Handle drag and drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        // Check if it's a file drop
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
            return;
        }

        // Check if it's a generated image from gallery
        const imageData = e.dataTransfer.getData('application/json');
        if (imageData && selectedBoardId) {
            try {
                const img = JSON.parse(imageData) as GeneratedImage;
                const newImage: MoodBoardImage = {
                    id: `mbi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    url: img.url,
                    thumbnail: img.thumbnail,
                    source: 'generated',
                    addedAt: Date.now()
                };
                onAddImageToBoard(selectedBoardId, newImage);
            } catch (err) {
                console.error('Failed to parse dropped image:', err);
            }
        }
    }, [selectedBoardId, handleFileUpload, onAddImageToBoard]);

    // Add from gallery
    const handleAddFromGallery = (img: GeneratedImage) => {
        if (!selectedBoardId) return;

        const newImage: MoodBoardImage = {
            id: `mbi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: img.url,
            thumbnail: img.thumbnail,
            source: 'generated',
            addedAt: Date.now()
        };
        onAddImageToBoard(selectedBoardId, newImage);
        setShowGalleryPicker(false);
    };

    // Extract Style DNA
    const handleExtractDNA = async () => {
        if (!selectedBoardId) return;
        setIsExtracting(true);
        try {
            await onExtractStyleDNA(selectedBoardId);
        } finally {
            setIsExtracting(false);
        }
    };

    // Analyze single image
    const handleAnalyzeImage = async (imageId: string) => {
        if (!selectedBoardId) return;
        setAnalyzingImageId(imageId);
        try {
            await onAnalyzeImage(selectedBoardId, imageId);
        } finally {
            setAnalyzingImageId(null);
        }
    };

    // Create new mood board
    const handleCreate = () => {
        if (!newBoardName.trim()) return;
        onCreateMoodBoard(newBoardName.trim(), newBoardPurpose);
        setNewBoardName('');
        setNewBoardPurpose('overall-aesthetic');
        setShowCreateDialog(false);
    };

    // Copy prompt snippet to clipboard
    const copyPromptSnippet = (snippet: string) => {
        navigator.clipboard.writeText(snippet);
    };

    // ==========================================
    // LIST VIEW - Shows all mood boards
    // ==========================================
    if (!selectedBoard) {
        return (
            <div className="h-full flex flex-col bg-zinc-950">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-violet-400" />
                            Mood Boards
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1">
                            Collect references, extract style DNA, inject into generations
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Board
                    </button>
                </div>

                {/* Board Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {moodBoards.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
                                <Palette className="w-8 h-8 text-zinc-700" />
                            </div>
                            <h3 className="text-white font-medium mb-2">No Mood Boards Yet</h3>
                            <p className="text-zinc-500 text-sm max-w-xs mb-4">
                                Create mood boards to collect reference images and extract style DNA for consistent generations.
                            </p>
                            <button
                                onClick={() => setShowCreateDialog(true)}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Your First Board
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {moodBoards.map(board => {
                                const purposeOption = PURPOSE_OPTIONS.find(p => p.value === board.purpose);
                                const previewImages = board.images.slice(0, 4);

                                return (
                                    <button
                                        key={board.id}
                                        onClick={() => setSelectedBoardId(board.id)}
                                        className="group bg-zinc-900/50 border border-white/5 rounded-xl p-3 text-left hover:border-violet-500/50 transition-all"
                                    >
                                        {/* Preview Grid */}
                                        <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden mb-3 grid grid-cols-2 grid-rows-2 gap-0.5">
                                            {previewImages.map((img, idx) => (
                                                <div key={idx} className="bg-zinc-900">
                                                    <img
                                                        src={img.thumbnail || img.url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                            {Array(4 - previewImages.length).fill(0).map((_, idx) => (
                                                <div key={`empty-${idx}`} className="bg-zinc-900 flex items-center justify-center">
                                                    <ImageIcon className="w-4 h-4 text-zinc-700" />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Info */}
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-white font-medium text-sm truncate">{board.name}</h3>
                                                <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500">
                                                    {purposeOption?.icon}
                                                    <span>{purposeOption?.label}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {board.styleDNA && (
                                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center" title="Style DNA extracted">
                                                        <Check className="w-3 h-3 text-green-400" />
                                                    </div>
                                                )}
                                                <span className="text-xs text-zinc-600">{board.images.length} imgs</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Create Dialog */}
                {showCreateDialog && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-lg font-bold text-white mb-4">Create Mood Board</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-zinc-400 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={newBoardName}
                                        onChange={(e) => setNewBoardName(e.target.value)}
                                        placeholder="e.g., Hero Character Look"
                                        className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-400 mb-2">Purpose</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PURPOSE_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setNewBoardPurpose(option.value)}
                                                className={`p-3 rounded-lg border text-left transition-all ${newBoardPurpose === option.value
                                                    ? 'bg-violet-600/20 border-violet-500/50 text-white'
                                                    : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {option.icon}
                                                    <span className="text-xs font-medium">{option.label}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateDialog(false)}
                                    className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white text-sm rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newBoardName.trim()}
                                    className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==========================================
    // DETAIL VIEW - Single mood board
    // ==========================================
    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => setSelectedBoardId(null)}
                        className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-white">{selectedBoard.name}</h2>
                        <p className="text-xs text-zinc-500">
                            {PURPOSE_OPTIONS.find(p => p.value === selectedBoard.purpose)?.label} &bull; {selectedBoard.images.length} images
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (confirm('Delete this mood board?')) {
                                onDeleteMoodBoard(selectedBoard.id);
                                setSelectedBoardId(null);
                            }
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Action Bar */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Upload className="w-3 h-3" />
                        Upload
                    </button>
                    <button
                        onClick={() => setShowGalleryPicker(true)}
                        className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Link2 className="w-3 h-3" />
                        From Gallery
                    </button>
                    <button
                        onClick={handleExtractDNA}
                        disabled={selectedBoard.images.length < 2 || isExtracting}
                        className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        {isExtracting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Wand2 className="w-3 h-3" />
                        )}
                        Extract DNA
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Style DNA Display */}
                {selectedBoard.styleDNA && (
                    <div className="p-4 border-b border-white/5 bg-violet-500/5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-400" />
                                Style DNA
                            </h3>
                            <button
                                onClick={() => copyPromptSnippet(selectedBoard.styleDNA!.promptSnippet)}
                                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                            >
                                <Copy className="w-3 h-3" />
                                Copy Snippet
                            </button>
                        </div>

                        {/* Color Palette */}
                        <div className="mb-3">
                            <p className="text-[10px] text-zinc-500 mb-1">COLOR PALETTE</p>
                            <div className="flex gap-1">
                                {selectedBoard.styleDNA.colorPalette.map((color, idx) => (
                                    <div
                                        key={idx}
                                        className="w-6 h-6 rounded-md border border-white/10"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Style Info */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-[10px] text-zinc-500 mb-1">LIGHTING</p>
                                <p className="text-zinc-300">{selectedBoard.styleDNA.lightingCharacteristics}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 mb-1">STYLE</p>
                                <p className="text-zinc-300">{selectedBoard.styleDNA.photographicStyle}</p>
                            </div>
                        </div>

                        {/* Mood Keywords */}
                        <div className="mt-3">
                            <p className="text-[10px] text-zinc-500 mb-1">MOOD</p>
                            <div className="flex flex-wrap gap-1">
                                {selectedBoard.styleDNA.moodKeywords.map((keyword, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] rounded-full">
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Prompt Snippet */}
                        <div className="mt-3 p-2 bg-black/30 rounded-lg">
                            <p className="text-[10px] text-zinc-500 mb-1">PROMPT INJECTION</p>
                            <p className="text-xs text-violet-300 font-mono">{selectedBoard.styleDNA.promptSnippet}</p>
                        </div>
                    </div>
                )}

                {/* Image Grid */}
                <div
                    className={`p-4 min-h-[200px] ${dragOver ? 'bg-violet-500/10' : ''} transition-colors`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    {selectedBoard.images.length === 0 ? (
                        <div className="h-48 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center">
                            <Upload className="w-8 h-8 text-zinc-700 mb-2" />
                            <p className="text-zinc-500 text-sm">Drop images here</p>
                            <p className="text-zinc-600 text-xs">or use the buttons above</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {selectedBoard.images.map(img => (
                                <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-zinc-900">
                                    <img
                                        src={img.thumbnail || img.url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleAnalyzeImage(img.id)}
                                            disabled={analyzingImageId === img.id}
                                            className="p-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                                            title="Analyze with AI"
                                        >
                                            {analyzingImageId === img.id ? (
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-white" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onRemoveImageFromBoard(selectedBoard.id, img.id)}
                                            className="p-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                                            title="Remove"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>

                                    {/* Analysis Badge */}
                                    {img.aiAnalysis && (
                                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-violet-600/80 rounded text-[9px] text-white font-medium">
                                            Analyzed
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Gallery Picker Modal */}
            {showGalleryPicker && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Add from Gallery</h3>
                            <button
                                onClick={() => setShowGalleryPicker(false)}
                                className="p-1 hover:bg-white/5 rounded-lg"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {globalHistory.length === 0 ? (
                                <div className="h-48 flex items-center justify-center text-zinc-500">
                                    No generated images yet
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    {globalHistory.map(img => (
                                        <button
                                            key={img.id}
                                            onClick={() => handleAddFromGallery(img)}
                                            className="aspect-square rounded-lg overflow-hidden bg-zinc-800 hover:ring-2 hover:ring-violet-500 transition-all"
                                        >
                                            <img
                                                src={img.thumbnail || img.url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoodBoardPanel;
