import { WorkspaceShell } from '@/components/previews/workspace-shell';
import { PreviewPanel, StatCard } from '@/components/previews/ui';

export default function WorkspaceOrdersPage() {
  return (
    <WorkspaceShell
      eyebrow="Product view · orders"
      title="Orders complete the story after a quote is accepted"
      description="Orders should be the operational home for accepted quotes: final commercial snapshot, contracts, documents, compliance readiness, and shipment progress. This is how Setu Flow stops feeling like a pre-sales tool and starts feeling like a real execution system."
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <StatCard label="Live orders" value="09" hint="Accepted quotes now being executed." />
            <StatCard label="Document readiness" value="78%" hint="Average completion across active orders." />
            <StatCard label="Blocked orders" value="02" hint="Waiting on certificates and shipping docs." />
          </div>
          <PreviewPanel title="Order control" subtitle="Everything needed to execute after acceptance should live here." badge="Post-sale execution">
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              <li>• Final pricing snapshot from the accepted quote</li>
              <li>• Contract and commercial terms status</li>
              <li>• Document checklist with blockers</li>
              <li>• Compliance checks and approvals</li>
              <li>• Activity history and shipment milestones</li>
            </ul>
          </PreviewPanel>
        </div>

        <PreviewPanel title="Order detail layout" subtitle="Collapse contracts, documents, and compliance into one order-centric workspace." badge="Operational view">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#359F91]">Commercial snapshot</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">Order #OF-24018 · Al Noor Foods</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Accepted from quote revision 3. CIF Jebel Ali. 52,000 USD. Target dispatch in 12 days.</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#359F91]">Readiness tabs</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">Documents · Compliance · Shipment · Timeline</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">This is the clean replacement for exposing documents, contracts, and compliance as disconnected product areas.</p>
            </div>
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 lg:col-span-2">
              Current blocker example: Certificate of origin still missing for Germany order batch 2. Keep blockers loud and operational.
            </div>
          </div>
        </PreviewPanel>
      </div>
    </WorkspaceShell>
  );
}
