
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import { ProducerMessage, AppStage } from '../types';
import { consultProducer } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface StudioAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentStage: AppStage;
}

const StudioAssistant: React.FC<StudioAssistantProps> = ({ isOpen, onClose, currentStage }) => {
  const [messages, setMessages] = useState<ProducerMessage[]>([
      {
          id: 'welcome',
          role: 'producer',
          content: `**I am The Producer.**\n\nI can help you:\n- **Learn the App:** Ask me "How do I add a mask?" or "What does Coverage do?"\n- **Write Scripts:** Ask me "Write a sci-fi scene" or "Give me a shot list."\n\nHow can I help you in ${currentStage.replace(/_/g, ' ')}?`,
          timestamp: Date.now()
      }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
      if (!input.trim() || isThinking) return;

      const userMsg: ProducerMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: input,
          timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsThinking(true);

      try {
          const responseText = await consultProducer(userMsg.content, currentStage);
          
          const producerMsg: ProducerMessage = {
              id: crypto.randomUUID(),
              role: 'producer',
              content: responseText,
              timestamp: Date.now()
          };
          setMessages(prev => [...prev, producerMsg]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed top-14 bottom-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
       
       {/* Header */}
       <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/50 backdrop-blur-sm">
           <div className="flex items-center gap-2">
               <div className="bg-violet-600 p-1.5 rounded-lg">
                   <Bot className="w-5 h-5 text-white" />
               </div>
               <div>
                   <h3 className="text-sm font-bold text-white">The Producer</h3>
                   <p className="text-[10px] text-slate-400">Guide & Scriptwriter</p>
               </div>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
       </div>

       {/* Chat Area */}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
           {messages.map(msg => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[90%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-violet-700 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                       {msg.role === 'producer' ? (
                           <div className="prose prose-invert prose-xs leading-relaxed">
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
                   <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center gap-2">
                       <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                       <span className="text-xs text-slate-400">Thinking...</span>
                   </div>
               </div>
           )}
           <div ref={messagesEndRef} />
       </div>

       {/* Input Area */}
       <div className="p-4 bg-slate-900 border-t border-slate-800">
           <div className="relative">
               <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 placeholder="Ask for help or script ideas..."
                 className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-600"
               />
               <button 
                 onClick={handleSend}
                 disabled={!input.trim() || isThinking}
                 className="absolute right-2 top-2 p-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-800 transition-colors"
               >
                   <Send className="w-4 h-4" />
               </button>
           </div>
           <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-none">
               <button onClick={() => setInput("How do I add a mask?")} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 text-slate-400 whitespace-nowrap">How do I add a mask?</button>
               <button onClick={() => setInput("Generate a script for a horror scene")} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 text-slate-400 whitespace-nowrap">Write a horror script</button>
               <button onClick={() => setInput("What is Shot Coverage?")} className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 text-slate-400 whitespace-nowrap">What is Coverage?</button>
           </div>
       </div>

    </div>
  );
};

export default StudioAssistant;
