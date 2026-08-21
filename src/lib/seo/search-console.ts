type SearchConsoleStatus = 'connected' | 'not_configured' | 'error';

export type SearchConsoleQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleDailyRow = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsolePageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleSitemap = {
  status: 'connected' | 'not_found' | 'error';
  path: string;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  pending: boolean;
  warnings: number;
  errors: number;
  submittedUrls: number;
  indexedUrls: number;
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
  daily: SearchConsoleDailyRow[];
  pages: SearchConsolePageRow[];
  sitemap: SearchConsoleSitemap;
};

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function emptySitemap(status: SearchConsoleSitemap['status'] = 'not_found'): SearchConsoleSitemap {
  return {
    status,
    path: process.env.SEO_SITEMAP_URL?.trim() || 'https://www.setuflowcrm.com/sitemap.xml',
    lastSubmitted: null,
    lastDownloaded: null,
    pending: false,
    warnings: 0,
    errors: 0,
    submittedUrls: 0,
    indexedUrls: 0,
  };
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
    daily: [],
    pages: [],
    sitemap: emptySitemap(status === 'error' ? 'error' : 'not_found'),
  };
}

export async function getSearchConsoleAccessToken() {
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
  if (!response.ok) throw new Error(`Search Console analytics returned ${response.status}`);
  return response.json() as Promise<{
    rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
  }>;
}

async function getSitemapSnapshot(siteUrl: string, accessToken: string): Promise<SearchConsoleSitemap> {
  const sitemapUrl = process.env.SEO_SITEMAP_URL?.trim() || 'https://www.setuflowcrm.com/sitemap.xml';
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;

  try {
    const response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Search Console sitemaps returned ${response.status}`);
    const payload = (await response.json()) as {
      sitemap?: Array<{
        path?: string;
        lastSubmitted?: string;
        lastDownloaded?: string;
        isPending?: boolean;
        warnings?: string | number;
        errors?: string | number;
        contents?: Array<{ submitted?: string | number; indexed?: string | number }>;
      }>;
    };
    const sitemap = (payload.sitemap ?? []).find((item) => item.path === sitemapUrl) ?? payload.sitemap?.[0];
    if (!sitemap) return emptySitemap('not_found');

    const totals = (sitemap.contents ?? []).reduce<{ submitted: number; indexed: number }>(
      (acc, item) => ({
        submitted: acc.submitted + Number(item.submitted ?? 0),
        indexed: acc.indexed + Number(item.indexed ?? 0),
      }),
      { submitted: 0, indexed: 0 },
    );

    return {
      status: 'connected',
      path: sitemap.path || sitemapUrl,
      lastSubmitted: sitemap.lastSubmitted || null,
      lastDownloaded: sitemap.lastDownloaded || null,
      pending: Boolean(sitemap.isPending),
      warnings: Number(sitemap.warnings ?? 0),
      errors: Number(sitemap.errors ?? 0),
      submittedUrls: totals.submitted,
      indexedUrls: totals.indexed,
    };
  } catch {
    return emptySitemap('error');
  }
}

export async function getSearchConsoleSnapshot(): Promise<SearchConsoleSnapshot> {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || 'https://www.setuflowcrm.com/';
  const accessToken = await getSearchConsoleAccessToken();

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
    const [totalsPayload, queryPayload, dailyPayload, pagesPayload, sitemap] = await Promise.all([
      searchAnalytics(endpoint, accessToken, { startDate, endDate, rowLimit: 1 }),
      searchAnalytics(endpoint, accessToken, { startDate, endDate, dimensions: ['query'], rowLimit: 20 }),
      searchAnalytics(endpoint, accessToken, { startDate, endDate, dimensions: ['date'], rowLimit: 100 }),
      searchAnalytics(endpoint, accessToken, { startDate, endDate, dimensions: ['page'], rowLimit: 20 }),
      getSitemapSnapshot(siteUrl, accessToken),
    ]);

    const totals = totalsPayload.rows?.[0];
    const queries = (queryPayload.rows ?? []).map((row) => ({
      query: row.keys?.[0] || 'Unknown query',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
    const daily = (dailyPayload.rows ?? []).map((row) => ({
      date: row.keys?.[0] || '',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    })).filter((row) => row.date).sort((a, b) => a.date.localeCompare(b.date));
    const pages = (pagesPayload.rows ?? []).map((row) => ({
      page: row.keys?.[0] || 'Unknown page',
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
      daily,
      pages,
      sitemap,
    };
  } catch (error) {
    return emptySnapshot(
      'error',
      error instanceof Error ? error.message : 'Google Search Console could not be loaded.',
      siteUrl,
    );
  }
}
