import Link from 'next/link';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { seoCompetitors, seoKeywordClusters, seoOpportunities, seoPageMetadata, seoSearchSignals, seoUpgradeActions, type SeoSearchWindow } from '@/lib/seo/seo-intelligence';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

export const metadata = { title: 'SEO Intelligence | SETU Flow Admin', robots: { index: false, follow: false } };

function isMainSetuOrganization(organization: { name?: string | null; slug?: string | null; domain?: string | null }) {
  return [organization.name, organization.slug, organization.domain].filter(Boolean).join(' ').toLowerCase().includes('setu');
}

function toneForPriority(priority: 'high' | 'medium' | 'low') { return priority === 'high' ? 'danger' as const : priority === 'medium' ? 'warning' as const : 'neutral' as const; }
function toneForImpact(impact: 'high' | 'medium' | 'low') { return impact === 'high' ? 'success' as const : impact === 'medium' ? 'info' as const : 'neutral' as const; }
function toneForCoverage(coverage: 'missing' | 'partial' | 'ready') { return coverage === 'missing' ? 'danger' as const : coverage === 'partial' ? 'warning' as const : 'success' as const; }
function toneForUpgrade(priority: 'p0' | 'p1' | 'p2') { return priority === 'p0' ? 'danger' as const : priority === 'p1' ? 'warning' as const : 'neutral' as const; }

function average(values: number[]) { return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)); }

function ScoreBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>;
}

function SearchWindow({ window, title }: { window: SeoSearchWindow; title: string }) {
  const signals = seoSearchSignals.filter((signal) => signal.window === window).sort((a, b) => b.relativeDemand - a.relativeDemand);
  return (
    <div id={`search-${window}`} className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
        <StatusBadge label={`${signals.length} tracked phrases`} tone="info" dot={false} />
      </div>
      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <article key={signal.phrase} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-950">{signal.phrase}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{signal.note}</p>
              </div>
              <div className="flex flex-wrap gap-2"><StatusBadge label={signal.intent} tone="info" dot={false} /><StatusBadge label={signal.recommendedAsset} tone="neutral" dot={false} /></div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_260px]">
              <div><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>Demand</span><span>{signal.relativeDemand}/100</span></div><ScoreBar value={signal.relativeDemand} /></div>
              <div><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>Buyer readiness</span><span>{signal.buyerReadiness}/100</span></div><ScoreBar value={signal.buyerReadiness} /></div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">Target: {signal.pageTarget}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default async function SeoIntelligencePage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  if (!membership || !organization) return null;
  if (!isMainSetuOrganization(organization as any)) return <StateMessage title="SEO intelligence is restricted to the main SETU Flow organization" description="Customer workspaces can manage CRM data, but SEO strategy and competitor monitoring are controlled from the main organization." tone="warning" />;

  const opportunityScore = average(seoCompetitors.map((competitor) => competitor.setuOpportunityScore));
  const relevanceScore = average(seoCompetitors.map((competitor) => competitor.relevanceScore));
  const missingClusters = seoKeywordClusters.filter((cluster) => cluster.currentCoverage === 'missing');
  const p0Actions = seoUpgradeActions.filter((action) => action.priority === 'p0');
  const topDailyDemand = Math.max(...seoSearchSignals.filter((signal) => signal.window === 'daily').map((signal) => signal.relativeDemand));
  const seoBotOwned = seoOpportunities.filter((opportunity) => opportunity.owner === 'seo_bot');

  return (
    <AdminSettingsShell active="seo" organizationName={organization.name} missingCount={0} sectionTitle="SEO Intelligence" gapItems={[]}>
      <AdminPageHero
        title="SEO Intelligence"
        description="Track where SETU Flow stands against CRM competitors, what import-export CRM buyers search for, and which SEO upgrades should move next."
        badge="Main organization only"
        cta={<Link href="https://www.setuflowcrm.com" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open public site</Link>}
        stats={[{ label: 'Opportunity', value: `${opportunityScore}/100`, tone: 'success' }, { label: 'Missing clusters', value: missingClusters.length, tone: 'warning' }, { label: 'P0 upgrades', value: p0Actions.length, tone: 'danger' }]}
      />

      <section className="grid gap-4 lg:grid-cols-4">
        {[['Where we stand', `${opportunityScore}/100`, 'Average SETU opportunity against tracked competitors.'], ['Search relevance', `${relevanceScore}/100`, 'How close the competitor space is to our target market.'], ['Daily demand', `${topDailyDemand}/100`, 'Top active import-export CRM search signal.'], ['SEO upgrade', `${p0Actions.length} P0`, 'Immediate changes to push for ranking lift.']].map(([label, value, copy]) => (
          <div key={label} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">{label}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>
        ))}
      </section>

      <SectionCard eyebrow="Comparison analytics" title="SETU Flow vs CRM and trade-software competitors" description="Planning scores show which competitor keyword battles are worth fighting first.">
        <div className="space-y-3">
          {seoCompetitors.slice().sort((a, b) => b.setuOpportunityScore - a.setuOpportunityScore).map((competitor) => (
            <article key={competitor.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="text-lg font-semibold tracking-tight text-slate-950">{competitor.name}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{competitor.gap}</p></div><a href={competitor.url} className="text-sm font-semibold text-blue-700 hover:text-blue-900">Open site</a></div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3"><div><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>Authority</span><span>{competitor.authorityScore}/100</span></div><ScoreBar value={competitor.authorityScore} /></div><div><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>Relevance</span><span>{competitor.relevanceScore}/100</span></div><ScoreBar value={competitor.relevanceScore} /></div><div><div className="mb-1 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><span>SETU opportunity</span><span>{competitor.setuOpportunityScore}/100</span></div><ScoreBar value={competitor.setuOpportunityScore} /></div></div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Search demand" title="What people search when looking for CRM in the import-export industry" description={seoPageMetadata.analyticsNote}>
        <div className="mb-4 flex flex-wrap gap-2"><a href="#search-daily" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Daily</a><a href="#search-weekly" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Weekly</a><a href="#search-monthly" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Monthly</a></div>
        <div className="space-y-4"><SearchWindow window="daily" title="Daily buyer and operator intent" /><SearchWindow window="weekly" title="Weekly comparison intent" /><SearchWindow window="monthly" title="Monthly category and education intent" /></div>
      </SectionCard>

      <SectionCard eyebrow="Keyword gap map" title="Coverage and required pages" description="This shows which search clusters have partial coverage and which need new SEO pages.">
        <div className="space-y-3">
          {seoKeywordClusters.map((cluster) => (
            <article key={cluster.cluster} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="text-lg font-semibold tracking-tight text-slate-950">{cluster.cluster}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{cluster.contentAngle}</p></div><div className="flex shrink-0 flex-wrap gap-2"><StatusBadge label={cluster.intent} tone="info" dot={false} /><StatusBadge label={`${cluster.priority} priority`} tone={toneForPriority(cluster.priority)} dot={false} /><StatusBadge label={cluster.currentCoverage} tone={toneForCoverage(cluster.currentCoverage)} dot={false} /></div></div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_280px]"><div className="flex flex-wrap gap-2">{cluster.examples.map((keyword) => <StatusBadge key={keyword} label={keyword} tone="neutral" dot={false} />)}</div><div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">Recommended page: {cluster.recommendedPage}</div></div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="SEO upgrade queue" title="Changes to push next for ranking lift" description="These are the next metadata, content, schema, internal-link, and automation changes the bot should help produce as reviewable PRs.">
        <div className="grid gap-3 md:grid-cols-2">
          {seoUpgradeActions.map((action) => <article key={action.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap gap-2"><StatusBadge label={action.priority.toUpperCase()} tone={toneForUpgrade(action.priority)} dot={false} /><StatusBadge label={action.type.replace(/_/g, ' ')} tone="info" dot={false} /></div><h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{action.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600"><strong>Target:</strong> {action.target}</p><p className="mt-1 text-sm leading-6 text-slate-600"><strong>Expected lift:</strong> {action.expectedLift}</p><p className="mt-1 text-sm leading-6 text-slate-600">{action.implementation}</p></article>)}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Automation" title="Daily monitoring, weekly review, safe publishing" description="The SEO bot monitors daily and opens reviewable PRs. Claim-heavy content still needs approval before publishing.">
        <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4"><h3 className="text-base font-bold text-emerald-950">Automated now</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900"><li>Daily keyword and competitor report generation.</li><li>Metadata, schema, and content recommendations.</li><li>Report artifacts under docs/seo.</li><li>Reviewable GitHub PRs instead of silent live changes.</li></ul></div><div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4"><h3 className="text-base font-bold text-amber-950">Human approval still required</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900"><li>Competitor, ranking, search-volume, pricing, or market-share claims.</li><li>New public pages with commercial claims.</li><li>AI-generated long-form content before publishing.</li><li>Customer-route, auth, or database changes.</li></ul></div></div>
        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600"><strong>Current bot-owned queue:</strong> {seoBotOwned.map((item) => item.title).join(', ') || 'No bot-owned tasks configured.'}</div>
      </SectionCard>
    </AdminSettingsShell>
  );
}
