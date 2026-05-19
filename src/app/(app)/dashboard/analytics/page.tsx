/**
 * /dashboard/analytics — Sprint 15
 * Analytics tab for the SetuFlow dashboard.
 * Integrates into the existing dashboard shell as a dedicated analytics view.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getAnalyticsData } from '@/lib/queries/analytics';
import type { AnalyticsData, FunnelStage } from '@/lib/queries/analytics';
import { hasSupabaseEnv } from '@/lib/env';

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en', { maximumFractionDigits: decimals });
}

function pctBar(pct: number, color: string) {
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = '#3b82f6',
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">{children}</h2>
  );
}

function FunnelWidget({ funnel }: { funnel: FunnelStage[] }) {
  const max = funnel[0]?.count ?? 1;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <SectionHeading>Lead → Order Conversion Funnel</SectionHeading>
      <div className="space-y-3">
        {funnel.map((stage) => (
          <Link key={stage.label} href={stage.href}>
            <div className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50">
              <div className="w-28 shrink-0">
                <p className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">{stage.label}</p>
                <p className="text-[10px] text-slate-400">{stage.pct}%</p>
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((stage.count / max) * 100)}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
              <div className="w-12 text-right">
                <span className="text-sm font-bold" style={{ color: stage.color }}>{fmt(stage.count)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MarketTable({ markets }: { markets: AnalyticsData['marketBreakdown'] }) {
  if (!markets.length) return null;
  const maxLeads = markets[0]?.leadCount ?? 1;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <SectionHeading>Top Markets</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-2 text-left font-semibold text-slate-400">Market</th>
              <th className="pb-2 text-right font-semibold text-slate-400">Leads</th>
              <th className="pb-2 text-right font-semibold text-slate-400">Quoted</th>
              <th className="pb-2 text-right font-semibold text-slate-400">Orders</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => (
              <tr key={m.market} className="border-b border-slate-50">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{m.market}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.round((m.leadCount / maxLeads) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="py-2 text-right font-semibold text-blue-600">{m.leadCount}</td>
                <td className="py-2 text-right font-semibold text-purple-600">{m.quoteCount}</td>
                <td className="py-2 text-right font-semibold text-emerald-600">{m.orderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductTable({ products }: { products: AnalyticsData['productBreakdown'] }) {
  if (!products.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <SectionHeading>Product Categories</SectionHeading>
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.category} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
            <span className="text-[12px] font-medium text-slate-700">{p.category}</span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">{p.leadCount} leads</span>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">{p.activeQuotes} quoted</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardAnalyticsPage() {
  if (!hasSupabaseEnv) redirect('/dashboard');

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/login');

  const data = await getAnalyticsData(workspace.organization.id);
  const { quoteMetrics: qm, orderMetrics: om, docSendMetrics: dm } = data;

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Commercial overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live metrics for {workspace.organization.name}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Funnel */}
      <div className="mb-5">
        <FunnelWidget funnel={data.funnel} />
      </div>

      {/* Quote KPIs */}
      <div className="mb-2">
        <SectionHeading>Quote Performance</SectionHeading>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Sent" value={fmt(qm.totalSent)} href="/quotes" color="#8b5cf6" />
        <StatCard label="Accepted" value={fmt(qm.totalAccepted)} color="#10b981" href="/quotes" />
        <StatCard label="Rejected" value={fmt(qm.totalRejected)} color="#ef4444" href="/quotes" />
        <StatCard label="Win Rate" value={`${qm.winRate}%`} color={qm.winRate >= 50 ? '#10b981' : '#f59e0b'} sub="of sent quotes" />
        <StatCard label="Avg Days to Accept" value={qm.avgDaysToAccept !== null ? `${qm.avgDaysToAccept}d` : '—'} color="#3b82f6" />
        <StatCard label="Pending Approval" value={fmt(qm.pendingApproval)} color={qm.pendingApproval > 0 ? '#f59e0b' : '#94a3b8'} href="/quotes" />
      </div>

      {/* Order KPIs */}
      <div className="mb-2">
        <SectionHeading>Order Execution</SectionHeading>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <StatCard label="Total Orders" value={fmt(om.totalActive)} href="/orders" color="#0f2244" />
        <StatCard label="Active" value={fmt(om.active)} color="#f59e0b" href="/orders" sub="in execution" />
        <StatCard label="Dispatched" value={fmt(om.dispatched)} color="#3b82f6" href="/orders" />
        <StatCard label="Paid & Closed" value={fmt(om.completed)} color="#10b981" href="/orders" />
      </div>

      {/* Document Send KPIs */}
      <div className="mb-2">
        <SectionHeading>Document Send Effectiveness (Last 90 days)</SectionHeading>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total Sends" value={fmt(dm.totalSends)} color="#0f2244" />
        <StatCard label="Via Email" value={fmt(dm.emailSends)} color="#3b82f6" sub="Mailtrap channel" />
        <StatCard label="Via WhatsApp" value={fmt(dm.whatsappSends)} color="#10b981" sub="Link generated" />
        <StatCard label="Links Opened" value={fmt(dm.openedLinks)} color="#8b5cf6" sub={`${dm.openRate}% open rate`} />
        <StatCard label="Email Delivered" value={fmt(dm.emailDelivered)} color="#10b981"
          sub={dm.emailSends > 0 ? `${dm.emailDeliveryRate}% delivery rate` : 'webhook needed'} />
        <StatCard label="Email Bounced" value={fmt(dm.emailBounced)} color={dm.emailBounced > 0 ? '#ef4444' : '#94a3b8'} />
      </div>

      {/* Market + Product breakdown */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MarketTable markets={data.marketBreakdown} />
        <ProductTable products={data.productBreakdown} />
      </div>

      {/* Footer note */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4">
        <div className="flex flex-wrap items-start gap-6 text-[11px] text-slate-400">
          <span>📊 <strong className="text-slate-600">Win rate</strong> = accepted ÷ all sent quotes</span>
          <span>📬 <strong className="text-slate-600">Open rate</strong> = document links opened ÷ total sends</span>
          <span>📧 <strong className="text-slate-600">Delivery rate</strong> = Mailtrap confirmed ÷ email sends (requires webhook setup)</span>
          <span>🔄 <strong className="text-slate-600">Live data</strong> — refreshes on every page load</span>
        </div>
      </div>
    </div>
  );
}
