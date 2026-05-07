'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import RightDrawer from '@/components/RightDrawer';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

type SetuGuruTopic = {
  id: string;
  title: string;
  routes: string[];
  tags: string[];
  answer: string[];
  nextActions: string[];
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  actions?: string[];
  actionHref?: string | null;
  rows?: Array<Record<string, unknown>>;
  tone?: 'normal' | 'loading' | 'error';
};

const STORAGE_KEY = 'setu-guru-widget-hidden';

const TOPICS: SetuGuruTopic[] = [
  {
    id: 'catalog-pricing',
    title: 'Catalog and pricing help',
    routes: ['/products', '/admin/categories', '/admin/product-management'],
    tags: ['products', 'catalog', 'pricing', 'category', 'variant', 'import', 'margin'],
    answer: [
      'Start with Admin > Categories so taxonomy and pricing defaults are ready before imports or manual product creation.',
      'In Products, each quote-ready row should include variant context like pack size, UOM, MOQ, SKU, and pricing basis.',
      'Use organization or category defaults for shared pricing assumptions. Product-level pricing overrides should be intentional and reviewed.',
    ],
    nextActions: ['Open Products', 'Create categories', 'Validate imports'],
  },
  {
    id: 'live-industry-research',
    title: 'Live industry research',
    routes: ['/products', '/quotes', '/orders', '/documents', '/compliance'],
    tags: ['live search', 'margin', 'hsn', 'hs code', 'tariff', 'uk', 'ireland', 'compliance', 'export', 'import'],
    answer: [
      'Ask live research questions when the answer depends on country, product, date, tariff rules, or current market benchmarks.',
      'For HS/HSN enrichment, Setu Guru should prepare candidate codes with confidence and sources first. Product master data should only be updated after authorized review.',
      'For compliance and pricing benchmarks, recommendations should stay source-backed and treated as draft guidance until confirmed.',
    ],
    nextActions: ['Ask live research', 'Review sources', 'Approve before write-back'],
  },
  {
    id: 'lead-to-order',
    title: 'Lead to order flow',
    routes: ['/leads', '/quotes', '/approval-send', '/orders', '/pipeline'],
    tags: ['lead', 'quote', 'order', 'pipeline', 'approval', 'buyer', 'supplier'],
    answer: [
      'Create or open the lead, qualify it, map product interest, and move it through the pipeline only when the next stage is valid.',
      'Create the quote from the lead and lock commercial terms first. Then price lines with the correct UOM, pack, MOQ, incoterm, FX, and quote-only adjustments.',
      'After acceptance, create the order and resolve contract, document, compliance, and commercial-lock blockers before moving execution forward.',
    ],
    nextActions: ['Open Leads', 'Review quote terms', 'Check blockers'],
  },
  {
    id: 'quote-approval',
    title: 'Quote pending approval',
    routes: ['/quotes', '/approval-send', '/leads'],
    tags: ['quote', 'approval', 'discount', 'markup', 'send', 'pdf'],
    answer: [
      'Discounts and markups on a quote affect that quote only. They do not rewrite organization, category, or product defaults.',
      'If the quote crosses the configured approval threshold, it moves into pending approval for owner, admin, or manager review.',
      'Preview the quote PDF before sending. If rejected, revise the draft with the rejection reason and submit again.',
    ],
    nextActions: ['Open approval queue', 'Review changes', 'Preview PDF'],
  },
  {
    id: 'new-org',
    title: 'Set up a new organization',
    routes: ['/admin/organization', '/admin/pipelines', '/admin/stages', '/admin/markets'],
    tags: ['onboarding', 'organization', 'setup', 'workspace'],
    answer: [
      'Open Admin > Organization and confirm company details, quote terms, order terms, default currency, and approval threshold.',
      'Review Admin > Pipelines, Admin > Stages, and Admin > Markets before inviting the wider team.',
      'Invite users from Admin > Invitations and assign roles based on each person’s actual responsibility.',
    ],
    nextActions: ['Open Admin > Organization', 'Review pipelines', 'Invite team'],
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getRouteTopics(pathname: string) {
  const matches = TOPICS.filter((topic) => topic.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`)));
  return matches.length ? matches : TOPICS.slice(0, 4);
}

function getBestTopic(query: string, pathname: string) {
  const normalizedQuery = normalize(query);
  const ranked = TOPICS.map((topic) => {
    const routeScore = topic.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ? 2 : 0;
    const haystack = normalize([topic.title, ...topic.tags, ...topic.answer].join(' '));
    const wordScore = normalizedQuery.split(/\s+/).filter(Boolean).reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
    return { topic, score: routeScore + wordScore };
  }).sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].topic : getRouteTopics(pathname)[0];
}

function isOrgSearchQuestion(question: string) {
  const q = question.toLowerCase();
  return ['how many product', 'how many buyer', 'how many supplier', 'how many lead', 'in my catalog', 'find buyer', 'find supplier', 'find lead', 'find product', 'search buyer', 'search supplier', 'missing hsn', 'missing hs code', 'filter', 'listed products', 'category'].some((phrase) => q.includes(phrase));
}

function buildAssistantMessage(topic: SetuGuruTopic, routeTitle: string): ChatMessage {
  return {
    id: `${topic.id}-${Date.now()}`,
    role: 'assistant',
    content: [`Here’s the best guidance for ${topic.title.toLowerCase()} on ${routeTitle}.`, ...topic.answer].join('\n\n'),
    actions: topic.nextActions,
  };
}

function ResultRows({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {rows.slice(0, 6).map((row, index) => (
        <div key={String(row.id ?? index)} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div className="font-semibold text-slate-950">{String(row.name ?? row.company ?? row.contact ?? 'Result')}</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500">
            {Object.entries(row).filter(([key, value]) => !['id', 'name', 'company', 'contact'].includes(key) && value).slice(0, 4).map(([key, value]) => (
              <span key={key} className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">{key}: {String(value)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SetuGuruWidget({ pathname, routeTitle, organizationName, roleLabel }: { pathname: string; routeTitle: string; organizationName?: string | null; roleLabel: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const routeTopics = useMemo(() => getRouteTopics(pathname), [pathname]);
  const quickPrompts = useMemo(() => {
    const selected = [
      ...routeTopics,
      TOPICS.find((topic) => topic.id === 'live-industry-research'),
      TOPICS.find((topic) => topic.id === 'quote-approval'),
    ].filter(Boolean) as SetuGuruTopic[];
    return selected.filter((topic, index, array) => array.findIndex((entry) => entry.id === topic.id) === index).slice(0, 4);
  }, [routeTopics]);

  useEffect(() => {
    setMessages([{ id: `welcome-${pathname}`, role: 'assistant', content: `Hi, I’m Setu Guru. I can help with ${routeTitle}, live catalog search, CRM workflows, pricing, HS codes, and export compliance. What would you like to do?` }]);
  }, [pathname, routeTitle]);

  useEffect(() => {
    const target = scrollRef.current;
    if (!target) return;
    requestAnimationFrame(() => target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' }));
  }, [messages, isThinking, drawerOpen]);

  function setWidgetHidden(nextHidden: boolean) {
    setHidden(nextHidden);
    localStorage.setItem(STORAGE_KEY, String(nextHidden));
    if (nextHidden) setDrawerOpen(false);
  }

  function askTopic(topic: SetuGuruTopic) {
    setMessages((current) => [...current, { id: `user-${topic.id}-${Date.now()}`, role: 'user', content: topic.title }, buildAssistantMessage(topic, routeTitle)]);
  }

  async function runOrgSearch(question: string) {
    const loadingId = `loading-${Date.now()}`;
    setIsThinking(true);
    setMessages((current) => [...current, { id: loadingId, role: 'assistant', content: 'Searching your live organization data…', tone: 'loading' }]);
    try {
      const response = await fetch('/api/setu-guru/org-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, route: pathname }) });
      const payload = await response.json();
      setMessages((current) => current.filter((message) => message.id !== loadingId).concat({
        id: `org-${Date.now()}`,
        role: 'assistant',
        content: payload.answer ?? 'I searched your organization data, but did not find a matching answer.',
        actions: payload.nextAction ? [payload.nextAction] : undefined,
        actionHref: typeof payload.actionHref === 'string' ? payload.actionHref : null,
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        tone: response.ok ? 'normal' : 'error',
      }));
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== loadingId).concat({ id: `org-error-${Date.now()}`, role: 'assistant', content: error instanceof Error ? error.message : 'I could not search your organization data right now.', tone: 'error' }));
    } finally {
      setIsThinking(false);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = inputValue.trim();
    if (!question || isThinking) return;
    setInputValue('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: question }]);
    if (isOrgSearchQuestion(question)) {
      void runOrgSearch(question);
      return;
    }
    setMessages((current) => [...current, buildAssistantMessage(getBestTopic(question, pathname), routeTitle)]);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  function saveFeedback(label: 'helpful' | 'missing') {
    const feedback = { label, lastMessage: messages[messages.length - 1]?.content ?? '', pathname, routeTitle, createdAt: new Date().toISOString() };
    const existingRaw = localStorage.getItem('setu-guru-feedback-log');
    const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
    localStorage.setItem('setu-guru-feedback-log', JSON.stringify([feedback, ...existing].slice(0, 50)));
    setFeedbackSaved(true);
    window.setTimeout(() => setFeedbackSaved(false), 2200);
  }

  const launcher = hidden ? (
    <button type="button" onClick={() => setWidgetHidden(false)} className="fixed right-0 top-1/2 z-[310] flex -translate-y-1/2 items-center rounded-l-2xl border border-r-0 border-sky-200 bg-white px-3 py-4 text-xs font-black uppercase tracking-[0.14em] text-sky-900 shadow-[0_16px_44px_rgba(15,23,42,0.16)] hover:bg-sky-50" aria-label="Show Setu Guru">Guru</button>
  ) : !drawerOpen ? (
    <button type="button" onClick={() => setDrawerOpen(true)} className="fixed bottom-[calc(104px+env(safe-area-inset-bottom))] right-4 z-[310] flex items-center gap-3 rounded-full border border-white/70 bg-white/95 p-2 pr-4 shadow-[0_20px_50px_rgba(15,23,42,0.16)] ring-1 ring-sky-100 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.2)] md:bottom-6 md:right-6" aria-label="Open Setu Guru">
      <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-1 shadow-inner"><img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full rounded-full object-cover" /><span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" /></span>
      <span className="hidden text-left sm:block"><span className="block text-sm font-bold text-slate-950">Setu Guru</span><span className="block text-xs text-slate-500">Ask CRM help</span></span>
    </button>
  ) : null;

  return (
    <>
      {launcher}
      <RightDrawer open={drawerOpen} onClose={closeDrawer} title={undefined} widthClassName="sm:max-w-[430px]" bodyClassName="!p-0" hideHeader>
        <div className="flex h-full min-h-[100dvh] flex-col bg-[#F8FBFF] sm:min-h-[calc(100dvh-1.5rem)]">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-1 shadow-[0_10px_24px_rgba(37,99,235,0.22)]"><img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru avatar" className="h-full w-full rounded-full object-cover" /><span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" /></div>
                <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-[17px] font-semibold text-slate-950">Setu Guru</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Online</span></div><div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500"><span className="rounded-full bg-slate-100 px-2 py-1 font-medium">{routeTitle}</span><span className="rounded-full bg-slate-100 px-2 py-1 font-medium">{roleLabel}</span><span className="rounded-full bg-slate-100 px-2 py-1 font-medium">{organizationName ?? 'Setu Flow'}</span></div></div>
              </div>
              <button type="button" onClick={() => setWidgetHidden(true)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50">Hide</button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded-[22px] border border-sky-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Quick starts</p>
              <div className="mt-3 grid grid-cols-2 gap-2">{quickPrompts.map((topic) => (<button key={topic.id} type="button" onClick={() => askTopic(topic)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900">{topic.title}</button>))}</div>
            </div>

            <div className="mt-4 space-y-3 pb-2">
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[88%]', message.role === 'assistant' ? 'pr-8' : 'pl-8')}>
                    {message.role === 'assistant' ? (<div className="mb-1 flex items-center gap-2 pl-1"><div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-[2px]"><img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full rounded-full object-cover" /></div><span className="text-[11px] font-semibold text-slate-500">Setu Guru</span></div>) : null}
                    <div className={cn('rounded-[22px] px-4 py-3 text-sm leading-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]', message.role === 'user' ? 'rounded-br-md bg-sky-600 text-white' : message.tone === 'error' ? 'rounded-bl-md border border-rose-200 bg-rose-50 text-rose-900' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700')}>
                      {message.content.split('\n\n').map((paragraph) => <p key={paragraph} className="mb-2 last:mb-0">{paragraph}</p>)}
                      <ResultRows rows={message.rows ?? []} />
                      {message.actions?.length ? (<div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{message.actions.map((action, index) => message.actionHref && index === 0 ? <a key={action} href={message.actionHref} className="rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-sky-700">{action}</a> : <span key={action} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">{action}</span>)}</div>) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 pb-4 pt-3">
            <div className="mb-3 flex items-center justify-between gap-2"><div className="flex gap-2"><button type="button" onClick={() => saveFeedback('helpful')} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Helpful</button><button type="button" onClick={() => saveFeedback('missing')} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">Missing detail</button></div><span className="text-[11px] text-slate-400">{feedbackSaved ? 'Saved' : 'Live org search ready'}</span></div>
            <form onSubmit={handleAsk} className="flex items-end gap-2 rounded-[22px] border border-slate-200 bg-[#F8FBFF] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100">
              <textarea ref={inputRef} value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} placeholder="Ask about products, buyers, suppliers, HSN codes…" className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              <button type="submit" disabled={isThinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-600 text-white shadow-[0_10px_24px_rgba(2,132,199,0.24)] transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Send message"><FaIcon icon={isThinking ? 'circle-o-notch' : 'send'} className={isThinking ? 'animate-spin' : undefined} /></button>
            </form>
            <p className="mt-2 px-1 text-center text-[11px] text-slate-400">Setu Guru can search this organization. Humans approve prices, compliance, sends, and write-backs.</p>
          </footer>
        </div>
      </RightDrawer>
    </>
  );
}
