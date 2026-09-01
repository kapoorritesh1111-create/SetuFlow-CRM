import type { SeoBotStatus } from '@/lib/seo/seo-bot-status';
import type { SeoConversionSnapshot } from '@/lib/seo/conversions';
import type { SeoSearchProgress } from '@/lib/seo/search-console-progress';

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function pct(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function delta(current: number, baseline: number, invert = false) {
  if (!baseline) return current ? 'new' : '—';
  const raw = ((current - baseline) / baseline) * 100;
  const adjusted = invert ? -raw : raw;
  return `${adjusted >= 0 ? '+' : ''}${Math.round(adjusted)}%`;
}

function shortPath(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new URL(value).pathname || '/';
  } catch {
    return value;
  }
}

function barWidth(value: number, max: number) {
  if (!value || !max) return '2%';
  return `${Math.max(4, Math.min(100, (value / max) * 100))}%`;
}

export function SeoProgressSummary({
  progress,
  conversions,
  bot,
}: {
  progress: SeoSearchProgress;
  conversions: SeoConversionSnapshot;
  bot: SeoBotStatus;
}) {
  const baseline = progress.baseline;
  const current = progress.current;
  const maxBucket = Math.max(
    1,
    baseline.rankBuckets.top50,
    current.rankBuckets.top50,
  );
  const audits = bot.data?.targetPageAnalyses ?? [];

  return (
    <>
      <div className="smc-content-card" style={{ marginBottom: 18, borderLeft: '4px solid #0f766e' }}>
        <div className="bc">SEO progress since Aug 21, 2026</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '5px 0 8px' }}>Are we actually moving up?</h2>
            <p style={{ margin: 0, maxWidth: 780 }}>{progress.message}</p>
          </div>
          <div style={{ fontSize: 12, opacity: 0.72, textAlign: 'right' }}>
            <div><strong>Baseline:</strong> {progress.baselineDate}</div>
            <div><strong>Comparable days:</strong> {progress.daysCompared}</div>
          </div>
        </div>

        {progress.status === 'connected' ? (
          <div className="smc-content-grid" style={{ marginTop: 16 }}>
            <div className="smc-content-card">
              <h4>Google impressions</h4>
              <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 3px' }}>{number(current.impressions)}</p>
              <p>Baseline {number(baseline.impressions)} · <strong>{delta(current.impressions, baseline.impressions)}</strong></p>
            </div>
            <div className="smc-content-card">
              <h4>Google clicks</h4>
              <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 3px' }}>{number(current.clicks)}</p>
              <p>Baseline {number(baseline.clicks)} · <strong>{delta(current.clicks, baseline.clicks)}</strong></p>
            </div>
            <div className="smc-content-card">
              <h4>Average position</h4>
              <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 3px' }}>{current.position ? number(current.position) : '—'}</p>
              <p>Baseline {baseline.position ? number(baseline.position) : '—'} · lower is better</p>
            </div>
            <div className="smc-content-card">
              <h4>Organic demo requests</h4>
              <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 3px' }}>{conversions.status === 'connected' ? number(conversions.organicDemoRequests) : '—'}</p>
              <p>{conversions.status === 'connected' ? `${conversions.totalDemoRequests} total demos attributed since baseline` : conversions.message}</p>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'rgba(148,163,184,.10)' }}>
            <strong>{progress.status === 'waiting' ? 'Waiting for Google post-baseline data' : 'SEO progress data unavailable'}</strong>
            <p style={{ marginBottom: 0 }}>{progress.message}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 16, marginBottom: 18 }}>
        <div className="smc-content-card">
          <h3>Keyword positions · baseline vs now</h3>
          <p>Counts are cumulative: Top 10 is included in Top 20 and Top 50.</p>
          {(['top10', 'top20', 'top50'] as const).map((key) => {
            const label = key === 'top10' ? 'Top 10' : key === 'top20' ? 'Top 20' : 'Top 50';
            const currentValue = current.rankBuckets[key];
            const baselineValue = baseline.rankBuckets[key];
            return (
              <div key={key} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <strong>{label}</strong>
                  <span>{currentValue} now · {baselineValue} baseline</span>
                </div>
                <div style={{ marginTop: 7, height: 8, borderRadius: 999, background: 'rgba(148,163,184,.18)', overflow: 'hidden' }}>
                  <div style={{ width: barWidth(currentValue, maxBucket), height: '100%', background: '#0f766e', borderRadius: 999 }} />
                </div>
                <div style={{ marginTop: 4, height: 5, borderRadius: 999, background: 'rgba(148,163,184,.12)', overflow: 'hidden' }}>
                  <div style={{ width: barWidth(baselineValue, maxBucket), height: '100%', background: '#94a3b8', borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
          <p style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>Visible non-zero query rows: {current.rankBuckets.visibleQueries} now · {baseline.rankBuckets.visibleQueries} baseline.</p>
        </div>

        <div className="smc-content-card">
          <h3>Non-brand search visibility</h3>
          <p>This is the most important early signal: people finding Setu Flow without already knowing the brand.</p>
          {progress.nonBrandQueries.length ? (
            <div style={{ display: 'grid', gap: 11, marginTop: 15 }}>
              {progress.nonBrandQueries.slice(0, 10).map((row) => (
                <div key={row.query} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{row.query}</strong>
                    <span style={{ fontSize: 11, opacity: 0.68 }}>{number(row.impressions)} impressions · {number(row.clicks)} clicks · CTR {pct(row.ctr)}</span>
                  </div>
                  <strong style={{ whiteSpace: 'nowrap' }}>#{number(row.position)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 16, opacity: 0.72 }}>No post-baseline non-brand query data yet. This will populate automatically as Google reports search impressions.</p>
          )}
        </div>
      </div>

      <div className="smc-content-card" style={{ marginBottom: 18, overflowX: 'auto' }}>
        <h3>SEO bot · target landing-page audit</h3>
        <p>The bot now checks the page that is supposed to rank for each keyword cluster instead of judging everything from the homepage.</p>
        {audits.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14, minWidth: 820, fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(148,163,184,.25)' }}>
                <th style={{ padding: '10px 8px' }}>Keyword cluster</th>
                <th style={{ padding: '10px 8px' }}>Target page</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Phrase coverage</th>
                <th style={{ padding: '10px 8px' }}>Canonical</th>
                <th style={{ padding: '10px 8px' }}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.targetPage} style={{ borderBottom: '1px solid rgba(148,163,184,.13)' }}>
                  <td style={{ padding: '11px 8px', fontWeight: 700 }}>{audit.cluster}</td>
                  <td style={{ padding: '11px 8px' }}>{audit.targetPage}</td>
                  <td style={{ padding: '11px 8px', textAlign: 'right' }}>{audit.hits}/{audit.keywordCount}</td>
                  <td style={{ padding: '11px 8px' }}>{audit.canonicalOk ? '✓ self-canonical' : '⚠ review'}</td>
                  <td style={{ padding: '11px 8px' }}>{audit.issues.length ? audit.issues.join(' · ') : 'Healthy'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ marginTop: 16, opacity: 0.72 }}>Run the upgraded SEO bot once after deployment to populate target-page audit results.</p>
        )}
      </div>

      {conversions.status === 'connected' ? (
        <div className="smc-content-card" style={{ marginBottom: 18 }}>
          <h3>Organic pipeline attribution</h3>
          <p>Demo requests are attributed from first-touch marketing data captured on the public site.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 12, fontSize: 13 }}>
            <span><strong>{conversions.organicDemoRequests}</strong> organic search</span>
            <span><strong>{conversions.paidSearchDemoRequests}</strong> paid search</span>
            <span><strong>{conversions.socialDemoRequests}</strong> social</span>
            <span><strong>{conversions.referralDemoRequests}</strong> referral</span>
            <span><strong>{conversions.directDemoRequests}</strong> direct</span>
          </div>
          {conversions.recent.length ? (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {conversions.recent.slice(0, 5).map((event, index) => (
                <div key={`${event.createdAt}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontSize: 12 }}>
                  <span><strong>{event.channel}</strong> · {shortPath(event.landingPage)}</span>
                  <span style={{ opacity: 0.66 }}>{new Date(event.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
