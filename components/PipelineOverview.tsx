import React from 'react';
import { FileText, Sparkles, Palette, Film, Video, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { ScriptData, GeneratedImage, GeneratedVideo, StoryboardFrame } from '../types';

interface PipelineOverviewProps {
    scriptData?: ScriptData | null;
    globalHistory: GeneratedImage[];
    storyboardFrames?: StoryboardFrame[];
    generatedVideos?: GeneratedVideo[];
    onNavigate: (stage: number) => void;
}

const PipelineOverview: React.FC<PipelineOverviewProps> = ({
    scriptData,
    globalHistory,
    storyboardFrames = [],
    generatedVideos = [],
    onNavigate
}) => {
    // Calculate metrics
    const totalBeats = scriptData?.beats?.length || 0;
    const beatsWithVisuals = scriptData?.beats?.filter(b => b.generatedImageIds?.length || b.sequenceGrid).length || 0;
    const totalCharacters = scriptData?.characters?.length || 0;
    const lockedCharacters = scriptData?.characters?.filter(c => c.isLocked).length || 0;
    const totalGenerations = globalHistory.length;
    const framesReady = storyboardFrames.filter(f => f.images.start.id !== 'ghost').length;
    const totalFrames = storyboardFrames.length;
    const videosGenerated = generatedVideos.filter(v => v.status === 'completed').length;

    const getStageStatus = (completion: number) => {
        if (completion >= 100) return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' };
        if (completion > 0) return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
        return { icon: AlertCircle, color: 'text-zinc-500', bg: 'bg-zinc-800' };
    };

    const stages = [
        {
            name: 'Script',
            icon: FileText,
            stage: 0,
            metric: `${totalBeats} beats`,
            subMetric: `${totalCharacters} characters (${lockedCharacters} locked)`,
            completion: totalBeats > 0 ? 100 : 0
        },
        {
            name: 'Concept',
            icon: Sparkles,
            stage: 1,
            metric: `${totalGenerations} images`,
            subMetric: `${beatsWithVisuals}/${totalBeats} beats visualized`,
            completion: totalBeats > 0 ? Math.round((beatsWithVisuals / totalBeats) * 100) : 0
        },
        {
            name: 'Edit',
            icon: Palette,
            stage: 2,
            metric: 'Non-destructive edits',
            subMetric: 'Quality refinement',
            completion: totalGenerations > 0 ? 50 : 0 // Always partial
        },
        {
            name: 'Storyboard',
            icon: Film,
            stage: 3,
            metric: `${framesReady}/${totalFrames} frames`,
            subMetric: totalFrames > 0 ? 'Ready for video' : 'Add frames',
            completion: totalFrames > 0 ? Math.round((framesReady / totalFrames) * 100) : 0
        },
        {
            name: 'Video',
            icon: Video,
            stage: 4,
            metric: `${videosGenerated} videos`,
            subMetric: videosGenerated > 0 ? 'Export ready' : 'Generate from frames',
            completion: videosGenerated > 0 ? 100 : 0
        }
    ];

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                Production Pipeline
            </h3>

            <div className="flex items-center justify-between gap-2">
                {stages.map((stage, idx) => {
                    const status = getStageStatus(stage.completion);
                    const StatusIcon = status.icon;

                    return (
                        <React.Fragment key={stage.name}>
                            <button
                                onClick={() => onNavigate(stage.stage)}
                                className={`flex-1 p-4 rounded-xl border border-white/5 hover:border-violet-500/50 transition-all group ${status.bg}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <stage.icon className={`w-4 h-4 ${status.color}`} />
                                    <span className="text-xs font-bold text-white">{stage.name}</span>
                                    <StatusIcon className={`w-3 h-3 ml-auto ${status.color}`} />
                                </div>
                                <p className="text-[10px] text-zinc-400 truncate">{stage.metric}</p>
                                <p className="text-[9px] text-zinc-600 truncate">{stage.subMetric}</p>

                                {/* Progress bar */}
                                <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                                        style={{ width: `${stage.completion}%` }}
                                    />
                                </div>
                            </button>

                            {idx < stages.length - 1 && (
                                <div className="w-4 h-px bg-zinc-700 shrink-0" />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Quick Stats */}
            <div className="mt-4 pt-4 border-t border-white/5 flex gap-6 text-[10px]">
                <div>
                    <span className="text-zinc-500">Total Assets:</span>
                    <span className="text-white ml-1 font-bold">{totalGenerations}</span>
                </div>
                <div>
                    <span className="text-zinc-500">Beat Coverage:</span>
                    <span className="text-white ml-1 font-bold">
                        {totalBeats > 0 ? Math.round((beatsWithVisuals / totalBeats) * 100) : 0}%
                    </span>
                </div>
                <div>
                    <span className="text-zinc-500">Storyboard:</span>
                    <span className="text-white ml-1 font-bold">
                        {totalFrames > 0 ? Math.round((framesReady / totalFrames) * 100) : 0}% complete
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PipelineOverview;
