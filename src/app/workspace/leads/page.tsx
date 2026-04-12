import { PRODUCT_ROUTES } from '@/lib/product-contract';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/previews/workspace-shell';
import { LeadCard } from '@/components/ui/lead-card';
import { PageHeader } from '@/components/ui/page-header';
import { QuickActionMenu } from '@/components/ui/quick-action-menu';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';

const filters = ['All', 'New', 'Qualified', 'At Risk', 'Waiting', 'This week'];

const leads = [
  {
    company: 'Al Noor Foods',
    contact: 'Sara Khan',
    market: 'UAE',
    stage: 'Qualified',
    nextAction: 'Open Draft Quote with mango + beetroot pricing assumptions',
    requirement: 'Fruit chips sampler · 1 container trial · Requested landed pricing',
    owner: 'Ritesh',
    urgency: 'Hot this week',
    health: 'Quote-ready',
    lastTouch: '14 min ago',
  },
  {
    company: 'Nairobi Retail Group',
    contact: 'Joseph Otieno',
    market: 'Kenya',
    stage: 'In Progress',
    nextAction: 'Confirm trial MOQ and document requirements',
    requirement: 'Fruit chips + moringa powder · Buyer document reviewed in Capture',
    owner: 'Ritesh',
    urgency: 'Needs review',
    health: 'Capture just cleared',
    lastTouch: '48 min ago',
  },
  {
    company: 'Bremen Ingredients',
    contact: 'Lena Fischer',
    market: 'Germany',
    stage: 'At Risk',
    nextAction: 'Revise terms and follow up',
    requirement: 'Beetroot powder · 2 pallet request · Reply overdue',
    owner: 'Ritesh',
    urgency: 'Reply overdue',
    health: 'Needs intervention',
    lastTouch: '6 days ago',
  },
];

const cardActions = [
  { label: 'Call', shortLabel: 'Call' },
  { label: 'WhatsApp', shortLabel: 'WA' },
  { label: 'Email', shortLabel: 'Email' },
  { label: 'Create Quote', shortLabel: 'Quote', emphasis: 'primary' as const, href: PRODUCT_ROUTES.app.quotes },
];

const selectedLead = leads[0];

const activityTimeline = [
  {
    label: 'Captured from inbound inquiry',
    detail: 'The buyer request entered through Capture with product, market, and landed-pricing intent already normalized.',
    meta: 'Today · 08:55',
  },
  {
    label: 'Qualified for commercial response',
    detail: 'Fit, volume intent, and buyer role were confirmed so Quote entry can now be the primary next action.',
    meta: 'Today · 09:18',
  },
  {
    label: 'Draft quote handoff opened',
    detail: 'The next move is to carry the selected products, trial volume, and packaging assumptions into Quote without asking the rep to re-enter context.',
    meta: 'Today · Now',
  },
];

const quotePreview = [
  'Buyer · Sara Khan · Procurement',
  'Market · UAE',
  'Requested SKUs · Mango chips, beetroot chips',
  'Commercial intent · 1 container trial with landed pricing request',
  'Packaging assumption · Retail-ready sampler cartons for first quote draft',
];

const quoteReadiness = [
  {
    title: 'Why Quote is open now',
    body: 'The lead is qualified, the requested products are known, and landed-pricing intent is already explicit. The approved rework should reward that with a dominant Quote entry action.',
    badge: { label: 'Qualified handoff', tone: 'success' as const },
  },
  {
    title: 'What moves with the handoff',
    body: 'Buyer name, market, requested SKUs, trial order context, and packaging assumptions should carry into Draft Quote so the rep starts from context, not from zero.',
    badge: { label: 'Context retained', tone: 'info' as const },
  },
  {
    title: 'When not to open Quote',
    body: 'If documentation, MOQ, or buyer intent is still unresolved, the next action should stay in Leads instead of forcing a premature quote flow.',
    badge: { label: 'Guardrail', tone: 'warning' as const },
  },
];

export default function WorkspaceLeadsPage() {
  return (
    <WorkspaceShell
      eyebrow="Product view · leads"
      title="A lead workspace that feels obvious, fast, and ready to train"
      description="The approved rework keeps Leads clean, obvious, and action-first so Capture and Quote handoff feel like one product instead of scattered modules."
    >
      <PageHeader
        eyebrow="Approved rework · Leads"
        title="Leads are now the first operating surface"
        description="The list, selected detail, and next action all use the same reusable component language so Leads and Capture stay visually and structurally aligned without drifting into a command-center shell."
        status="Ready"
        meta={['Capture → Lead → Quote → Order', 'Qualified leads open Quote', 'No command-center drift', 'Mobile sticky CTA ready']}
        actions={[
          { label: 'Open Capture', href: PRODUCT_ROUTES.workspace.capture, type: 'secondary' },
          { label: 'Create Quote', href: PRODUCT_ROUTES.app.quotes, type: 'primary' },
        ]}
      />

      <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-[#1F487C]/10 bg-white/90 p-4 shadow-[0_16px_40px_rgba(31,72,124,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-h-11 flex-1 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">
          Search leads, buyers, countries, or product needs
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:justify-end">
          {filters.map((filter, index) => (
            <button
              key={filter}
              type="button"
              className={index === 2
                ? 'whitespace-nowrap rounded-full border border-[#1F487C]/10 bg-[#1F487C]/5 px-4 py-2 text-xs font-semibold text-[#1F487C]'
                : 'whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600'}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <SectionCard
          eyebrow="Lead list"
          title="One clean queue"
          description="The card system keeps owner, requirement, status, and the next move visible without introducing a bloated multi-rail shell."
          actions={<StatusBadge label="12 active leads · 3 quote-ready" tone="info" />}
        >
          <div className="space-y-4">
            {leads.map((lead, index) => (
              <div key={lead.company} className="space-y-3">
                <LeadCard {...lead} actions={cardActions} selected={index === 0} />
                <div className="flex flex-wrap gap-2 px-1">
                  <StatusBadge label={lead.urgency} tone={index === 2 ? 'danger' : 'warning'} />
                  <StatusBadge label={lead.health} tone={index === 0 ? 'success' : 'info'} />
                  <StatusBadge label={`Last touch · ${lead.lastTouch}`} tone="neutral" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Selected lead"
            title={`${selectedLead.company} · quote-entry handoff`}
            description="This is the single decision surface for a selected lead: confirm why Quote is allowed, preserve context, and move the opportunity forward without rework."
            actions={<StatusBadge label={selectedLead.stage} tone="success" />}
          >
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Primary CTA rule</p>
                  <p className="mt-2 font-semibold">Use Create Quote only when the lead is qualified and the commercial ask is already clear enough to draft.</p>
                </div>
                <StatusBadge label="Quote entry unlocked" tone="success" />
              </div>
              <p className="mt-3 text-emerald-800">This lead meets that bar, so Quote should be the dominant forward action and not buried behind secondary workflow steps.</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quoteReadiness.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">{item.title}</p>
                    <StatusBadge label={item.badge.label} tone={item.badge.tone} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Inherited context preview</p>
                  <p className="mt-2 text-sm text-slate-600">The selected lead should preview inherited context, rep review items, and the approval gate before the rep opens Quote.</p>
                </div>
                <StatusBadge label="Inherited context visible" tone="info" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {quotePreview.map((item, index) => (
                  <div key={item} className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item}</p>
                      {index === 3 ? <StatusBadge label="Carries forward" tone="success" /> : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Primary CTA</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Open Draft Quote</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Open Draft Quote with buyer, market, requested products, packaging assumptions, and trial-order context prefilled from the qualified lead.</p>
                </div>
                <div className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rep review fallback</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Keep in Leads</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Use when MOQ, documentation, or buyer intent is still incomplete and the rep review should remain in Leads before Quote opens.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Activity timeline</p>
                  <p className="mt-2 text-sm text-slate-600">Capture handoff, qualification, and quote-entry readiness stay in one place.</p>
                </div>
                <StatusBadge label="Ready for Draft Quote" tone="success" />
              </div>
              <div className="mt-4 space-y-3">
                {activityTimeline.map((item) => (
                  <div key={item.label} className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{item.meta}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <QuickActionMenu
              className="mt-5"
              items={[
                { label: 'Open Draft Quote', shortLabel: 'Quote', href: PRODUCT_ROUTES.app.quotes, emphasis: 'primary' },
                { label: 'Open Capture', shortLabel: 'Capture', href: PRODUCT_ROUTES.workspace.capture },
                { label: 'Add Note', shortLabel: 'Note' },
              ]}
            />
          </SectionCard>

          <SectionCard
            eyebrow="Why this matters"
            title="What changed from the old direction"
            description="The approved rework replaces heavy theatre with a clear flow that sales teams can understand in minutes."
          >
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              <li>• Status is shared and reusable instead of screen-specific decoration.</li>
              <li>• Quick actions are tap-friendly and available without hover dependence.</li>
              <li>• Qualified leads now explain why Quote is available instead of exposing a generic CTA.</li>
              <li>• Capture remains the intake route, not a competing workspace pattern.</li>
            </ul>
            <div className="mt-5 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#1F487C]/5 p-4 text-sm leading-6 text-slate-700">
              This pass adds visible quote-entry handoff logic and CTA helper copy while keeping the layout inside the locked rework contract.
            </div>
            <div className="mt-4">
              <Link href={PRODUCT_ROUTES.development.readiness} className="text-sm font-semibold text-[#1F487C]">View approved rework readiness →</Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="sticky bottom-3 z-20 mt-6 xl:hidden">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Selected lead</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedLead.company}</p>
              <p className="mt-1 text-xs text-slate-500">Qualified lead · inherited context visible · approval gate remains</p>
            </div>
            <StatusBadge label={selectedLead.stage} tone="success" />
          </div>
          <QuickActionMenu
            items={[
              { label: 'Open Draft Quote', shortLabel: 'Quote', href: PRODUCT_ROUTES.app.quotes, emphasis: 'primary' },
              { label: 'Add Note', shortLabel: 'Note' },
              { label: 'Open Capture', shortLabel: 'Capture', href: PRODUCT_ROUTES.workspace.capture },
            ]}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
