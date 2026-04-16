'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProfessionalDigitalCard } from '@/components/contact-exchange/professional-digital-card';
import {
  EMPTY_CARD_SETTINGS,
  mergeIdentityWithCardSettings,
  toCardSettingsInput,
  type MyCardSettingsInput,
  type MyCardSettingsRow,
} from '@/lib/contact-exchange/my-card-settings';
import type { PublicCardIdentity } from '@/lib/contact-exchange/public-card';

type MyCardWorkspaceProps = {
  identity: PublicCardIdentity;
  organizationId: string | null;
  initialSettings?: Partial<MyCardSettingsRow> | null;
};

function fieldClassName() {
  return 'mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
}

export function MyCardWorkspace({ identity, organizationId, initialSettings }: MyCardWorkspaceProps) {
  const [overrides, setOverrides] = useState<MyCardSettingsInput>(() =>
    toCardSettingsInput(initialSettings, {
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
    }),
  );
  const [copied, setCopied] = useState<'link' | 'summary' | null>(null);
  const [origin, setOrigin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [shareSlug, setShareSlug] = useState<string | null>(initialSettings?.share_slug ?? null);

  const cardIdentity = useMemo<PublicCardIdentity>(
    () => mergeIdentityWithCardSettings(identity, {
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
  const publicVcfUrl = shareSlug ? (origin ? `${origin}/api/public/card-vcf?share=${encodeURIComponent(shareSlug)}` : `/api/public/card-vcf?share=${encodeURIComponent(shareSlug)}`) : '';


  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">My card settings</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Professional digital vCard details</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">These details are now saved in the database, so your public card, QR share, and save-contact experience stay consistent across devices.</p>
            </div>
            <div className="text-right">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Database-backed</span>
              <p className="mt-2 text-xs text-slate-500">{saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : isSaving ? 'Saving…' : 'Ready'}</p>
            </div>
          </div>
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
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => persistSettings()}
              disabled={isSaving}
              className="inline-flex min-h-[50px] items-center justify-center rounded-[1.2rem] bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving ? 'Saving…' : 'Save card settings'}
            </button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Share actions</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Public card, QR share, and save contact</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <a href={publicCardUrl || '#'} target="_blank" rel="noreferrer" className={`inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] px-4 py-3 text-sm font-semibold ${shareSlug ? 'bg-slate-950 text-white' : 'pointer-events-none bg-slate-300 text-white'}`}>Open public card</a>
            <button type="button" onClick={() => copy(publicCardUrl, 'link')} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{copied === 'link' ? 'Link copied' : 'Copy share link'}</button>
            <button type="button" onClick={() => copy(`Save ${cardIdentity.fullName} · ${cardIdentity.roleLabel}\n${publicCardUrl}`, 'summary')} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{copied === 'summary' ? 'Intro copied' : 'Copy intro'}</button>
            <a href={publicVcfUrl || '#'} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700" aria-disabled={!shareSlug}>Download .vcf</a>
          </div>
          <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live QR / share destination</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-600">{shareSlug && publicCardUrl ? publicCardUrl : 'Save card settings to generate your persistent share link.'}</p>
              </div>
              {shareSlug ? (
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(publicCardUrl)}`} alt="QR code for digital vCard share" className="h-40 w-40 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm" />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ProfessionalDigitalCard
        identity={cardIdentity}
        mode="workspace"
        saveContactHref={publicVcfUrl || undefined}
        primaryActionHref={publicCardPath ? `${publicCardPath}#request-quote` : null}
        primaryActionLabel="Request quote"
        secondaryActionHref={publicCardPath ? `${publicCardPath}#book-appointment` : null}
        secondaryActionLabel="Book appointment"
      />
    </div>
  );
}
