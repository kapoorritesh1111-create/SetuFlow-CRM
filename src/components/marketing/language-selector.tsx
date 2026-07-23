'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export type MarketingLang = 'en' | 'de' | 'fr' | 'es' | 'zh' | 'hi' | 'ar';

export const LANG_STORAGE_KEY = 'setuflow-language';

export const LANGUAGES: {
  code: MarketingLang;
  flagSrc: string;
  label: string;
  native: string;
  short: string;
  region: string;
  dir?: 'rtl' | 'ltr';
}[] = [
  { code: 'en', flagSrc: '/flags/us.svg', label: 'English', native: 'English', short: 'EN', region: 'Global / US' },
  { code: 'de', flagSrc: '/flags/de.svg', label: 'German', native: 'Deutsch', short: 'DE', region: 'Germany / DACH' },
  { code: 'fr', flagSrc: '/flags/fr.svg', label: 'French', native: 'Francais', short: 'FR', region: 'France / EU' },
  { code: 'es', flagSrc: '/flags/es.svg', label: 'Spanish', native: 'Espanol', short: 'ES', region: 'Spain / LATAM' },
  { code: 'zh', flagSrc: '/flags/cn.svg', label: 'Chinese', native: 'Chinese', short: 'ZH', region: 'China / Global trade' },
  { code: 'hi', flagSrc: '/flags/in.svg', label: 'Hindi', native: 'Hindi', short: 'HI', region: 'India' },
  { code: 'ar', flagSrc: '/flags/ae.svg', label: 'Arabic', native: 'Arabic', short: 'AR', region: 'UAE / GCC', dir: 'rtl' },
];

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const hostname = window.location.hostname;
  const domains = ['', hostname, hostname.startsWith('www.') ? hostname.slice(4) : `.${hostname}`];

  domains.forEach((domain) => {
    document.cookie = `${name}=; ${expires}; path=/`;
    if (domain) document.cookie = `${name}=; ${expires}; path=/; domain=${domain}`;
  });
}

export function clearGoogleTranslateCookies() {
  clearCookie('googtrans');
}

export function getStoredLanguage(): MarketingLang {
  if (typeof window === 'undefined') return 'en';
  const value = window.localStorage.getItem(LANG_STORAGE_KEY) as MarketingLang | null;
  return LANGUAGES.some((item) => item.code === value) ? value! : 'en';
}

export function applyStoredLanguage(code: MarketingLang) {
  if (typeof window === 'undefined') return;

  const previousGoogleTranslateCookie = getCookieValue('googtrans');
  const wasTranslated =
    document.documentElement.classList.contains('translated-ltr') ||
    document.documentElement.classList.contains('translated-rtl') ||
    document.body.classList.contains('translated-ltr') ||
    document.body.classList.contains('translated-rtl') ||
    Boolean(document.querySelector('.goog-te-combo')) ||
    Boolean(previousGoogleTranslateCookie && !previousGoogleTranslateCookie.endsWith('/en'));

  window.localStorage.setItem(LANG_STORAGE_KEY, code);
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';

  if (code === 'en') {
    clearGoogleTranslateCookies();
    document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
    document.body.classList.remove('translated-ltr', 'translated-rtl');
  }

  window.dispatchEvent(new CustomEvent('setuflow-language-change', { detail: code }));

  if (code === 'en' && wasTranslated) {
    window.location.reload();
  }
}

export function useMarketingLanguage() {
  const [language, setLanguage] = useState<MarketingLang>('en');

  useEffect(() => {
    const initial = getStoredLanguage();
    setLanguage(initial);
    document.documentElement.lang = initial;
    document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';
    if (initial === 'en') clearGoogleTranslateCookies();
    const handler = (event: Event) => setLanguage((event as CustomEvent<MarketingLang>).detail || getStoredLanguage());
    window.addEventListener('setuflow-language-change', handler);
    return () => window.removeEventListener('setuflow-language-change', handler);
  }, []);

  return language;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Flag({ src, label, size = 'sm' }: { src: string; label: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'h-5 w-7' : 'h-5 w-7';
  return (
    <span className={`relative inline-flex ${dims} shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm`}>
      <Image src={src} alt={`${label} flag`} fill className="object-cover" sizes="32px" />
    </span>
  );
}

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const language = useMarketingLanguage();
  const active = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative notranslate" data-no-translate="true" translate="no">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`group inline-flex items-center rounded-full border bg-white font-black text-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/70 ${open ? 'border-slate-950 ring-2 ring-slate-950/5' : 'border-slate-200'} ${compact ? 'gap-1.5 px-2.5 py-1.5 text-[11px]' : 'gap-2 px-3 py-2 text-[12px]'}`}
        aria-label="Change language"
        aria-expanded={open}
        translate="no"
      >
        <Flag src={active.flagSrc} label={active.label} />
        <span className="tracking-[0.14em] notranslate" translate="no">{active.short}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[270px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] notranslate" data-no-translate="true" translate="no">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/70 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Global language</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Choose display language</p>
          </div>
          <div className="p-1.5">
            {LANGUAGES.map((item) => {
              const selected = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    applyStoredLanguage(item.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${selected ? 'bg-teal-50 text-teal-950' : 'text-slate-700 hover:bg-slate-50'}`}
                  translate="no"
                >
                  <Flag src={item.flagSrc} label={item.label} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{item.native}</span>
                      <span className={`shrink-0 text-[10px] font-black tracking-[0.14em] ${selected ? 'text-teal-700' : 'text-slate-400'}`}>{item.short}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">{item.region}</span>
                  </span>
                  {selected && <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[9px] font-black text-white">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
