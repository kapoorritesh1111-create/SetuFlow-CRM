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
  insights?: {
    quoteRequestCount: number;
    appointmentCount: number;
    recentLeads: Array<{
      id: string;
      company_name: string | null;
      contact_name: string | null;
      source_label: string | null;
      created_at: string | null;
    }>;
  };
};

type CopyKind = 'link' | 'summary' | null;
type ShareState = 'idle' | 'shared' | 'copied' | 'error';
type QrMode = 'smart' | 'offline';
type CropDraft = { src: string; zoom: number; x: number; y: number } | null;

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

async function cropToDataUrl(draft: NonNullable<CropDraft>) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = draft.src;
  });

  const preview = 260;
  const output = 320;
  const scale = Math.max(preview / image.naturalWidth, preview / image.naturalHeight) * draft.zoom;
  const canvas = document.createElement('canvas');
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare image editor.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, output, output);
  const ratio = output / preview;
  const drawW = image.naturalWidth * scale * ratio;
  const drawH = image.naturalHeight * scale * ratio;
  const drawX = (output - drawW) / 2 + draft.x * ratio;
  const drawY = (output - drawH) / 2 + draft.y * ratio;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  return canvas.toDataURL('image/jpeg', 0.62);
}

function formatRecency(value: string | null) {
  if (!value) return 'recent';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return 'recent';
  const hours = Math.max(1, Math.round(diffMs / 3600000));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const quickFields: Array<{ key: keyof MyCardSettingsInput; label: string; placeholder?: string }> = [
  { key: 'primaryPhone', label: 'Primary phone' },
  { key: 'secondaryPhone', label: 'Secondary phone' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address' },
  { key: 'bookingUrl', label: 'Booking link', placeholder: 'https://cal.com/...' },
  { key: 'quoteUrl', label: 'Quote request link', placeholder: 'https://... or leave blank' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
];

export function MyCardWorkspace({ identity, organizationId, initialSettings, insights }: MyCardWorkspaceProps) {
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
  const [qrMode, setQrMode] = useState<QrMode>('smart');
  const [avatarUrl, setAvatarUrl] = useState(identity.avatarUrl ?? '');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');
  const [cropDraft, setCropDraft] = useState<CropDraft>(null);

  useEffect(() => {
    setOverrides(initialOverrides);
    setShareSlug(initialSettings?.share_slug ?? null);
    setSaveState('idle');
    setSaveMessage('');
    setAvatarUrl(identity.avatarUrl ?? '');
  }, [initialOverrides, initialSettings?.share_slug, identity.avatarUrl]);

  const isDirty = JSON.stringify(overrides) !== JSON.stringify(initialOverrides);

  const cardIdentity = useMemo<PublicCardIdentity>(
    () =>
      mergeIdentityWithCardSettings({ ...identity, avatarUrl: avatarUrl || identity.avatarUrl }, {
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
    [identity, overrides, avatarUrl],
  );

  const fallbackParams = useMemo(() => buildPublicCardSearchParams(cardIdentity), [cardIdentity]);
  const fallbackPublicCardPath = useMemo(() => {
    const query = fallbackParams.toString();
    return query ? `/card?${query}` : '/card';
  }, [fallbackParams]);
  // Prefer the server share slug when available. Do not append full profile
  // details to share links once a slug exists; large phone-uploaded avatars
  // can otherwise create URI_TOO_LONG failures in QR and .vcf links.
  const preferredPublicCardPath = shareSlug ? `/card?share=${encodeURIComponent(shareSlug)}` : fallbackPublicCardPath;
  const publicCardUrl = origin ? `${origin}${preferredPublicCardPath}` : preferredPublicCardPath;
  const publicVcfPath = shareSlug ? `/api/public/card-vcf?share=${encodeURIComponent(shareSlug)}` : `/api/public/card-vcf?${fallbackParams.toString()}`;
  const publicVcfUrl = origin ? `${origin}${publicVcfPath}` : publicVcfPath;
  const smartQrUrl = `${publicCardUrl}${publicCardUrl.includes('?') ? '&' : '?'}src=qr`;
  const qrDestinationUrl = qrMode === 'offline' ? publicVcfUrl : smartQrUrl;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    async function buildQrCode() {
      if (!qrDestinationUrl) return;
      try {
        const dataUrl = await QRCode.toDataURL(qrDestinationUrl, { width: 220, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B2E4A', light: '#FFFFFF' } });
        if (isActive) setQrCodeDataUrl(dataUrl);
      } catch {
        if (isActive) setQrCodeDataUrl('');
      }
    }
    void buildQrCode();
    return () => { isActive = false; };
  }, [qrDestinationUrl]);

  function handleAvatarFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarMessage('Choose an image file.');
      return;
    }
    if (file.size > 12_000_000) {
      setAvatarMessage('Choose an image under 12MB. We optimize it before saving.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropDraft({ src: String(reader.result ?? ''), zoom: 1, x: 0, y: 0 });
      setAvatarMessage('');
    };
    reader.readAsDataURL(file);
  }

  async function saveCroppedAvatar() {
    if (!cropDraft) return;
    setAvatarSaving(true);
    setAvatarMessage('Optimizing and saving photo…');
    try {
      const dataUrl = await cropToDataUrl(cropDraft);
      const response = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Could not save photo.');
      setAvatarUrl(payload.avatarUrl || dataUrl);
      setCropDraft(null);
      setAvatarMessage('Photo saved and optimized for your vCard.');
      window.setTimeout(() => setAvatarMessage(''), 2400);
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Could not save photo.');
    } finally {
      setAvatarSaving(false);
    }
  }

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
      if (!response.ok) throw new Error(payload?.error || 'Unable to save card details.');
      setOverrides(payload.settings);
      setShareSlug(payload.shareSlug);
      setSaveState('saved');
      setSaveMessage('Saved. Your QR code, public card, and .vcf now use the latest details.');
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : 'Unable to save card details.');
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
      window.setTimeout(() => { setCopied(null); setShareState('idle'); }, 1800);
    } catch {
      setShareState('error');
    }
  }

  async function handleShare() {
    if (!publicCardUrl) return setShareState('error');
    if (!shareSupported) return copy(publicCardUrl, 'link');
    try {
      await navigator.share({ title: `${cardIdentity.fullName} · SETU Flow`, text: `${cardIdentity.fullName} · ${cardIdentity.organizationName}`, url: publicCardUrl });
      setShareState('shared');
      window.setTimeout(() => setShareState('idle'), 1800);
    } catch {
      setShareState('idle');
    }
  }

  const shareIntro = `Save ${cardIdentity.fullName}\n${cardIdentity.organizationName}\n${publicCardUrl}`;
  const statusCopy = saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : isSaving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'Ready';
  const shareStateCopy = shareState === 'shared' ? 'Shared.' : shareState === 'copied' ? 'Copied.' : shareState === 'error' ? 'Could not share. Try copying the link.' : 'Ready to share.';

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Card profile</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Make your vCard feel personal.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload a photo, adjust the crop, and save phone-ready contact details. The preview on the right shows exactly what prospects will see.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{statusCopy}</span>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl font-semibold text-slate-700 shadow-sm">
                  {avatarUrl ? <img src={avatarUrl} alt={identity.fullName} className="h-full w-full object-cover" /> : identity.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">Large phone photos are welcome. Setu Flow crops and compresses them before saving.</p>
                  {avatarMessage ? <p className="mt-2 text-xs font-medium text-[#1F487C]">{avatarMessage}</p> : null}
                </div>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[#1F487C]/12 bg-white px-5 py-2 text-sm font-semibold text-[#1F487C] shadow-sm transition hover:bg-[#eef6fb]">
                Upload photo
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {quickFields.map((field) => (
              <label key={field.key} className="block text-sm font-medium text-slate-700">
                {field.label}
                <input
                  className={fieldClassName()}
                  value={String(overrides[field.key] ?? '')}
                  placeholder={field.placeholder}
                  onChange={(e) => setOverrides((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{isDirty ? 'Save to refresh the public card, QR code, and contact download.' : 'Your latest saved details are ready to share.'}</p>
            <button type="button" onClick={() => void persistSettings()} disabled={isSaving} className="inline-flex min-h-[48px] items-center justify-center rounded-[1rem] bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {isSaving ? 'Saving…' : 'Save card'}
            </button>
          </div>
          {saveMessage ? <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${saveState === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{saveMessage}</p> : null}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Share</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Send your card in seconds.</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Share by QR, link, device share, or downloadable contact file.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${shareSlug ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>{shareSlug ? 'Live' : 'Save once'}</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <a href={publicCardUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-[52px] items-center justify-center rounded-[1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Open card</a>
            <button type="button" onClick={() => void handleShare()} className="inline-flex min-h-[52px] items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{shareSupported ? 'Share' : copied === 'link' ? 'Copied' : 'Copy link'}</button>
            <button type="button" onClick={() => void copy(shareIntro, 'summary')} className="inline-flex min-h-[52px] items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{copied === 'summary' ? 'Copied' : 'Copy intro'}</button>
            <a href={publicVcfUrl} download className="inline-flex min-h-[52px] items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Save contact</a>
          </div>
          <div className="mt-3 flex items-center gap-2" aria-label="Wallet actions">
            <a href={`/api/public/apple-wallet?url=${encodeURIComponent(publicCardUrl)}&name=${encodeURIComponent(cardIdentity.fullName)}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Add to Apple Wallet" title="Add to Apple Wallet"><img src="/marketing/apple-wallet-icon.png" alt="Apple Wallet" className="h-7 w-7 object-contain" /></a>
            <a href={`/api/public/google-wallet?url=${encodeURIComponent(publicCardUrl)}&name=${encodeURIComponent(cardIdentity.fullName)}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Add to Google Wallet" title="Add to Google Wallet"><img src="/marketing/google-wallet-icon.png" alt="Google Wallet" className="h-7 w-7 object-contain" /></a>
            <span className="text-xs text-slate-500">Wallet pass actions</span>
          </div>
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{shareStateCopy}</p>

          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">QR destination</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Smart QR opens the public card by default. Offline QR can be used when you want a direct contact-file scan.</p>
                <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white p-1">
                  <button type="button" onClick={() => setQrMode('smart')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${qrMode === 'smart' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Smart</button>
                  <button type="button" onClick={() => setQrMode('offline')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${qrMode === 'offline' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}>Offline</button>
                </div>
                <p className="mt-2 truncate rounded-xl bg-white px-3 py-2 text-xs text-slate-500">{qrDestinationUrl}</p>
              </div>
              {qrCodeDataUrl ? <img src={qrCodeDataUrl} alt="QR code for digital vCard share" className="h-40 w-40 rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm" /> : <div className="flex h-36 w-36 items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 bg-white/70 p-4 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-400">QR loading</div>}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Responses</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Card activity</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Quotes</p><p className="mt-2 text-3xl font-semibold text-slate-900">{insights?.quoteRequestCount ?? 0}</p></div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Appointments</p><p className="mt-2 text-3xl font-semibold text-slate-900">{insights?.appointmentCount ?? 0}</p></div>
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Leads</p><p className="mt-2 text-3xl font-semibold text-slate-900">{insights?.recentLeads.length ?? 0}</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {(insights?.recentLeads?.length ?? 0) ? insights!.recentLeads.slice(0, 4).map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold text-slate-900">{item.company_name || item.contact_name || 'Public card lead'}</p><p className="mt-1 text-xs text-slate-600">{formatRecency(item.created_at)}</p></div>
                <a href={`/leads/${item.id}`} className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open lead</a>
              </div>
            )) : <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-500">Requests and appointments will appear here after your card is shared.</div>}
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

      {cropDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Photo editor</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Place your photo in the circle.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use the controls below to crop and resize. The saved image is optimized for the site.</p>
              </div>
              <button type="button" onClick={() => setCropDraft(null)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Close</button>
            </div>
            <div className="mt-5 flex justify-center">
              <div className="relative h-[280px] w-[280px] overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
                <img
                  src={cropDraft.src}
                  alt="Crop preview"
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{ transform: `translate(calc(-50% + ${cropDraft.x}px), calc(-50% + ${cropDraft.y}px)) scale(${cropDraft.zoom})`, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-white/80" />
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">Zoom<input type="range" min="1" max="2.4" step="0.01" value={cropDraft.zoom} onChange={(e) => setCropDraft((c) => c ? { ...c, zoom: Number(e.target.value) } : c)} className="mt-2 w-full" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Move left / right<input type="range" min="-90" max="90" step="1" value={cropDraft.x} onChange={(e) => setCropDraft((c) => c ? { ...c, x: Number(e.target.value) } : c)} className="mt-2 w-full" /></label>
                <label className="block text-sm font-medium text-slate-700">Move up / down<input type="range" min="-90" max="90" step="1" value={cropDraft.y} onChange={(e) => setCropDraft((c) => c ? { ...c, y: Number(e.target.value) } : c)} className="mt-2 w-full" /></label>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCropDraft(null)} className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => void saveCroppedAvatar()} disabled={avatarSaving} className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">{avatarSaving ? 'Saving…' : 'Save photo'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
