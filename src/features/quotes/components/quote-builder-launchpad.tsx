import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';

const steps = [
  {
    title: 'Product',
    body: 'Start from the qualified lead and lock the quote to the right buyer, RFQ context, template, and pricing basis before deeper edits.',
  },
  {
    title: 'Pricing',
    body: 'Build the draft line by line with linked products, catalog reference, MOQ cues, and visible quote pricing deltas.',
  },
  {
    title: 'Terms',
    body: 'Set currency, approval posture, workflow notes, and internal commercial conditions without breaking the lead-owned flow.',
  },
  {
    title: 'Review',
    body: 'Confirm totals, draft structure, and workflow posture before the final send decision is made.',
  },
  {
    title: 'Send',
    body: 'Use the send checkpoint to keep blockers explicit and stop premature quote sends when approval or compliance is still open.',
  },
] as const;

const checkpoints = [
  {
    title: 'Draft structure visible',
    note: 'The quote builder now starts from a guided step model instead of treating Quotes like a post-review conversion page.',
    tone: 'info' as const,
  },
  {
    title: 'Send gate stays explicit',
    note: 'Approval and send-readiness checks stay visible before a quote moves forward.',
    tone: 'warning' as const,
  },
  {
    title: 'Lead-owned quoting preserved',
    note: 'Qualified lead context remains the safest launch point for real quote work, so Capture → Lead → Quote → Order stays intact.',
    tone: 'success' as const,
  },
];

export function QuoteBuilderLaunchpad({
  eyebrow = 'Quote builder core',
  title = 'Quote Builder',
  description = 'Start quote work from a qualified lead, then move through the guided builder structure instead of skipping straight to order conversion.',
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge="Builder core"
        status="Ready"
        meta={['Guided draft flow', 'Send checkpoint visible', 'Lead-owned launch preserved']}
        actions={[
          { label: 'Open Leads', href: PRODUCT_ROUTES.app.leads },
          { label: 'Open development plan', href: PRODUCT_ROUTES.development.home, type: 'secondary' },
        ]}
      />

      <SectionCard
        eyebrow="Why this route stays here"
        title="The approved guided draft flow stays here, not as an order-conversion shortcut"
        description="Sprint 4 quote-builder core is complete. Keep the live draft following the approved builder sequence without reopening lead simplification or bypassing the lead-owned flow."
      >
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Step {index + 1}</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">Launch rule</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Real quote creation should still begin from a qualified lead where buyer context, product mapping, RFQ linkage, and send blockers already exist.
            </p>
            <Link
              href={PRODUCT_ROUTES.app.leads}
              className={`mt-5 inline-flex rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${workspacePrimaryButtonClass}`}
            >
              Start from Leads
            </Link>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              This keeps the approved Capture → Lead → Quote → Order flow intact while preserving the completed quote-builder baseline.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Builder checkpoints"
        title="What this route now makes explicit"
        description="This launchpad preserves the approved quote-builder baseline and stops the Quotes route from acting like an Order-conversion shortcut."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {checkpoints.map((item) => (
            <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <StatusBadge label={item.title} tone={item.tone} />
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
