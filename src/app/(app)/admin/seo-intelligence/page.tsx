import Link from 'next/link';
import { redirect } from 'next/navigation';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { getLiveGoogleTrends, type LiveTrendResult } from '@/lib/seo/google-trends';
import { seoChangeProof, seoCompetitors, seoKeywordClusters, seoKeywordGroupSummaries, seoOpportunities, seoUpgradeActions } from '@/lib/seo/seo-intelligence';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const metadata = { title: 'SEO Intelligence | SETU Flow Admin', robots: { index: false, follow: false } };

const SETU_FLOW_INTERNAL_ORG_ID = INTERNAL_ORG_ID;

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

function isInternalOrg(organizationId: string) {
  const configuredInternalOrgId = process.env.SETU_INTERNAL_ORG_ID?.trim();
  return organizationId === configuredInternalOrgId || organizationId === SETU_FLOW_INTERNAL_ORG_ID;
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));
}

function toneForStatus(status: 'live' | 'next_pr' | 'pending' | 'missing'): Tone {
  if (status === 'live') return 'success';
  if (status === 'next_pr') return 'warning';
  if (status === 'missing') return 'danger';
  return 'neutral';
}

function toneForPriority(priority: 'p0' | 'p1' | 'p2'): Tone {
  if (priority === 'p0') return 'danger';
  if (priority === 'p1') return 'warning';
  return 'neutral';
}

function toneForCoverage(coverage: 'missing' | 'partial' | 'ready'): Tone {
  if (coverage === 'ready') return 'success';
  if (coverage === 'partial') return 'warning';
  return 'danger';
}

function ScoreBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}

function trendPolyline(trends: LiveTrendResult, query: string, width = 1100, height = 250) {
  if (trends.points.length === 0) return '';
  return trends.points.map((point, index) => {
    const x = Math.round((index / Math.max(trends.points.length - 1, 1)) * width);
    const y = Math.round(height - ((point.values[query] ?? 0) / 100) * height);
    return `${x},${y}`;
  }).join(' ');
}

function HelpMenu() {
  return (
    <details className="relative">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">? Help</summary>
      <div className="absolute right-0 z-20 mt-3 w-[min(430px,calc(100vw-2rem))] rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <h3 className="text-base font-bold text-slate-950">SEO Intelligence help</h3>
        <p className="mt-2">Use the sticky tabs directly under Governance Clear to jump to the section you need.</p>
        <ul className="mt-3 space-y-2">
          <li><strong>Overview:</strong> current SEO health, completed PRs, and remaining quality work.</li>
          <li><strong>Changes:</strong> proof that all page batches are merged and deployed.</li>
          <li><strong>Trends:</strong> live SearchApi/SerpApi trend signals and tracked keywords.</li>
          <li><strong>Keywords:</strong> coverage status for every target cluster.</li>
          <li><strong>Push PR:</strong> creates the next quality-improvement PR.</li>
        </ul>
      </div>
    </details>
  );
}

function SectionTabs() {
  const tabs = [
    ['#overview', 'Overview'],
    ['#changes', 'Changes'],
    ['#trends', 'Trends'],
    ['#keywords', 'Keywords'],
    ['#competitors', 'Competitors'],
    ['#push', 'Push PR'],
    ['#improve', 'Improve health'],
  ];
  return (
    <nav className="sticky top-16 z-20 -mx-1 flex gap-2 overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
      {tabs.map(([href, label]) => <a key={href} href={href} className="whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800">{label}</a>)}
    </nav>
  );
}

function LiveTrendsChart({ trends }: { trends: LiveTrendResult }) {
  const activeQueries = trends.queries.slice(0, 5);
  const primary = activeQueries[0] || 'import export CRM';
  const primaryPoints = trendPolyline(trends, primary);
  const area = primaryPoints ? `M${primaryPoints.split(' ').join(' L')} L1100,250 L0,250 Z` : '';

  if (trends.status !== 'connected' || trends.points.length === 0) {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-700">Live trends</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-amber-950">Trend data needs attention</h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">{trends.message}</p>
          </div>
          <StatusBadge label={trends.status.replace(/_/g, ' ')} tone={trends.status === 'error' ? 'danger' : 'warning'} dot={false} />
        </div>
        <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-white p-4">
          <h4 className="font-bold text-slate-950">Tracked keywords</h4>
          <div className="mt-3 flex flex-wrap gap-2">{trends.queries.map((query) => <StatusBadge key={query} label={query} tone="neutral" dot={false} />)}</div>
          <p className="mt-3 text-sm text-slate-600">To change these, set <code>SEO_TREND_QUERIES</code> in Vercel with up to 5 comma-separated keywords, then redeploy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">Live Google Trends</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">12-month interest-over-time from {trends.provider}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">Updated {new Date(trends.updatedAt).toLocaleString()} · relative interest, not absolute search volume.{trends.degraded ? ' Some keywords used one-query fallback because the combined comparison failed.' : ''}</p>
        </div>
        <StatusBadge label={trends.degraded ? 'partial live' : 'connected'} tone={trends.degraded ? 'warning' : 'success'} dot={false} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[52px_minmax(0,1fr)]">
        <div className="flex flex-col justify-between py-2 text-right text-[11px] font-bold text-slate-400"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div>
          <div className="relative min-h-[300px] overflow-hidden rounded-[1.5rem] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
            <div className="absolute inset-4 bg-[linear-gradient(to_bottom,rgba(148,163,184,.22)_1px,transparent_1px)] bg-[length:100%_25%]" />
            <svg viewBox="0 0 1100 250" preserveAspectRatio="none" className="absolute inset-4 h-[250px] w-[calc(100%-2rem)] overflow-visible" aria-label="Live Google Trends interest over time">
              <defs><linearGradient id="liveTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c7fff" stopOpacity="0.22" /><stop offset="100%" stopColor="#0c7fff" stopOpacity="0" /></linearGradient></defs>
              {area ? <path d={area} fill="url(#liveTrendFill)" /> : null}
              {activeQueries.map((query, index) => <polyline key={query} points={trendPolyline(trends, query)} fill="none" stroke={['#0c7fff', '#10b981', '#f59e0b', '#7c3aed', '#dc2626'][index] ?? '#334155'} strokeWidth={index === 0 ? '6' : '4'} strokeLinecap="round" strokeLinejoin="round" opacity={index === 0 ? '1' : '0.82'} />)}
            </svg>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1 text-center text-[11px] font-bold text-slate-500">{trends.points.filter((_, index) => index % Math.max(Math.ceil(trends.points.length / 6), 1) === 0).slice(0, 6).map((point) => <span key={point.label}>{point.label.split('–')[0].trim()}</span>)}</div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">{activeQueries.map((query, index) => <span key={query} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ['#0c7fff', '#10b981', '#f59e0b', '#7c3aed', '#dc2626'][index] }} />{query}</span>)}</div>
    </div>
  );
}

function CreateSeoPrForm() {
  return (
    <form action="/api/admin/seo/create-pr" method="post" className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-emerald-950">Create SEO quality PR</h3>
          <p className="mt-1 text-sm leading-6 text-emerald-900">All first-wave SEO pages are live. The next PR improves internal links, schema guidance, and quality tracking.</p>
        </div>
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Create PR</button>
      </div>
    </form>
  );
}

export default async function SeoIntelligencePage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  if (!membership || !organization) return null;

  if (!isInternalOrg(organization.id)) redirect('/admin');

  const liveTrends = await getLiveGoogleTrends();
  const readyClusters = seoKeywordClusters.filter((cluster) => cluster.currentCoverage === 'ready').length;
  const totalClusters = seoKeywordClusters.length;
  const keywordGaps = seoKeywordClusters.filter((cluster) => cluster.currentCoverage !== 'ready').length;
  const pageCoverageHealth = Math.round((readyClusters / Math.max(totalClusters, 1)) * 100);
  const trendHealth = liveTrends.status === 'connected' ? (liveTrends.degraded ? 85 : 100) : 65;
  const qualityHealth = 82;
  const seoHealth = Math.round(pageCoverageHealth * 0.55 + trendHealth * 0.2 + qualityHealth * 0.25);
  const liveChanges = seoChangeProof.filter((item) => item.status === 'live').length;
  const opportunityScore = average(seoCompetitors.map((competitor) => competitor.setuOpportunityScore));
  const seoBotOwned = seoOpportunities.filter((opportunity) => opportunity.owner === 'seo_bot');

  return (
    <AdminSettingsShell active="seo" organizationName={organization.name} missingCount={0} sectionTitle="SEO Intelligence" gapItems={[]}>
      <SectionTabs />
      <AdminPageHero title="SEO Intelligence" description="Live trend signals, completed SEO coverage, competitor gaps, and quality-improvement PRs." badge="Main organization only" cta={<div className="flex flex-wrap gap-2"><HelpMenu /><Link href="https://www.setuflowcrm.com" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open public site</Link></div>} stats={[{ label: 'SEO health', value: `${seoHealth}%`, tone: seoHealth >= 90 ? 'success' : 'warning' }, { label: 'Page coverage', value: `${pageCoverageHealth}%`, tone: 'success' }, { label: 'Trends', value: liveTrends.status === 'connected' ? 'Live' : 'Needs attention', tone: liveTrends.status === 'connected' ? 'success' : 'warning' }]} />

      <section id="overview" className="scroll-mt-32 grid gap-4 lg:grid-cols-4">
        {[
          ['SEO health', `${seoHealth}%`, 'Weighted score: page coverage, live trends, and page quality.'],
          ['Page coverage', `${pageCoverageHealth}%`, `${readyClusters}/${totalClusters} target keyword clusters now have ready pages.`],
          ['Keyword gaps', `${keywordGaps}`, 'Coverage gaps remaining after merged SEO PRs.'],
          ['Opportunity', `${opportunityScore}/100`, 'Where SETU can win against tracked competitors.'],
        ].map(([label, value, copy]) => <div key={label} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{label}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>)}
      </section>

      <section id="changes" className="scroll-mt-32"><SectionCard eyebrow="Changes" title="All SEO page PRs completed"><div className="grid gap-3 md:grid-cols-2">{seoChangeProof.map((item) => <article key={item.title} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[44px_minmax(0,1fr)_120px] md:items-center"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-xl">{item.icon}</div><div><h3 className="text-base font-bold text-slate-950">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p></div><StatusBadge label={item.status.replace(/_/g, ' ')} tone={toneForStatus(item.status)} dot={false} /></article>)}</div></SectionCard></section>

      <section id="trends" className="scroll-mt-32"><SectionCard eyebrow="Trends" title="Live trend signals"><LiveTrendsChart trends={liveTrends} /><div className="mt-4 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4"><h3 className="text-base font-bold text-blue-950">Manage tracked trend keywords</h3><p className="mt-2 text-sm leading-6 text-blue-900">Current tracked keywords are shown below. To change them, update Vercel env var <code>SEO_TREND_QUERIES</code> with up to 5 comma-separated keywords and redeploy.</p><div className="mt-3 flex flex-wrap gap-2">{liveTrends.queries.map((query) => <StatusBadge key={query} label={query} tone="info" dot={false} />)}</div></div></SectionCard></section>

      <section id="keywords" className="scroll-mt-32"><SectionCard eyebrow="Keywords" title="Keyword coverage"><div className="grid gap-3 md:grid-cols-2">{seoKeywordClusters.map((cluster) => <article key={cluster.cluster} className="rounded-[1.5rem] border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">{cluster.cluster}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{cluster.recommendedPage}</p></div><StatusBadge label={cluster.currentCoverage} tone={toneForCoverage(cluster.currentCoverage)} dot={false} /></div><div className="mt-3 flex flex-wrap gap-2">{cluster.examples.slice(0, 4).map((keyword) => <StatusBadge key={keyword} label={keyword} tone="neutral" dot={false} />)}</div></article>)}</div><div className="mt-5 space-y-3">{seoKeywordGroupSummaries.map((item) => <article key={item.group} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)] lg:items-center"><div><h3 className="text-base font-bold text-slate-950">{item.group}</h3><p className="mt-1 text-sm text-slate-600">{item.action}</p></div><StatusBadge label={`${item.currentIndex}/100`} tone={item.currentIndex >= 85 ? 'success' : 'warning'} dot={false} /><span className="text-sm font-bold capitalize text-slate-700">{item.trend}</span><div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{item.recommendedPage}</div></article>)}</div></SectionCard></section>

      <section id="competitors" className="scroll-mt-32"><SectionCard eyebrow="Competitors" title="Where SETU Flow can win"><div className="grid gap-3 md:grid-cols-2">{seoCompetitors.map((competitor) => <article key={competitor.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-950">{competitor.name}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{competitor.gap}</p></div><a href={competitor.url} className="shrink-0 text-sm font-semibold text-blue-700">Open</a></div><div className="mt-4"><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>SETU opportunity</span><span>{competitor.setuOpportunityScore}/100</span></div><ScoreBar value={competitor.setuOpportunityScore} /></div></article>)}</div></SectionCard></section>

      <section id="push" className="scroll-mt-32"><SectionCard eyebrow="Push PR" title="Create reviewable SEO changes"><CreateSeoPrForm /><div className="mt-4 grid gap-3 md:grid-cols-2">{seoUpgradeActions.map((action) => <article key={action.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap gap-2"><StatusBadge label={action.priority.toUpperCase()} tone={toneForPriority(action.priority)} dot={false} /><StatusBadge label={action.type.replace(/_/g, ' ')} tone="info" dot={false} /></div><h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{action.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600"><strong>Target:</strong> {action.target}</p><p className="mt-1 text-sm leading-6 text-slate-600"><strong>Expected lift:</strong> {action.expectedLift}</p><p className="mt-1 text-sm leading-6 text-slate-600">{action.implementation}</p></article>)}</div><div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"><strong>Current bot-owned queue:</strong> {seoBotOwned.map((item) => item.title).join(', ') || 'No bot-owned tasks configured.'}</div></SectionCard></section>

      <section id="improve" className="scroll-mt-32"><SectionCard eyebrow="Improve health" title="How to make SEO health better"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4"><StatusBadge label="coverage complete" tone="success" dot={false} /><h3 className="mt-3 font-bold text-emerald-950">Page coverage is done</h3><p className="mt-2 text-sm leading-6 text-emerald-900">All first-wave SEO clusters have live pages. The next score gains come from quality, internal links, and analytics.</p></div><div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4"><StatusBadge label="next" tone="info" dot={false} /><h3 className="mt-3 font-bold text-blue-950">Improve page quality</h3><p className="mt-2 text-sm leading-6 text-blue-900">Add proof copy, comparison tables, screenshots, FAQs, and stronger internal links to push beyond basic coverage.</p></div><div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4"><StatusBadge label="analytics" tone="warning" dot={false} /><h3 className="mt-3 font-bold text-amber-950">Add Search Console history</h3><p className="mt-2 text-sm leading-6 text-amber-900">SearchApi gives trend signals. Search Console will give impressions, clicks, CTR, and actual queries for health scoring.</p></div></div></SectionCard></section>
    </AdminSettingsShell>
  );
}
