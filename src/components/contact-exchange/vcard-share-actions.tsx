'use client';

import { useEffect, useMemo, useState } from 'react';

function ActionButton({ href, label, primary = false, download, onClick }: { href?: string; label: string; primary?: boolean; download?: boolean; onClick?: () => void | Promise<void> }) {
  const className = primary
    ? 'inline-flex min-h-[54px] items-center justify-center rounded-panel bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800'
    : 'inline-flex min-h-[54px] items-center justify-center rounded-panel border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50';

  if (href) {
    return (
      <a href={href} className={className} download={download}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="max-w-[70%] text-right text-sm text-slate-700">{value}</span>
    </div>
  );
}

function QrHint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-panel border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

export function VCardShareActions({
  publicCardPath,
  downloadPath,
  fullName,
  organizationName,
  roleLabel,
  email,
  primaryPhone,
}: {
  publicCardPath: string;
  downloadPath: string;
  fullName: string;
  organizationName: string;
  roleLabel: string;
  email: string;
  primaryPhone: string;
}) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'fallback'>('idle');

  const publicCardUrl = useMemo(() => (origin ? `${origin}${publicCardPath}` : publicCardPath), [origin, publicCardPath]);
  const downloadUrl = useMemo(() => (origin ? `${origin}${downloadPath}` : downloadPath), [origin, downloadPath]);
  const qrImageUrl = useMemo(() => `/api/contact-exchange/qr?data=${encodeURIComponent(publicCardUrl)}`, [publicCardUrl]);

  const shareText = useMemo(
    () => `Save ${fullName} · ${roleLabel}\n${organizationName}\nDirect contact: ${email}${primaryPhone ? ` · ${primaryPhone}` : ''}\nOpen the premium identity page: ${publicCardUrl}`,
    [email, fullName, organizationName, publicCardUrl, primaryPhone, roleLabel],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
  }, []);

  async function copyPreviewLink() {
    try {
      await navigator.clipboard.writeText(publicCardUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function copyIntroSummary() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      setCopiedSummary(false);
    }
  }

  async function handleNativeShare() {
    if (!shareSupported) {
      await copyPreviewLink();
      setShareState('fallback');
      window.setTimeout(() => setShareState('idle'), 2200);
      return;
    }

    try {
      await navigator.share({
        title: `${fullName} · SETU Flow digital vCard`,
        text: `${fullName} · ${roleLabel} · ${organizationName}`,
        url: publicCardUrl,
      });
      setShareState('shared');
      window.setTimeout(() => setShareState('idle'), 2200);
    } catch {
      setShareState('idle');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.04fr,0.96fr]">
      <div className="rounded-hero border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">Share system</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">One clean destination for every share</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Lead with the public card, then support it with native share, QR handoff, and a downloadable contact file.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Live</span>
        </div>

        <div className="mt-6 rounded-hero border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Primary share actions</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open the card, share it, copy the intro, or download the contact file.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ActionButton href={publicCardUrl} label="Open public card" primary />
            <ActionButton label={shareSupported ? 'Share now' : 'Copy share link'} onClick={handleNativeShare} />
            <ActionButton label={copiedSummary ? 'Intro copied' : 'Copy intro'} onClick={copyIntroSummary} />
            <ActionButton href={downloadUrl} label="Save contact" download />
          </div>
        </div>

        <div className="mt-5 rounded-hero border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Share state</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copied
              ? 'Public card link copied.'
              : shareState === 'shared'
                ? 'Shared through native share sheet.'
                : shareState === 'fallback'
                  ? 'Native share unavailable, so the public card link was copied instead.'
                  : 'Ready to send as a polished digital identity page.'}
          </p>

          <div className="mt-4 rounded-panel bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Recommended intro</p>
            <p className="mt-2 whitespace-pre-line">{shareText}</p>
          </div>

          <div className="mt-4 rounded-panel border border-slate-200 px-4 py-2">
            <DetailRow label="Public card URL" value={publicCardUrl} />
            <DetailRow label="Identity layer" value="Verified and save-first" />
            <DetailRow label="Recipient flow" value="Open → trust → save → contact" />
          </div>
        </div>
      </div>

      <div className="rounded-hero border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-soft sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">QR as a premium handoff</p>
            <p className="mt-1 text-sm text-slate-600">The QR lands on the same public card, so the experience stays consistent across in-person and remote sharing.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Live</span>
        </div>

        <div className="mt-5 rounded-hero border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <div className="flex min-h-[244px] items-center justify-center rounded-panel bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
            <img src={qrImageUrl} alt="QR code for digital card" className="h-56 w-56 rounded-hero border border-slate-200 bg-white p-3 shadow-sm" />
          </div>

          <div className="mt-4 space-y-3">
            <QrHint title="Why it works" detail="The scan lands on the same public card, with the same save-contact and response actions." />
            <QrHint title="What to look for" detail="On mobile, the first visible actions should still feel clear, credible, and easy to trust." />
          </div>
        </div>
      </div>
    </div>
  );
}
