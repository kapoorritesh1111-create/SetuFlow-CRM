'use client';

import { useEffect, useMemo, useState } from 'react';
import { StateMessage } from '@/components/ui/state-message';
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

function formatRecency(value: string | null) {
  if (!value) return 'recent';
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return 'recent';
  const hours = Math.max(1, Math.round(diffMs / 3600000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

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
  const [avatarUrl, setAvatarUrl] = useState(identity.avatarUrl ?? '');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');

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

  async function handleAvatarFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarMessage('Please choose an image file.');
      return;
    }
    if (file.size > 1_250_000) {
      setAvatarMessage('Use a smaller image under 1.25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? '');
      setAvatarUrl(dataUrl);
      setAvatarSaving(true);
      setAvatarMessage('Saving profile photo…');
      try {
        const response = await fetch('/api/profile/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: dataUrl }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Could not save profile photo.');
        setAvatarUrl(payload.avatarUrl || dataUrl);
        setAvatarMessage('Profile photo saved. Your vCard preview now uses it.');
        window.setTimeout(() => setAvatarMessage(''), 2200);
      } catch (error) {
        setAvatarMessage(error instanceof Error ? error.message : 'Could not save profile photo.');
      } finally {
        setAvatarSaving(false);
      }
    };
    reader.readAsDataURL(file);
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

          <div className="mt-6 rounded-[1.6rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-100 text-xl font-semibold text-slate-700 shadow-sm">
                  {avatarUrl ? <img src={avatarUrl} alt={identity.fullName} className="h-full w-full object-cover" /> : identity.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">Upload from phone camera roll or a file. This makes the public vCard feel personal and screenshot-ready for the homepage.</p>
                  {avatarMessage ? <p className="mt-2 text-xs font-medium text-[#1F487C]">{avatarMessage}</p> : null}
                </div>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[#1F487C]/12 bg-white px-5 py-2 text-sm font-semibold text-[#1F487C] shadow-sm transition hover:bg-[#eef6fb]">
                {avatarSaving ? 'Saving…' : 'Upload photo'}
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => void handleAvatarFile(event.target.files?.[0])} />
              </label>
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
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{isDirty ? 'Save to refresh the public card, QR code, and vCard download with your latest details.' : shareSlug ? 'Your saved public card is ready to open, share, copy, and download.' : 'Save once to generate the permanent slug. Until then, the fallback share link below still opens your card.'}</p>
            <button type="button" onClick={() => void persistSettings()} disabled={isSaving} className="inline-flex min-h-[50px] items-center justify-center rounded-[1.2rem] bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">{isSaving ? 'Saving…' : shareSlug ? 'Save card settings' : 'Save and generate share slug'}</button>
          </div>
          <StateMessage
            className="mt-4"
            title="What to do next with My Card"
            description={shareSlug
              ? 'Save changes, copy or share the public link, then open the public card to confirm the customer experience.'
              : 'Save this card once to create the permanent share link.'}
            tone="neutral"
          />

          {saveMessage ? <StateMessage className="mt-4" title={saveState === 'error' ? 'My Card save failed' : 'My Card updated'} description={saveMessage} tone={saveState === 'error' ? 'danger' : 'success'} /> : null}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Conversion visibility</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">What your public card is bringing into the CRM</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">These are working outcomes, not vanity metrics. Review the request mix, then open the captured lead record and move it into qualification or quote work.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Source-attributed</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote requests</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{insights?.quoteRequestCount ?? 0}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Public-card visitors who raised commercial demand and should be qualified into quote-ready pipeline.</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Appointments</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{insights?.appointmentCount ?? 0}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Booked follow-up requests that now exist inside the CRM for the team to action.</p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Captured leads</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{insights?.recentLeads.length ?? 0}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Recent CRM records linked back to your card share so the team can verify the funnel is working.</p>
            </div>
          </div>

          <StateMessage
            className="mt-4"
            title="What to do next with card responses"
            description="Open the latest captured lead, verify the source label from Public Card, then qualify serious demand into Quote without leaving the CRM."
            tone="neutral"
          />

          <div className="mt-5 space-y-3">
            {(insights?.recentLeads?.length ?? 0) ? insights!.recentLeads.slice(0, 5).map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.company_name || item.contact_name || 'Public card lead'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.source_label || 'Public Card'} · {formatRecency(item.created_at)}</p>
                </div>
                <a href={`/leads/${item.id}`} className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Open lead</a>
              </div>
            )) : (
              <div className="rounded-[1.3rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-500">
                Public-card requests and appointments will appear here once shared-card traffic starts creating CRM records.
              </div>
            )}
          </div>
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
          <StateMessage className="mt-4" title="Share readiness" description={shareStateCopy} tone={shareState === 'error' ? 'danger' : shareState === 'shared' || shareState === 'copied' ? 'success' : 'neutral'} />
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
