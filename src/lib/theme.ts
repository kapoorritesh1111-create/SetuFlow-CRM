/** One theme preference controls SETU tokens and native browser controls. */
export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'setuflow-theme';
export const THEME_CHANGE_EVENT = 'setuflow-theme-change';

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch { return 'system'; }
}

export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light' || typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncCommunicationChrome() {
  if (typeof window === 'undefined' || !/^\/(mail|calendar|contacts)(\/|$)/.test(window.location.pathname)) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--sf-surface-1').trim();
  if (color) document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => { meta.content = color; });
}

export function applyTheme(preference: ThemePreference) {
  if (typeof document === 'undefined') return;
  const dark = resolveIsDark(preference);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  syncCommunicationChrome();
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

export function setThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(THEME_STORAGE_KEY, preference); } catch { /* Still apply this choice in the current document. */ }
  applyTheme(preference);
}

/** Nonce'd pre-paint script. System mode follows OS changes without a reload.
 * Never persist a resolved system value: doing so would freeze automatic mode. */
export const THEME_INIT_SCRIPT = `
(function() {
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function sync() {
    var pref = 'system';
    try { pref = window.localStorage.getItem('setuflow-theme') || 'system'; } catch (e) {}
    var dark = pref === 'dark' || (pref !== 'light' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    if (/^\\/(mail|calendar|contacts)(\\/|$)/.test(window.location.pathname)) {
      var color = getComputedStyle(document.documentElement).getPropertyValue('--sf-surface-1').trim();
      if (color) document.querySelectorAll('meta[name="theme-color"]').forEach(function(meta) { meta.content = color; });
    }
    window.dispatchEvent(new CustomEvent('setuflow-theme-change'));
  }
  sync();
  media.addEventListener('change', sync);
  window.addEventListener('storage', function(event) { if (event.key === 'setuflow-theme' || event.key === null) sync(); });
  window.addEventListener('pageshow', sync);
  window.addEventListener('focus', sync);
  document.addEventListener('DOMContentLoaded', sync, { once: true });
})();
`.trim();
