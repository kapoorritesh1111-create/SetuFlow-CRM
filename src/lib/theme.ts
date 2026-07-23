// Real dark mode support. Tokens for `.dark` already exist in design-tokens.css
// and tailwind.config.ts already has darkMode: 'class' — this was the missing
// piece: nothing ever wrote the class or persisted a preference. The previous
// "Appearance" control in /mobile/settings only set local component state.

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'setuflow-theme';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(preference: ThemePreference) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveIsDark(preference));
}

export function setThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
}

/** Inlined into <head> as a nonce'd script so the correct class is set before
 * first paint — avoids a flash of the wrong theme on load. Kept as a plain
 * string (not a React effect) because effects run after paint. */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var pref = window.localStorage.getItem('${STORAGE_KEY}');
    var isDark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`.trim();
