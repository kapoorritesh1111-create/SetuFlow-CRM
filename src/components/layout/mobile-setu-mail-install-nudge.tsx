'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './mobile-setu-mail-install-nudge.module.css';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function MobileSetuMailInstallNudge() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (pathname !== '/mail' || params.get('app') === 'setu-mail' || isStandalone()) return;
    try {
      if (localStorage.getItem('setu-mail-install-dismissed') === '1') return;
    } catch {}

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    const timer = window.setTimeout(() => {
      if (isIos()) setVisible(true);
    }, 900);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, [pathname, params]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem('setu-mail-install-dismissed', '1'); } catch {}
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setVisible(false);
      setInstallPrompt(null);
      return;
    }
    setIosHelp(true);
  }

  return (
    <aside className={styles.card} aria-label="Install SETU Mail">
      <button type="button" onClick={dismiss} className={styles.close} aria-label="Dismiss install SETU Mail prompt"><X size={17} /></button>
      <img src="/icons/setu-mail.svg" alt="" aria-hidden="true" className={styles.icon} />
      <div className={styles.copy}>
        <strong>Put SETU Mail on your phone</strong>
        <span>{iosHelp ? 'On iPhone, tap Share and choose Add to Home Screen.' : 'Open Mail, Calendar and People like an app and receive supported notifications.'}</span>
      </div>
      <button type="button" onClick={() => void install()} className={styles.install}>
        {installPrompt ? <Download size={16} /> : <Share2 size={16} />}
        <span>{installPrompt ? 'Install' : iosHelp ? 'Got it' : 'How'}</span>
      </button>
    </aside>
  );
}
