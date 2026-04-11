import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';

export default function QuotesPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Approved rework · Quotes"
        title="Quotes"
        description="Review commercial fit, confirm approval state, and convert the quote into the first operational order record only when the gate is clear."
        badge="Hero workflow"
        status="Review"
        meta={['Buyer context preserved', 'Approval gate visible', 'Order carry-forward ready']}
        actions={[
          { label: 'Convert to Order', href: '/workspace/orders', type: 'primary' },
        ]}
      />

      <SectionCard
        eyebrow="Quote details"
        title="Commercial context ready for conversion"
        description="This quote keeps the buyer, market, SKU, and pricing context visible so the next step into Order does not rebuild the deal from scratch."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-950">Buyer:</span> Acme Imports</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Market:</span> UAE</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Products:</span> Mango Chips, Banana Chips</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-950">Commercial intent:</span> Approved for order conversion</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Pricing basis:</span> Quote snapshot locked</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Carry-forward:</span> Buyer, SKU, pricing, and packaging assumptions</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Approval gate"
        title="Convert only when review is complete"
        description="Order creation depends on a clear commercial state. Execution readiness can still be pending after conversion, but the quote review gate must be visible before the move forward."
        actions={
          <Link
            href="/workspace/orders"
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${workspacePrimaryButtonClass}`}
          >
            Convert to Order
          </Link>
        }
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Pending approval" tone="warning" />
          <StatusBadge label="Documents previewed" tone="info" />
          <StatusBadge label="Order carry-forward ready" tone="success" />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Conversion creates the order record with inherited commercial context. Dispatch readiness and document completion continue inside Order.
        </p>
      </SectionCard>
    </div>
  );
}
