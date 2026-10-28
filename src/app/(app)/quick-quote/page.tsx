import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { isPackagingPricingV5EnabledForOrg, listSalesPackagingPricingV5Options } from '@/lib/packaging-pricing-v5/sales-options';
import { listSalesPackagingFramePricingV5Options } from '@/lib/packaging-pricing-v5/frame-sales-options';
import QuickQuoteWorkbench from '@/features/quotes/components/quick-quote-workbench';

export default async function QuickQuotePage() {
  const workspace = await requireWorkspace();
  const orgId = workspace.organization?.id;
  if (!orgId || !workspace.membership) return <p>Active sales workspace required.</p>;

  // This route is a salesperson-only INTERNAL price preview. It cannot issue a
  // quote number, create a public quote link or send an unapproved estimate.
  const enabled = await isPackagingPricingV5EnabledForOrg(orgId);
  const [sup, frame] = enabled ? await Promise.all([
    listSalesPackagingPricingV5Options(orgId),
    listSalesPackagingFramePricingV5Options(orgId),
  ]) : [null, null];

  const db = createServiceRoleClient();
  const { data: manualFamilies } = db ? await db.from('packaging_service_families')
    .select('id,name,slug,is_active,is_quoteable,pricing_engine_type')
    .eq('organization_id',orgId).eq('is_active',true)
    .order('name') : {data:[]};

  const covered = new Set([
    ...(sup?.families ?? []).map((f:any) => String(f.id)),
    ...(frame?.families ?? []).map((f:any) => String(f.id)),
  ]);
  const allowedManual=new Set(['flat-bottom-pouches','spout-pouches','shrink-sleeves','courier-bags']);
  const manual = (manualFamilies ?? []).filter((f:any) => !covered.has(String(f.id)) && (f.slug==='labels'?f.is_quoteable&&orgId==='b97913cb-3b95-4247-8ced-ffdc0d392d2a':allowedManual.has(String(f.slug))));
  return (
    <main className="mx-auto max-w-6xl px-3 pb-28 pt-4 sm:px-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm font-semibold text-blue-700 underline" href="/leads">← Sales workspace</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Quick Quote</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Compare real published prices during a call, before entering customer details.
            All prices here are internal estimates, not customer quotations.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">Internal pricing only</span>
      </header>
      <QuickQuoteWorkbench sup={sup} frame={frame} manualFamilies={manual} />
    </main>
  );
}
