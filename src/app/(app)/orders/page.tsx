import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';

const documentPack = [
  { label: 'Commercial invoice', tone: 'warning' as const },
  { label: 'Packing list', tone: 'warning' as const },
  { label: 'Shipping instructions', tone: 'neutral' as const },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Approved rework · Orders"
        title="Orders"
        description="Create the first operational order record from an approved quote without losing buyer, SKU, pricing, or readiness context."
        badge="Post-acceptance execution"
        status="In progress"
        meta={['Buyer aligned', 'Pricing snapshot locked', 'Dispatch gates visible']}
      />

      <SectionCard
        eyebrow="Inherited context"
        title="What carried forward from Quote"
        description="Order creation starts with the commercial context already reviewed in Quote so operations can confirm execution details instead of rebuilding the deal."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-950">Buyer:</span> Acme Imports</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Market:</span> UAE</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Requested SKUs:</span> Mango Chips, Banana Chips</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-950">Pricing basis:</span> Approved quote snapshot</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Packaging:</span> Retail export packs</p>
            <p className="mt-2"><span className="font-semibold text-slate-950">Commercial state:</span> Valid for order conversion</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Document pack"
        title="Documents required before dispatch"
        description="Commercial conversion can happen before every document is complete, but dispatch readiness must show the remaining blockers clearly."
      >
        <div className="flex flex-wrap gap-2">
          {documentPack.map((item) => (
            <StatusBadge key={item.label} label={item.label} tone={item.tone} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Execution readiness"
        title="Order can exist before dispatch can happen"
        description="Separate commercial validity from execution readiness so the team can see exactly why an order is created versus why shipment is still blocked."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Commercially valid</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">Quote is approved and the carried pricing snapshot is ready to convert into an order record.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Documents pending</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">Invoice, packing list, and shipping instructions still need completion before final operational release.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Dispatch not ready</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">Keep order active while blockers stay visible so execution handoff remains honest and trainable.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
