import { getSearchConsoleAccessToken, type SearchConsoleQueryRow } from '@/lib/seo/search-console';

export type SeoRankBuckets = {
  top10: number;
  top20: number;
  top50: number;
  visibleQueries: number;
};

export type SeoSearchWindow = {
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  rankBuckets: SeoRankBuckets;
  queries: SearchConsoleQueryRow[];
};

export type SeoSearchProgress = {
  status: 'connected' | 'not_configured' | 'error' | 'waiting';
  message: string;
  baselineDate: string;
  daysCompared: number;
  current: SeoSearchWindow;
  baseline: SeoSearchWindow;
  nonBrandQueries: SearchConsoleQueryRow[];
};

const DAY_MS = 86_400_000;
const DEFAULT_BASELINE_DATE = '2026-08-21';

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function yesterday() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date);
}

function emptyBuckets(): SeoRankBuckets {
  return { top10: 0, top20: 0, top50: 0, visibleQueries: 0 };
}

function emptyWindow(startDate: string, endDate: string): SeoSearchWindow {
  return { startDate, endDate, clicks: 0, impressions: 0, ctr: 0, position: 0, rankBuckets: emptyBuckets(), queries: [] };
}

function mapQueries(rows: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> = []) {
  return rows.map((row) => ({
    query: row.keys?.[0] || 'Unknown query',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

function rankBuckets(rows: SearchConsoleQueryRow[]): SeoRankBuckets {
  const visible = rows.filter((row) => row.impressions > 0 && row.position > 0);
  return {
    top10: visible.filter((row) => row.position <= 10).length,
    top20: visible.filter((row) => row.position <= 20).length,
    top50: visible.filter((row) => row.position <= 50).length,
    visibleQueries: visible.length,
  };
}

function isBrandQuery(query: string) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return normalized === 'setu' || normalized.includes('setu flow') || normalized.includes('setuflow') || normalized.includes('setu crm');
}

async function searchAnalytics(endpoint: string, accessToken: string, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Search Console progress query returned ${response.status}`);
  return response.json() as Promise<{
    rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
  }>;
}

async function loadWindow(endpoint: string, accessToken: string, startDate: string, endDate: string): Promise<SeoSearchWindow> {
  const [totalsPayload, queryPayload] = await Promise.all([
    searchAnalytics(endpoint, accessToken, { startDate, endDate, rowLimit: 1 }),
    searchAnalytics(endpoint, accessToken, { startDate, endDate, dimensions: ['query'], rowLimit: 1000 }),
  ]);
  const totals = totalsPayload.rows?.[0];
  const queries = mapQueries(queryPayload.rows ?? []);
  return {
    startDate,
    endDate,
    clicks: totals?.clicks ?? 0,
    impressions: totals?.impressions ?? 0,
    ctr: totals?.ctr ?? 0,
    position: totals?.position ?? 0,
    rankBuckets: rankBuckets(queries),
    queries,
  };
}

export async function getSeoSearchProgress(): Promise<SeoSearchProgress> {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || 'sc-domain:setuflowcrm.com';
  const baselineDate = process.env.SEO_BASELINE_DATE?.trim() || DEFAULT_BASELINE_DATE;
  const endDate = yesterday();
  const accessToken = await getSearchConsoleAccessToken();
  const baselineEnd = shiftDate(baselineDate, -1);

  if (!accessToken) {
    return {
      status: 'not_configured',
      message: 'Search Console OAuth is required before SEO progress can be measured.',
      baselineDate,
      daysCompared: 0,
      current: emptyWindow(baselineDate, endDate),
      baseline: emptyWindow(baselineEnd, baselineEnd),
      nonBrandQueries: [],
    };
  }

  const daysSinceBaseline = Math.floor((parseDate(endDate).getTime() - parseDate(baselineDate).getTime()) / DAY_MS) + 1;
  if (daysSinceBaseline <= 0) {
    return {
      status: 'waiting',
      message: `Baseline is fixed at ${baselineDate}. Search Console has not reported a post-baseline day yet.`,
      baselineDate,
      daysCompared: 0,
      current: emptyWindow(baselineDate, endDate),
      baseline: emptyWindow(baselineEnd, baselineEnd),
      nonBrandQueries: [],
    };
  }

  const daysCompared = Math.min(28, daysSinceBaseline);
  const currentStart = shiftDate(endDate, -(daysCompared - 1));
  const baselineStart = shiftDate(baselineEnd, -(daysCompared - 1));
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  try {
    const [current, baseline] = await Promise.all([
      loadWindow(endpoint, accessToken, currentStart, endDate),
      loadWindow(endpoint, accessToken, baselineStart, baselineEnd),
    ]);
    const nonBrandQueries = current.queries
      .filter((row) => !isBrandQuery(row.query))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);
    return {
      status: 'connected',
      message: `Comparing ${daysCompared} day${daysCompared === 1 ? '' : 's'} after the Aug 21 SEO baseline with the same number of days immediately before it.`,
      baselineDate,
      daysCompared,
      current,
      baseline,
      nonBrandQueries,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SEO progress could not be loaded.',
      baselineDate,
      daysCompared,
      current: emptyWindow(currentStart, endDate),
      baseline: emptyWindow(baselineStart, baselineEnd),
      nonBrandQueries: [],
    };
  }
}
