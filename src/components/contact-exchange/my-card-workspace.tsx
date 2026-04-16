'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ProfessionalDigitalCard } from '@/components/contact-exchange/professional-digital-card';
import {
  EMPTY_CARD_SETTINGS,
  mergeIdentityWithCardSettings,
  toCardSettingsInput,
  type MyCardSettingsInput,
  type MyCardSettingsRow,
} from '@/lib/contact-exchange/my-card-settings-shared';
import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';

type MyCardWorkspaceProps = {
  identity: PublicCardIdentity;
  organizationId: string | null;
  initialSettings?: Partial<MyCardSettingsRow> | null;
};

function fieldClassName() {
  return 'mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
}

function buildDefaults(identity: PublicCardIdentity) {
  return {
    ...EMPTY_CARD_SETTINGS,
    primaryPhone: identity.primaryPhone,
    secondaryPhone: identity.secondaryPhone ?? '',
    website: identity.website ?? '',
    address: identity.address ?? '',
    bookingUrl: identity.bookingUrl ?? '',
    quoteUrl: identity.quoteUrl ?? '',
    linkedin: identity.socials?.linkedin ?? '',
    instagram: identity.socials?.instagram ?? '',
    facebook: identity.socials?.facebook ?? '',
    tiktok: identity.socials?.tiktok ?? '',
  } satisfies Partial<MyCardSettingsInput>;
}

export function MyCardWorkspace({ identity, organizationId, initialSettings }: MyCardWorkspaceProps) {
  const defaults = useMemo(() => buildDefaults(identity), [identity]);
  const initialOverrides = useMemo(() => toCardSettingsInput(initialSettings, defaults), [initialSettings, defaults]);

  const [overrides, setOverrides] = useState<MyCardSettingsInput>(initialOverrides);
  const [copied, setCopied] = useState<'link' | 'summary' | null>(null);
  const [origin, setOrigin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [shareSlug, setShareSlug] = useState<string | null>(initialSettings?.share_slug ?? null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    setOverrides(initialOverrides);
    setShareSlug(initialSettings?.share_slug ?? null);
    setSaveState('idle');
  }, [initialOverrides, initialSettings?.share_slug]);

  const isDirty = JSON.stringify(overrides) !== JSON.stringify(initialOverrides);

  const cardIdentity = useMemo<PublicCardIdentity>(
    () =>
      mergeIdentityWithCardSettings(identity, {
        primary_phone: overrides.primaryPhone,
        secondary_phone: overrides.secondaryPhone,
        website: overrides.website,
        address: overrides.address,
        booking_url: overrides.bookingUrl,
        quote_url: overrides.quoteUrl,
        linkedin_url: overrides.linkedin,
        instagram_url: overrides.instagram,
        facebook_url: overrides.facebook,
        tiktok_url: overrides.tiktok,
      } as Partial<MyCardSettingsRow>),
    [identity, overrides],
  );

  const publicCardPath = shareSlug ? `/card?share=${encodeURIComponent(shareSlug)}` : '';
  const publicCardUrl = publicCardPath && origin ? `${origin}${publicCardPath}` : '';
  const publicVcfUrl = shareSlug
    ? origin
      ? `${origin}/api/public/card-vcf?share=${encodeURIComponent(shareSlug)}`
      : `/api/public/card-vcf?share=${encodeURIComponent(shareSlug)}`
    : '';
  const shareActionsReady = Boolean(shareSlug && publicCardUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function buildQrCode() {
      if (!publicCardUrl) {
        if (isActive) setQrCodeDataUrl('');
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(publicCardUrl, {
          width: 180,
          margin: 1,
          color: { dark: '#1F487C', light: '#FFFFFF' },
        });
        if (isActive) setQrCodeDataUrl(dataUrl);
      } catch {
        if (isActive) setQrCodeDataUrl('');
      }
    }

    void buildQrCode();
    return () => {
      isActive = false;
    };
  }, [publicCardUrl]);

  async function persistSettings(nextOverrides = overrides) {
    try {
      setIsSaving(true);
      setSaveState('idle');
      const response = await fetch('/api/my-card-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          fullName: identity.fullName,
          email: identity.email,
          settings: nextOverrides,
        }),
      });

      if (!response.ok) throw new Error('Unable to save My Card settings.');
      const payload = await response.json();
      setOverrides(payload.settings);
      setShareSlug(payload.shareSlug);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch {
      setSaveState('error');
    } finally {
      setIsSaving(false);
    }
  }

  async function copy(value: string, kind: 'link' | 'summary') {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  const statusCopy = saveState === 'saved'
    ? 'Saved'
    : saveState === 'error'
      ? 'Save failed'
      : isSaving
        ? 'Saving…'
        : isDirty
          ? 'Unsaved changes'
          : shareActionsReady
            ? 'Ready to share'
            : 'Setup needed';

  return (
    <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">My card settings</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Professional digital vCard details and share controls</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">These details are saved in the database so your public card, QR share, and save-contact experience stay consistent across devices. Use the share actions below or the global Share card button in the product header.</p>
            </div>
            <div className="text-right">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Database-backed</span>
              <p className="mt-2 text-xs text-slate-500">{statusCopy}</p>
            </div>
          </div>

          {!shareActionsReady ? (
            <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-sky-50/70 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Finish setup once, then every Share action becomes live.</p>
                  <p className="mt-1 leading-6 text-slate-600">Your saved card already loads here when it exists. If this is your first visit, save the form once to generate the permanent public card link and QR code.</p>
                </div>
                <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                  {shareSlug ? 'Share link loading' : 'Share link not generated'}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Primary phone<input className={fieldClassName()} value={overrides.primaryPhone} onChange={(e) => setOverrides((c) => ({ ...c, primaryPhone: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">Secondary phone<input className={fieldClassName()} value={overrides.secondaryPhone} onChange={(e) => setOverrides((c) => ({ ...c, secondaryPhone: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">Website<input className={fieldClassName()} value={overrides.website} onChange={(e) => setOverrides((c) => ({ ...c, website: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">Address<input className={fieldClassName()} value={overrides.address} onChange={(e) => setOverrides((c) => ({ ...c, address: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">Booking link<input className={fieldClassName()} value={overrides.bookingUrl} onChange={(e) => setOverrides((c) => ({ ...c, bookingUrl: e.target.value }))} placeholder="https://cal.com/..." /></label>
            <label className="block text-sm font-medium text-slate-700">Request quote link<input className={fieldClassName()} value={overrides.quoteUrl} onChange={(e) => setOverrides((c) => ({ ...c, quoteUrl: e.target.value }))} placeholder="https://... or leave blank" /></label>
            <label className="block text-sm font-medium text-slate-700">LinkedIn<input className={fieldClassName()} value={overrides.linkedin} onChange={(e) => setOverrides((c) => ({ ...c, linkedin: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">Instagram<input className={fieldClassName()} value={overrides.instagram} onChange={(e) => setOverrides((c) => ({ ...c, instagram: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">Facebook<input className={fieldClassName()} value={overrides.facebook} onChange={(e) => setOverrides((c) => ({ ...c, facebook: e.target.value }))} /></label>
            <label className="block text-sm font-medium text-slate-700">TikTok<input className={fieldClassName()} value={overrides.tiktok} onChange={(e) => setOverrides((c) => ({ ...c, tiktok: e.target.value }))} /></label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {isDirty
                ? 'Save to refresh the public card, QR code, and vCard download with your latest details.'
                : shareActionsReady
                  ? 'Your saved public card is ready to open, copy, and download.'
                  : 'Save once to generate the public share link and enable the actions below.'}
            </p>
            <button
              type="button"
              onClick={() => persistSettings()}
              disabled={isSaving}
              className="inline-flex min-h-[50px] items-center justify-center rounded-[1.2rem] bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Saving…' : shareActionsReady ? 'Save card settings' : 'Save and generate share link'}
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Share actions</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Public card, QR share, and save contact</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${shareActionsReady ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-600'}`}>
              {shareActionsReady ? 'Actions live' : 'Actions unlock after save'}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <a href={publicCardUrl || '#'} target="_blank" rel="noreferrer" className={`inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] px-4 py-3 text-sm font-semibold ${shareActionsReady ? 'bg-slate-950 text-white' : 'pointer-events-none bg-slate-300 text-white'}`}>Open public card</a>
            <button type="button" onClick={() => copy(publicCardUrl, 'link')} disabled={!shareActionsReady} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{copied === 'link' ? 'Link copied' : 'Copy share link'}</button>
            <button type="button" onClick={() => copy(`Save ${cardIdentity.fullName} · ${cardIdentity.roleLabel}\n${publicCardUrl}`, 'summary')} disabled={!shareActionsReady} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{copied === 'summary' ? 'Intro copied' : 'Copy intro'}</button>
            <a href={publicVcfUrl || '#'} className={`inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 ${shareActionsReady ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!shareActionsReady}>Download .vcf</a>
          </div>
          <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live QR / share destination</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-600">{shareActionsReady ? publicCardUrl : 'Save card settings to generate your persistent share link.'}</p>
              </div>
              {shareActionsReady && qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR code for digital vCard share" className="h-40 w-40 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm" />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-4 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                  QR code appears after save
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProfessionalDigitalCard
        identity={cardIdentity}
        mode="workspace"
        saveContactHref={publicVcfUrl || undefined}
        primaryActionHref={cardIdentity.quoteUrl?.trim() || (publicCardPath ? `${publicCardPath}#request-quote` : null)}
        primaryActionLabel="Request quote"
        secondaryActionHref={cardIdentity.bookingUrl?.trim() || (publicCardPath ? `${publicCardPath}#book-appointment` : null)}
        secondaryActionLabel="Book appointment"
      />
    </div>
  );
}
