import { NextRequest, NextResponse } from 'next/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';

const repository = process.env.SEO_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'kapoorritesh1111-create/SetuFlow-CRM';
const githubApi = 'https://api.github.com';

function githubToken() {
  return process.env.SEO_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

async function githubFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${githubApi}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken()}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || `GitHub request failed: ${response.status}`);
  return data;
}

export async function POST(request: NextRequest) {
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.setuflowcrm.com';

  try {
    const context = await requireSetuInternalAdminWorkspace();
    if (context.missingEnv) return NextResponse.json({ error: 'Supabase environment is not configured.' }, { status: 500 });
    if (!githubToken()) return NextResponse.redirect(new URL('/smc/seo?seoAction=github-token-required', siteBase), { status: 303 });

    const formData = await request.formData();
    const prNumber = Number(formData.get('prNumber'));
    if (!Number.isInteger(prNumber) || prNumber <= 0) throw new Error('A valid SEO pull request number is required.');

    const pr = await githubFetch(`/repos/${repository}/pulls/${prNumber}`);
    const headRef = String(pr?.head?.ref || '');
    const baseRef = String(pr?.base?.ref || '');

    if (pr?.state !== 'open') throw new Error(`PR #${prNumber} is not open.`);
    if (pr?.draft) throw new Error(`PR #${prNumber} is still a draft.`);
    if (baseRef !== 'main') throw new Error(`PR #${prNumber} does not target main.`);
    if (!headRef.startsWith('seo/quality-improvement-')) throw new Error(`PR #${prNumber} was not created by the SMC SEO publishing workflow.`);
    if (pr?.mergeable === false) throw new Error(`PR #${prNumber} is not currently mergeable.`);

    const result = await githubFetch(`/repos/${repository}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      body: JSON.stringify({
        merge_method: 'squash',
        sha: pr?.head?.sha,
        commit_title: `SEO quality improvement (#${prNumber})`,
        commit_message: 'Published from the SETU Flow SMC SEO Command Center after operator approval.',
      }),
    });

    if (!result?.merged) throw new Error(result?.message || `GitHub did not merge PR #${prNumber}.`);

    return NextResponse.redirect(new URL(`/smc/seo?seoAction=pr-published&pr=${prNumber}`, siteBase), { status: 303 });
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Unable to publish SEO PR.');
    return NextResponse.redirect(new URL(`/smc/seo?seoAction=error&message=${message}`, siteBase), { status: 303 });
  }
}
