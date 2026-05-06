import Link from 'next/link';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { seoCompetitors, seoKeywordClusters, seoOpportunities, seoPageMetadata } from '@/lib/seo/seo-intelligence';

export const metadata = {
  title: 'SEO Intelligence | SETU Flow Admin',
  robots: { index: false, follow: false },
};

function isMainSetuOrganization(organization: { name?: string | null; slug?: string | null; domain?: string | null }) {
  const joined = [organization.name, organization.slug, organization.domain].filter(Boolean).join(' ').toLowerCase();
  return joined.includes('setu') || joined.includes('setugroups') || joined.includes('setu-flow');
}

function toneForPriority(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'danger' as const;
  if (priority === 'medium') return 'warning' as const;
  return 'neutral' as const;
}

function toneForImpact(impact: 'high' | 'medium' | 'low') {
  if (impact === 'high') return 'success' as const;
  if (impact === 'medium') return 'info' as const;
  return 'neutral' as const;
}

export default async function SeoIntelligencePage() {
  if (!hasSupabaseEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  }

  const { missingEnv, membership, organization } = await requireAdminWorkspace();

  if (missingEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using the SEO intelligence workspace." tone="warning" />;
  }

  if (!membership || !organization) return null;

  if (!isMainSetuOrganization(organization as any)) {
    return (
      <StateMessage
        title="SEO intelligence is restricted to the main SETU Flow organization"
        description="Customer workspaces can manage their CRM data, but competitor monitoring, SEO strategy, and public website optimization are controlled from the main SETU Flow organization."
        tone="warning"
      />
    );
  }

  const highPriorityClusters = seoKeywordClusters.filter((cluster) => cluster.priority === 'high');
  const comparisonClusters = seoKeywordClusters.filter((cluster) => cluster.intent === 'comparison');
  const seoBotOwned = seoOpportunities.filter((opportunity) => opportunity.owner === 'seo_bot');

  return (
    <AdminSettingsShell active="seo" organizationName={organization.name} missingCount={0} sectionTitle="SEO Intelligence" gapItems={[]}>
      <AdminPageHero
        title="SEO Intelligence"
        description="Monitor CRM competitors, keyword demand, content gaps, schema quality, and reviewable SEO bot recommendations for the public SETU Flow CRM website."
        badge="Main organization only"
        cta={<Link href="https://www.setuflowcrm.com" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Open public site</Link>}
        stats={[
          { label: 'Tracked competitors', value: seoCompetitors.length, tone: 'info' },
          { label: 'Keyword clusters', value: seoKeywordClusters.length, tone: 'success' },
          { label: 'High priority', value: highPriorityClusters.length, tone: 'warning' },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">Position</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{seoPageMetadata.primaryPositioning}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Do not try to rank like a generic CRM. The SEO strategy should win narrow buying-intent searches around import-export CRM, quote workflows, trade shows, FX, incoterms, compliance, and shipment handoff.</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-600">Bot mode</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Reviewable PR automation</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">The SEO bot should collect competitor and keyword signals, generate metadata/content/schema improvements, then open GitHub PRs for review instead of silently changing the live site.</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-600">Next content moves</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{highPriorityClusters.length} high-intent clusters</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Start with solution and feature pages that answer commercial search intent. Home page metadata alone cannot carry every CRM search category.</p>
        </div>
      </section>

      <SectionCard eyebrow="Competitor intelligence" title="CRM and trade-software comparison map" description="Use this view to decide where SETU Flow should compete directly and where it should avoid generic CRM battles.">
        <div className="grid gap-3 xl:grid-cols-2">
          {seoCompetitors.map((competitor) => (
            <article key={competitor.name} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">{competitor.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{competitor.category.replace(/_/g, ' ')}</p>
                </div>
                <a href={competitor.url} className="text-sm font-semibold text-blue-700 hover:text-blue-900">Open site</a>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700"><strong>Positioning:</strong> {competitor.positioning}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong>Likely strength:</strong> {competitor.likelyStrength}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700"><strong>SETU counter:</strong> {competitor.setuCounterPosition}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {competitor.keywords.map((keyword) => <StatusBadge key={competitor.name + keyword} label={keyword} tone="neutral" dot={false} />)}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Keyword demand" title="How global import-export CRM buyers search" description="These clusters should drive the public site architecture, internal links, metadata, and future content briefs.">
        <div className="space-y-3">
          {seoKeywordClusters.map((cluster) => (
            <article key={cluster.cluster} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">{cluster.cluster}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{cluster.contentAngle}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <StatusBadge label={cluster.intent} tone="info" dot={false} />
                  <StatusBadge label={`${cluster.priority} priority`} tone={toneForPriority(cluster.priority)} dot={false} />
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_280px]">
                <div className="flex flex-wrap gap-2">
                  {cluster.examples.map((keyword) => <StatusBadge key={keyword} label={keyword} tone="neutral" dot={false} />)}
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">Recommended page: {cluster.recommendedPage}</div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="SEO bot roadmap" title="Automated recommendations and PR queue" description="The bot is designed to identify gaps and prepare reviewable changes for metadata, content, schema, and internal linking.">
        <div className="grid gap-3 md:grid-cols-2">
          {seoOpportunities.map((opportunity) => (
            <article key={opportunity.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={`impact: ${opportunity.impact}`} tone={toneForImpact(opportunity.impact)} dot={false} />
                <StatusBadge label={`effort: ${opportunity.effort}`} tone="neutral" dot={false} />
                <StatusBadge label={opportunity.owner} tone={opportunity.owner === 'seo_bot' ? 'info' : 'neutral'} dot={false} />
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{opportunity.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{opportunity.action}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Automation contract" title="What the bot should change automatically" description="Safe SEO automation should produce diffs, reports, and PRs. Final publishing stays controlled through GitHub review and Vercel deployment checks.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-base font-bold text-emerald-950">Allowed automated PRs</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
              <li>Metadata title and description proposals for existing pages.</li>
              <li>JSON-LD schema additions when backed by visible page content.</li>
              <li>Content brief markdown files for solution, feature, comparison, and resource pages.</li>
              <li>Weekly competitor/keyword gap reports stored under docs/seo.</li>
              <li>Internal link suggestions after target pages exist.</li>
            </ul>
          </div>
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-base font-bold text-amber-950">Human review required</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
              <li>Claims about competitors, rankings, search volume, pricing, or market share.</li>
              <li>New public pages that make commercial claims.</li>
              <li>Any AI-generated long-form content before publishing.</li>
              <li>Changes that affect customer routes, app authentication, or database schema.</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
          <strong>Current bot-owned queue:</strong> {seoBotOwned.map((item) => item.title).join(', ') || 'No bot-owned tasks configured.'}
        </div>
      </SectionCard>
    </AdminSettingsShell>
  );
}
