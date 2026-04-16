import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';

type ProfessionalDigitalCardProps = {
  identity: PublicCardIdentity;
  mode?: 'workspace' | 'public';
  saveContactHref?: string;
  primaryActionHref?: string | null;
  primaryActionLabel?: string;
  secondaryActionHref?: string | null;
  secondaryActionLabel?: string;
};

function SocialIcon({ label }: { label: string }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">{label}</span>;
}

function SocialButton({ href, label }: { href?: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
      aria-label={label}
    >
      <SocialIcon label={label.slice(0, 2)} />
    </a>
  );
}

export function ProfessionalDigitalCard({
  identity,
  mode = 'workspace',
  saveContactHref,
  primaryActionHref,
  primaryActionLabel = 'Request quote',
  secondaryActionHref,
  secondaryActionLabel = 'Book appointment',
}: ProfessionalDigitalCardProps) {
  const details = [
    identity.primaryPhone,
    identity.address,
    identity.email,
    identity.website,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return (
    <div className="overflow-hidden rounded-[2.6rem] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f7f7f7_0%,#ececec_100%)] px-6 pb-10 pt-8 sm:px-10">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_center,_rgba(15,23,42,0.08),_transparent_38%),linear-gradient(120deg,transparent_0%,rgba(15,23,42,0.05)_28%,transparent_56%),linear-gradient(60deg,transparent_0%,rgba(15,23,42,0.04)_28%,transparent_56%)]" />
        <div className="relative flex flex-col items-center text-center">
          <div className="h-52 w-52 overflow-hidden rounded-full border border-white/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.1)] sm:h-60 sm:w-60">
            {identity.avatarUrl ? (
              <img src={identity.avatarUrl} alt={identity.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#e5e7eb_100%)] text-6xl font-semibold text-slate-700">
                {identity.fullName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{identity.roleLabel}</p>
          <h1 className="mt-4 text-5xl font-light tracking-[-0.08em] text-slate-950 sm:text-6xl">{identity.fullName}</h1>
          <p className="mt-3 text-2xl font-light italic tracking-[-0.05em] text-slate-700">{identity.organizationName}</p>
        </div>
      </div>

      <div className="space-y-8 bg-[linear-gradient(180deg,#ffffff_0%,#faf7f4_100%)] px-6 pb-8 pt-6 sm:px-10">
        <div className="space-y-3 rounded-[1.8rem] bg-white/80 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
          {details.map((detail) => (
            <div key={detail} className="flex items-center gap-4 text-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ede7df] text-xs">•</span>
              <span className="text-sm tracking-[0.18em] text-slate-700 sm:text-base">{detail}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-4xl font-light tracking-[-0.06em] text-slate-900">Bookings Now Available</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {primaryActionHref ? (
              <a href={primaryActionHref} className="inline-flex min-h-[58px] items-center justify-center rounded-[1.4rem] bg-[#d9d0c4] px-5 py-4 text-lg font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-[#cbc0b1]">
                {primaryActionLabel}
              </a>
            ) : null}
            {secondaryActionHref ? (
              <a href={secondaryActionHref} className="inline-flex min-h-[58px] items-center justify-center rounded-[1.4rem] border border-slate-300 bg-white px-5 py-4 text-lg font-semibold uppercase tracking-[0.22em] text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                {secondaryActionLabel}
              </a>
            ) : null}
          </div>
          {saveContactHref ? (
            <a href={saveContactHref} className="mt-4 inline-flex min-h-[50px] items-center justify-center rounded-[1.2rem] bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800">
              Save contact
            </a>
          ) : null}
        </div>

        {(identity.socials?.linkedin || identity.socials?.instagram || identity.socials?.facebook || identity.socials?.tiktok) ? (
          <div className="flex items-center justify-center gap-3">
            <SocialButton href={identity.socials?.facebook} label="Facebook" />
            <SocialButton href={identity.socials?.instagram} label="Instagram" />
            <SocialButton href={identity.socials?.tiktok} label="TikTok" />
            <SocialButton href={identity.socials?.linkedin} label="LinkedIn" />
          </div>
        ) : null}

        {mode === 'workspace' ? (
          <p className="text-center text-sm leading-6 text-slate-500">This card is generated from signed-in user identity, organization branding, and share settings so any team member can send a polished digital vCard with QR, save-contact, request quote, and appointment actions.</p>
        ) : null}
      </div>
    </div>
  );
}
