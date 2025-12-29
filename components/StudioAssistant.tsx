
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Lightbulb, AlertTriangle, CheckCircle, ChevronRight, RefreshCw, Zap, BookOpen, Film, Palette, Navigation, Eye } from 'lucide-react';
import { ProducerMessage, AppStage, ProducerContext } from '../types';
import { consultProducer, getProactiveSuggestions } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import SpotlightOverlay from './SpotlightOverlay';

// Action types that Scout can emit
type ScoutAction =
  | { type: 'navigate'; target: string }
  | { type: 'highlight'; target: string }
  | null;

// Parse action commands from AI response
const parseScoutAction = (text: string): { cleanText: string; action: ScoutAction } => {
  // Look for action commands at the end of the text
  const navigateMatch = text.match(/\[ACTION:NAVIGATE:([^\]]+)\]\s*$/);
  const highlightMatch = text.match(/\[ACTION:HIGHLIGHT:([^\]]+)\]\s*$/);

  if (navigateMatch) {
    return {
      cleanText: text.replace(/\[ACTION:NAVIGATE:[^\]]+\]\s*$/, '').trim(),
      action: { type: 'navigate', target: navigateMatch[1] }
    };
  }

  if (highlightMatch) {
    return {
      cleanText: text.replace(/\[ACTION:HIGHLIGHT:[^\]]+\]\s*$/, '').trim(),
      action: { type: 'highlight', target: highlightMatch[1] }
    };
  }

  return { cleanText: text, action: null };
};

interface StudioAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: AppStage;
  projectContext?: ProducerContext;
  onNavigate?: (destination: string) => void;
  onSetActiveTab?: (tab: string) => void;
}

// Quick action buttons based on context
const getQuickActions = (stage: AppStage, context?: ProducerContext) => {
    const baseActions = [
        { label: "How do I add a mask?", icon: Palette },
        { label: "What is Shot Coverage?", icon: Film },
    ];

    // Stage-specific actions
    const stageActions: Record<string, Array<{ label: string; icon: any }>> = {
        'STAGE_0_SCRIPT': [
            { label: "Help me write a script", icon: BookOpen },
            { label: "Break down my beats", icon: Film },
            { label: "What characters do I need?", icon: Sparkles },
        ],
        'STAGE_1_CONCEPT': [
            { label: "Why are my images inconsistent?", icon: AlertTriangle },
            { label: "Best reference image strategy", icon: Lightbulb },
            { label: "Write a cinematic prompt", icon: Sparkles },
        ],
        'STAGE_2_EDITING': [
            { label: "How do I use masking?", icon: Palette },
            { label: "Best relighting techniques", icon: Lightbulb },
            { label: "Fix my composition", icon: Sparkles },
        ],
        'STAGE_3_STORYBOARD': [
            { label: "Plan my shot sequence", icon: Film },
            { label: "Add transitions between shots", icon: ChevronRight },
            { label: "What's missing from my storyboard?", icon: AlertTriangle },
        ],
        'STAGE_4_VIDEO': [
            { label: "Best Veo prompting tips", icon: Lightbulb },
            { label: "Camera movement vocabulary", icon: Film },
            { label: "Optimize my video prompt", icon: Sparkles },
        ],
    };

    // Context-aware actions
    const contextActions: Array<{ label: string; icon: any }> = [];

    if (context) {
        // No characters defined
        if (context.worldBible?.characters?.length === 0 && context.script?.beats?.some(b => b.characters.length > 0)) {
            contextActions.push({ label: "Help me set up my Character Bible", icon: AlertTriangle });
        }

        // No lookbook
        if (!context.productionDesign?.hasLookbook) {
            contextActions.push({ label: "How do I create a Lookbook?", icon: Palette });
        }

        // Many generations without references
        const recentWithoutRefs = context.generationHistory?.recentGenerations?.filter(g => !g.hadReferences).length || 0;
        if (recentWithoutRefs >= 3) {
            contextActions.push({ label: "Why should I use reference images?", icon: Lightbulb });
        }
    }

    return [...contextActions, ...(stageActions[stage] || baseActions)].slice(0, 4);
};

const StudioAssistant: React.FC<StudioAssistantProps> = ({
    isOpen,
    onClose,
    currentStage,
    projectContext,
    onNavigate,
    onSetActiveTab
}) => {
    const [messages, setMessages] = useState<ProducerMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [proactiveSuggestions, setProactiveSuggestions] = useState<string | null>(null);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasLoadedSuggestions = useRef(false);

    // Handle Scout actions (navigation and highlighting)
    const executeAction = useCallback((action: ScoutAction) => {
        if (!action) return;

        if (action.type === 'navigate') {
            const target = action.target;

            // Handle stage navigation
            if (target.startsWith('STAGE_')) {
                onNavigate?.(target);
            }
            // Handle tab navigation within Script Studio
            else if (target.startsWith('TAB_')) {
                const tabMap: Record<string, string> = {
                    'TAB_SCRIPT': 'script',
                    'TAB_CHARACTERS': 'characters',
                    'TAB_LOCATIONS': 'locations',
                    'TAB_PRODUCTS': 'products',
                    'TAB_DESIGN': 'design'
                };
                const tabName = tabMap[target];
                if (tabName && onSetActiveTab) {
                    // First navigate to Script Studio if not there
                    if (currentStage !== 'STAGE_0_SCRIPT') {
                        onNavigate?.('STAGE_0_SCRIPT');
                    }
                    // Then set the active tab
                    setTimeout(() => onSetActiveTab(tabName), 100);
                }
            }
        } else if (action.type === 'highlight') {
            setHighlightTarget(action.target);
        }
    }, [onNavigate, onSetActiveTab, currentStage]);

    const dismissHighlight = useCallback(() => {
        setHighlightTarget(null);
    }, []);

    // Reactive mobile detection with resize listener
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 768
    );

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Build welcome message with context awareness
    const getWelcomeMessage = () => {
        const stageName = currentStage.replace(/_/g, ' ').replace('STAGE ', '');

        let contextHint = '';
        if (projectContext) {
            const charCount = projectContext.worldBible?.characters?.length || 0;
            const beatCount = projectContext.script?.beatCount || 0;
            const imageCount = projectContext.generationHistory?.totalImages || 0;

            if (charCount === 0 && beatCount > 0) {
                contextHint = `\n\n⚠️ You have ${beatCount} beats but no characters in your Bible yet.`;
            } else if (imageCount > 0 && !projectContext.productionDesign?.hasLookbook) {
                contextHint = `\n\n💡 You've generated ${imageCount} images. A Lookbook could improve consistency.`;
            }
        }

        return {
            id: 'welcome',
            role: 'producer' as const,
            content: `**I am The Producer** — your AI production partner.

I can see your full project and can help you:
- 🎬 **Plan Production:** Analyze scripts, identify missing assets, optimize workflows
- 🎨 **Guide Generation:** Write better prompts, suggest references, improve consistency
- 📚 **Teach Features:** Explain any tool or technique in context${contextHint}

What can I help you with in ${stageName}?`,
            timestamp: Date.now()
        };
    };

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([getWelcomeMessage()]);
        }
    }, [isOpen]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Load proactive suggestions when panel opens
    useEffect(() => {
        if (isOpen && projectContext && !hasLoadedSuggestions.current) {
            hasLoadedSuggestions.current = true;
            loadProactiveSuggestions();
        }
    }, [isOpen, projectContext]);

    const loadProactiveSuggestions = async () => {
        if (!projectContext) return;

        setIsLoadingSuggestions(true);
        try {
            const suggestions = await getProactiveSuggestions(projectContext);
            setProactiveSuggestions(suggestions);
        } catch (e) {
            console.error('Failed to load suggestions:', e);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleSend = async (customMessage?: string) => {
        const messageText = customMessage || input;
        if (!messageText.trim() || isThinking) return;

        const userMsg: ProducerMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            // Pass full project context if available
            const context = projectContext || currentStage;
            const responseText = await consultProducer(userMsg.content, context);

            // Parse any action commands from the response
            const { cleanText, action } = parseScoutAction(responseText);

            const producerMsg: ProducerMessage = {
                id: crypto.randomUUID(),
                role: 'producer',
                content: cleanText, // Use cleaned text without action command
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, producerMsg]);

            // Execute any action after a brief delay for UX
            if (action) {
                setTimeout(() => executeAction(action), 500);
            }
        } catch (e) {
            console.error(e);
            const errorMsg: ProducerMessage = {
                id: crypto.randomUUID(),
                role: 'producer',
                content: "I lost my connection to the studio. Please try again.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    const quickActions = getQuickActions(currentStage, projectContext);

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile: Full-screen modal with backdrop */}
            {isMobile && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            <div className={`fixed bg-zinc-900 shadow-2xl z-50 flex flex-col ${
                isMobile
                    ? 'inset-0 animate-in slide-in-from-bottom duration-300'
                    : 'top-14 bottom-0 right-0 w-[420px] border-l border-zinc-800 animate-in slide-in-from-right duration-300'
            }`}>

            {/* Header */}
            <div className={`border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/80 backdrop-blur-sm shrink-0 ${isMobile ? 'h-16 pt-safe' : 'h-14'}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-violet-900/30">
                        <Bot className={isMobile ? 'w-6 h-6 text-white' : 'w-5 h-5 text-white'} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-white ${isMobile ? 'text-base' : 'text-sm'}`}>The Producer</h3>
                        <p className="text-[10px] text-zinc-400">AI Production Partner</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            hasLoadedSuggestions.current = false;
                            loadProactiveSuggestions();
                        }}
                        className={`text-zinc-500 hover:text-violet-400 transition-colors ${isMobile ? 'p-3' : 'p-1.5'}`}
                        title="Refresh suggestions"
                    >
                        <RefreshCw className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onClose}
                        className={`text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ${isMobile ? 'p-3 -mr-2' : 'p-1.5'}`}
                    >
                        <X className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />
                    </button>
                </div>
            </div>

            {/* Proactive Suggestions Banner */}
            {proactiveSuggestions && (
                <div className="border-b border-zinc-800 bg-gradient-to-r from-violet-950/30 to-indigo-950/30 px-4 py-3 shrink-0">
                    <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-zinc-300 leading-relaxed">
                            <span className="text-amber-400 font-medium">Quick Analysis: </span>
                            <ReactMarkdown
                                className="inline prose prose-invert prose-xs [&>p]:inline [&>ul]:mt-1 [&>ul]:mb-0"
                                components={{
                                    p: ({ children }) => <span>{children}</span>
                                }}
                            >
                                {proactiveSuggestions}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {isLoadingSuggestions && !proactiveSuggestions && (
                <div className="border-b border-zinc-800 bg-zinc-950/50 px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyzing your project...
                    </div>
                </div>
            )}

            {/* Project Status Bar - hidden on mobile to save space */}
            {projectContext && !isMobile && (
                <div className="border-b border-zinc-800 px-4 py-2 bg-zinc-950/30 shrink-0">
                    <div className="flex items-center gap-4 text-[10px]">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${(projectContext.worldBible?.characters?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-zinc-400">{projectContext.worldBible?.characters?.length || 0} Characters</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${(projectContext.worldBible?.locations?.length || 0) > 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-zinc-400">{projectContext.worldBible?.locations?.length || 0} Locations</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${(projectContext.script?.beatCount || 0) > 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-zinc-400">{projectContext.script?.beatCount || 0} Beats</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${(projectContext.generationHistory?.totalImages || 0) > 0 ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                            <span className="text-zinc-400">{projectContext.generationHistory?.totalImages || 0} Images</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/30 ${isMobile ? '-webkit-overflow-scrolling-touch' : ''}`}>
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-xl p-3 ${isMobile ? 'text-sm' : 'text-sm'} ${msg.role === 'user' ? 'bg-violet-700 text-white' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'}`}>
                            {msg.role === 'producer' ? (
                                <div className="prose prose-invert prose-xs leading-relaxed [&>ul]:mt-2 [&>ul]:mb-2 [&>p]:mb-2 [&>p:last-child]:mb-0">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                            <span className="text-xs text-zinc-400">Analyzing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 bg-zinc-900 border-t border-zinc-800 shrink-0 ${isMobile ? 'pb-safe' : ''}`}>
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask for help, script ideas, or production advice..."
                        className={`w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-14 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-zinc-600 ${isMobile ? 'py-4 text-base' : 'py-3 text-sm'}`}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isThinking}
                        className={`absolute right-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:bg-zinc-800 transition-colors ${isMobile ? 'top-2 p-2.5' : 'top-2 p-1.5'}`}
                    >
                        <Send className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                    </button>
                </div>

                {/* Context-Aware Quick Actions */}
                <div className={`mt-3 flex gap-2 overflow-x-auto scrollbar-none ${isMobile ? 'pb-2' : 'pb-1'}`}>
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(action.label)}
                            className={`flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full border border-zinc-700 text-zinc-400 whitespace-nowrap transition-colors ${isMobile ? 'text-xs px-3 py-2' : 'text-[10px] px-2.5 py-1.5'}`}
                        >
                            <action.icon className={isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>

        </div>

        {/* Spotlight Overlay for highlighting UI elements */}
        <SpotlightOverlay
            targetId={highlightTarget}
            onDismiss={dismissHighlight}
        />
        </>
    );
};

export default StudioAssistant;
