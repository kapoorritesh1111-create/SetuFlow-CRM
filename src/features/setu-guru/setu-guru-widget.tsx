'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

const STORAGE_KEY = 'setu-guru-widget-hidden';

const TOPICS: SetuGuruTopic[] = [
  {
    id: 'start-new-org',
    title: 'Start a new organization',
    routes: ['/admin/organization', '/admin/pipelines', '/admin/stages', '/admin/markets'],
    tags: ['onboarding', 'organization', 'setup', 'first admin', 'workspace'],
    summary: 'Verify org defaults, pipeline/stage setup, markets, terms, and approval threshold before inviting the team.',
    answer: [
      'Open Admin > Organization and confirm company name, logo, website, headquarters country, quote terms, order terms, default currency, and approval threshold.',
      'Review Admin > Pipelines, Admin > Stages, and Admin > Markets so the workspace matches the customer journey before users start entering records.',
      'After the commercial structure is right, invite users from Admin > Invitations and assign roles based on actual work responsibility.'
    ],
    nextActions: ['Open Admin > Organization', 'Review pipeline/stage names', 'Invite first team members'],
  },
  {
    id: 'catalog-pricing',
    title: 'Set up catalog and pricing',
    routes: ['/products', '/admin/categories', '/admin/product-management'],
    tags: ['products', 'catalog', 'pricing', 'category', 'variant', 'import', 'margin'],
    summary: 'Create categories first, add products and variants, then apply inherited pricing defaults or explicit product overrides.',
    answer: [
      'Start with Admin > Categories so product taxonomy and category pricing defaults are ready before product import.',
      'In Products, each operational row should have variant context such as pack size, UOM, MOQ, SKU, and pricing basis.',
      'Use organization or category pricing defaults for shared freight, duty, margin, and landed-cost assumptions. Product-level pricing overrides should be deliberate and reasoned.'
    ],
    nextActions: ['Create parent categories', 'Add product variants', 'Run Catalog Command Center import validation'],
  },
  {
    id: 'lead-to-order',
    title: 'Lead to order workflow',
    routes: ['/leads', '/quotes', '/approval-send', '/orders', '/pipeline'],
    tags: ['lead', 'quote', 'order', 'pipeline', 'approval', 'accepted quote'],
    summary: 'Capture, qualify, map products, quote, approve/send, accept, then execute the order with blockers resolved.',
    answer: [
      'Capture the buyer or supplier in Leads, qualify the record, map product interests, and move it through the pipeline only when the next stage is valid.',
      'Create a quote from the lead, lock commercial terms first, then price lines with the correct UOM, pack, MOQ, incoterm, FX, and quote-only adjustments.',
      'Once accepted, create the order and use Orders to resolve contract, document, compliance, and release blockers before advancing execution state.'
    ],
    nextActions: ['Create or open the lead', 'Lock quote terms before pricing', 'Check order blockers before release'],
  },
  {
    id: 'quote-approval',
    title: 'Quote approval and sending',
    routes: ['/quotes', '/approval-send', '/leads'],
    tags: ['quote', 'approval', 'discount', 'markup', 'pdf', 'send', 'whatsapp'],
    summary: 'Quote-only adjustments beyond the threshold require approval before sending or acceptance.',
    answer: [
      'Discounts and markups entered in a quote do not rewrite product, category, or organization pricing defaults.',
      'Adjustments beyond the configured threshold route the quote into pending approval for owner, admin, or manager review.',
      'Use the quote PDF preview/export before sending. If rejected, revise the draft with the rejection reason before requesting approval again.'
    ],
    nextActions: ['Save quote adjustments', 'Open approval queue', 'Preview the quote PDF'],
  },
  {
    id: 'trade-events-mobile',
    title: 'Trade events and mobile capture',
    routes: ['/trade-events', '/mobile', '/profile'],
    tags: ['trade show', 'mobile', 'business card', 'scan', 'vcard', 'qr', 'event'],
    summary: 'Set up events before the show, capture leads on mobile, and share Smart vCards from the field.',
    answer: [
      'Create the trade event, assign team members, and confirm mobile scan readiness before going to the booth.',
      'Use mobile capture for business-card scan or quick manual entry. Review extracted details before creating the lead.',
      'Each field user should complete Profile > My Card so their Smart QR and vCard share actions are ready during conversations.'
    ],
    nextActions: ['Create trade event', 'Check scan readiness', 'Set up My Card'],
  },
  {
    id: 'documents-compliance',
    title: 'Documents, compliance, and blockers',
    routes: ['/documents', '/compliance', '/orders', '/leads'],
    tags: ['documents', 'compliance', 'blocker', 'contract', 'order state'],
    summary: 'Document and compliance blockers prevent unsafe stage or order progression until evidence is complete.',
    answer: [
      'A document blocker means a required file is missing or not tagged correctly. Upload the document and attach the correct document type.',
      'A compliance blocker means the required checklist or review action is not resolved. Operations, managers, admins, or owners usually clear these checks.',
      'Orders should not move from Draft to Ready or onward until accepted quote, contract, document, compliance, and commercial-lock blockers are clean.'
    ],
    nextActions: ['Open the blockers panel', 'Upload missing document evidence', 'Resolve compliance checklist items'],
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
      'Invitation acceptance creates access only when the invitation and role assignment complete successfully; admins can resend or manually correct role assignment.'
    ],
    nextActions: ['Open Admin > Users', 'Verify membership is active', 'Resend expired invitations'],
  },
  {
    id: 'live-industry-research',
    title: 'Live industry research',
    routes: ['/products', '/quotes', '/orders', '/documents', '/compliance'],
    tags: ['live search', 'industry standard', 'margin', 'markup', 'hsn', 'hs code', 'commodity code', 'tariff', 'duty', 'vat', 'uk', 'ireland', 'compliance', 'documents', 'export', 'import'],
    summary: 'Use live source-backed research for margin benchmarks, HS/HSN codes, commodity codes, duties, tariffs, and shipment document requirements.',
    answer: [
      'Ask Setu Guru for live research when the answer depends on country, product, date, tariff rules, or industry benchmarks, such as Ireland margin ranges, UK import documents, or missing HS/HSN codes.',
      'For HS/HSN enrichment, Setu Guru should prepare candidate codes with confidence and sources first. Product master data should only be updated after an authorized user reviews and approves the rows.',
      'For compliance and pricing benchmarks, Setu Guru should cite official or high-quality sources, explain assumptions, and treat recommendations as draft guidance until managers, brokers, or compliance owners confirm.'
    ],
    nextActions: ['Ask for live research', 'Review sources and confidence', 'Approve before write-back'],
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
      'Setu Guru should improve from feedback by logging unclear answers, missing docs, repeated questions, and unresolved topics for admin review.'
    ],
    nextActions: ['Review AI draft context', 'Edit before using', 'Log missing help content'],
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
  const [query, setQuery] = useState('');
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const routeTopics = useMemo(() => getRouteTopics(pathname), [pathname]);
  const activeTopic = useMemo(() => {
    if (activeTopicId) return TOPICS.find((topic) => topic.id === activeTopicId) ?? routeTopics[0];
    return getBestTopic(query, pathname);
  }, [activeTopicId, pathname, query, routeTopics]);

  const searchResults = useMemo(() => {
    const ranked = [...TOPICS]
      .map((topic) => ({ topic, score: scoreTopic(topic, query, pathname) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => entry.topic);
    return ranked.length ? ranked : routeTopics;
  }, [pathname, query, routeTopics]);

  function setWidgetHidden(nextHidden: boolean) {
    setHidden(nextHidden);
    localStorage.setItem(STORAGE_KEY, String(nextHidden));
    if (nextHidden) setDrawerOpen(false);
  }

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveTopicId(null);
  }

  function saveFeedback(label: 'helpful' | 'missing') {
    const feedback = {
      label,
      topicId: activeTopic.id,
      query,
      pathname,
      routeTitle,
      createdAt: new Date().toISOString(),
    };
    const existingRaw = localStorage.getItem('setu-guru-feedback-log');
    const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
    localStorage.setItem('setu-guru-feedback-log', JSON.stringify([feedback, ...existing].slice(0, 50)));
    setFeedbackSaved(true);
    window.setTimeout(() => setFeedbackSaved(false), 2400);
  }

  async function copyBuildPrompt() {
    const prompt = [
      'Build Setu Guru, the embedded Setu Flow CRM help chatbot with live industry research.',
      'Use docs/setu-guru as the primary knowledge base and follow docs/setu-guru/SETU_GURU_GPT_CREATION_EXACT_INSTRUCTIONS.md exactly.',
      'Connect live research through /api/setu-guru/research for margins, HS/HSN/commodity codes, tariffs, duties, and compliance documents.',
      'Keep the bot route-aware, role-aware, organization-safe, source-backed, and human-in-control for pricing, approvals, sends, compliance, and product master-data write-back.',
    ].join(' ');
    await navigator.clipboard?.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  }

  const launcher = hidden ? (
    <button
      type="button"
      onClick={() => setWidgetHidden(false)}
      className="fixed right-0 top-1/2 z-[310] flex -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-amber-200 bg-white px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#0b2e4a] shadow-[0_16px_44px_rgba(15,23,42,0.18)] hover:bg-amber-50"
      aria-label="Show Setu Guru"
    >
      <span className="writing-mode-vertical">Guru</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="fixed bottom-[calc(140px+env(safe-area-inset-bottom))] right-4 z-[310] flex h-[70px] w-[70px] items-center justify-center rounded-[1.35rem] border border-amber-200 bg-[linear-gradient(135deg,#071a2c_0%,#0b2e4a_52%,#0c7fff_145%)] p-1.5 shadow-[0_18px_44px_rgba(12,47,79,0.34)] ring-2 ring-white/80 transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(12,47,79,0.42)] md:bottom-6 md:right-6"
      aria-label="Open Setu Guru help"
    >
      <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full rounded-[1rem] object-cover" />
      <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-white bg-amber-300 text-[10px] font-black text-[#0b2e4a]">?</span>
    </button>
  );

  return (
    <>
      {launcher}
      <RightDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Setu Guru"
        description={`Your route-aware CRM guide for ${routeTitle}.`}
        widthClassName="sm:max-w-[500px]"
      >
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,#071a2c_0%,#0b2e4a_58%,#0c7fff_150%)] p-4 text-white shadow-[0_16px_44px_rgba(15,23,42,0.16)]">
            <div className="flex items-center gap-4">
              <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru avatar" className="h-20 w-20 rounded-2xl border border-white/15 object-cover shadow-lg" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">Setu Guru</p>
                <h3 className="mt-1 text-xl font-semibold">Ask me CRM, pricing, HS code, and compliance questions safely.</h3>
                <p className="mt-2 text-xs leading-5 text-white/70">Workspace: {organizationName ?? 'Setu Flow'} · Role: {roleLabel}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleAsk} className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm">
            <label htmlFor="setu-guru-query" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ask Setu Guru</label>
            <div className="mt-2 flex gap-2">
              <input
                id="setu-guru-query"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveTopicId(null);
                }}
                placeholder="Example: Find missing HSN codes or UK shipment documents"
                className="min-h-11 flex-1 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-[#0c7fff] focus:ring-2 focus:ring-[#0c7fff]/20"
              />
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#0b2e4a] px-4 text-sm font-bold text-white hover:bg-[#061c2e]">
                <FaIcon icon="send" />
                <span>Ask</span>
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Context shortcuts</p>
            <div className="flex flex-wrap gap-2">
              {routeTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setActiveTopicId(topic.id);
                    setQuery('');
                  }}
                  className={cn(
                    'rounded-full border px-3 py-2 text-xs font-bold transition',
                    activeTopic.id === topic.id ? 'border-[#0b2e4a] bg-[#0b2e4a] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0c7fff] hover:text-[#0b2e4a]'
                  )}
                >
                  {topic.title}
                </button>
              ))}
            </div>
          </div>

          <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0c7fff]">Best answer</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">{activeTopic.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{activeTopic.summary}</p>
            <div className="mt-4 space-y-3">
              {activeTopic.answer.map((paragraph) => (
                <p key={paragraph} className="rounded-2xl border border-white bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">{paragraph}</p>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Suggested next actions</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-950">
                {activeTopic.nextActions.map((action) => <li key={action}>• {action}</li>)}
              </ul>
            </div>
          </section>

          <div className="grid gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Related knowledge</p>
            {searchResults.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopicId(topic.id)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-[#0c7fff] hover:bg-slate-50"
              >
                <span className="block text-sm font-bold text-slate-950">{topic.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{topic.summary}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-2 rounded-[1.35rem] border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Make Setu Guru smarter</p>
            <p className="text-sm leading-6 text-slate-600">Feedback is saved locally for now. Connect this log and /api/setu-guru/research to the future chatbot backend so repeated misses become knowledge-base updates.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => saveFeedback('helpful')} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Helpful</button>
              <button type="button" onClick={() => saveFeedback('missing')} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Missing detail</button>
              <button type="button" onClick={copyBuildPrompt} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">Copy GPT build note</button>
              <button type="button" onClick={() => setWidgetHidden(true)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500">Hide bot</button>
            </div>
            {feedbackSaved ? <p className="text-xs font-semibold text-emerald-700">Feedback saved for review.</p> : null}
            {copied ? <p className="text-xs font-semibold text-[#0c7fff]">Build note copied.</p> : null}
          </div>
        </div>
      </RightDrawer>
    </>
  );
}
