import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Send, Sparkles, Loader2, Check, X, ChevronDown, ChevronUp,
    MessageSquare, Wand2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    ProducerMessage,
    ProducerAppContext,
    PRODUCER_TOOLS,
    PRODUCER_SYSTEM_PROMPT,
    executeProducerTool,
    ToolResult
} from '../services/producerAgent';

// Gemini API response types
interface GeminiPart {
    text?: string;
    functionCall?: {
        name: string;
        args: Record<string, unknown>;
    };
}

interface GeminiFunctionCall {
    name: string;
    args: Record<string, unknown>;
}

interface ProducerChatProps {
    appContext: ProducerAppContext;
    isOpen: boolean;
    onClose: () => void;
}

// Quick action suggestions
const QUICK_PROMPTS = [
    { label: "Add warm-up sequence", prompt: "Add 3 beats at the start showing athlete warming up before the main action" },
    { label: "Make it more dramatic", prompt: "Update the visual style to be more dramatic and cinematic throughout" },
    { label: "Show me the project", prompt: "What's the current state of my project? Give me a summary." },
    { label: "Generate all beats", prompt: "Generate images for all beats that don't have images yet" },
];

const ProducerChat: React.FC<ProducerChatProps> = ({ appContext, isOpen, onClose }) => {
    const [messages, setMessages] = useState<ProducerMessage[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const [pendingConfirmation, setPendingConfirmation] = useState<{
        toolName: string;
        parameters: Record<string, unknown>;
        message: string;
    } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const conversationHistoryRef = useRef<{ role: string; parts: { text: string }[] }[]>([]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Build Gemini API request with function calling
    const callGeminiWithTools = async (userMessage: string): Promise<{
        text: string;
        functionCalls?: GeminiFunctionCall[];
    }> => {
        const apiKey = (import.meta as unknown as { env: { VITE_GEMINI_API_KEY?: string } }).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        // Add user message to history
        conversationHistoryRef.current.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: conversationHistoryRef.current,
                systemInstruction: {
                    parts: [{ text: PRODUCER_SYSTEM_PROMPT }]
                },
                tools: [{
                    functionDeclarations: PRODUCER_TOOLS
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (!candidate?.content?.parts) {
            throw new Error('Invalid response from API');
        }

        // Check for function calls
        const functionCalls = candidate.content.parts
            .filter((part: GeminiPart) => part.functionCall)
            .map((part: GeminiPart) => ({
                name: part.functionCall!.name,
                args: part.functionCall!.args
            }));

        // Get text response
        const textParts = candidate.content.parts
            .filter((part: GeminiPart) => part.text)
            .map((part: GeminiPart) => part.text);

        const text = textParts.join('\n');

        // Add assistant response to history
        conversationHistoryRef.current.push({
            role: 'model',
            parts: [{ text: text || '[Executing tools...]' }]
        });

        return { text, functionCalls };
    };

    // Send function results back to Gemini for final response
    const sendFunctionResults = async (toolResults: { name: string; result: ToolResult }[]): Promise<string> => {
        const apiKey = (import.meta as unknown as { env: { VITE_GEMINI_API_KEY?: string } }).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        // Add function responses to history
        const functionResponseParts = toolResults.map(tr => ({
            functionResponse: {
                name: tr.name,
                response: tr.result
            }
        }));

        conversationHistoryRef.current.push({
            role: 'function',
            parts: functionResponseParts as any
        });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: conversationHistoryRef.current,
                systemInstruction: {
                    parts: [{ text: PRODUCER_SYSTEM_PROMPT }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Done!';

        // Add to history
        conversationHistoryRef.current.push({
            role: 'model',
            parts: [{ text }]
        });

        return text;
    };

    const handleSend = useCallback(async (overrideMessage?: string) => {
        const messageToSend = overrideMessage || input.trim();
        if (!messageToSend) return;

        setInput('');
        setIsThinking(true);
        setShowQuickPrompts(false);

        // Add user message to UI
        const userMsgId = `msg_${Date.now()}`;
        setMessages(prev => [...prev, {
            id: userMsgId,
            role: 'user',
            content: messageToSend,
            timestamp: Date.now()
        }]);

        try {
            // Call Gemini with tools
            const response = await callGeminiWithTools(messageToSend);

            // If there are function calls, execute them
            if (response.functionCalls && response.functionCalls.length > 0) {
                const toolCalls: { toolName: string; parameters: Record<string, unknown>; result: ToolResult }[] = [];

                for (const call of response.functionCalls) {
                    // Execute the tool
                    const result = await executeProducerTool(call.name, call.args, appContext);

                    // Check if needs confirmation
                    if (result.needsConfirmation) {
                        setPendingConfirmation({
                            toolName: call.name,
                            parameters: call.args,
                            message: result.confirmationMessage || result.message
                        });

                        setMessages(prev => [...prev, {
                            id: `msg_${Date.now()}`,
                            role: 'producer',
                            content: result.confirmationMessage || result.message,
                            timestamp: Date.now()
                        }]);

                        setIsThinking(false);
                        return;
                    }

                    toolCalls.push({
                        toolName: call.name,
                        parameters: call.args,
                        result
                    });
                }

                // Send results back to Gemini for final response
                const finalResponse = await sendFunctionResults(
                    toolCalls.map(tc => ({ name: tc.toolName, result: tc.result }))
                );

                // Add producer message with tool calls
                setMessages(prev => [...prev, {
                    id: `msg_${Date.now()}`,
                    role: 'producer',
                    content: finalResponse,
                    timestamp: Date.now(),
                    toolCalls
                }]);
            } else {
                // No tools, just text response
                setMessages(prev => [...prev, {
                    id: `msg_${Date.now()}`,
                    role: 'producer',
                    content: response.text || "I'm not sure how to help with that. Could you rephrase?",
                    timestamp: Date.now()
                }]);
            }
        } catch (error) {
            console.error('Producer chat error:', error);
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'producer',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: Date.now()
            }]);
        } finally {
            setIsThinking(false);
        }
    }, [input, appContext]);

    // Handle confirmation response
    const handleConfirmation = async (confirmed: boolean) => {
        if (!pendingConfirmation) return;

        if (confirmed) {
            setIsThinking(true);
            // Re-execute without the confirmation check (force execute)
            const result = await executeProducerTool(
                pendingConfirmation.toolName,
                { ...pendingConfirmation.parameters, forceExecute: true },
                appContext
            );

            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'producer',
                content: result.message,
                timestamp: Date.now(),
                toolCalls: [{
                    toolName: pendingConfirmation.toolName,
                    parameters: pendingConfirmation.parameters,
                    result
                }]
            }]);
            setIsThinking(false);
        } else {
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}`,
                role: 'producer',
                content: "No problem, I won't make that change. What else can I help with?",
                timestamp: Date.now()
            }]);
        }

        setPendingConfirmation(null);
    };

    // Clear chat
    const handleClear = () => {
        setMessages([]);
        conversationHistoryRef.current = [];
        setShowQuickPrompts(true);
        setPendingConfirmation(null);
    };

    // Handle keyboard
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-16 bottom-0 w-96 bg-zinc-950 border-l border-white/10 flex flex-col z-30 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">Creative Producer</h3>
                        <p className="text-[10px] text-zinc-500">AI that executes your vision</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClear}
                        className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                        title="Clear chat"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && showQuickPrompts && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-zinc-700" />
                        </div>
                        <h4 className="text-white font-medium mb-2">Hey! I'm your Creative Producer.</h4>
                        <p className="text-zinc-500 text-sm mb-6">
                            Tell me what you want and I'll make it happen.
                        </p>

                        <div className="space-y-2">
                            {QUICK_PROMPTS.map((qp, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(qp.prompt)}
                                    className="w-full p-3 bg-zinc-900/50 border border-white/5 rounded-xl text-left text-sm text-zinc-300 hover:bg-zinc-800/50 hover:border-violet-500/30 transition-all"
                                >
                                    {qp.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'producer'
                            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600'
                            : 'bg-zinc-700'
                            }`}>
                            {msg.role === 'producer' ? (
                                <Sparkles className="w-4 h-4 text-white" />
                            ) : (
                                <span className="text-[10px] text-white font-bold">YOU</span>
                            )}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                            <div className={`inline-block p-3 rounded-xl text-sm ${msg.role === 'producer'
                                ? 'bg-zinc-900 text-zinc-200'
                                : 'bg-violet-600 text-white'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {/* Tool calls indicator */}
                            {msg.toolCalls && msg.toolCalls.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {msg.toolCalls.map((call, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[10px]">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${call.result.success ? 'bg-green-500/20' : 'bg-red-500/20'
                                                }`}>
                                                {call.result.success ? (
                                                    <Check className="w-2.5 h-2.5 text-green-400" />
                                                ) : (
                                                    <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                                                )}
                                            </div>
                                            <span className={call.result.success ? 'text-green-400' : 'text-red-400'}>
                                                {call.toolName === 'addBeat' && 'Added beat'}
                                                {call.toolName === 'modifyBeat' && 'Modified beat'}
                                                {call.toolName === 'deleteBeats' && 'Deleted beats'}
                                                {call.toolName === 'reorderBeats' && 'Reordered beats'}
                                                {call.toolName === 'generateBeatImages' && 'Started generation'}
                                                {call.toolName === 'addCharacter' && 'Added character'}
                                                {call.toolName === 'addLocation' && 'Added location'}
                                                {call.toolName === 'addProduct' && 'Added product'}
                                                {call.toolName === 'createMoodBoard' && 'Created mood board'}
                                                {call.toolName === 'updateProductionDesign' && 'Updated design'}
                                                {call.toolName === 'getProjectState' && 'Got state'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                        <div className="bg-zinc-900 p-3 rounded-xl">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation dialog */}
                {pendingConfirmation && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-amber-200 mb-3">{pendingConfirmation.message}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleConfirmation(true)}
                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                        Yes, proceed
                                    </button>
                                    <button
                                        onClick={() => handleConfirmation(false)}
                                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Tell me what you want to create..."
                        disabled={isThinking || !!pendingConfirmation}
                        rows={1}
                        className="flex-1 px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isThinking || !!pendingConfirmation}
                        className="p-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[9px] text-zinc-600 mt-2 text-center">
                    Producer can add beats, generate images, and modify your project
                </p>
            </div>
        </div>
    );
};

export default ProducerChat;
