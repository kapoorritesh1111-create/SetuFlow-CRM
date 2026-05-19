/**
 * /dashboard/analytics — Sprint 15
 * Live analytics dashboard. Server component. Refreshes on every load.
 * Linked from main dashboard header as "📊 Analytics" button.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getAnalyticsData } from '@/lib/queries/analytics';
import type { AnalyticsData } from '@/lib/queries/analytics';
import { hasSupabaseEnv } from '@/lib/env';

function fmt(n: number) { return n.toLocaleString('en'); }
function safePct(n: number) { return Math.min(Math.max(n, 0), 100); }

function KPI({ label, value, sub, color = '#3b82f6', href }: { label: string; value: string | number; sub?: string; color?: string; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] hover:shadow-md transition-shadow">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Funnel({ funnel }: { funnel: AnalyticsData['funnel'] }) {
  const max = funnel[0]?.count || 1;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">Lead → Order Conversion Funnel</p>
      <div className="space-y-3">
        {funnel.map(stage => (
          <Link key={stage.label} href={stage.href}>
            <div className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50">
              <div className="w-28 shrink-0">
                <p className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">{stage.label}</p>
                <p className="text-[10px] text-slate-400">{stage.pct}%</p>
              </div>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((stage.count / max) * 100)}%`, backgroundColor: stage.color }} />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-bold" style={{ color: stage.color }}>{fmt(stage.count)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">{children}</p>;
}

export default async function AnalyticsPage() {
  if (!hasSupabaseEnv) redirect('/dashboard');
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/login');
  const data = await getAnalyticsData(workspace.organization.id);
  const { quoteMetrics: qm, orderMetrics: om, docSendMetrics: dm } = data;

  return (
    <div className="min-h-screen bg-slate-50/80 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Commercial overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            {workspace.organization.name}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              Live · {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          </p>
        </div>
        <Link href="/dashboard" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
          ← Dashboard
        </Link>
      </div>

      <div className="mb-5"><Funnel funnel={data.funnel} /></div>

      <div className="mb-2"><Head>Quote Performance</Head></div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Sent" value={fmt(qm.totalSent)} color="#8b5cf6" href="/quotes" />
        <KPI label="Accepted" value={fmt(qm.totalAccepted)} color="#10b981" href="/quotes" />
        <KPI label="Rejected" value={fmt(qm.totalRejected)} color="#ef4444" href="/quotes" />
        <KPI label="Win Rate" value={`${qm.winRate}%`} color={qm.winRate >= 50 ? '#10b981' : '#f59e0b'} sub="of sent quotes" />
        <KPI label="Avg Days to Accept" value={qm.avgDaysToAccept !== null ? `${qm.avgDaysToAccept}d` : '—'} color="#3b82f6" />
        <KPI label="Pending Approval" value={fmt(qm.pendingApproval)} color={qm.pendingApproval > 0 ? '#f59e0b' : '#94a3b8'} href="/quotes" />
      </div>

      <div className="mb-2"><Head>Order Execution</Head></div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Total Orders" value={fmt(om.totalActive)} color="#0f2244" href="/orders" />
        <KPI label="Active" value={fmt(om.active)} color="#f59e0b" href="/orders" sub="in execution" />
        <KPI label="Dispatched" value={fmt(om.dispatched)} color="#3b82f6" href="/orders" />
        <KPI label="Paid & Closed" value={fmt(om.completed)} color="#10b981" href="/orders" />
      </div>

      <div className="mb-2"><Head>Document Send Effectiveness — Last 90 days</Head></div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPI label="Total Sends" value={fmt(dm.totalSends)} color="#0f2244" />
        <KPI label="Via Email" value={fmt(dm.emailSends)} color="#3b82f6" sub="Mailtrap" />
        <KPI label="Via WhatsApp" value={fmt(dm.whatsappSends)} color="#10b981" sub="Link generated" />
        <KPI label="Links Opened" value={fmt(dm.openedLinks)} color="#8b5cf6" sub={`${dm.openRate}% open rate`} />
        <KPI label="Email Delivered" value={fmt(dm.emailDelivered)} color="#10b981" sub={dm.emailSends > 0 ? `${dm.emailDeliveryRate}% rate` : 'needs webhook'} />
        <KPI label="Email Bounced" value={fmt(dm.emailBounced)} color={dm.emailBounced > 0 ? '#ef4444' : '#94a3b8'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.marketBreakdown.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <Head>Top Markets</Head>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-slate-100"><th className="pb-2 text-left text-slate-400 font-semibold">Market</th><th className="pb-2 text-right text-slate-400 font-semibold">Leads</th><th className="pb-2 text-right text-slate-400 font-semibold">Quoted</th><th className="pb-2 text-right text-slate-400 font-semibold">Orders</th></tr></thead>
              <tbody>
                {data.marketBreakdown.map(m => (
                  <tr key={m.market} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-800">{m.market}</td>
                    <td className="py-2 text-right font-semibold text-blue-600">{m.leadCount}</td>
                    <td className="py-2 text-right font-semibold text-purple-600">{m.quoteCount}</td>
                    <td className="py-2 text-right font-semibold text-emerald-600">{m.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.productBreakdown.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <Head>Product Categories</Head>
            <div className="space-y-2">
              {data.productBreakdown.map(p => (
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
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-[11px] text-slate-400 flex flex-wrap gap-6">
        <span>📊 <strong className="text-slate-600">Win rate</strong> = accepted ÷ sent quotes</span>
        <span>📬 <strong className="text-slate-600">Open rate</strong> = links opened ÷ total sends</span>
        <span>📧 <strong className="text-slate-600">Delivery rate</strong> = confirmed delivered ÷ email sends (needs MAILTRAP_WEBHOOK_SECRET)</span>
        <span>🔄 <strong className="text-slate-600">Live data</strong> — refreshes on every page load</span>
      </div>
    </div>
  );
}
