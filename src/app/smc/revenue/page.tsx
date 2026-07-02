import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

const PLAN_PRICING: Record<string, number> = {
  starter: 49, growth: 149, professional: 299, enterprise: 0,
};

function money(n: number) {
  if (n === 0) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n}`;
}

export default async function SmcRevenuePage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/');
  const { data: m } = await (sb as any).from('organization_members').select('id')
    .eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  if (!m) redirect('/');

  // Fetch real data
  const [onboardingRes, orgsRes] = await Promise.all([
    (sb as any).from('client_onboarding_requests').select('id,status,requested_plan,requested_seat_count,pipeline_stage,is_trial_request,created_at,source').order('created_at', { ascending: false }),
    (sb as any).from('organizations').select('id,name,created_at').not('id', 'eq', INTERNAL_ORG_ID).limit(200),
  ]);

  const requests: any[] = onboardingRes.data ?? [];
  const orgs: any[] = orgsRes.data ?? [];

  // Compute metrics from real data
  const live = requests.filter(r => r.status === 'live' || r.pipeline_stage === 'converted');
  const trials = requests.filter(r => r.is_trial_request && !['converted','lost'].includes(r.pipeline_stage ?? ''));
  const negotiating = requests.filter(r => r.pipeline_stage === 'negotiating');
  const qualified = requests.filter(r => ['qualified','trial','negotiating'].includes(r.pipeline_stage ?? ''));
  const lost = requests.filter(r => r.pipeline_stage === 'lost');
  const total = requests.length;

  // MRR estimate
  const mrr = live.reduce((sum, r) => {
    const price = PLAN_PRICING[r.requested_plan?.toLowerCase() ?? ''] ?? 0;
    return sum + price;
  }, 0);

  // Pipeline value (qualified + negotiating leads × plan price)
  const pipelineValue = negotiating.reduce((sum, r) => {
    const price = PLAN_PRICING[r.requested_plan?.toLowerCase() ?? ''] ?? 99;
    return sum + price;
  }, 0);

  // Conversion rate
  const convRate = total > 0 ? Math.round((live.length / total) * 100) : 0;
  const trialToConv = trials.length > 0 && live.length > 0 ? Math.round((live.length / (live.length + trials.length)) * 100) : 0;

  // Plan distribution
  const planCounts: Record<string, number> = { trial: 0, starter: 0, growth: 0, professional: 0, enterprise: 0 };
  for (const r of requests) {
    const plan = r.is_trial_request ? 'trial' : (r.requested_plan?.toLowerCase() ?? 'starter');
    if (plan in planCounts) planCounts[plan]++;
  }

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const r of requests) {
    const src = r.source ?? 'unknown';
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  }
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Monthly lead intake (last 6 months)
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    const count = requests.filter(r => {
      const cd = new Date(r.created_at);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;
    months.push({ label, count });
  }
  const maxMonthCount = Math.max(...months.map(m => m.count), 1);

  const kpis = [
    { label: 'MRR', value: money(mrr), sub: mrr === 0 ? 'Pre-revenue stage' : `${live.length} paying org${live.length !== 1 ? 's' : ''}`, color: mrr > 0 ? '#10b981' : '#94a3b8' },
    { label: 'Total Leads', value: String(total), sub: `${qualified.length} qualified`, color: '#1F487C' },
    { label: 'Active Trials', value: String(trials.length), sub: `${trialToConv}% convert rate`, color: '#d97706' },
    { label: 'Negotiating', value: String(negotiating.length), sub: `${money(pipelineValue)} pipeline`, color: '#6366f1' },
    { label: 'Live Orgs', value: String(Math.max(live.length, orgs.length)), sub: `+${orgs.length} in DB`, color: '#279491' },
    { label: 'Lead → Live %', value: `${convRate}%`, sub: `${lost.length} lost`, color: convRate > 20 ? '#10b981' : '#94a3b8' },
  ];

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Business</div><h1>Revenue &amp; Growth</h1></div>
        <div className="ha"><span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Live data from DB</span></div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 16px 12px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '13px 14px', boxShadow: '0 1px 4px rgba(15,23,42,.05)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Monthly intake chart */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#1F487C' }}>Monthly Lead Intake (last 6 months)</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {months.map(m => (
              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', background: '#1F487C', borderRadius: '4px 4px 0 0', height: `${Math.round((m.count / maxMonthCount) * 64) + 2}px`, minHeight: 4 }} />
                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{m.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution + pipeline funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#1F487C' }}>Plan Distribution</p>
            {[
              { key: 'trial',        label: 'Trial',        price: 'Free',       color: '#d97706' },
              { key: 'starter',      label: 'Starter',      price: '$49/mo',     color: '#279491' },
              { key: 'growth',       label: 'Growth',       price: '$149/mo',    color: '#1F487C' },
              { key: 'professional', label: 'Professional', price: '$299/mo',    color: '#6366f1' },
              { key: 'enterprise',   label: 'Enterprise',   price: 'Custom',     color: '#0f172a' },
            ].map(p => (
              <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{p.label}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>{p.price}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: p.color }}>{planCounts[p.key] ?? 0}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#1F487C' }}>Pipeline Funnel</p>
            {[
              { label: 'Total Leads',   count: total,               color: '#e2e8f0' },
              { label: 'Qualified',     count: qualified.length,    color: '#c7d2fe' },
              { label: 'Trial Active',  count: trials.length,       color: '#fcd34d' },
              { label: 'Negotiating',   count: negotiating.length,  color: '#6ee7b7' },
              { label: 'Live / Won',    count: live.length,         color: '#279491' },
            ].map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, width: 90, flexShrink: 0 }}>{s.label}</span>
                <div style={{ flex: 1, height: 14, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${total > 0 ? Math.max(4, Math.round((s.count / total) * 100)) : 0}%`, background: s.color, borderRadius: 4, transition: 'width .4s' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#334155', width: 20, textAlign: 'right' }}>{s.count}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, padding: '8px 10px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: 10, color: '#14532d', fontWeight: 700 }}>MRR Potential (negotiating × plan): {money(pipelineValue)}/mo</span>
            </div>
          </div>
        </div>

        {/* Source breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 14 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#1F487C' }}>Lead Sources</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topSources.map(([src, count]) => (
              <div key={src} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '7px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'capitalize' }}>{src.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1F487C' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {mrr === 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#92400e' }}>Pre-revenue stage — MRR will show once leads are marked as converted with a plan assigned.</p>
          </div>
        )}
      </div>
    </>
  );
}
