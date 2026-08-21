type SearchConsoleStatus = 'connected' | 'not_configured' | 'error';

export type SearchConsoleQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleSnapshot = {
  status: SearchConsoleStatus;
  message: string;
  siteUrl: string;
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queries: SearchConsoleQueryRow[];
};

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function emptySnapshot(status: SearchConsoleStatus, message: string, siteUrl = ''): SearchConsoleSnapshot {
  return {
    status,
    message,
    siteUrl,
    startDate: isoDate(28),
    endDate: isoDate(1),
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
    queries: [],
  };
}

async function getAccessToken() {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) return null;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Google OAuth returned ${response.status}`);
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error('Google OAuth did not return an access token.');
  return payload.access_token;
}

export async function getSearchConsoleSnapshot(): Promise<SearchConsoleSnapshot> {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || 'https://www.setuflowcrm.com/';
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return emptySnapshot(
      'not_configured',
      'Add GOOGLE_SEARCH_CONSOLE_CLIENT_ID, CLIENT_SECRET and REFRESH_TOKEN in Vercel to show real impressions, clicks, CTR and ranking data.',
      siteUrl,
    );
  }

  const startDate = isoDate(28);
  const endDate = isoDate(1);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  try {
    const [totalsResponse, queriesResponse] = await Promise.all([
      fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate, rowLimit: 1 }),
        next: { revalidate: 900 },
      }),
      fetch(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 20 }),
        next: { revalidate: 900 },
      }),
    ]);

    if (!totalsResponse.ok || !queriesResponse.ok) {
      throw new Error(`Search Console returned ${totalsResponse.status}/${queriesResponse.status}`);
    }

    const totalsPayload = (await totalsResponse.json()) as {
      rows?: Array<{ clicks?: number; impressions?: number; ctr?: number; position?: number }>;
    };
    const queryPayload = (await queriesResponse.json()) as {
      rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
    };

    const totals = totalsPayload.rows?.[0];
    const queries = (queryPayload.rows ?? []).map((row) => ({
      query: row.keys?.[0] || 'Unknown query',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

    return {
      status: 'connected',
      message: `Live Google Search Console data for ${startDate} through ${endDate}.`,
      siteUrl,
      startDate,
      endDate,
      clicks: totals?.clicks ?? 0,
      impressions: totals?.impressions ?? 0,
      ctr: totals?.ctr ?? 0,
      position: totals?.position ?? 0,
      queries,
    };
  } catch (error) {
    return emptySnapshot(
      'error',
      error instanceof Error ? error.message : 'Google Search Console could not be loaded.',
      siteUrl,
    );
  }
}
