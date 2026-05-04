'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MobileSignedInIdentity } from './mobile-shell';

function buildIntro(identity?: MobileSignedInIdentity, publicCardUrl = '') {
  const name = identity?.name ?? 'SETU Flow user';
  const role = identity?.roleLabel ?? 'Team member';
  const org = identity?.organizationName ?? 'SETU Flow';
  const email = identity?.email ? `\nEmail: ${identity.email}` : '';
  const phone = identity?.primaryPhone ? `\nCell: ${identity.primaryPhone}` : '';
  return `Save ${name} · ${role}\n${org}${email}${phone}\nOpen my digital business card: ${publicCardUrl}`;
}

function getInitials(name?: string | null) {
  return (name ?? 'SF')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SF';
}

export function MobileVCardShareSheet({
  open,
  onClose,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  signedIn?: MobileSignedInIdentity;
}) {
  const [origin, setOrigin] = useState('');
  const [status, setStatus] = useState('Ready to share your digital business card.');
  const [shareSupported, setShareSupported] = useState(false);
  const publicPath = signedIn?.shareHref ?? '/card';
  const downloadPath = signedIn?.downloadVcfHref ?? '/api/contact-exchange/vcard';
  const publicCardUrl = useMemo(() => (origin && publicPath.startsWith('/') ? `${origin}${publicPath}` : publicPath), [origin, publicPath]);
  const downloadUrl = useMemo(() => (origin && downloadPath.startsWith('/') ? `${origin}${downloadPath}` : downloadPath), [origin, downloadPath]);
  const qrImageUrl = useMemo(() => `/api/contact-exchange/qr?data=${encodeURIComponent(publicCardUrl)}`, [publicCardUrl]);

  const intro = useMemo(() => buildIntro(signedIn, publicCardUrl), [publicCardUrl, signedIn]);
  const initials = signedIn?.initials || getInitials(signedIn?.name);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
  }, []);

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(message);
      window.setTimeout(() => setStatus('Ready to share your digital business card.'), 1800);
    } catch {
      setStatus('Copy did not start. Use Save contact or Send email instead.');
    }
  }

  async function shareNow() {
    if (!shareSupported) {
      await copy(publicCardUrl, 'Card link copied.');
      return;
    }
    try {
      await navigator.share({
        title: `${signedIn?.name ?? 'SETU Flow'} · SETU Flow digital business card`,
        text: intro,
        url: publicCardUrl,
      });
      setStatus('Shared through your device share sheet.');
      window.setTimeout(() => setStatus('Ready to share your digital business card.'), 1800);
    } catch {
      setStatus('Share cancelled.');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/65 px-4 py-5 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto flex min-h-full max-w-[430px] items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-sky-300/40 bg-white shadow-[0_24px_90px_rgba(15,23,42,.36)] dark:border-sky-800/60 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
          <div className="bg-[linear-gradient(145deg,#071827_0%,#0b2e4a_58%,#1267b5_120%)] p-7 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#20a4ff,#0c7fff)] text-base font-black shadow-xl shadow-sky-950/40">{initials}</div>
              <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white" aria-label="Close Share vCard">×</button>
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight">{signedIn?.name ?? 'SETU Flow user'}</h2>
            <p className="mt-1 text-sm font-semibold text-white/80">{signedIn?.roleLabel ?? 'Team member'} · {signedIn?.organizationName ?? 'SETU Flow'}</p>
            {signedIn?.email ? <p className="mt-2 text-xs text-white/62">{signedIn.email}</p> : null}
            {signedIn?.primaryPhone ? <p className="mt-1 text-xs font-semibold text-sky-100">Cell: {signedIn.primaryPhone}</p> : null}
          </div>

          <div className="grid gap-4 p-6">
            <div className="text-center">
              <img src={qrImageUrl} alt="QR code for digital vCard" className="mx-auto h-36 w-36 rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-sm" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Scan to open card</p>
            </div>

            <a href={downloadUrl} download className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b2e4a] px-4 text-sm font-black text-white shadow-lg shadow-sky-950/20">⬇️ Save contact</a>
            <button type="button" onClick={() => copy(publicCardUrl, 'Card link copied.')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800">🔗 Copy link</button>
            <a href={`mailto:?subject=${encodeURIComponent(`${signedIn?.name ?? 'SETU Flow'} digital business card`)}&body=${encodeURIComponent(intro)}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-800">✉️ Send email</a>
            <button type="button" onClick={shareNow} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-800">{shareSupported ? '📲 Share card' : '📋 Copy link'}</button>
            <div className="grid grid-cols-2 gap-2" aria-label="Wallet actions">
              <a href={`/api/public/apple-wallet?url=${encodeURIComponent(publicCardUrl)}&name=${encodeURIComponent(signedIn?.name ?? 'SETU Flow')}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2" aria-label="Add to Apple Wallet"><img src="/marketing/apple-wallet-icon.png" alt="Apple Wallet" className="h-8 w-8 object-contain" /></a>
              <a href={`/api/public/google-wallet?url=${encodeURIComponent(publicCardUrl)}&name=${encodeURIComponent(signedIn?.name ?? 'SETU Flow')}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2" aria-label="Add to Google Wallet"><img src="/marketing/google-wallet-icon.png" alt="Google Wallet" className="h-8 w-8 object-contain" /></a>
            </div>
            <a href="/contact-exchange/vcard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-slate-500">⚙️ Edit settings</a>
            <p className="text-center text-xs font-semibold text-blue-600">{status}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
