import Link from 'next/link';
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

export default async function SmcSeoPage() {
  const [bot, trends, searchConsole] = await Promise.all([
    getSeoBotStatus(),
    getLiveGoogleTrends(),
    getSearchConsoleSnapshot(),
  ]);

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

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Growth · Search & SEO</div>
          <h1>SEO Command Center</h1>
          <p>Real bot health, Google visibility, keyword coverage and the next work that improves discovery.</p>
        </div>
      </div>

      <div className="smc-kr">
        <div className="smc-kp teal"><div className="v">{seoHealth}%</div><div className="l">SEO Health</div></div>
        <div className="smc-kp"><div className="v">{searchConsole.status === 'connected' ? number(searchConsole.impressions) : '—'}</div><div className="l">Google Impressions · 28d</div></div>
        <div className="smc-kp"><div className="v">{searchConsole.status === 'connected' ? number(searchConsole.clicks) : '—'}</div><div className="l">Google Clicks · 28d</div></div>
        <div className={`smc-kp ${bot.status === 'healthy' ? 'teal' : 'amber'}`}><div className="v">{bot.status === 'healthy' ? 'LIVE' : bot.status.toUpperCase()}</div><div className="l">SEO Bot</div></div>
      </div>

      <div className="smc-content-page">
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
            <h3>Google Trends</h3>
            <p><strong>Status:</strong> {trends.status}</p>
            <p>{trends.message}</p>
            <p><strong>Tracked:</strong> {trends.queries.slice(0, 5).join(', ')}</p>
          </div>

          <div className="smc-content-card">
            <h3>LinkedIn Distribution</h3>
            <p><strong>Cadence:</strong> Weekdays at 13:30 UTC</p>
            <p><strong>Current state:</strong> {linkedinConfigured ? 'Publisher credentials detected' : 'Credentials required'}</p>
            <p>{linkedinConfigured ? 'The scheduled publisher is ready to send the rotating Setu Flow growth campaign.' : 'Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN to activate automatic posting.'}</p>
          </div>
        </div>

        <h2 style={{ marginTop: 24 }}>Google Search Performance</h2>
        {searchConsole.status === 'connected' ? (
          <div className="smc-content-grid">
            <div className="smc-content-card"><h4>Impressions</h4><p>{number(searchConsole.impressions)}</p></div>
            <div className="smc-content-card"><h4>Clicks</h4><p>{number(searchConsole.clicks)}</p></div>
            <div className="smc-content-card"><h4>CTR</h4><p>{pct(searchConsole.ctr)}</p></div>
            <div className="smc-content-card"><h4>Average position</h4><p>{number(searchConsole.position)}</p></div>
          </div>
        ) : (
          <div className="smc-content-card">
            <h4>Search Console connection required</h4>
            <p>{searchConsole.message}</p>
            <p>Once the three Google OAuth environment variables are added, this page will switch from placeholders to live Google search data automatically.</p>
          </div>
        )}

        {searchConsole.queries.length > 0 ? (
          <>
            <h2 style={{ marginTop: 24 }}>Top Google Queries · 28 days</h2>
            <div className="smc-content-grid">
              {searchConsole.queries.slice(0, 12).map((row) => (
                <div key={row.query} className="smc-content-card">
                  <h4>{row.query}</h4>
                  <p>{number(row.impressions)} impressions · {number(row.clicks)} clicks</p>
                  <p>Position {number(row.position)} · CTR {pct(row.ctr)}</p>
                </div>
              ))}
            </div>
          </>
        ) : null}

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
          <p>Use SMC for daily monitoring. Use the internal Admin SEO page for deeper trend charts and PR creation until those controls are fully consolidated here.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <Link href="/admin/seo-intelligence">Open SEO Intelligence</Link>
            <Link href="https://www.setuflowcrm.com">Open public site</Link>
          </div>
        </div>
      </div>
    </>
  );
}
