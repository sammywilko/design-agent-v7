import React, { useState, useCallback } from 'react';
import {
    Sparkles, RefreshCw, Check, Eye, Save, X, Loader2,
    Maximize2, ChevronLeft, ChevronRight, Zap, Film, Palette
} from 'lucide-react';
import { Beat, GeneratedImage, MoodBoard, CharacterProfile, LocationProfile, ProductProfile, ProductionDesign } from '../types';
import { generateBeatVariants } from '../services/gemini';

interface VariantExplorerProps {
    beat: Beat;
    characters: CharacterProfile[];
    locations: LocationProfile[];
    products: ProductProfile[];
    moodBoards: MoodBoard[];
    productionDesign?: ProductionDesign;
    onSelectVariant: (variant: GeneratedImage) => void;
    onSaveAllVariants: (variants: GeneratedImage[]) => void;
    onClose: () => void;
    showNotification: (msg: string) => void;
}

const VariantExplorer: React.FC<VariantExplorerProps> = ({
    beat,
    characters,
    locations,
    products,
    moodBoards,
    productionDesign,
    onSelectVariant,
    onSaveAllVariants,
    onClose,
    showNotification
}) => {
    const [variants, setVariants] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedMoodBoardId, setSelectedMoodBoardId] = useState<string | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'comparison'>('grid');
    const [fullscreenVariant, setFullscreenVariant] = useState<GeneratedImage | null>(null);
    const [generationCount, setGenerationCount] = useState(0);

    // Get mood boards with Style DNA
    const analyzedBoards = moodBoards.filter(mb => mb.styleDNA);

    const handleExplore = useCallback(async () => {
        setIsGenerating(true);
        try {
            const selectedMoodBoard = selectedMoodBoardId
                ? moodBoards.find(mb => mb.id === selectedMoodBoardId)
                : undefined;

            const newVariants = await generateBeatVariants({
                beat,
                characters,
                locations,
                products,
                moodBoard: selectedMoodBoard,
                productionDesign,
                variantCount: 3,
                aspectRatio: '16:9',
                resolution: '2K'
            });

            if (newVariants.length > 0) {
                setVariants(newVariants);
                setSelectedVariantId(newVariants[0].id);
                setGenerationCount(prev => prev + 1);
                showNotification(`Generated ${newVariants.length} creative options`);
            } else {
                showNotification('Failed to generate variants. Please try again.');
            }
        } catch (error) {
            console.error('Error generating variants:', error);
            showNotification('Error generating variants');
        } finally {
            setIsGenerating(false);
        }
    }, [beat, characters, locations, products, moodBoards, selectedMoodBoardId, productionDesign, showNotification]);

    const handleSelect = useCallback(() => {
        const selected = variants.find(v => v.id === selectedVariantId);
        if (selected) {
            // Mark as selected
            const updatedVariant: GeneratedImage = {
                ...selected,
                variantMetadata: {
                    ...selected.variantMetadata!,
                    selectedAsMain: true
                }
            };
            onSelectVariant(updatedVariant);
            showNotification('Variant selected as main image');
        }
    }, [variants, selectedVariantId, onSelectVariant, showNotification]);

    const handleSaveAll = useCallback(() => {
        if (variants.length > 0) {
            onSaveAllVariants(variants);
            showNotification(`Saved ${variants.length} variants to history`);
        }
    }, [variants, onSaveAllVariants, showNotification]);

    const getVariantIcon = (variantType: string) => {
        switch (variantType) {
            case 'Standard': return <Sparkles className="w-3.5 h-3.5" />;
            case 'Dramatic': return <Zap className="w-3.5 h-3.5" />;
            case 'Cinematic': return <Film className="w-3.5 h-3.5" />;
            case 'Artistic': return <Palette className="w-3.5 h-3.5" />;
            default: return <Sparkles className="w-3.5 h-3.5" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl border border-white/10 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Explore Options</h2>
                            <p className="text-zinc-500 text-xs">
                                Beat {beat.id.slice(-4)}: {beat.visualSummary.slice(0, 50)}...
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'comparison' : 'grid')}
                            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            {viewMode === 'grid' ? 'Compare Side-by-Side' : 'Grid View'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-zinc-950/50 shrink-0">
                    {analyzedBoards.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 font-medium">Style:</span>
                            <select
                                value={selectedMoodBoardId || ''}
                                onChange={e => setSelectedMoodBoardId(e.target.value || null)}
                                className="px-3 py-1.5 bg-zinc-800 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-violet-500/50"
                            >
                                <option value="">No style (standard)</option>
                                {analyzedBoards.map(mb => (
                                    <option key={mb.id} value={mb.id}>
                                        {mb.name} ({mb.purpose})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={handleExplore}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white text-xs font-bold rounded-lg transition-all shadow-lg disabled:shadow-none"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                {variants.length > 0 ? 'Generate 3 More' : 'Explore 3 Options'}
                            </>
                        )}
                    </button>

                    {generationCount > 0 && (
                        <span className="text-[10px] text-zinc-600">
                            Round {generationCount}
                        </span>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {variants.length > 0 ? (
                        <>
                            {/* Variants Display */}
                            <div className={viewMode === 'grid'
                                ? 'grid grid-cols-3 gap-5'
                                : 'flex gap-4'
                            }>
                                {variants.map((variant, index) => (
                                    <div
                                        key={variant.id}
                                        onClick={() => setSelectedVariantId(variant.id)}
                                        className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                                            selectedVariantId === variant.id
                                                ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/20'
                                                : 'ring-1 ring-white/10 hover:ring-white/30'
                                        } ${viewMode === 'comparison' ? 'flex-1' : ''}`}
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-video bg-zinc-800">
                                            <img
                                                src={variant.url}
                                                alt={`Variant ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Selection Badge */}
                                            {selectedVariantId === variant.id && (
                                                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shadow-lg">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}

                                            {/* Fullscreen Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFullscreenVariant(variant);
                                                }}
                                                className="absolute top-3 left-3 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/70 hover:text-white transition-colors"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                            </button>

                                            {/* Option Number */}
                                            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-bold">
                                                Option {index + 1}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-4 bg-zinc-950">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`p-1 rounded ${
                                                    variant.variantMetadata?.variantType === 'Standard' ? 'bg-blue-500/20 text-blue-400' :
                                                    variant.variantMetadata?.variantType === 'Dramatic' ? 'bg-orange-500/20 text-orange-400' :
                                                    variant.variantMetadata?.variantType === 'Cinematic' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-pink-500/20 text-pink-400'
                                                }`}>
                                                    {getVariantIcon(variant.variantMetadata?.variantType || 'Standard')}
                                                </div>
                                                <span className="text-sm font-semibold text-white">
                                                    {variant.variantMetadata?.variantType || 'Standard'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500">
                                                {variant.variantMetadata?.variantDescription}
                                            </p>
                                            {variant.variantMetadata?.moodBoardName && (
                                                <p className="text-[10px] text-violet-400 mt-2">
                                                    Style: {variant.variantMetadata.moodBoardName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                                <button
                                    onClick={handleSaveAll}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Save All Options
                                </button>
                                <button
                                    onClick={handleSelect}
                                    disabled={!selectedVariantId}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg disabled:shadow-none"
                                >
                                    <Check className="w-4 h-4" />
                                    Use Selected Option
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-24 h-24 rounded-3xl bg-zinc-800/50 flex items-center justify-center mb-6">
                                <Sparkles className="w-12 h-12 text-zinc-700" />
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2">
                                Ready to explore creative options?
                            </h3>
                            <p className="text-zinc-500 text-sm text-center max-w-md mb-8 leading-relaxed">
                                Generate 3 distinct variations of this beat to see different
                                creative directions. Pick the one that fits your vision best.
                            </p>

                            <div className="grid grid-cols-3 gap-4 max-w-lg">
                                <div className="p-4 bg-zinc-800/30 rounded-xl border border-white/5 text-center">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                                        <Sparkles className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <p className="text-xs text-zinc-400 font-medium">Standard</p>
                                    <p className="text-[10px] text-zinc-600 mt-1">Direct interpretation</p>
                                </div>
                                <div className="p-4 bg-zinc-800/30 rounded-xl border border-white/5 text-center">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
                                        <Zap className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <p className="text-xs text-zinc-400 font-medium">Dramatic</p>
                                    <p className="text-[10px] text-zinc-600 mt-1">High contrast, bold</p>
                                </div>
                                <div className="p-4 bg-zinc-800/30 rounded-xl border border-white/5 text-center">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                                        <Film className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <p className="text-xs text-zinc-400 font-medium">Cinematic</p>
                                    <p className="text-[10px] text-zinc-600 mt-1">Film-like quality</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Fullscreen Preview Modal */}
                {fullscreenVariant && (
                    <div
                        className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
                        onClick={() => setFullscreenVariant(null)}
                    >
                        <button
                            onClick={() => setFullscreenVariant(null)}
                            className="absolute top-6 right-6 p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Navigation */}
                        {variants.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIdx = variants.findIndex(v => v.id === fullscreenVariant.id);
                                        const prevIdx = currentIdx > 0 ? currentIdx - 1 : variants.length - 1;
                                        setFullscreenVariant(variants[prevIdx]);
                                    }}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl text-white transition-colors"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIdx = variants.findIndex(v => v.id === fullscreenVariant.id);
                                        const nextIdx = currentIdx < variants.length - 1 ? currentIdx + 1 : 0;
                                        setFullscreenVariant(variants[nextIdx]);
                                    }}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl text-white transition-colors"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}

                        <img
                            src={fullscreenVariant.url}
                            alt="Fullscreen variant"
                            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />

                        {/* Info Overlay */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-lg rounded-xl flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {getVariantIcon(fullscreenVariant.variantMetadata?.variantType || 'Standard')}
                                <span className="text-white font-medium">
                                    {fullscreenVariant.variantMetadata?.variantType}
                                </span>
                            </div>
                            <span className="text-zinc-500">|</span>
                            <span className="text-zinc-400 text-sm">
                                {fullscreenVariant.variantMetadata?.variantDescription}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VariantExplorer;
