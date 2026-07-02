import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, FileCheck2, Link2, ShieldAlert, Sparkles, Truck, Users } from 'lucide-react';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import {
  buildSetuGuruSupplierRecommendations,
  buildSupplierAnalyticsFunnel,
  buildSupplierSourcingReportRows,
  calculateSupplierPerformanceKpis,
} from '@/lib/supplier-insights';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getEnabledModuleSet, normalizeModuleKey } from '@/lib/modules/module-grants';

function fmt(value: number) {
  return value.toLocaleString('en-US');
}

function money(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function Metric({ label, value, helper, Icon }: { label: string; value: string; helper: string; Icon: typeof Users }) {
  return (
    <article className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="h-6 w-6" /></span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-teal-700">{helper}</p>
        </div>
      </div>
    </article>
  );
}

export default async function SupplierInsightsPage() {
  // Module gate: check whether this org has supplier_procurement enabled
  const _ws = await getWorkspaceAccess();
  if (_ws.organization) {
    const _db = await createServerClient();
    const { data: _grants } = await (_db as any).from('org_module_grants')
      .select('module_key, enabled')
      .eq('organization_id', _ws.organization.id);
    if (Array.isArray(_grants) && _grants.length > 0) {
      const _enabled = getEnabledModuleSet(_grants.map((r: any) => ({ module_key: normalizeModuleKey(r.module_key) ?? r.module_key, enabled: r.enabled })));
      if (!_enabled.has('supplier_procurement')) {
        return (
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[#279491]">Supplier Procurement Module</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">Supplier insights locked</h2>
            <p className="mt-3 text-sm text-slate-500">The Supplier Insights dashboard, sourcing funnel, and Guru recommendations require the Supplier Procurement add-on.</p>
            <a href="mailto:admin@setugroups.com?subject=Supplier Procurement Module" className="mt-6 inline-block rounded-xl bg-[#1F487C] px-5 py-3 text-sm font-semibold text-white">Request module access</a>
          </div>
        );
      }
    }
  }
  if (!hasSupabaseEnv) redirect('/dashboard?mode=suppliers');
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Supplier analytics" title="Workspace membership needed" description="Supplier insights require an active organization membership." primaryActionHref="/dashboard?mode=suppliers" primaryActionLabel="Back to dashboard" />;
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
  const kpis = calculateSupplierPerformanceKpis({ leads, documents, rfqs });
  const funnel = buildSupplierAnalyticsFunnel(leads);
  const reportRows = buildSupplierSourcingReportRows({ leads, documents, rfqs }).slice(0, 8);
  const guruRecommendations = buildSetuGuruSupplierRecommendations({ leads, documents, rfqs });

  return (
    <main data-s41-supplier-dashboard-insights="true" className="space-y-6 text-slate-900">
      <section className="rounded-[2rem] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Supplier sourcing command center</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">Supplier Insights</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Performance, readiness, sourcing funnel, cost request movement, reports, and Setu Guru recommendations for supplier mode.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard?mode=suppliers" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-teal-200">Supplier dashboard</Link>
            <Link href="/reports/suppliers" className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">Open sourcing reports</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Suppliers" value={fmt(kpis.totalSuppliers)} helper="active sourcing base" Icon={Users} />
        <Metric label="Approved" value={fmt(kpis.approvedSuppliers)} helper="ready for demand" Icon={FileCheck2} />
        <Metric label="Readiness" value={`${kpis.readinessPercent}%`} helper="document coverage" Icon={ShieldAlert} />
        <Metric label="Cost Requests" value={fmt(kpis.activeCostRequests)} helper="RFQ response motion" Icon={Truck} />
        <Metric label="At Risk" value={fmt(kpis.atRiskSuppliers)} helper="needs sourcing review" Icon={ShieldAlert} />
        <Metric label="Demand Value" value={money(kpis.demandLinkValue)} helper="supplier-linked value" Icon={Link2} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Supplier analytics funnel</h2>
            <BarChart3 className="h-5 w-5 text-teal-600" />
          </div>
          <div className="space-y-4">
            {funnel.map((stage) => (
              <div key={stage.label}>
                <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">{stage.label}</span><span className="font-semibold text-slate-950">{fmt(stage.count)} · {Math.round(stage.pct)}%</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.max(4, stage.pct)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50/70 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><Sparkles className="h-5 w-5 text-teal-700" />Setu Guru supplier recommendations</h2>
          <div className="mt-4 space-y-3">
            {guruRecommendations.length ? guruRecommendations.map((item) => <p key={item} className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-700">{item}</p>) : <p className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-700">Supplier sourcing looks clean. Keep linking approved suppliers to buyer demand.</p>}
          </div>
          <Link href="/setu-guru?mode=suppliers" className="mt-5 inline-flex rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white">Ask Setu Guru</Link>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Supplier sourcing report preview</h2>
          <Link href="/reports/suppliers" className="text-sm font-semibold text-teal-700">Open full report</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full divide-y divide-slate-100 text-sm">
            <thead><tr>{['Supplier', 'Market', 'Stage', 'Document Readiness', 'Cost Requests', 'Demand Link Value', 'Next Review'].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.length ? reportRows.map((row, index) => <tr key={index}>{Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{String(value)}</td>)}</tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No supplier report rows yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
