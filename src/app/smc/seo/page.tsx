import Link from 'next/link';
import { SeoPerformanceVisuals } from '@/components/smc/seo-performance-visuals';
import { getLiveGoogleTrends } from '@/lib/seo/google-trends';
import { getSearchConsoleSnapshot } from '@/lib/seo/search-console';
import { getSeoBotStatus } from '@/lib/seo/seo-bot-status';
import { seoCompetitors, seoKeywordClusters, seoUpgradeActions } from '@/lib/seo/seo-intelligence';

function pct(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function deltaLabel(current: number, previous: number) {
  if (!previous) return current ? 'new' : '—';
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : ''}${Math.round(delta)}%`;
}

function actionNotice(action?: string, message?: string, pr?: string) {
  if (action === 'bot-started') return { tone: '#0f766e', text: 'SEO bot started in GitHub Actions. The SMC bot status will refresh after the workflow finishes.' };
  if (action === 'pr-published') return { tone: '#0f766e', text: `SEO PR #${pr || ''} was published to main. Vercel will deploy the change automatically.` };
  if (action === 'github-token-required') return { tone: '#b45309', text: 'GitHub publishing is not configured yet. Add SEO_GITHUB_TOKEN in Vercel to run the bot, create SEO PRs, and publish approved work from SMC.' };
  if (action === 'error') return { tone: '#b91c1c', text: message || 'The SEO action could not be completed.' };
  return null;
}

const buttonBase = {
  border: 0,
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 750,
  cursor: 'pointer',
} as const;

export default async function SmcSeoPage({ searchParams }: { searchParams?: { seoAction?: string; message?: string; pr?: string } }) {
  const [bot, trends, searchConsole] = await Promise.all([
    getSeoBotStatus(),
    getLiveGoogleTrends(),
    getSearchConsoleSnapshot(),
  ]);

  const githubConfigured = Boolean(
    process.env.SEO_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim(),
  );
  const linkedinConfigured = Boolean(
    process.env.LINKEDIN_ACCESS_TOKEN?.trim() && process.env.LINKEDIN_AUTHOR_URN?.trim(),
  );
  const readyClusters = seoKeywordClusters.filter((cluster) => cluster.currentCoverage === 'ready').length;
  const coverageHealth = Math.round((readyClusters / Math.max(seoKeywordClusters.length, 1)) * 100);
  const botHealth = bot.status === 'healthy' ? 100 : bot.status === 'stale' ? 55 : 20;
  const trendHealth = trends.status === 'connected' ? (trends.degraded ? 80 : 100) : 45;
  const searchHealth = searchConsole.status === 'connected' ? 100 : 35;
  const seoHealth = Math.round(coverageHealth * 0.4 + botHealth * 0.25 + trendHealth * 0.15 + searchHealth * 0.2);
  const homepageCoverage = bot.data?.siteAnalysis.clusterCoverage ?? [];
  const recent7 = searchConsole.daily.slice(-7);
  const previous7 = searchConsole.daily.slice(-14, -7);
  const recentImpressions = recent7.reduce((sum, row) => sum + row.impressions, 0);
  const previousImpressions = previous7.reduce((sum, row) => sum + row.impressions, 0);
  const recentClicks = recent7.reduce((sum, row) => sum + row.clicks, 0);
  const previousClicks = previous7.reduce((sum, row) => sum + row.clicks, 0);
  const notice = actionNotice(
    searchParams?.seoAction,
    searchParams?.message ? decodeURIComponent(searchParams.message) : undefined,
    searchParams?.pr,
  );

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Growth · Search & SEO</div>
          <h1>SEO Command Center</h1>
          <p>Monitor Google visibility, see which pages and queries are moving, run the SEO bot, and publish approved SEO work through GitHub.</p>
        </div>
      </div>

      <div className="smc-kr">
        <div className="smc-kp teal"><div className="v">{seoHealth}%</div><div className="l">SEO Health</div></div>
        <div className="smc-kp"><div className="v">{searchConsole.status === 'connected' ? number(searchConsole.impressions) : '—'}</div><div className="l">Google Impressions · 28d</div></div>
        <div className="smc-kp"><div className="v">{searchConsole.status === 'connected' ? number(searchConsole.clicks) : '—'}</div><div className="l">Google Clicks · 28d</div></div>
        <div className={`smc-kp ${bot.status === 'healthy' ? 'teal' : 'amber'}`}><div className="v">{bot.status === 'healthy' ? 'LIVE' : bot.status.toUpperCase()}</div><div className="l">SEO Bot</div></div>
      </div>

      <div className="smc-content-page">
        {notice ? (
          <div className="smc-content-card" style={{ marginBottom: 16, borderLeft: `4px solid ${notice.tone}` }}>
            <strong>{notice.text}</strong>
          </div>
        ) : null}

        <div className="smc-content-card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ maxWidth: 720 }}>
              <div className="bc">SEO publishing controls</div>
              <h2 style={{ margin: '4px 0 8px' }}>Operate SEO directly from SMC</h2>
              <p style={{ margin: 0 }}>Run the live SEO audit, generate a reviewable SEO improvement PR, then explicitly publish an approved SMC-generated PR to main. Google Search Console remains read-only for measurement and indexing visibility.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <form action="/api/smc/seo/run-bot" method="post">
                <button type="submit" disabled={!githubConfigured} style={{ ...buttonBase, background: githubConfigured ? '#0f766e' : '#cbd5e1', color: githubConfigured ? '#fff' : '#64748b', cursor: githubConfigured ? 'pointer' : 'not-allowed' }}>Run SEO bot now</button>
              </form>
              <form action="/api/admin/seo/create-pr" method="post" target="_blank">
                <button type="submit" disabled={!githubConfigured} style={{ ...buttonBase, background: githubConfigured ? '#0f172a' : '#cbd5e1', color: githubConfigured ? '#fff' : '#64748b', cursor: githubConfigured ? 'pointer' : 'not-allowed' }}>Create SEO improvement PR</button>
              </form>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(148,163,184,.2)' }}>
            <div style={{ fontWeight: 750, marginBottom: 7 }}>Publish an approved SMC SEO PR to main</div>
            <p style={{ margin: '0 0 10px', fontSize: 13, opacity: 0.76 }}>Review the generated PR in GitHub first. Then enter its PR number here. SMC only permits open PRs created by the `seo/quality-improvement-*` workflow and targeting `main`.</p>
            <form action="/api/smc/seo/publish-pr" method="post" style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
              <input name="prNumber" type="number" min="1" required placeholder="PR number" disabled={!githubConfigured} style={{ width: 130, border: '1px solid rgba(148,163,184,.45)', borderRadius: 9, padding: '9px 11px', background: 'transparent' }} />
              <button type="submit" disabled={!githubConfigured} style={{ ...buttonBase, background: githubConfigured ? '#166534' : '#cbd5e1', color: githubConfigured ? '#fff' : '#64748b', cursor: githubConfigured ? 'pointer' : 'not-allowed' }}>Publish approved PR to main</button>
            </form>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 14, fontSize: 12, opacity: 0.76 }}>
            <span>GitHub publishing: <strong>{githubConfigured ? 'ready' : 'SEO_GITHUB_TOKEN required'}</strong></span>
            <span>Google Search Console: <strong>{searchConsole.status === 'connected' ? 'connected · read-only' : searchConsole.status.replace('_', ' ')}</strong></span>
            <span>Target branch: <strong>main after explicit approval</strong></span>
          </div>
        </div>

        <div className="smc-content-grid">
          <div className="smc-content-card">
            <h3>SEO Bot</h3>
            <p><strong>Status:</strong> {bot.status}</p>
            <p>{bot.message}</p>
            {bot.data ? <p><strong>Last run:</strong> {new Date(bot.data.generatedAt).toLocaleString()}</p> : null}
            <p><strong>Schedule:</strong> Daily at 10:15 UTC</p>
          </div>

          <div className="smc-content-card">
            <h3>Google Search Console</h3>
            <p><strong>Status:</strong> {searchConsole.status.replace('_', ' ')}</p>
            <p>{searchConsole.message}</p>
            {searchConsole.status === 'connected' ? (
              <>
                <p><strong>CTR:</strong> {pct(searchConsole.ctr)}</p>
                <p><strong>Average position:</strong> {number(searchConsole.position)}</p>
              </>
            ) : null}
          </div>

          <div className="smc-content-card">
            <h3>Sitemap & indexing</h3>
            <p><strong>Status:</strong> {searchConsole.sitemap.status.replace('_', ' ')}</p>
            <p><strong>Submitted URLs:</strong> {number(searchConsole.sitemap.submittedUrls)}</p>
            <p><strong>Indexed URLs:</strong> {number(searchConsole.sitemap.indexedUrls)}</p>
            <p><strong>Errors / warnings:</strong> {searchConsole.sitemap.errors} / {searchConsole.sitemap.warnings}</p>
            {searchConsole.sitemap.lastDownloaded ? <p><strong>Google last read:</strong> {new Date(searchConsole.sitemap.lastDownloaded).toLocaleString()}</p> : null}
          </div>

          <div className="smc-content-card">
            <h3>Google Trends</h3>
            <p><strong>Status:</strong> {trends.status}</p>
            <p>{trends.message}</p>
            <p><strong>Tracked:</strong> {trends.queries.slice(0, 5).join(', ')}</p>
          </div>
        </div>

        <h2 style={{ marginTop: 24 }}>Google Search Performance</h2>
        {searchConsole.status === 'connected' ? (
          <>
            <div className="smc-content-grid">
              <div className="smc-content-card"><h4>Impressions · 28d</h4><p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{number(searchConsole.impressions)}</p><p>Last 7 days: {number(recentImpressions)} · {deltaLabel(recentImpressions, previousImpressions)} vs prior 7d</p></div>
              <div className="smc-content-card"><h4>Clicks · 28d</h4><p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{number(searchConsole.clicks)}</p><p>Last 7 days: {number(recentClicks)} · {deltaLabel(recentClicks, previousClicks)} vs prior 7d</p></div>
              <div className="smc-content-card"><h4>CTR</h4><p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{pct(searchConsole.ctr)}</p><p>Shows how often a Google impression becomes a visit.</p></div>
              <div className="smc-content-card"><h4>Average position</h4><p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 4px' }}>{number(searchConsole.position)}</p><p>Lower is better; page-one positions are 1–10.</p></div>
            </div>
            <SeoPerformanceVisuals snapshot={searchConsole} trends={trends} />
          </>
        ) : (
          <div className="smc-content-card">
            <h4>Search Console connection required</h4>
            <p>{searchConsole.message}</p>
          </div>
        )}

        <h2 style={{ marginTop: 24 }}>Homepage Keyword Coverage · Latest Bot Run</h2>
        <div className="smc-content-grid">
          {homepageCoverage.length > 0 ? homepageCoverage.map((cluster) => (
            <div key={cluster.cluster} className="smc-content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <h4>{cluster.cluster}</h4>
                <strong>{cluster.hits}/{cluster.keywordCount}</strong>
              </div>
              <p>{cluster.hits === 0 ? 'No direct phrase coverage detected on the homepage.' : 'Homepage contains direct phrase coverage.'}</p>
            </div>
          )) : seoKeywordClusters.map((cluster) => (
            <div key={cluster.cluster} className="smc-content-card">
              <h4>{cluster.cluster}</h4>
              <p>Bot telemetry unavailable. Target page: {cluster.recommendedPage}</p>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 24 }}>Target Keyword Clusters</h2>
        <div className="smc-content-grid">
          {seoKeywordClusters.map((cluster) => (
            <div key={cluster.cluster} className="smc-content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <h4>{cluster.cluster}</h4>
                <strong>{cluster.currentCoverage}</strong>
              </div>
              <p>{cluster.examples.join(' · ')}</p>
              <p><strong>Target:</strong> {cluster.recommendedPage}</p>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 24 }}>Competitor Opportunity</h2>
        <div className="smc-content-grid">
          {seoCompetitors.map((competitor) => (
            <div key={competitor.name} className="smc-content-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <h4>{competitor.name}</h4>
                <strong>{competitor.setuOpportunityScore}/100</strong>
              </div>
              <p>{competitor.gap}</p>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 24 }}>Next SEO Actions</h2>
        <div className="smc-content-grid">
          {seoUpgradeActions.map((action) => (
            <div key={action.title} className="smc-content-card">
              <h4>{action.title}</h4>
              <p><strong>{action.priority.toUpperCase()}</strong> · {action.expectedLift}</p>
              <p>{action.implementation}</p>
            </div>
          ))}
        </div>

        {bot.data?.recommendations?.length ? (
          <>
            <h2 style={{ marginTop: 24 }}>Recommendations From Today&apos;s Bot</h2>
            <div className="smc-content-card">
              <ul>
                {bot.data.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
              </ul>
            </div>
          </>
        ) : null}

        <div className="smc-content-card" style={{ marginTop: 24 }}>
          <h3>Operator links</h3>
          <p>SMC is now the daily operating view. The internal SEO Intelligence page remains available for deeper technical analysis.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
            <Link href="/admin/seo-intelligence">Open SEO Intelligence</Link>
            <Link href="https://www.setuflowcrm.com/sitemap.xml" target="_blank">Open sitemap</Link>
            <Link href="https://github.com/kapoorritesh1111-create/SetuFlow-CRM/actions/workflows/seo-autobot.yml" target="_blank">Open SEO bot in GitHub</Link>
            <Link href="https://github.com/kapoorritesh1111-create/SetuFlow-CRM/pulls" target="_blank">Review SEO PRs</Link>
            <Link href="https://www.setuflowcrm.com" target="_blank">Open public site</Link>
          </div>
        </div>

        <div className="smc-content-card" style={{ marginTop: 16, opacity: 0.9 }}>
          <h3>LinkedIn Distribution</h3>
          <p><strong>Cadence:</strong> Weekdays at 13:30 UTC · <strong>Current state:</strong> {linkedinConfigured ? 'publisher credentials detected' : 'credentials required'}</p>
          <p>We will activate and validate LinkedIn after the Google/SMC SEO command center is stable.</p>
        </div>
      </div>
    </>
  );
}
