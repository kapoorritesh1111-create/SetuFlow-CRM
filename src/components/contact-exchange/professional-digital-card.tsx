import { UserAvatar } from '@/components/ui/user-avatar';
import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';

type ProfessionalDigitalCardProps = {
  identity: PublicCardIdentity;
  mode?: 'workspace' | 'public';
  saveContactHref?: string;
  primaryActionHref?: string | null;
  primaryActionLabel?: string;
  secondaryActionHref?: string | null;
  secondaryActionLabel?: string;
  appleWalletHref?: string | null;
  googleWalletHref?: string | null;
};

type SocialLabel = 'Facebook' | 'Instagram' | 'TikTok' | 'LinkedIn';

function SocialIcon({ label }: { label: SocialLabel }) {
  switch (label) {
    case 'Facebook':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v3H6v4h3v4h4v-4h3.2l.8-4H13V9c0-.6.4-1 1-1Z" />
        </svg>
      );
    case 'Instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'TikTok':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path d="M14 4c.6 2 2 3.4 4 4v2.8c-1.5-.1-2.9-.6-4-1.4V15a5 5 0 1 1-5-5" />
        </svg>
      );
    case 'LinkedIn':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path d="M8 10v7" />
          <path d="M8 7.2v.1" />
          <path d="M12 17v-4a2.5 2.5 0 0 1 5 0v4" />
          <path d="M12 10v7" />
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
  }
}

function SocialButton({ href, label }: { href?: string | null; label: SocialLabel }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-700/12 bg-white text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-700/30 hover:bg-brand-50"
      aria-label={label}
      title={label}
    >
      <SocialIcon label={label} />
    </a>
  );
}

function cleanDetail(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  return trimmed.length ? trimmed : null;
}

export function ProfessionalDigitalCard({
  identity,
  mode = 'workspace',
  saveContactHref,
  primaryActionHref,
  primaryActionLabel = 'Request quote',
  secondaryActionHref,
  secondaryActionLabel = 'Book appointment',
  appleWalletHref,
  googleWalletHref,
}: ProfessionalDigitalCardProps) {
  const details = [
    cleanDetail(identity.primaryPhone),
    cleanDetail(identity.address),
    cleanDetail(identity.email),
    cleanDetail(identity.website),
  ].filter((value): value is string => Boolean(value));

  const hasActions = Boolean(primaryActionHref || secondaryActionHref);

  return (
    <div className="overflow-hidden rounded-hero border border-brand-700/10 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.12)]">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-6 pb-10 pt-8 text-white sm:px-10">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_top_right,_rgba(255,255,255,0.55),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.25),_transparent_30%)]" />
        <div className="relative flex flex-col items-center text-center">
          <UserAvatar name={identity.fullName} email={identity.email} avatarUrl={identity.avatarUrl} size="2xl" className="border border-white/35 bg-white/15 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur ring-0" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-white/75">{identity.roleLabel}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">{identity.fullName}</h1>
          <p className="mt-3 text-2xl font-medium tracking-[-0.03em] text-white/85">{identity.organizationName}</p>
        </div>
      </div>

      <div className="space-y-8 bg-[linear-gradient(180deg,#ffffff_0%,#F7FBFC_100%)] px-6 pb-8 pt-6 sm:px-10">
        {details.length > 0 ? (
          <div className="space-y-3 rounded-hero border border-brand-700/10 bg-white/90 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
            {details.map((detail) => (
              <div key={detail} className="flex items-center gap-4 text-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF5F3] text-sm font-semibold text-accent-500">•</span>
                <span className="text-sm tracking-[0.08em] text-slate-700 sm:text-base">{detail}</span>
              </div>
            ))}
          </div>
        ) : null}

        {hasActions ? (
          <div className="text-center">
            <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-900">Connect with {identity.fullName.split(' ')[0] || 'our team'}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {primaryActionHref ? (
                <a
                  href={primaryActionHref}
                  target={primaryActionHref.startsWith('http') ? '_blank' : undefined}
                  rel={primaryActionHref.startsWith('http') ? 'noreferrer' : undefined}
                  className="inline-flex min-h-[58px] items-center justify-center rounded-panel bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-4 text-lg font-semibold uppercase tracking-[0.18em] text-white transition hover:opacity-95"
                >
                  {primaryActionLabel}
                </a>
              ) : null}
              {secondaryActionHref ? (
                <a
                  href={secondaryActionHref}
                  target={secondaryActionHref.startsWith('http') ? '_blank' : undefined}
                  rel={secondaryActionHref.startsWith('http') ? 'noreferrer' : undefined}
                  className="inline-flex min-h-[58px] items-center justify-center rounded-panel border border-brand-700/16 bg-white px-5 py-4 text-lg font-semibold uppercase tracking-[0.18em] text-brand-700 transition hover:border-brand-700/35 hover:bg-brand-50"
                >
                  {secondaryActionLabel}
                </a>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              {saveContactHref ? (
                <a href={saveContactHref} download className="inline-flex min-h-[50px] items-center justify-center rounded-card bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800">
                  Save contact
                </a>
              ) : null}
              {appleWalletHref ? (
                <a href={appleWalletHref} className="flex h-[50px] w-[50px] items-center justify-center rounded-card border border-brand-700/16 bg-white p-2 transition hover:bg-brand-50" aria-label="Add to Apple Wallet" title="Add to Apple Wallet"><img src="/marketing/apple-wallet-icon.png" alt="Apple Wallet" className="h-8 w-8 object-contain" /></a>
              ) : null}
              {googleWalletHref ? (
                <a href={googleWalletHref} className="flex h-[50px] w-[50px] items-center justify-center rounded-card border border-brand-700/16 bg-white p-2 transition hover:bg-brand-50" aria-label="Add to Google Wallet" title="Add to Google Wallet"><img src="/marketing/google-wallet-icon.png" alt="Google Wallet" className="h-8 w-8 object-contain" /></a>
              ) : null}
            </div>
          </div>
        ) : null}

        {(identity.socials?.linkedin ||
          identity.socials?.instagram ||
          identity.socials?.facebook ||
          identity.socials?.tiktok) ? (
          <div className="flex items-center justify-center gap-3">
            <SocialButton href={identity.socials?.facebook} label="Facebook" />
            <SocialButton href={identity.socials?.instagram} label="Instagram" />
            <SocialButton href={identity.socials?.tiktok} label="TikTok" />
            <SocialButton href={identity.socials?.linkedin} label="LinkedIn" />
          </div>
        ) : null}

        {mode === 'workspace' ? (
          <p className="text-center text-sm leading-6 text-slate-500">
            This card is generated from your signed-in profile, organization branding, and saved share settings.
          </p>
        ) : null}
      </div>
    </div>
  );
}
