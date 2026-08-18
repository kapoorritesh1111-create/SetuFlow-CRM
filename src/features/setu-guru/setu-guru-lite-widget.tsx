'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { getSetuGuruLitePage, isSetuGuruLiteAllowedPath } from '@/lib/setu-guru/public-site-registry';
import { SetuGuruFab } from '@/features/setu-guru/setu-guru-fab';

type LiteAction = { label: string; href: string };
type LiteMessage = { id: string; role: 'assistant' | 'user'; content: string; actions?: LiteAction[]; tone?: 'normal' | 'loading' | 'error' };
type LiteResponse = { answer?: string; actions?: LiteAction[]; pageTitle?: string; policy?: string; answered?: boolean };

const SESSION_KEY = 'setu-guru-lite-session';

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `lite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  if (typeof window === 'undefined') return null;
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = createSessionId();
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

export function SetuGuruLiteWidget() {
  const pathname = usePathname() || '/';
  const allowed = isSetuGuruLiteAllowedPath(pathname);
  const page = useMemo(() => getSetuGuruLitePage(pathname), [pathname]);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiteMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    setMessages([
      {
        id: `welcome-${page.path}`,
        role: 'assistant',
        content: `Hi, I’m Setu Guru Lite. I can help with ${page.title}: ${page.summary}\n\nI only answer from Setu Flow public marketing and training pages. I cannot access private CRM records or search outside this site.`,
        actions: page.safeActions.slice(0, 3),
      },
    ]);
  }, [page.path, page.safeActions, page.summary, page.title]);

  useEffect(() => {
    const target = scrollRef.current;
    if (!target) return;
    requestAnimationFrame(() => target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' }));
  }, [messages, thinking, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  if (!allowed) return null;

  function hideChatWindow() {
    setOpen(false);
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || thinking) return;
    const userMessage: LiteMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed };
    const loadingId = `loading-${Date.now()}`;
    setQuestion('');
    setThinking(true);
    setMessages((current) => [...current, userMessage, { id: loadingId, role: 'assistant', content: 'Checking the public Setu Flow site guide…', tone: 'loading' }]);

    try {
      const response = await fetch('/api/setu-guru/lite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, pagePath: pathname, sessionId }),
      });
      const payload = (await response.json()) as LiteResponse;
      setMessages((current) => current.filter((message) => message.id !== loadingId).concat({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: payload.answer || 'I could not answer that from the public site guide right now.',
        actions: Array.isArray(payload.actions) ? payload.actions.slice(0, 4) : [],
        tone: response.ok ? 'normal' : 'error',
      }));
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== loadingId).concat({
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Setu Guru Lite is unavailable right now.',
        tone: 'error',
      }));
    } finally {
      setThinking(false);
    }
  }

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 print:hidden" data-no-translate="true">
      {open ? (
        <section ref={panelRef} className="w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-hero border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]" aria-label="Setu Guru Lite public assistant">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={36} height={36} className="rounded-xl object-contain" />
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </span>
              <div>
                <p className="text-sm font-black">Setu Guru Lite</p>
                <p className="text-[11px] font-semibold text-white/55">Public site and training guide</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={hideChatWindow} className="rounded-full px-2 py-1 text-xs font-bold text-white/65 transition hover:bg-white/10 hover:text-white">Minimize</button>
              <button type="button" onClick={hideChatWindow} className="rounded-full px-2 py-1 text-xs font-bold text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="Hide Setu Guru Lite chat window">Hide</button>
            </div>
          </div>

          <div ref={scrollRef} className="max-h-[22rem] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'ml-8 rounded-2xl bg-teal-600 px-3 py-2 text-sm leading-6 text-white' : `mr-4 rounded-2xl px-3 py-2 text-sm leading-6 ${message.tone === 'error' ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-100' : message.tone === 'loading' ? 'bg-slate-50 text-slate-500 ring-1 ring-slate-100' : 'bg-slate-50 text-slate-700 ring-1 ring-slate-100'}`}>
                <p className="whitespace-pre-line">{message.content}</p>
                {message.actions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action) => (
                      <Link key={`${message.id}-${action.href}-${action.label}`} href={action.href} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-50">
                        {action.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <form onSubmit={ask} className="border-t border-slate-100 bg-white p-3">
            <label className="sr-only" htmlFor="setu-guru-lite-question">Ask Setu Guru Lite</label>
            <textarea
              id="setu-guru-lite-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask about ${page.title}, platform, pricing, comparison, mobile, or training…`}
              className="min-h-[4.5rem] w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              maxLength={1000}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Public content only</p>
              <button type="submit" disabled={thinking || !question.trim()} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45">
                Ask
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <SetuGuruFab label="Open Setu Guru Lite" onClick={() => setOpen((current) => !current)} />
    </div>
  );
}