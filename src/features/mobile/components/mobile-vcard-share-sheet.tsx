'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { MobileSignedInIdentity } from './mobile-shell';

function buildIntro(identity?: MobileSignedInIdentity, publicCardUrl = '') {
  const name = identity?.name ?? 'SETU Flow user';
  const role = identity?.roleLabel ?? 'Team member';
  const org = identity?.organizationName ?? 'SETU Flow';
  const email = identity?.email ? `\nDirect contact: ${identity.email}` : '';
  return `Save ${name} · ${role}\n${org}${email}\nOpen the premium identity page: ${publicCardUrl}`;
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
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [status, setStatus] = useState('Ready to share your digital business card.');
  const [shareSupported, setShareSupported] = useState(false);
  const publicPath = signedIn?.shareHref ?? '/card';
  const downloadPath = signedIn?.downloadVcfHref ?? '/api/contact-exchange/vcard';
  const publicCardUrl = useMemo(() => (origin ? `${origin}${publicPath}` : publicPath), [origin, publicPath]);
  const downloadUrl = useMemo(() => (origin ? `${origin}${downloadPath}` : downloadPath), [origin, downloadPath]);
  const intro = useMemo(() => buildIntro(signedIn, publicCardUrl), [publicCardUrl, signedIn]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setShareSupported(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
  }, []);

  useEffect(() => {
    if (!open || !publicCardUrl) return;
    let active = true;
    async function buildQr() {
      try {
        const dataUrl = await QRCode.toDataURL(publicCardUrl, {
          width: 220,
          margin: 1,
          color: { dark: '#1F487C', light: '#FFFFFF' },
        });
        if (active) setQrImageUrl(dataUrl);
      } catch {
        if (active) setQrImageUrl('');
      }
    }
    void buildQr();
    return () => {
      active = false;
    };
  }, [open, publicCardUrl]);

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(message);
      window.setTimeout(() => setStatus('Ready to share your digital business card.'), 1800);
    } catch {
      setStatus('Copy did not start. Use Open card or Download .vcf instead.');
    }
  }

  async function shareNow() {
    if (!shareSupported) {
      await copy(publicCardUrl, 'Share link copied.');
      return;
    }
    try {
      await navigator.share({
        title: `${signedIn?.name ?? 'SETU Flow'} · SETU Flow digital vCard`,
        text: `${signedIn?.name ?? 'SETU Flow'} · ${signedIn?.roleLabel ?? 'Team member'} · ${signedIn?.organizationName ?? 'SETU Flow'}`,
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
    <div className="fixed inset-0 z-[100] bg-slate-950/65 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto flex min-h-full max-w-[430px] items-end">
        <section className="w-full rounded-t-[2rem] border border-white/70 bg-white p-5 shadow-[0_-24px_80px_rgba(15,23,42,.32)] dark:border-slate-800 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600 dark:text-sky-300">Share vCard</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{signedIn?.name ?? 'SETU Flow user'}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">{signedIn?.roleLabel ?? 'Team member'} · {signedIn?.organizationName ?? 'SETU Flow'}</p>
              {signedIn?.email ? <p className="mt-1 text-xs text-slate-400">{signedIn.email}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white" aria-label="Close Share vCard">×</button>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-900">
              {qrImageUrl ? <img src={qrImageUrl} alt="QR code for digital vCard" className="mx-auto h-52 w-52 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm" /> : <p className="py-16 text-sm text-slate-500">Preparing QR…</p>}
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-300">Scan to open the same public card and save contact.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a href={publicCardUrl} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">Open card</a>
              <button type="button" onClick={shareNow} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">{shareSupported ? 'Share now' : 'Copy link'}</button>
              <button type="button" onClick={() => copy(intro, 'Intro copied.')} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">Copy intro</button>
              <a href={downloadUrl} download className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-3 text-sm font-black text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-sky-200">Download .vcf</a>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <p className="font-black text-slate-950 dark:text-white">Recommended intro</p>
              <p className="mt-2 whitespace-pre-line">{intro}</p>
              <p className="mt-3 font-semibold text-blue-600 dark:text-sky-300">{status}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
