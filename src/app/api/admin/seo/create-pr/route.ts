import { NextResponse } from 'next/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';

export const runtime = 'nodejs';

type GitHubContentFile = { path: string; content: string };

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
      path: 'src/app/resources/export-compliance-checklist/page.tsx',
      content: seoPage(
        'Export Compliance Checklist for Trade Teams',
        'Export Compliance Resource',
        'Use this export compliance checklist to organize buyer details, product requirements, trade documents, approvals, and shipment readiness before orders move forward.',
        ['Capture buyer, consignee, and destination-country requirements.', 'Track product, HS code, certification, and documentation readiness.', 'Connect compliance checks to quotes, orders, and shipment handoff.', 'Reduce missed steps before export execution begins.'],
        [
          { question: 'What should an export compliance checklist include?', answer: 'An export compliance checklist should include buyer and consignee details, destination-country requirements, product information, HS codes, certifications, trade documents, payment terms, and shipment readiness checks.' },
          { question: 'How does SETU Flow support export compliance workflows?', answer: 'SETU Flow helps teams keep compliance-related tasks connected to leads, quotes, documents, approvals, and order handoff so steps are not lost in spreadsheets or email threads.' },
        ],
      ),
    },
    {
      path: 'src/app/features/trade-show-lead-capture/page.tsx',
      content: seoPage(
        'Trade Show Lead Capture CRM for Exporters',
        'Trade Show Lead Capture',
        'Capture trade show leads, scan business cards, organize event contacts, and move export opportunities into follow-up workflows with SETU Flow CRM.',
        ['Capture business cards, QR contacts, and event leads quickly.', 'Tag leads by trade show, country, product interest, and follow-up stage.', 'Move captured contacts into buyer, supplier, quote, and task workflows.', 'Reduce post-event lead leakage after exhibitions and trade fairs.'],
        [
          { question: 'What is trade show lead capture for exporters?', answer: 'Trade show lead capture for exporters is the process of collecting buyer, supplier, distributor, and partner contacts during exhibitions and moving them into structured CRM follow-up.' },
          { question: 'Why use a CRM after a trade show?', answer: 'A CRM helps exporters avoid losing event leads by assigning follow-ups, tracking product interest, organizing contacts, and moving qualified opportunities toward quotes and orders.' },
        ],
      ),
    },
    {
      path: 'src/app/solutions/export-management-software/page.tsx',
      content: seoPage(
        'Export Management Software for Growing Trade Teams',
        'Export Management Software',
        'SETU Flow helps exporters manage leads, buyers, quotes, documents, tasks, approvals, and order handoff from one export management workspace.',
        ['Manage export sales follow-up and buyer communication.', 'Connect quotes, documents, tasks, and approvals in one workflow.', 'Support growing export teams that are moving beyond spreadsheets.', 'Keep sales and execution teams aligned from inquiry to order handoff.'],
        [
          { question: 'What is export management software?', answer: 'Export management software helps trade teams organize export sales, buyer follow-up, quotations, documentation, approvals, tasks, and order handoff in a controlled workflow.' },
          { question: 'Who should use SETU Flow for export management?', answer: 'SETU Flow is useful for exporters and import-export teams that need CRM, quote control, trade show lead capture, and execution visibility in one workspace.' },
        ],
      ),
    },
    {
      path: `docs/seo/seo-next-batch-request-${nowStamp()}.md`,
      content: `# SEO Next Batch PR Request\n\nGenerated from the SETU Flow SEO Intelligence dashboard on ${date}.\n\n## Included\n\n- Export compliance checklist resource page\n- Trade show lead capture feature page\n- Export management software solution page\n\n## Review checklist\n\n- Verify claims are accurate and supportable.\n- Confirm routes match SETU Flow positioning.\n- Confirm Vercel build passes before merging.\n- Review page copy before publishing to production.\n`,
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
    if (!githubToken()) return NextResponse.json({ error: 'Missing SEO_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN in Vercel environment variables.' }, { status: 500 });

    const branch = `seo/next-content-batch-${nowStamp()}`;
    const mainRef = await githubFetch(`/repos/${repoFullName}/git/ref/heads/main`);
    const baseSha = mainRef?.object?.sha;
    if (!baseSha) throw new Error('Unable to read main branch SHA.');

    await githubFetch(`/repos/${repoFullName}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });

    for (const file of plannedFiles()) await createOrUpdateFile(branch, file);

    const pr = await githubFetch(`/repos/${repoFullName}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'SEO next batch: add export resources and trade show pages',
        head: branch,
        base: 'main',
        body: 'Created from the SETU Flow SEO Intelligence dashboard. This PR adds the next SEO content batch: export compliance checklist, trade show lead capture, and export management software pages. Please review claims and wait for Vercel before merging.',
      }),
    });

    return NextResponse.redirect(pr.html_url || '/admin/seo-intelligence', { status: 303 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create SEO PR.' }, { status: 500 });
  }
}
