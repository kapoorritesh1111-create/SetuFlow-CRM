import type { LiveTrendResult } from '@/lib/seo/google-trends';
import type { SearchConsoleSnapshot } from '@/lib/seo/search-console';

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function pct(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function shortDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function pathLabel(page: string) {
  try {
    const url = new URL(page);
    return url.pathname || '/';
  } catch {
    return page;
  }
}

function DailySearchChart({ snapshot }: { snapshot: SearchConsoleSnapshot }) {
  const rows = snapshot.daily;
  const maxImpressions = Math.max(1, ...rows.map((row) => row.impressions));
  const latest = rows.at(-1);
  const first = rows[0];

  return (
    <div className="smc-content-card" style={{ minHeight: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Google visibility · daily</h3>
          <p style={{ margin: 0 }}>Daily impressions from Search Console. Click any bar with your cursor to see the exact day and value.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>{number(snapshot.impressions)} impressions</strong>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{snapshot.startDate} → {snapshot.endDate}</div>
        </div>
      </div>

      {rows.length ? (
        <>
          <div style={{ height: 178, display: 'flex', alignItems: 'flex-end', gap: 3, marginTop: 24, padding: '0 4px', borderBottom: '1px solid rgba(100,116,139,.25)' }}>
            {rows.map((row) => {
              const height = Math.max(row.impressions > 0 ? 5 : 2, Math.round((row.impressions / maxImpressions) * 160));
              return (
                <div key={row.date} title={`${shortDate(row.date)} · ${number(row.impressions)} impressions · ${number(row.clicks)} clicks · position ${number(row.position)}`} style={{ flex: 1, minWidth: 4, height, borderRadius: '5px 5px 0 0', background: 'linear-gradient(180deg, #18a7a0, #0b5d6b)' }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, opacity: 0.7 }}>
            <span>{first ? shortDate(first.date) : ''}</span>
            <span>Peak {number(maxImpressions)}</span>
            <span>{latest ? shortDate(latest.date) : ''}</span>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 22, padding: 28, borderRadius: 12, background: 'rgba(148,163,184,.09)' }}>
          <strong>Waiting for daily Google data</strong>
          <p style={{ marginBottom: 0 }}>The Search Console connection is live. This graph will populate as Google records impressions for Setu Flow.</p>
        </div>
      )}
    </div>
  );
}

function QueryBars({ snapshot }: { snapshot: SearchConsoleSnapshot }) {
  const rows = snapshot.queries.slice(0, 10);
  const max = Math.max(1, ...rows.map((row) => row.impressions));

  return (
    <div className="smc-content-card">
      <h3>Queries bringing Setu Flow into search</h3>
      <p>Top Search Console queries ranked by impressions.</p>
      {rows.length ? (
        <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {rows.map((row) => (
            <div key={row.query}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.query}</strong>
                <span style={{ whiteSpace: 'nowrap' }}>{number(row.impressions)} imp · #{number(row.position)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,.18)', overflow: 'hidden', marginTop: 7 }}>
                <div style={{ height: '100%', width: `${Math.max(3, (row.impressions / max) * 100)}%`, borderRadius: 999, background: '#168f8a' }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.68, marginTop: 4 }}>{number(row.clicks)} clicks · CTR {pct(row.ctr)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 18, opacity: 0.72 }}>No query rows yet. Google has connected successfully but has not reported search impressions for this period.</p>
      )}
    </div>
  );
}

function TrendBars({ trends }: { trends: LiveTrendResult }) {
  const averages = trends.averages.length
    ? trends.averages
    : trends.queries.map((query) => {
        const values = trends.points.map((point) => point.values[query]).filter((value) => Number.isFinite(value));
        return { query, value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 };
      });
  const max = Math.max(1, ...averages.map((row) => row.value));

  return (
    <div className="smc-content-card">
      <h3>Google Trends demand</h3>
      <p>Relative search interest for the keyword themes Setu Flow is targeting.</p>
      {trends.status === 'connected' && averages.length ? (
        <div style={{ display: 'grid', gap: 15, marginTop: 18 }}>
          {averages.map((row) => (
            <div key={row.query}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <strong>{row.query}</strong>
                <span>{number(row.value)}/100</span>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: 'rgba(148,163,184,.18)', overflow: 'hidden', marginTop: 7 }}>
                <div style={{ height: '100%', width: `${Math.max(2, (row.value / max) * 100)}%`, borderRadius: 999, background: '#225ea8' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 18, opacity: 0.72 }}>{trends.message}</p>
      )}
    </div>
  );
}

function LandingPagesTable({ snapshot }: { snapshot: SearchConsoleSnapshot }) {
  const rows = snapshot.pages.slice(0, 12);

  return (
    <div className="smc-content-card" style={{ overflowX: 'auto' }}>
      <h3>Landing pages in Google</h3>
      <p>Which Setu Flow pages are earning visibility and where they rank.</p>
      {rows.length ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, minWidth: 660, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(148,163,184,.25)' }}>
              <th style={{ padding: '10px 8px' }}>Page</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Impressions</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Clicks</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>CTR</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.page} style={{ borderBottom: '1px solid rgba(148,163,184,.13)' }}>
                <td style={{ padding: '11px 8px', fontWeight: 650 }}>{pathLabel(row.page)}</td>
                <td style={{ padding: '11px 8px', textAlign: 'right' }}>{number(row.impressions)}</td>
                <td style={{ padding: '11px 8px', textAlign: 'right' }}>{number(row.clicks)}</td>
                <td style={{ padding: '11px 8px', textAlign: 'right' }}>{pct(row.ctr)}</td>
                <td style={{ padding: '11px 8px', textAlign: 'right' }}>{number(row.position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ marginTop: 18, opacity: 0.72 }}>No landing-page performance is available yet. This table will populate automatically when Google starts serving the new SEO pages.</p>
      )}
    </div>
  );
}

export function SeoPerformanceVisuals({ snapshot, trends }: { snapshot: SearchConsoleSnapshot; trends: LiveTrendResult }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, .65fr)', gap: 16, marginTop: 14 }}>
        <DailySearchChart snapshot={snapshot} />
        <QueryBars snapshot={snapshot} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, .7fr) minmax(0, 1.3fr)', gap: 16, marginTop: 16 }}>
        <TrendBars trends={trends} />
        <LandingPagesTable snapshot={snapshot} />
      </div>
    </>
  );
}
