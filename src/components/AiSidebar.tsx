import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Loader2, Sparkles, FolderInput, Image as ImageIcon } from 'lucide-react';
import { AIRouter } from '../services/ai/router';
import { FileItem } from '../types';
import ReactMarkdown from 'react-markdown';

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileItem[];
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export function AiSidebar({ isOpen, onClose, files }: AiSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', content: 'Hi! I am GlassCloud AI. Ask me anything about your files, or ask me to organize them.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await AIRouter.askAssistant(userMsg, files);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: 'Sorry, I encountered an error. Please check your API keys.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: 'organize' | 'image') => {
    if (isLoading) return;
    
    if (action === 'organize') {
      const userMsg = "Please suggest how to organize my files.";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
      setIsLoading(true);
      try {
        const folders = await AIRouter.suggestFolders(files);
        const aiMsg = `I suggest organizing your files into these folders:\n\n${folders.map(f => `- **${f}**`).join('\n')}\n\nYou can use the "Smart Organize" button in the main view to automatically create these and move your files.`;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: aiMsg }]);
      } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: 'Sorry, I encountered an error.' }]);
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'image') {
      const images = files.filter(f => f.type === 'image' && !f.isTrashed);
      if (images.length === 0) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: "Analyze my recent image." }, { id: (Date.now() + 1).toString(), role: 'ai', content: "You don't have any images in your current view to analyze." }]);
        return;
      }
      
      const recentImage = images.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const userMsg = `Please analyze my recent image: ${recentImage.name}`;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
      setIsLoading(true);
      try {
        const tags = await AIRouter.analyzeImage(recentImage);
        const aiMsg = `I analyzed **${recentImage.name}**. Here are some descriptive tags:\n\n${tags.map(t => `- ${t}`).join('\n')}`;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: aiMsg }]);
      } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: 'Sorry, I encountered an error.' }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-white font-medium">GlassCloud AI</h2>
                  <p className="text-xs text-slate-400">Powered by Groq & Gemini</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500 text-white rounded-tr-none' 
                      : 'bg-slate-800 border border-white/10 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.role === 'ai' ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-slate-800 border border-white/10 text-slate-200 rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-800/50">
              <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => handleQuickAction('organize')}
                  disabled={isLoading}
                  className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-colors border border-indigo-500/30 disabled:opacity-50"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  Organize Folders
                </button>
                <button 
                  onClick={() => handleQuickAction('image')}
                  disabled={isLoading}
                  className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium transition-colors border border-emerald-500/30 disabled:opacity-50"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Image Recognition
                </button>
              </div>
              <form onSubmit={handleSubmit} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask GlassCloud AI..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:hover:text-indigo-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
