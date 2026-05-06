import Link from 'next/link';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import {
  seoChangeProof,
  seoCompetitors,
  seoKeywordClusters,
  seoKeywordGroupSummaries,
  seoOpportunities,
  seoPageMetadata,
  seoTrendPoints,
  seoUpgradeActions,
} from '@/lib/seo/seo-intelligence';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export const metadata = { title: 'SEO Intelligence | SETU Flow Admin', robots: { index: false, follow: false } };

function isMainSetuOrganization(organization: { name?: string | null; slug?: string | null; domain?: string | null }) {
  return [organization.name, organization.slug, organization.domain].filter(Boolean).join(' ').toLowerCase().includes('setu');
}
function average(values: number[]) { return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)); }
function toneForStatus(status: 'live' | 'next_pr' | 'pending' | 'missing') { return status === 'live' ? 'success' as const : status === 'next_pr' ? 'warning' as const : status === 'missing' ? 'danger' as const : 'neutral' as const; }
function toneForPriority(priority: 'p0' | 'p1' | 'p2') { return priority === 'p0' ? 'danger' as const : priority === 'p1' ? 'warning' as const : 'neutral' as const; }
function ScoreBar({ value }: { value: number }) { return <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>; }

function TrendChart() {
  const max = 100;
  const width = 1100;
  const height = 250;
  const toPoint = (value: number, index: number) => `${Math.round((index / (seoTrendPoints.length - 1)) * width)},${Math.round(height - (value / max) * height)}`;
  const combined = seoTrendPoints.map((point, index) => toPoint(point.combined, index)).join(' ');
  const commercial = seoTrendPoints.map((point, index) => toPoint(point.commercial, index)).join(' ');
  const education = seoTrendPoints.map((point, index) => toPoint(point.education, index)).join(' ');
  const area = `M${combined.split(' ').join(' L')} L${width},${height} L0,${height} Z`;
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-950">SETU planning index, not live Google Trends</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">This is an internal planning model from tracked keyword groups. It is useful for prioritizing pages, but it is not Google Search Console or Google Trends data yet.</p>
        </div>
        <div className="flex flex-wrap gap-2"><StatusBadge label="Planning data" tone="warning" dot={false} /><StatusBadge label="Needs Google connection" tone="neutral" dot={false} /></div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[52px_minmax(0,1fr)]">
        <div className="flex flex-col justify-between py-2 text-right text-[11px] font-bold text-slate-400"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div>
          <div className="relative min-h-[300px] overflow-hidden rounded-[1.5rem] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4">
            <div className="absolute inset-4 bg-[linear-gradient(to_bottom,rgba(148,163,184,.22)_1px,transparent_1px)] bg-[length:100%_25%]" />
            <svg viewBox="0 0 1100 250" preserveAspectRatio="none" className="absolute inset-4 h-[250px] w-[calc(100%-2rem)] overflow-visible" aria-label="SETU SEO planning demand index for the last 12 months">
              <defs><linearGradient id="seoTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c7fff" stopOpacity="0.22" /><stop offset="100%" stopColor="#0c7fff" stopOpacity="0" /></linearGradient></defs>
              <path d={area} fill="url(#seoTrendFill)" />
              <polyline points={combined} fill="none" stroke="#0c7fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={commercial} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              <polyline points={education} fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              {seoTrendPoints.map((point, index) => { const [cx, cy] = toPoint(point.combined, index).split(','); return <circle key={point.month} cx={cx} cy={cy} r="6" fill="#0c7fff" />; })}
            </svg>
          </div>
          <div className="mt-2 grid grid-cols-12 gap-1 text-center text-[11px] font-bold text-slate-500">{seoTrendPoints.map((point) => <span key={point.month}>{point.month}</span>)}</div>
        </div>
      </div>
    </div>
  );
}

function CreateSeoPrForm() {
  return (
    <form action="/api/admin/seo/create-pr" method="post" className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-emerald-950">Create SEO upgrade PR</h3>
          <p className="mt-1 text-sm leading-6 text-emerald-900">Creates a GitHub branch and pull request with the first SEO landing pages. Nothing merges live until you review and merge the PR.</p>
        </div>
        <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Create PR</button>
      </div>
      <p className="mt-3 text-xs font-semibold text-emerald-800">Requires Vercel env var: SEO_GITHUB_TOKEN or GITHUB_TOKEN with repo contents + pull request access.</p>
    </form>
  );
}

export default async function SeoIntelligencePage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  if (!membership || !organization) return null;
  if (!isMainSetuOrganization(organization as any)) return <StateMessage title="SEO intelligence is restricted to the main SETU Flow organization" description="Customer workspaces can manage CRM data, but SEO strategy and competitor monitoring are controlled from the main organization." tone="warning" />;
  const seoHealth = 74;
  const liveChanges = seoChangeProof.filter((item) => item.status === 'live').length;
  const keywordGaps = seoKeywordClusters.filter((cluster) => cluster.currentCoverage === 'missing').length;
  const opportunityScore = average(seoCompetitors.map((competitor) => competitor.setuOpportunityScore));
  const p0Actions = seoUpgradeActions.filter((action) => action.priority === 'p0');
  const seoBotOwned = seoOpportunities.filter((opportunity) => opportunity.owner === 'seo_bot');

  return (
    <AdminSettingsShell active="seo" organizationName={organization.name} missingCount={0} sectionTitle="SEO Intelligence" gapItems={[]}>
      <AdminPageHero title="SEO Intelligence" description="A beginner-friendly command center that shows real SEO changes, clearly labels planning data, and lets internal admins create reviewable SEO PRs." badge="Main organization only" cta={<Link href="https://www.setuflowcrm.com" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open public site</Link>} stats={[{ label: 'SEO health', value: `${seoHealth}%`, tone: 'success' }, { label: 'Live changes', value: liveChanges, tone: 'info' }, { label: 'P0 upgrades', value: p0Actions.length, tone: 'danger' }]} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.07)]"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">SEO Intelligence, explained simply</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Know what is real, what is estimated, and what can be pushed.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Real changes show proof and build status. Estimated planning data is clearly labeled until Google Search Console or Google Trends is connected.</p></div><div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-5"><h3 className="text-lg font-bold text-blue-950">How to read this page</h3><div className="mt-4 space-y-3 text-sm leading-6 text-blue-950"><p><strong>1.</strong> Check proof of live SEO changes.</p><p><strong>2.</strong> Treat planning charts as estimates.</p><p><strong>3.</strong> Use Create PR to generate reviewable SEO changes.</p></div></div></section>
      <section className="grid gap-4 lg:grid-cols-4">{[['SEO health', `${seoHealth}%`, 'Good foundation, but missing high-intent landing pages.'], ['Changes live', `${liveChanges}`, 'Verified SEO items already live or active.'], ['Keyword gaps', `${keywordGaps}`, 'Important clusters where better pages are needed.'], ['Opportunity', `${opportunityScore}/100`, 'Where SETU can win against tracked competitors.']].map(([label, value, copy]) => <div key={label} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">{label}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>)}</section>
      <SectionCard eyebrow="Change proof" title="How we know SEO changes have been made" description="Each SEO update should show the change, the status, and whether it is live, queued for the next PR, or still missing."><div className="space-y-3">{seoChangeProof.map((item) => <article key={item.title} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[44px_minmax(0,1fr)_120px] md:items-center"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-xl">{item.icon}</div><div><h3 className="text-base font-bold text-slate-950">{item.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p></div><StatusBadge label={item.status.replace(/_/g, ' ')} tone={toneForStatus(item.status)} dot={false} /></article>)}</div><div className="mt-4 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><strong>Simple explanation:</strong> SEO changes are real when this page can show a GitHub commit, a successful Vercel build, and the exact page or keyword that changed.</div></SectionCard>
      <SectionCard eyebrow="Planning index" title="12-month SETU keyword planning index" description="This is not Google data yet. It is a planning model used to decide which SEO changes should be created first."><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]"><TrendChart /><div className="space-y-3"><div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4"><StatusBadge label="Not Google data" tone="warning" dot={false} /><h3 className="mt-3 text-lg font-bold text-amber-950">No fake trends</h3><p className="mt-2 text-sm leading-6 text-amber-900">This chart is deliberately labeled as an internal planning index until real Google data is connected.</p></div><div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4"><StatusBadge label="P0 action" tone="danger" dot={false} /><h3 className="mt-3 text-lg font-bold text-rose-950">What this means</h3><p className="mt-2 text-sm leading-6 text-rose-900">Create dedicated pages for import-export CRM, export quote software, and trade show lead capture.</p></div><div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4"><StatusBadge label="Next connection" tone="info" dot={false} /><h3 className="mt-3 text-lg font-bold text-blue-950">Connect real data later</h3><p className="mt-2 text-sm leading-6 text-blue-900">The next step is Google Search Console / Keyword Planner ingestion into Supabase.</p></div></div></div><div className="mt-5 space-y-3">{seoKeywordGroupSummaries.map((item) => <article key={item.group} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)] lg:items-center"><div><h3 className="text-base font-bold text-slate-950">{item.group}</h3><p className="mt-1 text-sm text-slate-600">{item.action}</p></div><StatusBadge label={`${item.currentIndex}/100`} tone={item.currentIndex >= 85 ? 'success' : 'warning'} dot={false} /><span className="text-sm font-bold capitalize text-slate-700">{item.trend}</span><div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">{item.recommendedPage}</div></article>)}</div></SectionCard>
      <SectionCard eyebrow="Competitor standing" title="Where SETU Flow can win" description="Do not fight generic CRM giants on broad terms. Win where buyers search for trade-specific CRM, export quotes, documents, and trade-show capture."><div className="grid gap-3 md:grid-cols-2">{seoCompetitors.map((competitor) => <article key={competitor.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-950">{competitor.name}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{competitor.gap}</p></div><a href={competitor.url} className="shrink-0 text-sm font-semibold text-blue-700">Open</a></div><div className="mt-4"><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>SETU opportunity</span><span>{competitor.setuOpportunityScore}/100</span></div><ScoreBar value={competitor.setuOpportunityScore} /></div></article>)}</div></SectionCard>
      <SectionCard eyebrow="Push SEO changes" title="Create a reviewable SEO PR from this page" description="This now has a real action path: create a GitHub branch and PR from the dashboard. It still does not silently merge to live."><CreateSeoPrForm /><div className="mt-4 grid gap-3 md:grid-cols-2">{seoUpgradeActions.map((action) => <article key={action.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap gap-2"><StatusBadge label={action.priority.toUpperCase()} tone={toneForPriority(action.priority)} dot={false} /><StatusBadge label={action.type.replace(/_/g, ' ')} tone="info" dot={false} /></div><h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{action.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600"><strong>Target:</strong> {action.target}</p><p className="mt-1 text-sm leading-6 text-slate-600"><strong>Expected lift:</strong> {action.expectedLift}</p><p className="mt-1 text-sm leading-6 text-slate-600">{action.implementation}</p></article>)}</div><div className="mt-5 grid gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-4"><div><strong>1. Preview</strong><p className="mt-1 text-sm text-emerald-900">Generate proposed files.</p></div><div><strong>2. PR</strong><p className="mt-1 text-sm text-emerald-900">Create GitHub branch.</p></div><div><strong>3. Check</strong><p className="mt-1 text-sm text-emerald-900">Wait for Vercel.</p></div><div><strong>4. Merge</strong><p className="mt-1 text-sm text-emerald-900">Review before live.</p></div></div><div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"><strong>Current bot-owned queue:</strong> {seoBotOwned.map((item) => item.title).join(', ') || 'No bot-owned tasks configured.'}</div></SectionCard>
    </AdminSettingsShell>
  );
}
