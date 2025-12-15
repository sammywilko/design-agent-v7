import React, { useState, useEffect } from 'react';
import { ProjectTemplate } from '../types';
import { getBuiltInTemplates, getCustomTemplates, deleteCustomTemplate as removeCustomTemplate } from '../services/projectTemplates';
import { X, Trash2, Sparkles, User, MapPin, Package, ChevronRight } from 'lucide-react';

interface TemplateSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: ProjectTemplate | null) => void; // null = blank project
}

const CATEGORY_LABELS: Record<ProjectTemplate['category'], { label: string; color: string }> = {
    commercial: { label: 'Commercial', color: 'blue' },
    narrative: { label: 'Narrative', color: 'violet' },
    documentary: { label: 'Documentary', color: 'amber' },
    fashion: { label: 'Fashion', color: 'pink' },
    product: { label: 'Product', color: 'emerald' },
    custom: { label: 'Custom', color: 'cyan' }
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ isOpen, onClose, onSelect }) => {
    const [customTemplates, setCustomTemplates] = useState<ProjectTemplate[]>([]);
    const builtInTemplates = getBuiltInTemplates();

    useEffect(() => {
        if (isOpen) {
            setCustomTemplates(getCustomTemplates());
        }
    }, [isOpen]);

    const handleDeleteCustom = (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this custom template?')) {
            removeCustomTemplate(templateId);
            setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Choose a Template</h2>
                        <p className="text-sm text-zinc-500 mt-0.5">
                            Start with a pre-configured setup or blank canvas
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Custom Templates Section */}
                    {customTemplates.length > 0 && (
                        <>
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Your Templates
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {customTemplates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => onSelect(template)}
                                        className="relative group text-left p-5 bg-gradient-to-br from-cyan-900/20 to-zinc-800 hover:from-cyan-800/30 hover:to-zinc-750 border border-cyan-500/30 hover:border-cyan-500/50 rounded-xl transition-all"
                                    >
                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => handleDeleteCustom(template.id, e)}
                                            className="absolute top-3 right-3 w-8 h-8 bg-red-600/80 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>

                                        <div className="text-3xl mb-3">{template.icon}</div>
                                        <h3 className="text-base font-bold text-white mb-1">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-zinc-400 line-clamp-2">
                                            {template.description}
                                        </p>

                                        {/* Entity counts */}
                                        <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-500">
                                            {template.worldBible.suggestedCharacters.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {template.worldBible.suggestedCharacters.length}
                                                </span>
                                            )}
                                            {template.worldBible.suggestedLocations.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {template.worldBible.suggestedLocations.length}
                                                </span>
                                            )}
                                            {template.worldBible.suggestedProducts.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Package className="w-3 h-3" />
                                                    {template.worldBible.suggestedProducts.length}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="h-px bg-zinc-800 mb-6" />
                        </>
                    )}

                    {/* Built-in Templates */}
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
                            Built-in Templates
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {builtInTemplates.map(template => {
                            const categoryInfo = CATEGORY_LABELS[template.category];
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => onSelect(template)}
                                    className="group text-left p-5 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="text-3xl">{template.icon}</div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${categoryInfo.color}-500/20 text-${categoryInfo.color}-400 border border-${categoryInfo.color}-500/30`}>
                                            {categoryInfo.label}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">
                                        {template.name}
                                    </h3>
                                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                                        {template.description}
                                    </p>

                                    {/* Shot requirements preview */}
                                    {template.shotRequirements && template.shotRequirements.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {template.shotRequirements.slice(0, 3).map((shot, i) => (
                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded">
                                                    {shot}
                                                </span>
                                            ))}
                                            {template.shotRequirements.length > 3 && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-zinc-700 text-zinc-500 rounded">
                                                    +{template.shotRequirements.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Entity counts */}
                                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                        {template.worldBible.suggestedCharacters.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {template.worldBible.suggestedCharacters.length}
                                            </span>
                                        )}
                                        {template.worldBible.suggestedLocations.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {template.worldBible.suggestedLocations.length}
                                            </span>
                                        )}
                                        {template.worldBible.suggestedProducts.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                {template.worldBible.suggestedProducts.length}
                                            </span>
                                        )}
                                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
                    <button
                        onClick={() => onSelect(null)}
                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
                    >
                        Skip - Start with Blank Project
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplateSelector;
