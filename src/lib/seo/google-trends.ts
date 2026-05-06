export type LiveTrendPoint = {
  label: string;
  values: Record<string, number>;
};

export type LiveTrendResult = {
  status: 'connected' | 'not_configured' | 'error';
  provider: 'serpapi' | 'searchapi' | 'google-trends-alpha' | 'none';
  message: string;
  queries: string[];
  points: LiveTrendPoint[];
  averages: Array<{ query: string; value: number }>;
  updatedAt: string;
  degraded?: boolean;
};

const defaultTrendQueries = [
  'import export CRM',
  'CRM for exporters',
  'export quote software',
  'trade show lead capture',
  'export compliance checklist',
] as const;

export function getSeoTrendQueries() {
  const rawQueries = process.env.SEO_TREND_QUERIES ?? '';
  const configured = rawQueries
    .split(',')
    .map((query: string) => query.trim())
    .filter(Boolean)
    .slice(0, 5);
  return configured.length > 0 ? configured : [...defaultTrendQueries];
}

function emptyResult(status: LiveTrendResult['status'], provider: LiveTrendResult['provider'], message: string): LiveTrendResult {
  return { status, provider, message, queries: getSeoTrendQueries(), points: [], averages: [], updatedAt: new Date().toISOString() };
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

function valueQuery(value: any, fallbackQuery?: string) {
  return String(value?.query ?? value?.keyword ?? value?.term ?? fallbackQuery ?? '');
}

function valueNumber(value: any) {
  return normalizeNumber(value?.extracted_value ?? value?.value ?? value?.interest ?? value);
}

function readTimeline(payload: any) {
  return payload?.interest_over_time?.timeline_data
    ?? payload?.interest_over_time?.timeline
    ?? payload?.interest_over_time
    ?? payload?.timeline_data
    ?? [];
}

function readAverages(payload: any) {
  return payload?.interest_over_time?.averages ?? payload?.averages ?? [];
}

function parseTimelinePayload(payload: any, queries: string[], provider: 'serpapi' | 'searchapi', message: string, degraded = false): LiveTrendResult {
  const timeline = readTimeline(payload);
  const averages = readAverages(payload);
  const points: LiveTrendPoint[] = Array.isArray(timeline) ? timeline.map((item: any) => {
    const values: Record<string, number> = {};
    const rawValues = item?.values ?? item?.value ?? item?.extracted_value ?? [];
    if (Array.isArray(rawValues)) {
      for (const value of rawValues) {
        const query = valueQuery(value, queries.length === 1 ? queries[0] : undefined);
        if (query) values[query] = valueNumber(value);
      }
    } else if (queries.length === 1) {
      values[queries[0]] = valueNumber(rawValues);
    }
    return { label: String(item?.date ?? item?.time ?? item?.timestamp ?? ''), values };
  }).filter((point: LiveTrendPoint) => point.label) : [];

  return {
    status: 'connected',
    provider,
    message,
    queries,
    points,
    averages: Array.isArray(averages) ? averages.map((item: any) => ({ query: valueQuery(item), value: valueNumber(item) })).filter((item) => item.query) : [],
    updatedAt: new Date().toISOString(),
    degraded,
  };
}

function mergeSingleQueryResults(results: LiveTrendResult[]): LiveTrendResult {
  const byLabel = new Map<string, LiveTrendPoint>();
  const queries = results.flatMap((result) => result.queries);
  const averages: Array<{ query: string; value: number }> = [];

  for (const result of results) {
    averages.push(...result.averages);
    for (const point of result.points) {
      const existing = byLabel.get(point.label) ?? { label: point.label, values: {} };
      existing.values = { ...existing.values, ...point.values };
      byLabel.set(point.label, existing);
    }
  }

  return {
    status: 'connected',
    provider: 'searchapi',
    message: 'Live Google Trends data loaded through SearchApi. Combined comparison failed, so the dashboard used one-query fallback requests.',
    queries,
    points: Array.from(byLabel.values()),
    averages,
    updatedAt: new Date().toISOString(),
    degraded: true,
  };
}

async function fetchSearchApi(searchApiKey: string, queries: string[]) {
  const url = new URL('https://www.searchapi.io/api/v1/search');
  url.searchParams.set('engine', 'google_trends');
  url.searchParams.set('data_type', 'TIMESERIES');
  url.searchParams.set('q', queries.join(','));
  url.searchParams.set('time', 'today 12-m');
  url.searchParams.set('api_key', searchApiKey);
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || payload?.error) throw new Error(payload?.error || `SearchApi returned ${response.status}`);
  return payload;
}

export async function getLiveGoogleTrends(): Promise<LiveTrendResult> {
  const queries = getSeoTrendQueries();
  const serpApiKey = process.env.SERPAPI_API_KEY || process.env.GOOGLE_TRENDS_SERPAPI_KEY;
  const searchApiKey = process.env.SEARCHAPI_API_KEY || process.env.GOOGLE_TRENDS_SEARCHAPI_KEY;
  const alphaConfigured = process.env.GOOGLE_TRENDS_API_KEY || process.env.GOOGLE_TRENDS_ALPHA_API_KEY;

  try {
    if (serpApiKey) {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_trends');
      url.searchParams.set('data_type', 'TIMESERIES');
      url.searchParams.set('q', queries.join(','));
      url.searchParams.set('date', 'today 12-m');
      url.searchParams.set('api_key', serpApiKey);
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok || payload?.error) throw new Error(payload?.error || `SerpApi returned ${response.status}`);
      return parseTimelinePayload(payload, queries, 'serpapi', 'Live Google Trends data loaded through SerpApi.');
    }

    if (searchApiKey) {
      try {
        const payload = await fetchSearchApi(searchApiKey, queries);
        return parseTimelinePayload(payload, queries, 'searchapi', 'Live Google Trends data loaded through SearchApi.');
      } catch (combinedError) {
        const singleResults: LiveTrendResult[] = [];
        for (const query of queries) {
          try {
            const payload = await fetchSearchApi(searchApiKey, [query]);
            singleResults.push(parseTimelinePayload(payload, [query], 'searchapi', `Loaded ${query} through SearchApi.`, true));
          } catch {
            // Keep trying the remaining keywords. SearchApi/Google Trends can fail on individual low-volume terms.
          }
        }
        if (singleResults.length > 0) return mergeSingleQueryResults(singleResults);
        throw combinedError;
      }
    }

    if (alphaConfigured) return emptyResult('not_configured', 'google-trends-alpha', 'Google Trends API alpha key detected, but the public alpha endpoint is not configured in this app yet. Use SERPAPI_API_KEY or SEARCHAPI_API_KEY for live data now.');
    return emptyResult('not_configured', 'none', 'Live trend data is not connected. Add SERPAPI_API_KEY or SEARCHAPI_API_KEY in Vercel to load live Google Trends interest-over-time data.');
  } catch (error) {
    return emptyResult('error', serpApiKey ? 'serpapi' : searchApiKey ? 'searchapi' : 'none', error instanceof Error ? error.message : 'Failed to load live Google Trends data.');
  }
}
