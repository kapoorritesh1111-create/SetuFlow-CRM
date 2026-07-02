import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileSpreadsheet, Sparkles } from 'lucide-react';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildSetuGuruSupplierRecommendations, buildSupplierSourcingReportRows } from '@/lib/supplier-insights';
import { createClient as createServerClientR } from '@/lib/supabase/server';
import { getEnabledModuleSet as getEnabledR, normalizeModuleKey as normKeyR } from '@/lib/modules/module-grants';

export default async function SupplierReportsPage() {
  const _wsR = await getWorkspaceAccess();
  if (_wsR.organization) {
    const _dbR = await createServerClientR();
    const { data: _gR } = await (_dbR as any).from('org_module_grants')
      .select('module_key, enabled').eq('organization_id', _wsR.organization.id);
    if (Array.isArray(_gR) && _gR.length > 0) {
      const _emR = getEnabledR(_gR.map((r: any) => ({ module_key: normKeyR(r.module_key) ?? r.module_key, enabled: r.enabled })));
      if (!_emR.has('supplier_procurement')) {
        return (
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[#279491]">Supplier Procurement Module</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">Supplier reports locked</h2>
            <p className="mt-3 text-sm text-slate-500">Supplier sourcing reports require the Supplier Procurement add-on.</p>
            <a href="mailto:admin@setugroups.com?subject=Supplier Procurement Module" className="mt-6 inline-block rounded-xl bg-[#1F487C] px-5 py-3 text-sm font-semibold text-white">Request module access</a>
          </div>
        );
      }
    }
  }
  if (!hasSupabaseEnv) redirect('/reports');
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Supplier sourcing reports" title="Workspace membership needed" description="Supplier reports require an active organization membership." primaryActionHref="/reports" primaryActionLabel="Back to reports" />;
  }

  const supabase = await createClient();
  const db = supabase as any;
  const [leadResult, stageResult, documentResult, rfqResult] = await Promise.all([
    db.from('leads').select('id, company_name, lead_type, country, deal_value, stage_id, notes, updated_at').eq('organization_id', workspace.organization.id).eq('lead_type', 'supplier').limit(1000),
    db.from('pipeline_stages').select('id, name').limit(1000),
    db.from('documents').select('id, related_id, status, doc_type').eq('organization_id', workspace.organization.id).eq('related_entity', 'lead').limit(1000),
    db.from('rfqs').select('id, lead_id, status, updated_at').eq('organization_id', workspace.organization.id).limit(1000),
  ]);
  const stageById = new Map((stageResult.data ?? []).map((stage: any) => [stage.id, stage.name]));
  const leads = (leadResult.data ?? []).map((lead: any) => ({ ...lead, stage_name: stageById.get(lead.stage_id) ?? null }));
  const documents = documentResult.data ?? [];
  const rfqs = rfqResult.data ?? [];
  const rows = buildSupplierSourcingReportRows({ leads, documents, rfqs });
  const recommendations = buildSetuGuruSupplierRecommendations({ leads, documents, rfqs });

  return (
    <main data-s41-supplier-sourcing-reports="true" className="space-y-6 text-slate-900">
      <section className="rounded-[2rem] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Supplier sourcing reports</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Supplier Reports</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Clean owner-facing sourcing reports focused on supplier readiness, cost request movement, approval status, demand linkage, and next review actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/reports" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-teal-200">All reports</Link>
            <Link href="/dashboard/supplier-insights" className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">Supplier insights</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><p className="text-sm font-medium text-slate-600">Report rows</p><p className="mt-1 text-3xl font-semibold text-slate-950">{rows.length}</p><p className="mt-1 text-xs font-semibold text-teal-700">supplier sourcing records</p></article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><p className="text-sm font-medium text-slate-600">Export format</p><p className="mt-1 text-3xl font-semibold text-slate-950">Table</p><p className="mt-1 text-xs font-semibold text-teal-700">Excel/PDF-ready columns</p></article>
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft"><p className="text-sm font-medium text-slate-600">Guru actions</p><p className="mt-1 text-3xl font-semibold text-slate-950">{recommendations.length}</p><p className="mt-1 text-xs font-semibold text-teal-700">supplier recommendations</p></article>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><FileSpreadsheet className="h-5 w-5 text-teal-700" />Sourcing report table</h2><Link href="/dashboard/supplier-insights" className="text-sm font-semibold text-teal-700">Supplier insights</Link></div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full divide-y divide-slate-100 text-sm">
            <thead><tr>{['Supplier', 'Market', 'Stage', 'Document Readiness', 'Cost Requests', 'Demand Link Value', 'Next Review'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length ? rows.map((row, index) => <tr key={index}>{Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{String(value)}</td>)}</tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No supplier rows yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-teal-200 bg-teal-50/70 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><Sparkles className="h-5 w-5 text-teal-700" />Setu Guru report guidance</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recommendations.length ? recommendations.map((item) => <p key={item} className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-700">{item}</p>) : <p className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-700">No supplier report recommendations yet.</p>}
        </div>
      </section>
    </main>
  );
}
