'use client';

import { useEffect, useState } from 'react';

export type MarketingLang = 'en' | 'de' | 'fr' | 'es' | 'zh' | 'hi' | 'ar';

export const LANG_STORAGE_KEY = 'setuflow-language';

export const LANGUAGES: { code: MarketingLang; flag: string; label: string; native: string; dir?: 'rtl' | 'ltr' }[] = [
  { code: 'en', flag: '🇬🇧', label: 'English', native: 'English' },
  { code: 'de', flag: '🇩🇪', label: 'German', native: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', label: 'French', native: 'Français' },
  { code: 'es', flag: '🇪🇸', label: 'Spanish', native: 'Español' },
  { code: 'zh', flag: '🇨🇳', label: 'Chinese', native: '中文' },
  { code: 'hi', flag: '🇮🇳', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ar', flag: '🇦🇪', label: 'Arabic', native: 'العربية', dir: 'rtl' },
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

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const language = useMarketingLanguage();
  const active = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0];

  return (
    <label className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-[13px]'}`}>
      <span aria-hidden>{active.flag}</span>
      <span className="hidden font-semibold lg:inline">{active.native}</span>
      <span className="sr-only">Select language</span>
      <select
        value={language}
        onChange={(event) => applyStoredLanguage(event.target.value as MarketingLang)}
        className="cursor-pointer bg-transparent text-xs font-bold outline-none"
        aria-label="Select language"
      >
        {LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.flag} {item.native}
          </option>
        ))}
      </select>
    </label>
  );
}
