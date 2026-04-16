import Link from 'next/link';
import { ContactIntakeReview } from '@/components/contact-exchange/contact-intake-review';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { requireWorkspace } from '@/lib/workspace/auth';

const inputMethods = [
  {
    title: 'Camera or image upload',
    detail: 'Upload a business card photo, screenshot, or shared image to review extracted details before import.',
  },
  {
    title: 'Document upload',
    detail: 'Use PDFs or requirement sheets when contact details arrive inside larger buyer or supplier documents.',
  },
  {
    title: 'Paste visible text',
    detail: 'Add copied text from cards, emails, or documents to improve the review result before creating follow-up work.',
  },
  {
    title: 'Review before import',
    detail: 'Keep the source visible, verify key fields, and move forward only after the information looks correct.',
  },
];

const reviewSteps = [
  'Upload the source file or paste visible contact text.',
  'Review extracted fields with the source side-by-side.',
  'Confirm names, company, contact details, and notes.',
  'Continue into the CRM workflow once the information is ready.',
];

export default async function ScanContactInfoPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Global contact exchange"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Restore workspace access before reviewing inbound contact capture surfaces."
        primaryActionHref={PRODUCT_ROUTES.app.dashboard}
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Global contact exchange"
        title="Scan Contact Info"
        description="Review inbound contact details from cards, screenshots, and shared documents before routing them into CRM follow-up."
        badge="Live"
        actions={[
          { label: 'My Digital vCard', href: '/contact-exchange/vcard' },
          { label: 'Go to leads', href: PRODUCT_ROUTES.app.leads, type: 'primary' },
        ]}
      />

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Source-first review</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep the uploaded source visible while reviewing the extracted contact block.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Human check before import</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Verify names, company, contact details, and notes before creating any downstream follow-up.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Made for buyer handoff</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use this surface to turn messy inbound contact inputs into clean CRM-ready information.
            </p>
          </article>
        </div>
      </SectionCard>

      <ContactIntakeReview />

      <SectionCard>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Input methods</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Capture paths users will recognize immediately
        </h2>
        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          {inputMethods.map((method) => (
            <article key={method.title} className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <p className="text-sm font-semibold text-slate-900">{method.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{method.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-[1fr,1fr,0.9fr]">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Ideal user flow</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-600">
              {reviewSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Best practice</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Check spelling against the source before import.</li>
              <li>Use pasted notes to preserve buyer intent and product context.</li>
              <li>Keep uploads attached when they help future commercial follow-up.</li>
              <li>Route approved details into Leads once the record is ready.</li>
            </ul>
          </article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
            <p className="text-sm font-semibold text-slate-900">Need outbound sharing?</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use your digital card to share contact details, QR access, and a trusted response path.
            </p>
            <div className="mt-4">
              <Link
                href="/contact-exchange/vcard"
                className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4"
              >
                Open My Digital vCard
              </Link>
            </div>
          </article>
        </div>
      </SectionCard>
    </div>
  );
}
