"use client";
import { useState, useRef } from 'react';
import { GuruAvatar } from '@/components/ui/guru-avatar';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function MobileGuruPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm Setu Guru. I can help with your leads, pipeline, quotes, and pricing. What do you need?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const res = await fetch('/api/setu-guru/org-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, route: '/mobile/guru', pageText: '', mode: 'page_help' }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.answer ?? 'I could not find an answer right now. Try asking about your leads or pipeline.' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  const quickPrompts = [
    'What should I work on today?',
    'Which leads are overdue?',
    'How do I advance a deal?',
    'What is the priority score?',
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-160px)]">
      {/* Header */}
      <section className="rounded-[2rem] bg-[linear-gradient(145deg,#0c172d,#1a3a7c)] p-5 text-white shadow-xl flex items-center gap-3 mb-4">
        <GuruAvatar size="lg" showOnlineDot />
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-sky-200">AI Assistant</p>
          <h1 className="text-xl font-black">Setu Guru</h1>
        </div>
      </section>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {quickPrompts.map(p => (
            <button key={p} type="button" onClick={() => { setInput(p); }}
              className="rounded-2xl bg-white/90 p-3 text-left text-xs font-semibold text-slate-700 shadow-sm active:scale-[.97] transition border border-slate-200/80 hover:border-sky-200 hover:bg-sky-50">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {m.role === 'assistant' && <GuruAvatar size="sm" className="mt-1 flex-shrink-0" />}
            <div className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-white/95 text-slate-800 border border-slate-200/80'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <GuruAvatar size="sm" className="mt-1 flex-shrink-0" />
            <div className="rounded-[1.5rem] rounded-bl-md bg-white/95 border border-slate-200/80 px-4 py-3">
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 sticky bottom-0 bg-transparent pb-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask Setu Guru anything…"
          className="flex-1 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        <button type="button" onClick={send} disabled={loading || !input.trim()}
          className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black disabled:opacity-50 shadow-lg active:scale-[.95] transition">
          →
        </button>
      </div>
    </div>
  );
}
