'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { type MarketingLang, useMarketingLanguage } from './language-selector';

const GOOGLE_LANGUAGE: Record<MarketingLang, string> = {
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
  zh: 'zh-CN',
  hi: 'hi',
  ar: 'ar',
};

type WindowWithTranslate = Window & {
  google?: {
    translate?: {
      TranslateElement?: new (options: Record<string, unknown>, elementId: string) => unknown;
    };
  };
  googleTranslateElementInit?: () => void;
};

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
  document.cookie = `${name}=${value}; ${expires}; path=/`;
  const hostname = window.location.hostname;
  if (hostname.includes('.')) document.cookie = `${name}=${value}; ${expires}; path=/; domain=.${hostname}`;
}

function applyGoogleTranslate(language: MarketingLang) {
  if (typeof window === 'undefined') return;
  const target = GOOGLE_LANGUAGE[language] || 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  setCookie('googtrans', `/auto/${target}`);
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (select) {
    select.value = target;
    select.dispatchEvent(new Event('change'));
  }
}

function loadGoogleTranslate(language: MarketingLang) {
  if (typeof window === 'undefined') return;
  const scopedWindow = window as WindowWithTranslate;

  if (!document.getElementById('setuflow-google-translate')) {
    const mount = document.createElement('div');
    mount.id = 'setuflow-google-translate';
    mount.style.position = 'fixed';
    mount.style.left = '-9999px';
    mount.style.top = '-9999px';
    mount.style.width = '1px';
    mount.style.height = '1px';
    mount.style.overflow = 'hidden';
    document.body.appendChild(mount);
  }

  scopedWindow.googleTranslateElementInit = () => {
    if (!scopedWindow.google?.translate?.TranslateElement) return;
    new scopedWindow.google.translate.TranslateElement(
      { pageLanguage: 'en', includedLanguages: 'en,de,fr,es,zh-CN,hi,ar', autoDisplay: false },
      'setuflow-google-translate',
    );
    window.setTimeout(() => applyGoogleTranslate(language), 250);
  };

  if (scopedWindow.google?.translate?.TranslateElement) {
    scopedWindow.googleTranslateElementInit?.();
    return;
  }

  if (!document.getElementById('setuflow-google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'setuflow-google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }
}

export function GlobalTranslator() {
  const language = useMarketingLanguage();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadGoogleTranslate(language);
    const timers = [100, 350, 900].map((delay) => window.setTimeout(() => applyGoogleTranslate(language), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [language, pathname]);

  return (
    <style jsx global>{`
      .goog-te-banner-frame,
      .skiptranslate iframe,
      iframe.goog-te-banner-frame {
        display: none !important;
        visibility: hidden !important;
      }
      body {
        top: 0 !important;
      }
      #setuflow-google-translate,
      .goog-te-gadget,
      .goog-te-balloon-frame {
        display: none !important;
      }
      .translated-ltr body,
      .translated-rtl body {
        top: 0 !important;
      }
      font > font {
        background: transparent !important;
      }
    `}</style>
  );
}
