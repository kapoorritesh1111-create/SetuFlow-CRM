import { PageHeader } from '@/components/ui/page-header';
import { QuickActionMenu } from '@/components/ui/quick-action-menu';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';

const quoteEntrySteps = [
  {
    title: 'Carry context in',
    body: 'Start the draft with inherited buyer, market, requested products, packaging assumptions, and qualification notes already visible.',
    badge: { label: 'Inherited context', tone: 'success' as const },
  },
  {
    title: 'Confirm pricing scope',
    body: 'Keep container, MOQ, freight expectation, payment terms, and margin guardrails explicit before the rep edits numbers.',
    badge: { label: 'Rep review', tone: 'info' as const },
  },
  {
    title: 'Review assumptions',
    body: 'Flag which assumptions were inherited versus which still need confirmation so Draft Quote feels grounded and reviewable.',
    badge: { label: 'Review cue', tone: 'warning' as const },
  },
  {
    title: 'Pause before send',
    body: 'Keep approvals, unresolved assumptions, and versioning visible before the quote moves beyond draft state.',
    badge: { label: 'Approval gate', tone: 'warning' as const },
  },
];

const leadCarryForward = [
  'Source · Qualified lead from Leads workspace',
  'Buyer · Sara Khan · Procurement',
  'Market · UAE',
  'Requested SKUs · Mango chips, beetroot chips',
  'Commercial intent · 1 container trial with landed pricing request',
  'Packaging assumption · Retail-ready sampler cartons',
];

const captureCarryForward = [
  'Source · Reviewed capture record',
  'Buyer · Nairobi Retail Group',
  'Market · Kenya',
  'Requested SKUs · Fruit chips + moringa powder',
  'Commercial intent · Pricing exploration after document review',
  'Data confidence · Reviewed and quote-eligible after duplicate check',
];

const quotePreviewCards = [
  {
    title: 'What Draft Quote inherits',
    body: 'Show buyer, market, requested products, commercial intent, and inherited assumptions immediately so the rep trusts what came forward.',
    badge: { label: 'Inherited context', tone: 'success' as const },
  },
  {
    title: 'What the rep still confirms',
    body: 'Pricing basis, freight logic, payment terms, and any low-confidence assumptions should stay visible as review items rather than hidden in memory.',
    badge: { label: 'Rep review', tone: 'warning' as const },
  },
  {
    title: 'Why this stays in Sprint 1',
    body: 'This is helper-copy and review-cue polish on the existing Quote entry surface, not a new quote system or structural redesign.',
    badge: { label: 'Sprint 1 only', tone: 'info' as const },
  },
];

const commercialSummary = [
  'Draft total · 52,000 USD',
  'Route · CIF Jebel Ali',
  'Margin guide · 14% pending manager review',
  'Freight basis · Included in landed-pricing preview',
];

const leadHelperCues = [
  {
    title: 'Inherited context',
    body: 'Lead qualification already confirmed buyer intent and request scope, so the rep can start from a quote-ready commercial story instead of rebuilding the lead by hand.',
    badge: { label: 'From Leads', tone: 'success' as const },
  },
  {
    title: 'Rep review',
    body: 'Validate MOQ, landed-pricing expectation, and any packaging detail that could affect final pricing before sharing externally.',
    badge: { label: 'Confirm now', tone: 'warning' as const },
  },
  {
    title: 'Approval gate',
    body: 'Use the inherited lead context as the starting point, then block send until any margin-policy or assumption issues are resolved.',
    badge: { label: 'Guardrail active', tone: 'info' as const },
  },
];

const captureHelperCues = [
  {
    title: 'Inherited context',
    body: 'This capture record cleared review, duplicate checks, and quote-entry thresholds, so the rep can start Draft Quote without an extra manual lead-only stop.',
    badge: { label: 'From Capture', tone: 'success' as const },
  },
  {
    title: 'Rep review',
    body: 'Confirm any extracted assumptions, missing buyer detail, or uncertain shipping basis before turning the reviewed record into a customer-facing quote.',
    badge: { label: 'Confirm now', tone: 'warning' as const },
  },
  {
    title: 'Approval gate',
    body: 'Treat the reviewed capture payload as prepared facts, then block send until pricing decisions and unresolved assumptions are explicitly cleared.',
    badge: { label: 'Guardrail active', tone: 'info' as const },
  },
];

const reviewCueCards = [
  {
    title: 'Approval gate',
    body: 'If the draft margin drops below account policy, keep send blocked and surface approval status inline with the pricing summary.',
    badge: { label: 'Approval required', tone: 'warning' as const },
  },
  {
    title: 'Rep review',
    body: 'Call out any inherited packaging, freight, or payment-term assumptions that still need rep confirmation before the quote leaves draft state.',
    badge: { label: 'Confirm assumptions', tone: 'warning' as const },
  },
  {
    title: 'Inherited context',
    body: 'Keep the origin of the draft visible so reps can explain whether the quote came from a qualified lead or a reviewed capture record.',
    badge: { label: 'Origin visible', tone: 'success' as const },
  },
];

export default function WorkspaceQuotesPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <PageHeader
        eyebrow="Sprint 1 · Quote entry"
        title="Draft Quote now makes inherited context, rep review, and approval gates obvious"
        description="Quote entry stays inside the existing Capture → Lead → Quote → Order flow, but now shows what came forward, what the rep still reviews, and what approval gate still controls send. This keeps Draft Quote clear, trustworthy, and aligned to the locked Sprint 1 spec."
        status="Ready"
        meta={['Capture → Lead → Quote → Order', 'Inherited context stays visible', 'Rep review cues inline', 'Approval gate before send']}
        actions={[
          { label: 'Back to Leads', href: '/workspace/leads', type: 'secondary' },
          { label: 'Back to Capture', href: '/workspace/capture', type: 'secondary' },
          { label: 'Save Draft', href: '/workspace/quotes', type: 'primary' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Quote entry"
          title="Entry logic stays guided, not blank"
          description="The first view in Quote should reassure the rep that the draft already knows where it came from, which inherited context is safe to use, what the rep still reviews, and what approval gate remains before send."
          actions={<StatusBadge label="Quote context ready" tone="success" />}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quoteEntrySteps.map((step) => (
              <div key={step.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <StatusBadge label={step.badge.label} tone={step.badge.tone} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Primary Sprint 1 rule</p>
                <p className="mt-2 font-semibold">Draft Quote should open with inherited commercial context already visible, rep review cues inline, and an approval gate that stays obvious before send.</p>
              </div>
              <StatusBadge label="Carry-forward visible" tone="success" />
            </div>
            <p className="mt-3 text-emerald-800">This keeps Quote aligned with the polished Leads and Capture handoff states while avoiding any redesign of the quote structure itself.</p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Quote preview"
          title="What the rep sees before drafting"
          description="The preview panel exposes commercial inheritance from either qualified Leads or reviewed Capture, then makes rep review and approval checks explicit before pricing and terms are adjusted."
          actions={<StatusBadge label="Shared foundation" tone="info" />}
        >
          <div className="space-y-4">
            {quotePreviewCards.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <StatusBadge label={item.badge.label} tone={item.badge.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
            <QuickActionMenu
              items={[
                { label: 'Edit from Leads', shortLabel: 'Leads', href: '/workspace/leads' },
                { label: 'Review Capture Record', shortLabel: 'Capture', href: '/workspace/capture' },
                { label: 'Continue Draft Quote', shortLabel: 'Continue', href: '/workspace/quotes', emphasis: 'primary' },
              ]}
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard
          eyebrow="Lead-origin draft"
          title="Qualified Lead carry-forward"
          description="When Quote opens from Leads, the rep should understand exactly what was qualified, what is inherited, what still needs review, and which approval gate still protects send."
          actions={<StatusBadge label="From Leads" tone="success" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {leadCarryForward.map((item, index) => (
              <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item}</p>
                  {index === 3 ? <StatusBadge label="Pricing input" tone="info" /> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {leadHelperCues.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <StatusBadge label={item.badge.label} tone={item.badge.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Capture-origin draft"
          title="Reviewed Capture carry-forward"
          description="When Quote opens directly from Capture, the rep should still see why the record was allowed forward, what the rep still reviews, and which approval gate still protects send."
          actions={<StatusBadge label="From Capture" tone="info" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {captureCarryForward.map((item, index) => (
              <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item}</p>
                  {index === 5 ? <StatusBadge label="Reviewed" tone="success" /> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {captureHelperCues.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <StatusBadge label={item.badge.label} tone={item.badge.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <SectionCard
          eyebrow="Commercial snapshot"
          title="Summary before send"
          description="Sprint 1 keeps the trust layer intact: inherited context is visible first, rep review stays obvious, and approval gates still govern the actual quote release."
          actions={<StatusBadge label="Approval-aware" tone="warning" />}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {commercialSummary.map((item, index) => (
              <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item}</p>
                  {index === 2 ? <StatusBadge label="Needs approval" tone="warning" /> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {reviewCueCards.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <StatusBadge label={item.badge.label} tone={item.badge.tone} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Approval required: margin is below the manager threshold for this account segment, so send should remain blocked until review is complete and inherited assumptions are confirmed.
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Sprint 1 discipline"
          title="No drift from the locked Leads/Capture spec"
          description="This pass only tightens micro-copy and review cues inside Quote entry using the same visual language already established in Leads and Capture."
          actions={<StatusBadge label="Locked to spec" tone="info" />}
        >
          <div className="space-y-3 text-sm leading-6 text-slate-700">
            <p>• Quote entry now explains inherited context, rep review, and approval gate language with the same wording used across the handoff chain.</p>
            <p>• Leads-origin and Capture-origin drafts stay distinct without changing the flow.</p>
            <p>• Shared foundations remain the visible system: PageHeader, SectionCard, StatusBadge, and QuickActionMenu.</p>
            <p>• Sprint 1 still avoids new workflow branches, detached shells, or a structural quote-builder redesign.</p>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
