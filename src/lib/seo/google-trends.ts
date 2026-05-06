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
};

export const seoTrendQueries = [
  'import export CRM',
  'CRM for exporters',
  'export quote software',
  'trade show lead capture',
  'export compliance checklist',
] as const;

function emptyResult(status: LiveTrendResult['status'], provider: LiveTrendResult['provider'], message: string): LiveTrendResult {
  return {
    status,
    provider,
    message,
    queries: [...seoTrendQueries],
    points: [],
    averages: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
}

function parseSerpApiPayload(payload: any): LiveTrendResult {
  const timeline = payload?.interest_over_time?.timeline_data ?? [];
  const averages = payload?.interest_over_time?.averages ?? [];
  const points: LiveTrendPoint[] = timeline.map((item: any) => {
    const values: Record<string, number> = {};
    for (const value of item.values ?? []) {
      values[String(value.query)] = normalizeNumber(value.extracted_value ?? value.value);
    }
    return { label: String(item.date ?? item.timestamp ?? ''), values };
  }).filter((point: LiveTrendPoint) => point.label);

  return {
    status: 'connected',
    provider: 'serpapi',
    message: 'Live Google Trends data loaded through SerpApi.',
    queries: [...seoTrendQueries],
    points,
    averages: averages.map((item: any) => ({ query: String(item.query), value: normalizeNumber(item.value) })),
    updatedAt: new Date().toISOString(),
  };
}

function parseSearchApiPayload(payload: any): LiveTrendResult {
  const timeline = payload?.interest_over_time?.timeline_data ?? [];
  const averages = payload?.interest_over_time?.averages ?? [];
  const points: LiveTrendPoint[] = timeline.map((item: any) => {
    const values: Record<string, number> = {};
    for (const value of item.values ?? []) {
      values[String(value.query)] = normalizeNumber(value.extracted_value ?? value.value);
    }
    return { label: String(item.date ?? item.timestamp ?? ''), values };
  }).filter((point: LiveTrendPoint) => point.label);

  return {
    status: 'connected',
    provider: 'searchapi',
    message: 'Live Google Trends data loaded through SearchApi.',
    queries: [...seoTrendQueries],
    points,
    averages: averages.map((item: any) => ({ query: String(item.query), value: normalizeNumber(item.value) })),
    updatedAt: new Date().toISOString(),
  };
}

export async function getLiveGoogleTrends(): Promise<LiveTrendResult> {
  const serpApiKey = process.env.SERPAPI_API_KEY || process.env.GOOGLE_TRENDS_SERPAPI_KEY;
  const searchApiKey = process.env.SEARCHAPI_API_KEY || process.env.GOOGLE_TRENDS_SEARCHAPI_KEY;
  const alphaConfigured = process.env.GOOGLE_TRENDS_API_KEY || process.env.GOOGLE_TRENDS_ALPHA_API_KEY;

  try {
    if (serpApiKey) {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google_trends');
      url.searchParams.set('data_type', 'TIMESERIES');
      url.searchParams.set('q', seoTrendQueries.join(','));
      url.searchParams.set('date', 'today 12-m');
      url.searchParams.set('api_key', serpApiKey);
      const response = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
      const payload = await response.json();
      if (!response.ok || payload?.error) throw new Error(payload?.error || `SerpApi returned ${response.status}`);
      return parseSerpApiPayload(payload);
    }

    if (searchApiKey) {
      const url = new URL('https://www.searchapi.io/api/v1/search');
      url.searchParams.set('engine', 'google_trends');
      url.searchParams.set('data_type', 'TIMESERIES');
      url.searchParams.set('q', seoTrendQueries.join(','));
      url.searchParams.set('time_range', 'past_12_months');
      url.searchParams.set('api_key', searchApiKey);
      const response = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
      const payload = await response.json();
      if (!response.ok || payload?.error) throw new Error(payload?.error || `SearchApi returned ${response.status}`);
      return parseSearchApiPayload(payload);
    }

    if (alphaConfigured) {
      return emptyResult('not_configured', 'google-trends-alpha', 'Google Trends API alpha key detected, but the public alpha endpoint is not configured in this app yet. Use SERPAPI_API_KEY or SEARCHAPI_API_KEY for live data now.');
    }

    return emptyResult('not_configured', 'none', 'Live trend data is not connected. Add SERPAPI_API_KEY or SEARCHAPI_API_KEY in Vercel to load live Google Trends interest-over-time data.');
  } catch (error) {
    return emptyResult('error', serpApiKey ? 'serpapi' : searchApiKey ? 'searchapi' : 'none', error instanceof Error ? error.message : 'Failed to load live Google Trends data.');
  }
}
