import { WorkspaceShell } from '@/components/previews/workspace-shell';
import { PageHeader } from '@/components/ui/page-header';
import { QuickActionMenu } from '@/components/ui/quick-action-menu';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';

const sources = [
  { title: 'Upload vCard', note: 'Inbound contact file parsed into structured lead fields.', state: 'Ready now' },
  { title: 'Scan business card', note: 'Camera-first intake for trade events and in-person meetings.', state: 'Mobile-first' },
  { title: 'Upload buyer document', note: 'RFQ, specification, or brief becomes a structured intake review.', state: 'Recommended' },
  { title: 'Paste message', note: 'Email, WhatsApp, or inquiry text enters the same review flow.', state: 'Fastest path' },
];

const extracted = [
  'Company: Nairobi Retail Group',
  'Contact: Joseph Otieno · Procurement',
  'Country: Kenya',
  'Products requested: Fruit chips, moringa powder',
  'Estimated volume: 1 container trial order',
  'Confidence: 87% field match',
];

const reviewChecks = [
  { label: 'Source preview loaded', detail: 'The original input is visible beside the extracted record so teams can validate trust before committing.' },
  { label: 'Duplicate check surfaced', detail: 'Potential account overlap is shown inline before any lead is created.' },
  { label: 'Commercial handoff intact', detail: 'Create Lead and Lead + Draft Quote stay available as the only forward paths.' },
];

const quoteCarryForward = [
  'Buyer and company identity from the reviewed source',
  'Country and requested products from extracted fields',
  'Trial-order intent and pricing signal from the inbound ask',
  'Duplicate resolution note so Quote starts on the right account path',
];

const handoffStates = [
  {
    title: 'Create Lead only',
    body: 'Use this when the inbound record is valid but pricing intent, requested products, or commercial fit still needs review in Leads.',
    badge: { label: 'Lead first', tone: 'warning' as const },
  },
  {
    title: 'Lead + Draft Quote',
    body: 'Use this when the record is reviewed, duplicate risk is handled, and the inbound ask is specific enough to start a draft quote immediately.',
    badge: { label: 'Quote path open', tone: 'success' as const },
  },
  {
    title: 'Merge Existing',
    body: 'Use this when the duplicate warning is real and the new intake should enrich an existing account instead of creating parallel work.',
    badge: { label: 'Duplicate guardrail', tone: 'info' as const },
  },
];

export default function WorkspaceCapturePage() {
  return (
    <WorkspaceShell
      eyebrow="Product view · capture"
      title="Capture turns messy inbound inputs into structured commercial work"
      description="Capture now represents the intake wedge inside the approved rework, turning messy inbound inputs into structured lead and quote work."
    >
      <PageHeader
        eyebrow="Approved rework · Capture"
        title="Unified intake with one review pattern"
        description="vCard import, card scan, document parsing, and pasted inquiries all feed the same review step before the system commits work into Leads and Quotes."
        status="Ready"
        meta={['Inbound only', 'Duplicate-aware', 'Lead + quote handoff ready', 'Tablet stack verified in layout']}
        actions={[
          { label: 'Open Leads', href: '/workspace/leads', type: 'secondary' },
          { label: 'Lead + Draft Quote', href: '/quotes', type: 'primary' },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Input modes"
          title="One intake entry set"
          description="All source types feed the same structured review step so teams do not learn four different patterns for one job."
          actions={<StatusBadge label="Inbound only" tone="info" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {sources.map((source, index) => (
              <button
                key={source.title}
                type="button"
                className={index === 2
                  ? 'rounded-[1.5rem] border border-[#1F487C]/15 bg-[#1F487C]/5 p-4 text-left shadow-[0_12px_30px_rgba(31,72,124,0.08)]'
                  : 'rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left'}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{source.title}</p>
                  <StatusBadge label={source.state} tone={index === 2 ? 'success' : 'neutral'} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{source.note}</p>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#1F487C]/5 p-4 text-sm leading-6 text-slate-700">
            My Card remains the rep-facing sharing tool. Capture stays dedicated to inbound intake only.
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Intake review"
            title="Review before commit"
            description="This is where Capture earns trust: source preview, extracted fields, duplicate warnings, and clear next actions before anything becomes live commercial work."
            actions={<StatusBadge label="Confidence 87%" tone="success" />}
          >
            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-[1.75rem] border border-dashed border-[#1F487C]/20 bg-[linear-gradient(180deg,#f8fcfe_0%,#eef7fb_100%)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1F487C]">Original source preview</p>
                  <StatusBadge label="Document selected" tone="info" />
                </div>
                <div className="mt-4 flex h-[260px] items-center justify-center rounded-[1.5rem] border border-white/80 bg-white/80 px-6 text-center text-sm text-slate-500 sm:h-[280px]">
                  vCard, business card image, inquiry text, or RFQ preview lives here.
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  {extracted.map((item, index) => (
                    <div key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>{item}</span>
                        {index === 5 ? <StatusBadge label="High confidence" tone="success" /> : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Possible duplicate found: existing account “Nairobi Retail Ltd” in Kenya with one prior inquiry.
                </div>
                <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Primary CTA rule</p>
                      <p className="mt-2 font-semibold">Use Lead + Draft Quote only when the reviewed record is clean enough to become a lead and specific enough to begin commercial drafting immediately.</p>
                    </div>
                    <StatusBadge label="Reviewed for quote path" tone="success" />
                  </div>
                  <p className="mt-3 text-emerald-800">This record meets that bar after review, so Lead + Draft Quote should sit beside Create Lead as an explicit forward choice.</p>
                </div>
                <QuickActionMenu
                  className="mt-5"
                  items={[
                    { label: 'Create Lead', shortLabel: 'Lead', href: '/workspace/leads' },
                    { label: 'Merge Existing', shortLabel: 'Merge' },
                    { label: 'Lead + Draft Quote', shortLabel: 'Quote', href: '/quotes', emphasis: 'primary' },
                  ]}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Handoff logic"
            title="CTA clarity for reviewed capture records"
            description="These states keep Capture understandable on desktop, tablet, and mobile without redesigning the flow."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {handoffStates.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <StatusBadge label={item.badge.label} tone={item.badge.tone} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Inherited context preview</p>
                  <p className="mt-2 text-sm text-slate-600">Before Capture opens Quote, the rep should see inherited context, remaining rep review items, and the approval gate that still applies after entry.</p>
                </div>
                <StatusBadge label="Inherited context visible" tone="success" />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {quoteCarryForward.map((item, index) => (
                  <div key={item} className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item}</p>
                      {index === 2 ? <StatusBadge label="Draft Quote input" tone="info" /> : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Primary CTA</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Lead + Draft Quote</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Create the lead and open Draft Quote with reviewed buyer, product, market, and pricing-intent context already attached.</p>
                </div>
                <div className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rep review fallback</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Create Lead</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Use when the record is valid but the rep review should stay in Capture or Leads before Quote opens responsibly.</p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {reviewChecks.map((item) => (
                <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:col-span-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <StatusBadge label="Locked to spec" tone="info" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-[#1F487C]/10 bg-[#1F487C]/5 p-4 text-sm leading-6 text-slate-700">
              Tablet and narrow-screen behavior stays vertical only. Preview and review never compete side by side on mobile, and the quote handoff stays visible in the sticky action area.
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="sticky bottom-3 z-20 mt-6 xl:hidden">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Capture decision bar</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Reviewed record already shows inherited context and the next review gate</p>
              <p className="mt-1 text-xs text-slate-500">Buyer, products, pricing signal, and review cues stay visible before opening the draft</p>
            </div>
            <StatusBadge label="Quote-ready review" tone="success" />
          </div>
          <QuickActionMenu
            items={[
              { label: 'Create Lead', shortLabel: 'Lead', href: '/workspace/leads' },
              { label: 'Merge Existing', shortLabel: 'Merge' },
              { label: 'Lead + Draft Quote', shortLabel: 'Quote', href: '/quotes', emphasis: 'primary' },
            ]}
          />
        </div>
      </div>
    </WorkspaceShell>
  );
}
