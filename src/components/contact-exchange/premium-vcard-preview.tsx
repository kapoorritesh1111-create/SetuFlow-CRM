import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

type PremiumVCardPreviewProps = {
  fullName: string;
  roleLabel: string;
  organizationName: string;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string | null;
  website?: string | null;
  address?: string | null;
  linkedIn?: string | null;
  mode?: 'workspace' | 'preview';
  verificationLabel?: string;
  sourceContext?: string;
  memoryLine?: string;
  socialProofLabel?: string;
};

function Avatar({ fullName, avatarUrl }: { fullName: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        className="h-24 w-24 rounded-full border border-white/80 object-cover shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:h-28 sm:w-28"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] text-3xl font-semibold text-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.18)] sm:h-28 sm:w-28">
      {fullName.slice(0, 1).toUpperCase()}
    </div>
  );
}

function LogoBadge({ organizationName, logoUrl }: { organizationName: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={organizationName} className="h-12 w-12 rounded-[1rem] border border-slate-200 bg-white object-contain p-2 shadow-sm" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm">
      {organizationName.slice(0, 1).toUpperCase()}
    </div>
  );
}

function ActionTile({ label, href, icon }: { label: string; href?: string; icon: string }) {
  const body = (
    <>
      <span className="text-xl leading-none text-slate-900">{icon}</span>
      <span className="text-sm font-semibold text-slate-900">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="flex min-h-[74px] items-center justify-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]"
      >
        {body}
      </a>
    );
  }

  return <div className="flex min-h-[74px] items-center justify-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_12px_34px_rgba(15,23,42,0.07)]">{body}</div>;
}

function GuidanceCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

export function PremiumVCardPreview({
  fullName,
  roleLabel,
  organizationName,
  avatarUrl,
  logoUrl,
  email,
  primaryPhone,
  website,
  linkedIn,
  mode = 'workspace',
  verificationLabel = 'Verified via SETU Exchange',
  sourceContext,
  memoryLine = 'Spoke recently and worth keeping one tap away for the next follow-up.',
  socialProofLabel,
}: PremiumVCardPreviewProps) {
  const roleAndCompany = [roleLabel, organizationName].filter(Boolean).join(' · ');
  const normalizedWebsite = website && !website.toLowerCase().startsWith('add ') ? (website.startsWith('http') ? website : `https://${website}`) : undefined;
  const normalizedLinkedIn = linkedIn ? (linkedIn.startsWith('http') ? linkedIn : `https://${linkedIn}`) : undefined;
  const telHref = primaryPhone.startsWith('+') ? `tel:${primaryPhone}` : undefined;
  const secondaryLinks = [
    normalizedLinkedIn ? { label: 'LinkedIn', href: normalizedLinkedIn } : null,
    normalizedWebsite ? { label: 'Website', href: normalizedWebsite } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;
  const contextLine = sourceContext || `Shared via ${organizationName}`;
  const proofLine = socialProofLabel || `${organizationName} professional identity`;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr,0.98fr]">
      <section className="rounded-[2.4rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.5),_transparent_32%),linear-gradient(180deg,#fcfdff_0%,#f4f8fc_100%)] p-4 shadow-soft sm:p-6">
        <div className="mx-auto max-w-[430px] rounded-[2.6rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.94)_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Global Contact Exchange</p>
              <p className="mt-2 text-sm font-medium text-slate-500">Premium identity destination</p>
            </div>
            <LogoBadge organizationName={organizationName} logoUrl={logoUrl} />
          </div>

          <div className="mt-9 flex flex-col items-center text-center">
            <Avatar fullName={fullName} avatarUrl={avatarUrl} />
            <h2 className="mt-6 text-[2.15rem] font-semibold leading-tight tracking-[-0.05em] text-slate-950 sm:text-[2.5rem]">{fullName}</h2>
            <p className="mt-2 text-[15px] font-medium text-slate-600 sm:text-base">{roleAndCompany}</p>

            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <p>{verificationLabel}</p>
              <p>{contextLine}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Save contact</p>
            <p className="mt-3 text-[1.7rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.95rem]">Instantly add this person</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">The card leads with one clear moment: save first while trust is highest, then call or email without hunting for the next step.</p>
            <button
              type="button"
              className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-[1.4rem] bg-slate-950 px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(15,23,42,0.22)] transition hover:bg-slate-800"
            >
              Save contact
            </button>
          </div>

          <p className="mt-5 text-center text-sm italic leading-6 text-slate-500">“{memoryLine}”</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ActionTile label="Call" href={telHref} icon="☏" />
            <ActionTile label="Email" href={`mailto:${email}`} icon="✉" />
          </div>

          {secondaryLinks.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
              {secondaryLinks.map((link, index) => (
                <div key={link.label} className="flex items-center gap-3">
                  {index > 0 ? <span className="text-slate-300">·</span> : null}
                  <a href={link.href} className="transition hover:text-slate-900">
                    {link.label}
                  </a>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8 border-t border-slate-200 pt-5 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Context</p>
            <p className="mt-2 text-sm text-slate-500">{proofLine}</p>
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-[2.4rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-soft sm:p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">{mode === 'preview' ? 'Apple layout preview' : 'Apple layout guidance'}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">One calm screen with one decision path</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Batch 12 removes the last traces of dashboard energy. The page now behaves like a calm digital identity card: large human presence, one dominant save moment, two obvious action tiles, and only the lightest supporting context.
          </p>
        </div>

        <GuidanceCard title="What changed" detail="The visual system shifted from feature-rich premium to restrained premium. White space does the work, secondary links moved to a light inline row, and the save action now reads like the one reason the page exists." />
        <GuidanceCard title="Why it matters" detail="Recipients can decide in seconds: this person is real, this page is trustworthy, and the best next step is to save first. That clarity is what makes the card feel premium instead of busy." />
        <GuidanceCard title="Acceptance criteria" detail="The hero feels human before it feels technical, save contact remains the strongest element on the screen, and call plus email stay obvious without competing with the main conversion moment." />

        <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold text-slate-900">Action hierarchy</p>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>1. Save the contact while the trust moment is strongest.</li>
            <li>2. Call or email immediately if action is needed now.</li>
            <li>3. Revisit through the shared link for context and light profile depth.</li>
          </ol>
        </div>

        {mode === 'preview' ? (
          <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/80 px-5 py-5 text-sm text-emerald-950">
            <p className="font-semibold">Leadership/demo callout</p>
            <p className="mt-2 leading-6">This now demos like a finished identity product: minimal, deliberate, and obviously save-first without looking like a workflow tool.</p>
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
            <p className="font-semibold text-slate-900">Operator launch notes</p>
            <p className="mt-2 leading-6">Use preview when you want recipients or leadership to experience the final Apple-level layout. The engine remains locked while the front-end now feels calmer, clearer, and more demo-ready.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/contact-exchange/vcard/preview" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Open preview
              </Link>
              <Link href={PRODUCT_ROUTES.app.leads} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Back to leads
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}