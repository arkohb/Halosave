import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Bot, Sparkles, Send, User, ShieldAlert, Lock, Target, TrendingUp, HelpCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}

export const CoachTab: React.FC = () => {
  const { user, askAICoach, vaults, summary } = useApp();
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg_01',
      sender: 'coach',
      text: `👋 Greetings ${user?.fullName || 'Bismark'}! I am your HaloSave AI Wealth Advisor.\n\nI analyze your real-time Databank MFund mutual units, emergency fund health score, and automated lock horizons. How can I assist your financial discipline today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const quickPrompts = [
    { icon: ShieldAlert, label: 'Emergency Fund Health?', query: 'What is my current emergency fund health score and how can I shield it?' },
    { icon: Target, label: 'How much should I save?', query: 'Based on my target goals, how much should I save weekly?' },
    { icon: Lock, label: 'Should I extend my lock?', query: 'Why does locking my withdrawals help compound mutual fund returns?' },
    { icon: TrendingUp, label: 'When will I reach my goal?', query: 'When will I hit my annual rent advance target amount?' },
  ];

  const handleSendQuery = async (queryToSend: string) => {
    if (!queryToSend.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 8),
      sender: 'user',
      text: queryToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const coachAnswer = await askAICoach(queryToSend);
      const coachMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 8),
        sender: 'coach',
        text: coachAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, coachMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: 'err_' + Math.random().toString(36).substring(2, 8),
        sender: 'coach',
        text: '⚠️ Network connection hiccup. Please verify your internet and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto pb-24">
      
      {/* Header Banner */}
      <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-halo-gold to-teal-600 flex items-center justify-center text-halo-dark shrink-0 shadow-lg shadow-halo-gold/20">
          <Bot className="w-8 h-8" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-halo-gold text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GEMINI INTELLIGENCE ENGINE</span>
          </div>
          <h1 className="text-2xl font-extrabold text-halo-dark tracking-tight mt-0.5">
            AI Financial Discipline Coach
          </h1>
          <p className="text-xs text-halo-text-tertiary">
            Real-time personalized advice tuned strictly to your HaloSave wealth profile.
          </p>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {quickPrompts.map(p => {
          const Icon = p.icon;
          return (
            <button
              key={p.label}
              onClick={() => handleSendQuery(p.query)}
              disabled={isThinking}
              className="p-3.5 rounded-2xl bg-halo-card hover:bg-halo-secondary border border-halo-border hover:border-halo-gold/40 text-left transition-all group flex flex-col justify-between space-y-2 disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-halo-gold font-bold text-xs">
                <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{p.label}</span>
              </div>
              <p className="text-[11px] text-halo-text-tertiary line-clamp-2 leading-relaxed font-mono">
                "{p.query}"
              </p>
            </button>
          );
        })}
      </div>

      {/* Chat Container Window */}
      <div className="bg-halo-card border border-halo-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
        
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex items-start gap-3.5 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-halo-dark'
                    : 'bg-halo-gold/20 text-halo-gold border border-halo-gold/30'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-halo-dark rounded-tr-sm shadow-lg'
                    : 'bg-halo-cream/90 text-halo-dark border border-halo-border rounded-tl-sm font-sans whitespace-pre-line shadow-md'
                }`}>
                  <p>{msg.text}</p>
                  <span className={`text-[9px] font-mono block mt-2 ${isUser ? 'text-indigo-200 text-right' : 'text-halo-text-muted'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-center gap-3 text-halo-gold text-xs font-mono animate-pulse pl-2">
              <div className="w-8 h-8 rounded-xl bg-halo-gold/20 flex items-center justify-center border border-halo-gold/30">
                <Bot className="w-4 h-4" />
              </div>
              <span>Analyzing portfolio allocation & Databank NAV yields...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-halo-cream border-t border-halo-border">
          <form onSubmit={(e) => { e.preventDefault(); handleSendQuery(inputQuery); }} className="flex items-center gap-3">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask AI Coach about your savings locks, target horizon, or mutual compounding..."
              className="flex-1 bg-halo-card border border-halo-border rounded-2xl px-5 py-3.5 text-xs text-halo-dark focus:outline-none focus:border-halo-gold transition-colors"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isThinking}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-bold transition-all shadow-lg shadow-halo-gold/20 disabled:opacity-50 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
