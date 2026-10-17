'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Platform = 'ios' | 'android' | 'other';

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isChrome, setIsChrome] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    setInstalled(isStandalone());
    setIsSafari(/Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent));
    setIsChrome(/Chrome|CriOS/i.test(navigator.userAgent) && !/Edg|OPR/i.test(navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowInstructions(false);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (platform === 'ios') {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'SETU Flow', url: window.location.href });
        } catch {
          // Cancellation or unavailable share target: keep manual installation guidance visible.
        }
      }
      setShowInstructions(true);
      return;
    }
    if (!promptEvent) {
      setShowInstructions(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome !== 'accepted') setShowInstructions(true);
  }

  const ios = platform === 'ios';
  const android = platform === 'android';

  return (
    <main style={{ minHeight: '100dvh', padding: '48px 20px', display: 'grid', placeItems: 'center', background: 'linear-gradient(155deg, #061e34, #0b3760 65%, #1769ad)', color: '#fff', fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 24, padding: '36px 28px', color: '#112a43', boxShadow: '0 20px 70px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
          <img src="/icons/icon-192.png" alt="SETU Flow app icon" width={64} height={64} style={{ borderRadius: 16 }} />
          <div><div style={{ fontSize: 22, fontWeight: 800 }}>SETU Flow</div><div style={{ color: '#65768a', fontSize: 13 }}>Your mobile workspace</div></div>
        </div>
        <h1 style={{ fontSize: 26, lineHeight: 1.25, fontWeight: 800, margin: '0 0 12px' }}>
          {installed ? 'SETU Flow is installed' : 'Install SETU Flow'}
        </h1>
        <p style={{ color: '#53677b', lineHeight: 1.65, marginBottom: 25 }}>
          {installed ? 'Open your workspace to continue.' : 'Add SETU Flow to your home screen for quick access to leads, quotes, follow-ups and more.'}
        </p>
        {installed ? (
          <a href="/dashboard" style={{ display: 'block', textAlign: 'center', padding: 16, borderRadius: 12, color: '#fff', background: '#087de3', fontWeight: 700, textDecoration: 'none' }}>Open SETU Flow</a>
        ) : (
          <>
            {ios && !isSafari && <p role="status" style={{ borderRadius: 12, padding: 14, background: '#fff4dd', color: '#795200', lineHeight: 1.5 }}>If Add to Home Screen is not available in this browser, open this link in Safari.</p>}
            <button type="button" onClick={install} style={{ width: '100%', padding: 16, border: 0, borderRadius: 12, background: '#087de3', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              {promptEvent ? 'Install app' : ios ? 'Open iPhone Share Menu' : 'Install SETU Flow'}
            </button>
            {showInstructions && (
              <div style={{ marginTop: 24, padding: 18, borderRadius: 14, background: '#edf5fc', lineHeight: 1.7, color: '#23435f' }}>
                <strong>{ios ? 'On iPhone or iPad' : android ? 'On Android' : 'In your browser'}</strong>
                {ios ? (
                  <ol style={{ paddingLeft: 22, margin: '8px 0 0' }}>
                    <li>Use the browser Share button. If the opened system share sheet does not offer Add to Home Screen, close it and use the browser’s own Share menu.</li>
                    <li>In Safari, tap the Share icon (square with an upward arrow). In Chrome, open its Share or browser menu.</li>
                    <li>Scroll through the browser’s share options and select <strong>Add to Home Screen</strong>. If unavailable, open this page in Safari and repeat.</li>
                    <li>Tap <strong>Add</strong>.</li>
                  </ol>
                ) : (
                  <ol style={{ paddingLeft: 22, margin: '8px 0 0' }}>
                    <li>{android && !isChrome ? 'Open this page in Chrome.' : 'Open your browser menu (⋮ or Share).'}</li>
                    <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                    <li>Confirm the installation.</li>
                  </ol>
                )}
              </div>
            )}
          </>
        )}
        <p style={{ marginTop: 20, fontSize: 12, textAlign: 'center', color: '#7b8996' }}>No App Store download required. Installation requires confirmation on your device.</p>
        <a href="/client-login" style={{ display: 'block', marginTop: 18, textAlign: 'center', color: '#0865b6', fontWeight: 600, fontSize: 14 }}>Sign in to SETU Flow</a>
      </div>
    </main>
  );
}
