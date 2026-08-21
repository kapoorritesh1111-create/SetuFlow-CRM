import { NextResponse } from 'next/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';

const repository = process.env.SEO_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'kapoorritesh1111-create/SetuFlow-CRM';

function githubToken() {
  return process.env.SEO_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

export async function POST() {
  try {
    const context = await requireSetuInternalAdminWorkspace();
    if (context.missingEnv) return NextResponse.json({ error: 'Supabase environment is not configured.' }, { status: 500 });

    const token = githubToken();
    if (!token) {
      return NextResponse.redirect(new URL('/smc/seo?seoAction=github-token-required', process.env.NEXT_PUBLIC_SITE_URL || 'https://www.setuflowcrm.com'), { status: 303 });
    }

    const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/seo-autobot.yml/dispatches`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub workflow dispatch failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return NextResponse.redirect(new URL('/smc/seo?seoAction=bot-started', process.env.NEXT_PUBLIC_SITE_URL || 'https://www.setuflowcrm.com'), { status: 303 });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Unable to start SEO bot.');
    return NextResponse.redirect(new URL(`/smc/seo?seoAction=error&message=${message}`, process.env.NEXT_PUBLIC_SITE_URL || 'https://www.setuflowcrm.com'), { status: 303 });
  }
}
