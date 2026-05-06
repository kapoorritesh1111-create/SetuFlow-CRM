'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import RightDrawer from '@/components/RightDrawer';
import { FaIcon } from '@/components/ui/fa-icon';
import { cn } from '@/lib/utils';

type SetuGuruTopic = {
  id: string;
  title: string;
  routes: string[];
  tags: string[];
  summary: string;
  answer: string[];
  nextActions: string[];
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  actions?: string[];
  topicId?: string;
};

const STORAGE_KEY = 'setu-guru-widget-hidden';

const TOPICS: SetuGuruTopic[] = [
  {
    id: 'start-new-org',
    title: 'Start a new organization',
    routes: ['/admin/organization', '/admin/pipelines', '/admin/stages', '/admin/markets'],
    tags: ['onboarding', 'organization', 'setup', 'first admin', 'workspace'],
    summary: 'Verify org defaults, pipelines, stages, markets, terms, and approval threshold before inviting the team.',
    answer: [
      'Start in Admin > Organization. Confirm company details, logo, website, headquarters country, quote terms, order terms, default currency, and approval threshold.',
      'Then review Admin > Pipelines, Admin > Stages, and Admin > Markets so the workspace matches your real commercial journey.',
      'Invite users only after the structure is ready. Use Admin > Invitations and assign roles based on each person’s actual responsibility.',
    ],
    nextActions: ['Open Admin > Organization', 'Review pipelines and stages', 'Invite first team members'],
  },
  {
    id: 'catalog-pricing',
    title: 'Set up catalog and pricing',
    routes: ['/products', '/admin/categories', '/admin/product-management'],
    tags: ['products', 'catalog', 'pricing', 'category', 'variant', 'import', 'margin'],
    summary: 'Create categories first, add products and variants, then apply inherited defaults or deliberate product overrides.',
    answer: [
      'You are on the catalog side. Build categories first in Admin > Categories, then add products and variants in Products.',
      'Every quote-ready product should have variant context such as pack size, UOM, MOQ, SKU, and pricing basis.',
      'Use organization or category defaults for shared pricing assumptions. Product-level overrides should be intentional and reviewed.',
    ],
    nextActions: ['Create parent categories', 'Add product variants', 'Validate imports before saving'],
  },
  {
    id: 'lead-to-order',
    title: 'Lead to order workflow',
    routes: ['/leads', '/quotes', '/approval-send', '/orders', '/pipeline'],
    tags: ['lead', 'quote', 'order', 'pipeline', 'approval', 'accepted quote'],
    summary: 'Capture, qualify, map products, quote, approve/send, accept, then execute the order with blockers resolved.',
    answer: [
      'Capture the buyer or supplier in Leads, qualify the record, map product interests, and move it through the pipeline only when the next stage is valid.',
      'Create a quote from the lead. Lock commercial terms first, then price lines with the correct UOM, pack, MOQ, incoterm, FX, and quote-only adjustments.',
      'After acceptance, create the order and resolve contract, document, compliance, and commercial-lock blockers before advancing execution.',
    ],
    nextActions: ['Open the lead', 'Create or review quote', 'Check order blockers'],
  },
  {
    id: 'quote-approval',
    title: 'Quote approval and sending',
    routes: ['/quotes', '/approval-send', '/leads'],
    tags: ['quote', 'approval', 'discount', 'markup', 'pdf', 'send', 'whatsapp'],
    summary: 'Quote-only adjustments beyond the threshold require approval before sending or acceptance.',
    answer: [
      'Quote adjustments do not rewrite product, category, or organization pricing defaults.',
      'Adjustments beyond the configured threshold route the quote into pending approval for owner, admin, or manager review.',
      'Preview the quote PDF before sending. If rejected, revise the draft with the rejection reason before requesting approval again.',
    ],
    nextActions: ['Open approval queue', 'Preview PDF', 'Revise rejected quote'],
  },
  {
    id: 'trade-events-mobile',
    title: 'Trade events and mobile capture',
    routes: ['/trade-events', '/mobile', '/profile'],
    tags: ['trade show', 'mobile', 'business card', 'scan', 'vcard', 'qr', 'event'],
    summary: 'Set up events before the show, capture leads on mobile, and share Smart vCards from the field.',
    answer: [
      'Create the trade event, assign team members, and confirm mobile scan readiness before the booth goes live.',
      'Use mobile capture for business-card scan or quick manual entry. Review extracted details before creating the lead.',
      'Each field user should complete Profile > My Card so their Smart QR and vCard share actions are ready.',
    ],
    nextActions: ['Create trade event', 'Check scan readiness', 'Set up My Card'],
  },
  {
    id: 'documents-compliance',
    title: 'Documents and compliance',
    routes: ['/documents', '/compliance', '/orders', '/leads'],
    tags: ['documents', 'compliance', 'blocker', 'contract', 'order state'],
    summary: 'Document and compliance blockers prevent unsafe stage or order progression until evidence is complete.',
    answer: [
      'A document blocker means a required file is missing or not tagged correctly. Upload the document and attach the right document type.',
      'A compliance blocker means the checklist or review action is not resolved. Operations, managers, admins, or owners usually clear these checks.',
      'Orders should not move forward until accepted quote, contract, document, compliance, and commercial-lock blockers are clean.',
    ],
    nextActions: ['Open blockers panel', 'Upload missing evidence', 'Resolve compliance checklist'],
  },
  {
    id: 'roles-permissions',
    title: 'Roles and permissions',
    routes: ['/admin/users', '/admin/invitations', '/admin/organization'],
    tags: ['role', 'permission', 'user', 'invite', 'viewer', 'sales', 'operations', 'admin'],
    summary: 'Use roles to match responsibility: owners/admins govern, managers approve, operators work daily flows, viewers read only.',
    answer: [
      'If a user cannot see Admin pages, they likely do not have owner, admin, or manager-level access.',
      'If a user cannot edit leads or quotes, verify their role in Admin > Users and confirm they are an active organization member.',
      'If invitation acceptance did not assign access correctly, admins can resend the invitation or manually correct the user role.',
    ],
    nextActions: ['Open Admin > Users', 'Verify membership', 'Resend expired invitation'],
  },
  {
    id: 'live-industry-research',
    title: 'Live industry research',
    routes: ['/products', '/quotes', '/orders', '/documents', '/compliance'],
    tags: ['live search', 'industry standard', 'margin', 'markup', 'hsn', 'hs code', 'commodity code', 'tariff', 'duty', 'vat', 'uk', 'ireland', 'compliance', 'documents', 'export', 'import'],
    summary: 'Use live source-backed research for margin benchmarks, HS/HSN codes, commodity codes, duties, tariffs, and shipment document requirements.',
    answer: [
      'Use live research when the answer depends on country, product, date, tariff rules, or industry benchmarks.',
      'For HS/HSN enrichment, prepare candidate codes with confidence and sources first. Product master data should only be updated after authorized review.',
      'For compliance and pricing benchmarks, cite official or high-quality sources and treat recommendations as draft guidance until confirmed.',
    ],
    nextActions: ['Ask for live research', 'Review confidence and sources', 'Approve before write-back'],
  },
  {
    id: 'ai-guardrails',
    title: 'AI suggestions and safe learning',
    routes: ['/ai-suggestions', '/leads', '/quotes'],
    tags: ['ai', 'suggestions', 'learning', 'draft', 'guardrails', 'chatbot'],
    summary: 'AI drafts help operators move faster, but humans keep control of prices, approvals, sends, compliance, and order state.',
    answer: [
      'Use AI suggestions as drafts or guidance, not autonomous actions. Operators must review and edit before use.',
      'AI should never approve quotes, change governed pricing, send messages without review, advance orders, or make compliance decisions.',
      'Setu Guru should improve from feedback by logging unclear answers, missing docs, repeated questions, and unresolved topics for admin review.',
    ],
    nextActions: ['Review AI draft', 'Edit before using', 'Log missing help content'],
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreTopic(topic: SetuGuruTopic, query: string, pathname: string) {
  const normalizedQuery = normalize(query);
  const haystack = normalize([topic.title, topic.summary, ...topic.tags, ...topic.answer, ...topic.nextActions].join(' '));
  const routeMatch = topic.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (!normalizedQuery) return routeMatch ? 8 : 0;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const hits = tokens.reduce((count, token) => count + (haystack.includes(token) ? 1 : 0), 0);
  return hits + (routeMatch ? 2 : 0);
}

function getRouteTopics(pathname: string) {
  const matches = TOPICS.filter((topic) => topic.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`)));
  return matches.length ? matches : TOPICS.slice(0, 4);
}

function getBestTopic(query: string, pathname: string) {
  const ranked = [...TOPICS]
    .map((topic) => ({ topic, score: scoreTopic(topic, query, pathname) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].topic : getRouteTopics(pathname)[0];
}

function buildAssistantMessage(topic: SetuGuruTopic, routeTitle: string): ChatMessage {
  return {
    id: `${topic.id}-${Date.now()}`,
    role: 'assistant',
    topicId: topic.id,
    content: [`Here’s the path for **${topic.title}** on **${routeTitle}**.`, ...topic.answer].join('\n\n'),
    actions: topic.nextActions,
  };
}

export function SetuGuruWidget({
  pathname,
  routeTitle,
  organizationName,
  roleLabel,
}: {
  pathname: string;
  routeTitle: string;
  organizationName?: string | null;
  roleLabel: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const routeTopics = useMemo(() => getRouteTopics(pathname), [pathname]);

  useEffect(() => {
    const welcomeTopic = getRouteTopics(pathname)[0];
    setMessages([
      {
        id: `welcome-${pathname}`,
        role: 'assistant',
        topicId: welcomeTopic.id,
        content: `Hi, I’m Setu Guru. I can help with **${routeTitle}**, CRM workflows, pricing, HS codes, and export compliance. What would you like to do?`,
      },
    ]);
  }, [pathname, routeTitle]);

  function setWidgetHidden(nextHidden: boolean) {
    setHidden(nextHidden);
    localStorage.setItem(STORAGE_KEY, String(nextHidden));
    if (nextHidden) setDrawerOpen(false);
  }

  function askTopic(topic: SetuGuruTopic) {
    setMessages((current) => [
      ...current,
      { id: `user-${topic.id}-${Date.now()}`, role: 'user', content: topic.title },
      buildAssistantMessage(topic, routeTitle),
    ]);
  }

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = inputValue.trim();
    if (!question) return;
    const topic = getBestTopic(question, pathname);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: question },
      buildAssistantMessage(topic, routeTitle),
    ]);
    setInputValue('');
  }

  function saveFeedback(label: 'helpful' | 'missing') {
    const feedback = {
      label,
      lastMessage: messages[messages.length - 1]?.content ?? '',
      pathname,
      routeTitle,
      createdAt: new Date().toISOString(),
    };
    const existingRaw = localStorage.getItem('setu-guru-feedback-log');
    const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
    localStorage.setItem('setu-guru-feedback-log', JSON.stringify([feedback, ...existing].slice(0, 50)));
    setFeedbackSaved(true);
    window.setTimeout(() => setFeedbackSaved(false), 2200);
  }

  const launcher = hidden ? (
    <button
      type="button"
      onClick={() => setWidgetHidden(false)}
      className="fixed right-0 top-1/2 z-[310] flex -translate-y-1/2 items-center rounded-l-2xl border border-r-0 border-sky-200 bg-white px-3 py-4 text-xs font-black uppercase tracking-[0.14em] text-sky-900 shadow-[0_16px_44px_rgba(15,23,42,0.18)] hover:bg-sky-50"
      aria-label="Show Setu Guru"
    >
      Guru
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="fixed bottom-[calc(110px+env(safe-area-inset-bottom))] right-4 z-[310] group flex items-center gap-3 rounded-[1.6rem] border border-white/80 bg-white/95 p-2 pr-4 shadow-[0_18px_50px_rgba(15,23,42,0.22)] ring-1 ring-sky-100/80 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.28)] md:bottom-6 md:right-6"
      aria-label="Open Setu Guru help"
    >
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-1 shadow-inner">
        <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full rounded-[1rem] object-cover" />
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
      </span>
      <span className="hidden text-left sm:block">
        <span className="block text-sm font-black text-slate-950">Setu Guru</span>
        <span className="block text-xs font-semibold text-slate-500">Ask CRM help</span>
      </span>
    </button>
  );

  return (
    <>
      {launcher}
      <RightDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={undefined}
        widthClassName="sm:max-w-[430px]"
        bodyClassName="!p-0"
      >
        <div className="flex h-full min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
          <header className="border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-1 shadow-sm">
                <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru avatar" className="h-full w-full rounded-[0.9rem] object-cover" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-black text-slate-950">Setu Guru</h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">Online</span>
                </div>
                <p className="truncate text-xs font-semibold text-slate-500">{routeTitle} · {roleLabel} · {organizationName ?? 'Setu Flow'}</p>
              </div>
              <button
                type="button"
                onClick={() => setWidgetHidden(true)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
              >
                Hide
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <div className="rounded-[1.4rem] border border-sky-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Try asking</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {routeTopics.slice(0, 3).map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => askTopic(topic)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                  >
                    {topic.title}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => askTopic(TOPICS.find((topic) => topic.id === 'live-industry-research') ?? routeTopics[0])}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  Live research
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm',
                      message.role === 'user'
                        ? 'rounded-br-md bg-sky-600 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                    )}
                  >
                    {message.content.split('\n\n').map((paragraph) => (
                      <p key={paragraph} className="mb-2 last:mb-0">{paragraph}</p>
                    ))}
                    {message.actions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {message.actions.map((action) => (
                          <span key={action} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">{action}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex gap-2">
                <button type="button" onClick={() => saveFeedback('helpful')} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">Helpful</button>
                <button type="button" onClick={() => saveFeedback('missing')} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-800">Missing detail</button>
              </div>
              {feedbackSaved ? <span className="font-bold text-emerald-700">Saved</span> : null}
            </div>
            <form onSubmit={handleAsk} className="flex items-end gap-2 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-2 focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="Ask Setu Guru..."
                className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white shadow-sm hover:bg-sky-700" aria-label="Send message">
                <FaIcon icon="send" />
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-slate-400">AI gives guidance. Humans approve prices, compliance, sends, and write-backs.</p>
          </footer>
        </div>
      </RightDrawer>
    </>
  );
}
