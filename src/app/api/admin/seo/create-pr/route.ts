import { NextResponse } from 'next/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';

type GitHubContentFile = { path: string; content: string };

const repoFullName = process.env.SEO_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'kapoorritesh1111-create/SetuFlow-CRM';
const githubApi = 'https://api.github.com';
const siteBase = 'https://www.setuflowcrm.com';

function githubToken() {
  return process.env.SEO_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').toLowerCase();
}

function seoPage(canonicalPath: string, title: string, eyebrow: string, description: string, bullets: string[], faq: Array<{ question: string; answer: string }>) {
  const bulletMarkup = bullets.map((bullet) => `<li>${bullet}</li>`).join('');
  const faqMarkup = faq.map((item) => `<article className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-slate-950">${item.question}</h2><p className="mt-2 text-sm leading-6 text-slate-600">${item.answer}</p></article>`).join('\n          ');
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
  });

  return `export const metadata = {
  title: '${title} | SETU Flow CRM',
  description: '${description}',
  alternates: { canonical: '${siteBase}${canonicalPath}' },
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-hero border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">${eyebrow}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">${title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">${description}</p>
        <ul className="mt-8 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">${bulletMarkup}</ul>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
          ${faqMarkup}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(schema)} }} />
    </main>
  );
}
`;
}

function plannedFiles(): GitHubContentFile[] {
  const stamp = nowStamp();
  const date = new Date().toISOString();
  return [
    {
      path: 'src/app/resources/export-document-checklist/page.tsx',
      content: seoPage(
        '/resources/export-document-checklist',
        'Export Document Checklist for Import Export Teams',
        'Export Documents',
        'Use this export document checklist to organize invoice, packing, certificate, compliance, shipping, and payment documents before handoff.',
        ['Track commercial invoice and packing list readiness.', 'Review certificates, compliance notes, and buyer requirements.', 'Connect missing documents to owners and next actions.', 'Use the checklist as an internal link target from compliance and order pages.'],
        [
          { question: 'What documents are usually needed for export shipments?', answer: 'Common export documents include a commercial invoice, packing list, certificates, buyer or consignee details, shipping instructions, and payment or compliance records. Requirements vary by country, product, and buyer.' },
          { question: 'Why add document checklists to an export CRM?', answer: 'Document checklists help sales and operations teams keep missing documents visible before orders move to shipment handoff.' },
        ],
      ),
    },
    {
      path: 'src/app/resources/import-export-crm-keyword-guide/page.tsx',
      content: seoPage(
        '/resources/import-export-crm-keyword-guide',
        'Import Export CRM Keyword Guide',
        'SEO Keyword Guide',
        'A practical guide to how buyers search for import export CRM, export management software, trade show lead capture, and quote management tools.',
        ['Group keywords by buyer intent, comparison intent, and operational intent.', 'Use solution pages for high-intent CRM and export software searches.', 'Use feature pages for quote, trade show, and workflow searches.', 'Use resource pages for checklist and compliance searches.'],
        [
          { question: 'Which CRM keywords should import export teams target first?', answer: 'Start with high-intent phrases such as import export CRM, CRM for exporters, export management software, export quote software, and trade show lead capture CRM.' },
          { question: 'How should SETU Flow use keyword data?', answer: 'SETU Flow should use keyword data to decide page priority, internal linking, schema improvements, and content depth upgrades.' },
        ],
      ),
    },
    {
      path: `docs/seo/seo-quality-improvement-request-${stamp}.md`,
      content: `# SEO Quality Improvement PR Request\n\nGenerated from the SETU Flow SMC SEO Command Center on ${date}.\n\n## Current state\n\n- Google Search Console is connected to SMC.\n- Sitemap and canonical controls are live.\n- The SEO bot runs daily and can be started manually from SMC.\n\n## Included in this PR\n\n- Export document checklist resource page\n- Import export CRM keyword guide resource page\n- Self-referencing canonicals for both pages\n- Sitemap entries for both pages\n\n## Review before merge\n\n- Confirm page copy and claims.\n- Add internal links from the most relevant marketing pages.\n- Confirm Search Console discovery after deployment.\n`,
    },
  ];
}

async function githubFetch(path: string, init: RequestInit = {}) {
  const token = githubToken();
  const response = await fetch(`${githubApi}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || `GitHub request failed: ${response.status}`);
  return data;
}

async function readGitHubFile(branch: string, path: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const existing = await githubFetch(`/repos/${repoFullName}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`);
  const content = Buffer.from(String(existing?.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
  return { sha: String(existing?.sha || ''), content };
}

async function createOrUpdateFile(branch: string, file: GitHubContentFile) {
  const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
  let sha: string | undefined;
  try {
    const existing = await githubFetch(`/repos/${repoFullName}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`);
    sha = existing?.sha;
  } catch {
    sha = undefined;
  }
  await githubFetch(`/repos/${repoFullName}/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `chore(seo): add ${file.path}`,
      branch,
      content: Buffer.from(file.content, 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });
}

async function ensureSitemapRoutes(branch: string) {
  const path = 'src/app/sitemap.ts';
  const { sha, content } = await readGitHubFile(branch, path);
  const routes = [
    "  { path: '/resources/export-document-checklist', priority: 0.8, changeFrequency: 'monthly' },",
    "  { path: '/resources/import-export-crm-keyword-guide', priority: 0.8, changeFrequency: 'monthly' },",
  ];
  const additions = routes.filter((route) => !content.includes(route));
  if (!additions.length) return;

  const marker = '];\n\nexport default function sitemap';
  if (!content.includes(marker)) throw new Error('Unable to locate sitemap route list.');
  const nextContent = content.replace(marker, `${additions.join('\n')}\n];\n\nexport default function sitemap`);
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  await githubFetch(`/repos/${repoFullName}/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'chore(seo): add generated resource pages to sitemap',
      branch,
      sha,
      content: Buffer.from(nextContent, 'utf8').toString('base64'),
    }),
  });
}

export async function POST() {
  try {
    const context = await requireSetuInternalAdminWorkspace();
    if (context.missingEnv) return NextResponse.json({ error: 'Supabase environment is not configured.' }, { status: 500 });
    if (!githubToken()) return NextResponse.json({ error: 'Missing SEO_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN in Vercel environment variables.' }, { status: 500 });

    const branch = `seo/quality-improvement-${nowStamp()}`;
    const mainRef = await githubFetch(`/repos/${repoFullName}/git/ref/heads/main`);
    const baseSha = mainRef?.object?.sha;
    if (!baseSha) throw new Error('Unable to read main branch SHA.');

    await githubFetch(`/repos/${repoFullName}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
    for (const file of plannedFiles()) await createOrUpdateFile(branch, file);
    await ensureSitemapRoutes(branch);

    const pr = await githubFetch(`/repos/${repoFullName}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'SEO quality improvement: add supporting resources',
        head: branch,
        base: 'main',
        body: 'Created from the SETU Flow SMC SEO Command Center. This PR adds supporting SEO resources with self-referencing canonicals and sitemap discovery. Review copy and claims before merging to main.',
      }),
    });

    return NextResponse.redirect(pr.html_url || '/smc/seo', { status: 303 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create SEO PR.' }, { status: 500 });
  }
}
