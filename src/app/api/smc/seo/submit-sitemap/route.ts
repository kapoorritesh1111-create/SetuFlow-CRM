import { NextResponse } from 'next/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { getSearchConsoleAccessToken } from '@/lib/seo/search-console';

export const runtime = 'nodejs';

export async function POST() {
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.setuflowcrm.com';

  try {
    const context = await requireSetuInternalAdminWorkspace();
    if (context.missingEnv) return NextResponse.json({ error: 'Supabase environment is not configured.' }, { status: 500 });

    const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() || 'sc-domain:setuflowcrm.com';
    const sitemapUrl = process.env.SEO_SITEMAP_URL?.trim() || 'https://www.setuflowcrm.com/sitemap.xml';
    const accessToken = await getSearchConsoleAccessToken();

    if (!accessToken) {
      return NextResponse.redirect(new URL('/smc/seo?seoAction=google-token-required', siteBase), { status: 303 });
    }

    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google sitemap submission failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return NextResponse.redirect(new URL('/smc/seo?seoAction=sitemap-submitted', siteBase), { status: 303 });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Unable to submit sitemap.');
    return NextResponse.redirect(new URL(`/smc/seo?seoAction=error&message=${message}`, siteBase), { status: 303 });
  }
}
