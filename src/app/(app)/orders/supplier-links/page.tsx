import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Link2, PackageCheck, ShieldAlert, Truck } from 'lucide-react';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildSupplierExecutionLinks, supplierExecutionSummary } from '@/lib/supplier-execution';

function fmt(value: number) { return value.toLocaleString('en-US'); }
function money(value: number) { if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`; if (value >= 1000) return `$${Math.round(value / 1000)}K`; return `$${Math.round(value)}`; }
function Metric({ label, value, helper, Icon }: { label: string; value: string; helper: string; Icon: typeof Link2 }) { return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="h-6 w-6" /></span><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-teal-700">{helper}</p></div></div></article>; }

export default async function SupplierOrderLinksPage() {
  if (!hasSupabaseEnv) redirect('/orders');
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return <WorkspaceState eyebrow="Supplier execution" title="Workspace membership needed" description="Supplier execution visibility requires an active organization membership." primaryActionHref="/orders" primaryActionLabel="Back to orders" />;

  const supabase = await createClient();
  const db = supabase as any;
  const [orderResult, leadResult, quoteResult, rfqResult, stageResult] = await Promise.all([
    db.from('orders').select('id, order_number, lead_id, source_quote_id, current_stage, status, order_lifecycle_status, fulfillment_status, dispatch_status, total_order_value, currency, metadata, updated_at').eq('organization_id', workspace.organization.id).limit(1000),
    db.from('leads').select('id, company_name, lead_type, country, stage_id').eq('organization_id', workspace.organization.id).limit(1000),
    db.from('quotes').select('id, lead_id, rfq_id, quote_number').eq('organization_id', workspace.organization.id).limit(1000),
    db.from('rfqs').select('id, lead_id, status').eq('organization_id', workspace.organization.id).limit(1000),
    db.from('pipeline_stages').select('id, name').limit(1000),
  ]);
  const stageById = new Map((stageResult.data ?? []).map((stage: any) => [stage.id, stage.name]));
  const leads = (leadResult.data ?? []).map((lead: any) => ({ ...lead, stage_name: stageById.get(lead.stage_id) ?? null }));
  const links = buildSupplierExecutionLinks({ orders: orderResult.data ?? [], leads, quotes: quoteResult.data ?? [], rfqs: rfqResult.data ?? [] });
  const summary = supplierExecutionSummary(links);
  return <main data-s41-supplier-execution-links="true" className="space-y-6 text-slate-900"><section className="rounded-[2rem] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 shadow-soft"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Supplier execution visibility</p><div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Order Supplier Links</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">See which orders have supplier linkage, where the link came from, and which execution steps still need sourcing visibility before shipment.</p></div><div className="flex flex-wrap gap-2"><Link href="/orders" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-teal-200">Orders</Link><Link href="/dashboard/supplier-insights" className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">Supplier insights</Link></div></div></section><section className="grid gap-4 md:grid-cols-4"><Metric label="Orders" value={fmt(summary.totalOrders)} helper="execution scope" Icon={PackageCheck} /><Metric label="Supplier linked" value={fmt(summary.linkedOrders)} helper="visible sourcing handoff" Icon={Link2} /><Metric label="Missing links" value={fmt(summary.missingSupplierLinks)} helper="needs supplier linkage" Icon={ShieldAlert} /><Metric label="Linked value" value={money(summary.activeSupplierLinkedValue)} helper="supplier-backed orders" Icon={Truck} /></section><section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-950">Supplier execution table</h2><span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">S41-SUP-023</span></div><div className="overflow-x-auto"><table className="min-w-[920px] w-full divide-y divide-slate-100 text-sm"><thead><tr>{['Order', 'Supplier', 'Market', 'Link Source', 'Execution Stage', 'Fulfillment', 'Dispatch', 'Value', 'Updated'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{links.length ? links.map((link) => <tr key={link.orderId}><td className="px-4 py-3 font-semibold text-slate-900">{link.orderNumber}</td><td className="px-4 py-3 text-slate-700">{link.supplierName}</td><td className="px-4 py-3 text-slate-700">{link.supplierMarket}</td><td className="px-4 py-3 text-slate-700">{link.linkSource.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-slate-700">{link.executionStage}</td><td className="px-4 py-3 text-slate-700">{link.fulfillmentStatus}</td><td className="px-4 py-3 text-slate-700">{link.dispatchStatus}</td><td className="px-4 py-3 text-slate-700">{link.currency} {Math.round(link.orderValue).toLocaleString()}</td><td className="px-4 py-3 text-slate-700">{link.updatedAt ?? '-'}</td></tr>) : <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No orders available for supplier execution visibility yet.</td></tr>}</tbody></table></div></section></main>;
}
