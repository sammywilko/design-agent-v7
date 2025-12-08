/**
 * ScriptDirectorModal Component
 *
 * Three-step workflow for transforming messy scripts into shot-level generation instructions.
 *
 * Steps:
 * 1. INPUT - Paste or upload script text
 * 2. ANALYSIS - Review extracted entities, answer clarification questions
 * 3. REVIEW - Edit shot breakdown per beat, import to project
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    X, Upload, FileText, Loader2, Sparkles, Users, MapPin, Package,
    CheckCircle, AlertCircle, ChevronRight, ChevronDown, Edit3,
    Camera, Video, Clock, DollarSign, Clapperboard, HelpCircle,
    Check, ArrowRight, Film, Layers, Target, Zap
} from 'lucide-react';
import {
    ScriptAnalysis,
    ExtractedEntity,
    AnalyzedBeat,
    ClarificationQuestion,
    Shot,
    CharacterProfile,
    LocationProfile,
    ProductProfile,
    Beat
} from '../types';
import { analyzeMessyScript, convertAnalyzedBeatsToBeats } from '../services/scriptDirector';

interface ScriptDirectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingBibles?: {
        characters: CharacterProfile[];
        locations: LocationProfile[];
        products: ProductProfile[];
    };
    onImportComplete: (data: {
        beats: Beat[];
        newCharacters: Partial<CharacterProfile>[];
        newLocations: Partial<LocationProfile>[];
        newProducts: Partial<ProductProfile>[];
    }) => void;
    showNotification: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type Step = 'input' | 'analysis' | 'review';

const ScriptDirectorModal: React.FC<ScriptDirectorModalProps> = ({
    isOpen,
    onClose,
    existingBibles,
    onImportComplete,
    showNotification
}) => {
    // Step management
    const [currentStep, setCurrentStep] = useState<Step>('input');

    // Input state
    const [scriptText, setScriptText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Analysis result
    const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
    const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

    // Editing state
    const [expandedBeats, setExpandedBeats] = useState<Set<string>>(new Set());
    const [editingShot, setEditingShot] = useState<{ beatId: string; shotId: string } | null>(null);

    // Calculate stats
    const stats = useMemo(() => {
        if (!analysis) return null;
        return {
            totalBeats: analysis.beats.length,
            totalShots: analysis.beats.reduce((sum, b) => sum + (b.shots?.length || 0), 0),
            newCharacters: analysis.entities.characters.filter(e => !e.existingBibleMatch).length,
            newLocations: analysis.entities.locations.filter(e => !e.existingBibleMatch).length,
            newProducts: analysis.entities.products.filter(e => !e.existingBibleMatch).length,
            matchedCharacters: analysis.entities.characters.filter(e => e.existingBibleMatch).length,
            matchedLocations: analysis.entities.locations.filter(e => e.existingBibleMatch).length,
            matchedProducts: analysis.entities.products.filter(e => e.existingBibleMatch).length,
        };
    }, [analysis]);

    // Analyze script
    const handleAnalyze = async () => {
        if (!scriptText.trim()) {
            showNotification('Please enter or paste your script', 'warning');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await analyzeMessyScript(scriptText, existingBibles);
            setAnalysis(result);

            // Auto-expand first few beats
            const initialExpanded = new Set(result.beats.slice(0, 3).map(b => b.id));
            setExpandedBeats(initialExpanded);

            setCurrentStep('analysis');
            showNotification(`Analyzed! Found ${result.beats.length} beats with ${result.entities.characters.length} characters`, 'success');
        } catch (error) {
            console.error('Script analysis failed:', error);
            showNotification('Analysis failed. Please try again.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Handle clarification answer
    const handleClarificationAnswer = (questionId: string, answer: string) => {
        setClarificationAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    // Toggle beat expansion
    const toggleBeatExpanded = (beatId: string) => {
        setExpandedBeats(prev => {
            const next = new Set(prev);
            if (next.has(beatId)) {
                next.delete(beatId);
            } else {
                next.add(beatId);
            }
            return next;
        });
    };

    // Update shot in analysis
    const updateShot = (beatId: string, shotId: string, updates: Partial<Shot>) => {
        if (!analysis) return;

        setAnalysis(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                beats: prev.beats.map(beat => {
                    if (beat.id !== beatId) return beat;
                    return {
                        ...beat,
                        shots: beat.shots.map(shot => {
                            if (shot.id !== shotId) return shot;
                            return { ...shot, ...updates };
                        })
                    };
                })
            };
        });
    };

    // Import to project
    const handleImport = () => {
        if (!analysis) return;

        // Convert analyzed beats to project beats
        const beats = convertAnalyzedBeatsToBeats(analysis.beats);

        // Get new entities (not matched to existing)
        const newCharacters = analysis.entities.characters
            .filter(e => !e.existingBibleMatch)
            .map(e => ({
                id: e.id,
                name: e.name,
                description: e.inferredDescription,
                promptSnippet: e.inferredDescription
            }));

        const newLocations = analysis.entities.locations
            .filter(e => !e.existingBibleMatch)
            .map(e => ({
                id: e.id,
                name: e.name,
                description: e.inferredDescription,
                promptSnippet: e.inferredDescription
            }));

        const newProducts = analysis.entities.products
            .filter(e => !e.existingBibleMatch)
            .map(e => ({
                id: e.id,
                name: e.name,
                description: e.inferredDescription,
                promptSnippet: e.inferredDescription
            }));

        onImportComplete({
            beats,
            newCharacters,
            newLocations,
            newProducts
        });

        showNotification(
            `Imported ${beats.length} beats with ${stats?.totalShots || 0} shots!`,
            'success'
        );
        handleClose();
    };

    // Reset and close
    const handleClose = () => {
        setCurrentStep('input');
        setScriptText('');
        setAnalysis(null);
        setClarificationAnswers({});
        setExpandedBeats(new Set());
        setEditingShot(null);
        onClose();
    };

    // Check if all required clarifications answered
    const hasUnansweredRequired = useMemo(() => {
        if (!analysis) return false;
        return analysis.clarifications
            .filter(q => q.required)
            .some(q => !clarificationAnswers[q.id]);
    }, [analysis, clarificationAnswers]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl w-full max-w-5xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl">
                            <Clapperboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Script Director</h2>
                            <p className="text-sm text-zinc-400">Transform scripts into shot-level instructions</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center justify-center gap-4">
                        <StepIndicator
                            step={1}
                            label="Input Script"
                            active={currentStep === 'input'}
                            completed={currentStep !== 'input'}
                        />
                        <div className="w-12 h-px bg-zinc-700" />
                        <StepIndicator
                            step={2}
                            label="Review Analysis"
                            active={currentStep === 'analysis'}
                            completed={currentStep === 'review'}
                        />
                        <div className="w-12 h-px bg-zinc-700" />
                        <StepIndicator
                            step={3}
                            label="Edit & Import"
                            active={currentStep === 'review'}
                            completed={false}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Input */}
                    {currentStep === 'input' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">Paste Your Script</h3>
                                <p className="text-sm text-zinc-400 max-w-lg mx-auto">
                                    Paste your script, running order, or creative brief. The Script Director will extract entities,
                                    break down beats into specific shots, and identify anything that needs clarification.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <textarea
                                    value={scriptText}
                                    onChange={(e) => setScriptText(e.target.value)}
                                    placeholder={`Paste your script here...

Example:
"Scene opens on Tower Bridge at dusk. Millie (30s, red hair, leopard print coat) stands in the center of the bridge.

A Forrest Gump feather-type moment - wind catches her scarf as traffic passes behind her.

Cut to @CEO in the corner office, watching the city lights..."`}
                                    className="w-full h-80 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none resize-none font-mono text-sm"
                                />

                                <div className="flex items-center gap-4 text-xs text-zinc-500">
                                    <div className="flex items-center gap-1">
                                        <FileText size={14} />
                                        <span>{scriptText.length} characters</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users size={14} />
                                        <span>Use @Name to reference entities</span>
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="text-amber-200 font-medium mb-2">Pro Tips</p>
                                            <ul className="text-amber-200/70 text-xs space-y-1">
                                                <li>• Use @mentions for characters/locations (e.g., @Millie, @TowerBridge)</li>
                                                <li>• Reference film styles: "Forrest Gump feather moment", "Wes Anderson symmetry"</li>
                                                <li>• Include mood descriptions: "tense", "hopeful", "chaotic"</li>
                                                <li>• Messy is fine - the AI will figure it out!</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleAnalyze}
                                disabled={!scriptText.trim() || isAnalyzing}
                                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing Script...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        Analyze Script
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Analysis */}
                    {currentStep === 'analysis' && analysis && (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    icon={<Film size={20} />}
                                    label="Beats"
                                    value={stats?.totalBeats || 0}
                                    color="amber"
                                />
                                <StatCard
                                    icon={<Camera size={20} />}
                                    label="Shots"
                                    value={stats?.totalShots || 0}
                                    color="orange"
                                />
                                <StatCard
                                    icon={<Clock size={20} />}
                                    label="Duration"
                                    value={`${analysis.production.estimatedDuration}s`}
                                    color="blue"
                                />
                                <StatCard
                                    icon={<DollarSign size={20} />}
                                    label="Est. Cost"
                                    value={`$${analysis.production.estimatedCost.toFixed(2)}`}
                                    color="emerald"
                                />
                            </div>

                            {/* Entities Found */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <EntityPanel
                                    title="Characters"
                                    icon={<Users size={16} />}
                                    entities={analysis.entities.characters}
                                    existingCount={stats?.matchedCharacters || 0}
                                    newCount={stats?.newCharacters || 0}
                                />
                                <EntityPanel
                                    title="Locations"
                                    icon={<MapPin size={16} />}
                                    entities={analysis.entities.locations}
                                    existingCount={stats?.matchedLocations || 0}
                                    newCount={stats?.newLocations || 0}
                                />
                                <EntityPanel
                                    title="Products"
                                    icon={<Package size={16} />}
                                    entities={analysis.entities.products}
                                    existingCount={stats?.matchedProducts || 0}
                                    newCount={stats?.newProducts || 0}
                                />
                            </div>

                            {/* Clarification Questions */}
                            {analysis.clarifications.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                        <HelpCircle size={16} className="text-amber-400" />
                                        Clarification Needed ({analysis.clarifications.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {analysis.clarifications.map(q => (
                                            <ClarificationCard
                                                key={q.id}
                                                question={q}
                                                answer={clarificationAnswers[q.id]}
                                                onAnswer={(answer) => handleClarificationAnswer(q.id, answer)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentStep('input')}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                                >
                                    Back to Script
                                </button>
                                <button
                                    onClick={() => setCurrentStep('review')}
                                    disabled={hasUnansweredRequired}
                                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    Review Shots
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === 'review' && analysis && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Shot Breakdown</h3>
                                <div className="text-sm text-zinc-400">
                                    {stats?.totalShots} shots across {stats?.totalBeats} beats
                                </div>
                            </div>

                            {/* Beat List */}
                            <div className="space-y-4">
                                {analysis.beats.map((beat, idx) => (
                                    <BeatCard
                                        key={beat.id}
                                        beat={beat}
                                        index={idx + 1}
                                        isExpanded={expandedBeats.has(beat.id)}
                                        onToggle={() => toggleBeatExpanded(beat.id)}
                                        editingShot={editingShot}
                                        onEditShot={setEditingShot}
                                        onUpdateShot={(shotId, updates) => updateShot(beat.id, shotId, updates)}
                                    />
                                ))}
                            </div>

                            {/* Critical Assets Warning */}
                            {analysis.production.criticalAssets.length > 0 && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Target className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="text-amber-200 font-medium mb-1">Critical Assets</p>
                                            <p className="text-amber-200/70 text-xs">
                                                These entities appear in 30%+ of shots. Generate their Bible entries first for best consistency:
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {analysis.production.criticalAssets.map((asset, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-amber-500/20 rounded text-xs text-amber-200">
                                                        {asset}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCurrentStep('analysis')}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                                >
                                    Back to Analysis
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    Import to Project
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Step Indicator Component
const StepIndicator: React.FC<{
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
}> = ({ step, label, active, completed }) => (
    <div className={`flex items-center gap-2 ${active ? 'text-white' : completed ? 'text-amber-400' : 'text-zinc-500'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            active
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                : completed
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
        }`}>
            {completed && !active ? <CheckCircle size={16} /> : step}
        </div>
        <span className="text-sm font-medium hidden sm:inline">{label}</span>
    </div>
);

// Stat Card Component
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: 'amber' | 'orange' | 'blue' | 'emerald';
}> = ({ icon, label, value, color }) => {
    const colorClasses = {
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs text-zinc-400">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    );
};

// Entity Panel Component
const EntityPanel: React.FC<{
    title: string;
    icon: React.ReactNode;
    entities: ExtractedEntity[];
    existingCount: number;
    newCount: number;
}> = ({ title, icon, entities, existingCount, newCount }) => (
    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-300">
                {icon}
                <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
                {existingCount > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                        {existingCount} matched
                    </span>
                )}
                {newCount > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                        {newCount} new
                    </span>
                )}
            </div>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
            {entities.map(entity => (
                <div
                    key={entity.id}
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                        entity.existingBibleMatch
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : 'bg-zinc-700/50 text-zinc-300'
                    }`}
                >
                    {entity.existingBibleMatch ? (
                        <CheckCircle size={14} className="text-emerald-400" />
                    ) : (
                        <AlertCircle size={14} className="text-amber-400" />
                    )}
                    <span className="font-medium">{entity.name}</span>
                    {entity.aliases.length > 0 && (
                        <span className="text-xs text-zinc-500">
                            ({entity.aliases.join(', ')})
                        </span>
                    )}
                </div>
            ))}
            {entities.length === 0 && (
                <p className="text-xs text-zinc-500 text-center py-2">None found</p>
            )}
        </div>
    </div>
);

// Clarification Card Component
const ClarificationCard: React.FC<{
    question: ClarificationQuestion;
    answer?: string;
    onAnswer: (answer: string) => void;
}> = ({ question, answer, onAnswer }) => (
    <div className={`p-4 rounded-xl border ${
        answer
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : question.required
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-zinc-800/50 border-zinc-700'
    }`}>
        <div className="flex items-start gap-3">
            {answer ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
                <HelpCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${question.required ? 'text-amber-400' : 'text-zinc-400'}`} />
            )}
            <div className="flex-1 space-y-3">
                <div>
                    <p className="text-sm text-white font-medium">{question.question}</p>
                    <p className="text-xs text-zinc-400 mt-1">{question.context}</p>
                </div>

                {question.options ? (
                    <div className="flex flex-wrap gap-2">
                        {question.options.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => onAnswer(opt.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                    answer === opt.id
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ) : question.freeformAllowed ? (
                    <input
                        type="text"
                        value={answer || ''}
                        onChange={(e) => onAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                ) : null}
            </div>
        </div>
    </div>
);

// Beat Card Component
const BeatCard: React.FC<{
    beat: AnalyzedBeat;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    editingShot: { beatId: string; shotId: string } | null;
    onEditShot: (edit: { beatId: string; shotId: string } | null) => void;
    onUpdateShot: (shotId: string, updates: Partial<Shot>) => void;
}> = ({ beat, index, isExpanded, onToggle, editingShot, onEditShot, onUpdateShot }) => (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden">
        {/* Beat Header */}
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-4 p-4 hover:bg-zinc-800 transition-colors text-left"
        >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                {index}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{beat.title}</h4>
                <p className="text-xs text-zinc-400 truncate">{beat.interpretedAction}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                    <Camera size={12} />
                    {beat.shots.length} shots
                </span>
                <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {beat.duration}s
                </span>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
        </button>

        {/* Shots List */}
        {isExpanded && (
            <div className="border-t border-zinc-700 p-4 space-y-3">
                {/* Entity Usage */}
                <div className="flex flex-wrap gap-2 pb-3 border-b border-zinc-700/50">
                    {beat.entityUsage.characters.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs">
                            @{name}
                        </span>
                    ))}
                    {beat.entityUsage.locations.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            @{name}
                        </span>
                    ))}
                    {beat.entityUsage.products.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                            @{name}
                        </span>
                    ))}
                </div>

                {/* Shot Cards */}
                {beat.shots.map((shot, shotIdx) => (
                    <ShotCard
                        key={shot.id}
                        shot={shot}
                        index={shotIdx + 1}
                        isEditing={editingShot?.beatId === beat.id && editingShot?.shotId === shot.id}
                        onEdit={() => onEditShot({ beatId: beat.id, shotId: shot.id })}
                        onSave={(updates) => {
                            onUpdateShot(shot.id, updates);
                            onEditShot(null);
                        }}
                        onCancel={() => onEditShot(null)}
                    />
                ))}
            </div>
        )}
    </div>
);

// Shot Card Component
const ShotCard: React.FC<{
    shot: Shot;
    index: number;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<Shot>) => void;
    onCancel: () => void;
}> = ({ shot, index, isEditing, onEdit, onSave, onCancel }) => {
    const [editedDescription, setEditedDescription] = useState(shot.description);
    const [editedShotSize, setEditedShotSize] = useState(shot.shotSize);

    const shotSizeLabels: Record<string, string> = {
        'ECU': 'Extreme Close-Up',
        'CU': 'Close-Up',
        'MCU': 'Medium Close-Up',
        'MS': 'Medium Shot',
        'MWS': 'Medium Wide',
        'WS': 'Wide Shot',
        'EWS': 'Extreme Wide'
    };

    if (isEditing) {
        return (
            <div className="p-3 bg-zinc-900 rounded-lg border border-amber-500/50 space-y-3">
                <div className="flex items-center gap-2">
                    <select
                        value={editedShotSize}
                        onChange={(e) => setEditedShotSize(e.target.value as Shot['shotSize'])}
                        className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white"
                    >
                        {Object.entries(shotSizeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{value} - {label}</option>
                        ))}
                    </select>
                </div>
                <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none resize-none"
                    rows={3}
                />
                <div className="flex gap-2">
                    <button
                        onClick={() => onSave({ description: editedDescription, shotSize: editedShotSize })}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors flex items-center gap-1"
                    >
                        <Check size={14} />
                        Save
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700/50 group">
            <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-500 font-mono">#{index}</span>
                    <span className="px-1.5 py-0.5 bg-zinc-700 rounded text-[10px] font-mono text-zinc-300">
                        {shot.shotSize}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{shot.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-zinc-500">
                        {shot.cameraAngle && <span>Angle: {shot.cameraAngle}</span>}
                        {shot.cameraMove && <span>Move: {shot.cameraMove}</span>}
                        {shot.focalLength && <span>Lens: {shot.focalLength}</span>}
                        {shot.duration && <span>Duration: {shot.duration}</span>}
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="p-1.5 text-zinc-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                    <Edit3 size={14} />
                </button>
            </div>
        </div>
    );
};

export default ScriptDirectorModal;
