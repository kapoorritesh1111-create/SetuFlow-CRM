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
import { buildPublicCardSearchParams, type PublicCardIdentity } from '@/lib/contact-exchange/public-card';

type MyCardWorkspaceProps = {
  identity: PublicCardIdentity;
  organizationId: string | null;
  initialSettings?: Partial<MyCardSettingsRow> | null;
};

type CopyKind = 'link' | 'summary' | null;
type ShareState = 'idle' | 'shared' | 'copied' | 'error';

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
  const [copied, setCopied] = useState<CopyKind>(null);
  const [origin, setOrigin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [shareSlug, setShareSlug] = useState<string | null>(initialSettings?.share_slug ?? null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [shareSupported, setShareSupported] = useState(false);
  const [shareState, setShareState] = useState<ShareState>('idle');

  useEffect(() => {
    setOverrides(initialOverrides);
    setShareSlug(initialSettings?.share_slug ?? null);
    setSaveState('idle');
    setSaveMessage('');
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

  const fallbackParams = useMemo(() => buildPublicCardSearchParams(cardIdentity), [cardIdentity]);
  const fallbackPublicCardPath = useMemo(() => {
    const query = fallbackParams.toString();
    return query ? `/card?${query}` : '/card';
  }, [fallbackParams]);
  const preferredPublicCardPath = shareSlug
    ? `${fallbackPublicCardPath}${fallbackPublicCardPath.includes('?') ? '&' : '?'}share=${encodeURIComponent(shareSlug)}`
    : fallbackPublicCardPath;
  const publicCardUrl = origin ? `${origin}${preferredPublicCardPath}` : preferredPublicCardPath;
  const publicVcfPath = `/api/public/card-vcf?${fallbackParams.toString()}${shareSlug ? `&share=${encodeURIComponent(shareSlug)}` : ''}`;
  const publicVcfUrl = origin ? `${origin}${publicVcfPath}` : publicVcfPath;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
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
      setSaveMessage('');
      const response = await fetch('/api/my-card-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, fullName: identity.fullName, email: identity.email, settings: nextOverrides }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to save My Card settings.');
      setOverrides(payload.settings);
      setShareSlug(payload.shareSlug);
      setSaveState('saved');
      setSaveMessage('Card settings saved. Public card, QR, and vCard actions are ready.');
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : 'Unable to save My Card settings.');
    } finally {
      setIsSaving(false);
    }
  }

  async function copy(value: string, kind: Exclude<CopyKind, null>) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setShareState('copied');
      window.setTimeout(() => {
        setCopied(null);
        setShareState('idle');
      }, 1800);
    } catch {
      setShareState('error');
    }
  }

  async function handleShare() {
    if (!publicCardUrl) {
      setShareState('error');
      return;
    }
    if (!shareSupported) {
      await copy(publicCardUrl, 'link');
      return;
    }
    try {
      await navigator.share({
        title: `${cardIdentity.fullName} · SETU Flow digital vCard`,
        text: `${cardIdentity.fullName} · ${cardIdentity.roleLabel} · ${cardIdentity.organizationName}`,
        url: publicCardUrl,
      });
      setShareState('shared');
      window.setTimeout(() => setShareState('idle'), 1800);
    } catch {
      setShareState('idle');
    }
  }

  const shareIntro = `Save ${cardIdentity.fullName} · ${cardIdentity.roleLabel}\n${cardIdentity.organizationName}\n${publicCardUrl}`;

  const statusCopy = saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : shareSlug ? 'Ready to share' : 'Share link pending save';
  const shareStateCopy = shareState === 'shared'
    ? 'Shared through your device share sheet.'
    : shareState === 'copied'
      ? copied === 'summary'
        ? 'Your share intro was copied.'
        : 'Your public card link was copied.'
      : shareState === 'error'
        ? 'Share could not start. Save once, then try again.'
        : shareSlug
          ? 'Every action below is live. The link also includes a fallback payload so the public card still opens if server lookup is unavailable.'
          : 'Save once to lock in your permanent share slug. The live preview link below already works as a fallback.';

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

          {!shareSlug ? (
            <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-sky-50/70 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Finish setup once, then every Share action becomes permanent.</p>
                  <p className="mt-1 leading-6 text-slate-600">The card preview and fallback share link already work below. Saving once adds the durable share slug used by QR and vCard downloads.</p>
                </div>
                <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Share slug pending</span>
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
            <p className="text-sm text-slate-500">{isDirty ? 'Save to refresh the public card, QR code, and vCard download with your latest details.' : shareSlug ? 'Your saved public card is ready to open, share, copy, and download.' : 'Save once to generate the permanent slug. Until then, the fallback share link below still opens your card.'}</p>
            <button type="button" onClick={() => void persistSettings()} disabled={isSaving} className="inline-flex min-h-[50px] items-center justify-center rounded-[1.2rem] bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? 'Saving…' : shareSlug ? 'Save card settings' : 'Save and generate share slug'}</button>
          </div>
          {saveMessage ? <div className={`mt-4 rounded-[1.2rem] px-4 py-3 text-sm ${saveState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{saveMessage}</div> : null}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Share actions</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Public card, QR share, and save contact</h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${shareSlug ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>{shareSlug ? 'Permanent share live' : 'Fallback share live'}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <a href={publicCardUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Open public card</a>
            <button type="button" onClick={() => void handleShare()} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{shareSupported ? 'Share now' : copied === 'link' ? 'Link copied' : 'Copy share link'}</button>
            <button type="button" onClick={() => void copy(shareIntro, 'summary')} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{copied === 'summary' ? 'Intro copied' : 'Copy intro'}</button>
            <a href={publicVcfUrl} className="inline-flex min-h-[54px] items-center justify-center rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Download .vcf</a>
          </div>
          <div className="mt-4 rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">{shareStateCopy}</div>
          <div className="mt-5 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live QR / share destination</p>
                <p className="mt-2 break-all text-sm leading-6 text-slate-600">{publicCardUrl}</p>
              </div>
              {qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="QR code for digital vCard share" className="h-40 w-40 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm" /> : <div className="flex h-40 w-40 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 p-4 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-400">QR code loading</div>}
            </div>
          </div>
        </div>
      </div>

      <ProfessionalDigitalCard
        identity={cardIdentity}
        mode="workspace"
        saveContactHref={publicVcfUrl}
        primaryActionHref={cardIdentity.quoteUrl?.trim() || `${preferredPublicCardPath}#request-quote`}
        primaryActionLabel="Request quote"
        secondaryActionHref={cardIdentity.bookingUrl?.trim() || `${preferredPublicCardPath}#book-appointment`}
        secondaryActionLabel="Book appointment"
      />
    </div>
  );
}
