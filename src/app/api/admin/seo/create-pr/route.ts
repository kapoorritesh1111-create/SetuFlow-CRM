import { NextResponse } from 'next/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';

type GitHubContentFile = {
  path: string;
  content: string;
};

const repoFullName = process.env.SEO_GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY || 'kapoorritesh1111-create/SetuFlow-CRM';
const githubApi = 'https://api.github.com';

function githubToken() {
  return process.env.SEO_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').toLowerCase();
}

function seoPage(title: string, eyebrow: string, description: string, bullets: string[], faq: Array<{ question: string; answer: string }>) {
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
};

export default function SeoLandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
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
  const date = new Date().toISOString();
  return [
    {
      path: 'src/app/solutions/import-export-crm/page.tsx',
      content: seoPage(
        'Import Export CRM for Global Trade Teams',
        'Import Export CRM',
        'SETU Flow CRM helps importers, exporters, and global trade teams manage leads, quotes, documents, approvals, and shipment handoff in one operating workflow.',
        ['Track buyers, suppliers, and trade-show leads in one CRM.', 'Manage FOB, CIF, EXW, and DDP quote workflows.', 'Keep document readiness and order handoff connected to the sales pipeline.', 'Replace scattered spreadsheets with reviewable trade execution steps.'],
        [
          { question: 'What is an import export CRM?', answer: 'An import export CRM is a customer relationship system designed around global trade workflows such as buyer follow-up, supplier coordination, quote approvals, trade documents, and order handoff.' },
          { question: 'How is SETU Flow different from a generic CRM?', answer: 'Generic CRMs mainly track contacts and deals. SETU Flow focuses on trade execution after the lead is captured, including export quotes, approvals, documents, and operational readiness.' },
        ],
      ),
    },
    {
      path: 'src/app/features/export-quote-management/page.tsx',
      content: seoPage(
        'Export Quote Management Software',
        'Export Quote Workflow',
        'Create, review, and manage export quotations with product pricing, incoterms, approvals, and quote-to-order handoff built for trade teams.',
        ['Support quote workflows for FOB, CIF, EXW, and DDP terms.', 'Keep pricing, approvals, and buyer follow-up connected.', 'Reduce rework from scattered spreadsheets and manual quote versions.', 'Move approved quotes toward order execution and shipment readiness.'],
        [
          { question: 'What is export quote management software?', answer: 'Export quote management software helps trade teams create and control quotations with pricing, incoterms, approval steps, and order handoff.' },
          { question: 'Why do exporters need quote workflow controls?', answer: 'Export quotes often depend on freight, insurance, duties, payment terms, and approvals. A controlled workflow reduces mistakes before the quote reaches the buyer.' },
        ],
      ),
    },
    {
      path: 'src/app/compare/crm-for-exporters/page.tsx',
      content: seoPage(
        'Best CRM for Exporters: Generic CRM vs Trade Execution CRM',
        'CRM Comparison',
        'Compare generic CRM tools with a trade execution CRM built for exporters that need buyer follow-up, quotes, documents, approvals, and shipment handoff.',
        ['Generic CRMs are strong for pipeline tracking and sales activity.', 'Trade execution CRMs add export quote, document, approval, and handoff workflows.', 'SETU Flow is positioned for import-export teams that need operational follow-through after the lead is captured.', 'Use this page to decide when trade-specific workflows matter more than broad CRM features.'],
        [
          { question: 'Can exporters use a generic CRM?', answer: 'Yes, exporters can use generic CRM tools for basic contacts and pipeline tracking, but trade teams often need additional workflows for quotes, documents, approvals, and shipment readiness.' },
          { question: 'When should exporters consider SETU Flow?', answer: 'Exporters should consider SETU Flow when leads, trade-show contacts, quotes, and order handoff need to be managed as one connected workflow.' },
        ],
      ),
    },
    {
      path: `docs/seo/seo-upgrade-request-${nowStamp()}.md`,
      content: `# SEO Upgrade PR Request\n\nGenerated from the SETU Flow SEO Intelligence dashboard on ${date}.\n\n## Included\n\n- Import-export CRM solution page\n- Export quote management feature page\n- CRM for exporters comparison page\n\n## Review checklist\n\n- Verify claims are accurate and supportable.\n- Confirm new routes match product positioning.\n- Confirm Vercel build passes before merging.\n- Review page copy before publishing to production.\n`,
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
  if (!response.ok) {
    throw new Error(data?.message || `GitHub request failed: ${response.status}`);
  }
  return data;
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

export async function POST() {
  try {
    const context = await requireSetuInternalAdminWorkspace();
    if (context.missingEnv) return NextResponse.json({ error: 'Supabase environment is not configured.' }, { status: 500 });

    if (!githubToken()) {
      return NextResponse.json({ error: 'Missing SEO_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN in Vercel environment variables.' }, { status: 500 });
    }

    const branch = `seo/dashboard-upgrade-${nowStamp()}`;
    const mainRef = await githubFetch(`/repos/${repoFullName}/git/ref/heads/main`);
    const baseSha = mainRef?.object?.sha;
    if (!baseSha) throw new Error('Unable to read main branch SHA.');

    await githubFetch(`/repos/${repoFullName}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });

    for (const file of plannedFiles()) {
      await createOrUpdateFile(branch, file);
    }

    const pr = await githubFetch(`/repos/${repoFullName}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'SEO upgrade: add trade-focused landing pages',
        head: branch,
        base: 'main',
        body: 'Created from the SETU Flow SEO Intelligence dashboard. This PR adds reviewable SEO landing pages for import-export CRM, export quote management, and CRM for exporters comparison intent. Please review claims and wait for Vercel before merging.',
      }),
    });

    return NextResponse.redirect(pr.html_url || '/admin/seo-intelligence', { status: 303 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create SEO PR.' }, { status: 500 });
  }
}
