'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { clearGoogleTranslateCookies, type MarketingLang, useMarketingLanguage } from './language-selector';

const GOOGLE_LANGUAGE: Record<Exclude<MarketingLang, 'en'>, string> = {
  de: 'de',
  fr: 'fr',
  es: 'es',
  zh: 'zh-CN',
  hi: 'hi',
  ar: 'ar',
};

const PROTECTED_BRAND_REPLACEMENTS: [RegExp, string][] = [
  [/Here's the AI Guru/gi, 'Setu Guru AI'],
  [/Teacher's Set/gi, 'Setu Guru'],
  [/Teacher Set/gi, 'Setu Guru'],
  [/Teacher's Guru/gi, 'Setu Guru'],
  [/सेतु\s*गुरु/g, 'Setu Guru'],
  [/सेटु\s*गुरु/g, 'Setu Guru'],
  [/सेतु\s*प्रवाह/g, 'SETU Flow'],
  [/सेटु\s*फ्लो/g, 'SETU Flow'],
  [/Setu\s+flow/gi, 'SETU Flow'],
  [/SETU\s+flow/g, 'SETU Flow'],
  [/Setu\s+Flow/g, 'SETU Flow'],
];

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
  document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax`;
  const hostname = window.location.hostname;
  if (hostname.includes('.')) document.cookie = `${name}=${value}; ${expires}; path=/; domain=.${hostname.replace(/^www\./, '')}; SameSite=Lax`;
}

function resetToEnglish() {
  if (typeof document === 'undefined') return;
  clearGoogleTranslateCookies();
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
  document.body.classList.remove('translated-ltr', 'translated-rtl');
}

function applyGoogleTranslate(language: Exclude<MarketingLang, 'en'>) {
  if (typeof window === 'undefined') return;
  const target = GOOGLE_LANGUAGE[language];
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  setCookie('googtrans', `/en/${target}`);
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (select) {
    select.value = target;
    select.dispatchEvent(new Event('change'));
  }
  window.setTimeout(restoreProtectedBrands, 150);
}

function restoreProtectedBrands() {
  if (typeof document === 'undefined' || !document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest('[data-no-translate]') || parent.closest('.notranslate')) continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG'].includes(parent.tagName)) continue;
    if (node.textContent?.trim()) nodes.push(node);
  }

  nodes.forEach((node) => {
    let next = node.textContent || '';
    PROTECTED_BRAND_REPLACEMENTS.forEach(([pattern, replacement]) => {
      next = next.replace(pattern, replacement);
    });
    if (next !== node.textContent) node.textContent = next;
  });
}

function loadGoogleTranslate(language: Exclude<MarketingLang, 'en'>) {
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
      { pageLanguage: 'en', includedLanguages: 'de,fr,es,zh-CN,hi,ar', autoDisplay: false },
      'setuflow-google-translate',
    );
    window.setTimeout(() => applyGoogleTranslate(language), 250);
    window.setTimeout(restoreProtectedBrands, 500);
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

    if (language === 'en') {
      resetToEnglish();
      return;
    }

    loadGoogleTranslate(language);
    const timers = [100, 350, 900, 1600].map((delay) => window.setTimeout(() => {
      applyGoogleTranslate(language);
      restoreProtectedBrands();
    }, delay));
    const observer = new MutationObserver(() => restoreProtectedBrands());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [language, pathname]);

  return (
    <style jsx global>{`
      .goog-te-banner-frame,
      .skiptranslate iframe,
      iframe.goog-te-banner-frame,
      .goog-te-balloon-frame,
      .goog-te-spinner-pos {
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
      .notranslate,
      [translate='no'],
      [data-no-translate='true'] {
        unicode-bidi: isolate;
      }
    `}</style>
  );
}
