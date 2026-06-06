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
  { code: 'en', flagSrc: '/flags/gb.svg', label: 'English', native: 'English', short: 'EN', region: 'Global / UK' },
  { code: 'de', flagSrc: '/flags/de.svg', label: 'German', native: 'Deutsch', short: 'DE', region: 'Germany / DACH' },
  { code: 'fr', flagSrc: '/flags/fr.svg', label: 'French', native: 'Francais', short: 'FR', region: 'France / EU' },
  { code: 'es', flagSrc: '/flags/es.svg', label: 'Spanish', native: 'Espanol', short: 'ES', region: 'Spain / LATAM' },
  { code: 'zh', flagSrc: '/flags/cn.svg', label: 'Chinese', native: 'Chinese', short: 'ZH', region: 'China / Global trade' },
  { code: 'hi', flagSrc: '/flags/in.svg', label: 'Hindi', native: 'Hindi', short: 'HI', region: 'India' },
  { code: 'ar', flagSrc: '/flags/ae.svg', label: 'Arabic', native: 'Arabic', short: 'AR', region: 'UAE / GCC', dir: 'rtl' },
];

export function getStoredLanguage(): MarketingLang {
  if (typeof window === 'undefined') return 'en';
  const value = window.localStorage.getItem(LANG_STORAGE_KEY) as MarketingLang | null;
  return LANGUAGES.some((item) => item.code === value) ? value! : 'en';
}

export function applyStoredLanguage(code: MarketingLang) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANG_STORAGE_KEY, code);
  document.documentElement.lang = code;
  document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent('setuflow-language-change', { detail: code }));
}

export function useMarketingLanguage() {
  const [language, setLanguage] = useState<MarketingLang>('en');

  useEffect(() => {
    const initial = getStoredLanguage();
    setLanguage(initial);
    document.documentElement.lang = initial;
    document.documentElement.dir = initial === 'ar' ? 'rtl' : 'ltr';
    const handler = (event: Event) => setLanguage((event as CustomEvent<MarketingLang>).detail || getStoredLanguage());
    window.addEventListener('setuflow-language-change', handler);
    return () => window.removeEventListener('setuflow-language-change', handler);
  }, []);

  return language;
}

function GlobeIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Flag({ src, label, size = 'sm' }: { src: string; label: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'h-8 w-11' : 'h-5 w-7';
  return (
    <span className={`relative inline-flex ${dims} shrink-0 overflow-hidden rounded-[6px] border border-slate-200 bg-white shadow-sm`}>
      <Image src={src} alt={`${label} flag`} fill className="object-cover" sizes="44px" />
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`group inline-flex items-center rounded-full border border-slate-200 bg-white font-bold text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/80 hover:text-teal-800 ${compact ? 'gap-1.5 px-2.5 py-1.5 text-[11px]' : 'gap-2 px-3.5 py-2 text-[12px]'}`}
        aria-label="Change language"
        aria-expanded={open}
      >
        <Flag src={active.flagSrc} label={active.label} />
        {!compact && <span className="hidden items-center text-slate-400 lg:inline-flex"><GlobeIcon /></span>}
        <span className="tracking-[0.14em]">{active.short}</span>
        {!compact && <span className="hidden max-w-[76px] truncate text-[12px] font-semibold tracking-normal text-slate-500 xl:inline">{active.native}</span>}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Global language</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Select your preferred site language.</p>
          </div>
          <div className="max-h-[340px] overflow-y-auto p-1.5">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <Flag src={item.flagSrc} label={item.label} size="md" />
                  <span className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black tracking-[0.12em] ${selected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.short}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{item.native}</span>
                    <span className="block text-xs text-slate-400">{item.label} - {item.region}</span>
                  </span>
                  {selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-black text-white">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
