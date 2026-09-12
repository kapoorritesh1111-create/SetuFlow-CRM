import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = path => readFileSync(path, 'utf8');
const compiled = ts.transpileModule(read('src/lib/theme.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(preference = null, systemDark = false, blocked = false) {
  let pref = preference, isDark = false, writes = 0;
  const events = {}, mediaEvents = {};
  const root = { style: {}, classList: { toggle: (name, value) => { if (name === 'dark') isDark = value; } } };
  const media = { matches: systemDark, addEventListener: (name, fn) => { mediaEvents[name] = fn; } };
  const window = { location: { pathname: '/mail' }, matchMedia: () => media,
    localStorage: { getItem: () => { if (blocked) throw new Error('storage blocked'); return pref; }, setItem: (_, value) => { if (blocked) throw new Error('storage blocked'); pref = value; writes++; } },
    addEventListener: (name, fn) => { events[name] = fn; }, dispatchEvent() {},
  };
  const document = { documentElement: root, querySelectorAll: () => [], addEventListener() {} };
  const context = vm.createContext({ exports: {}, window, document, CustomEvent: class {}, getComputedStyle: () => ({ getPropertyValue: () => '#101A2E' }) });
  vm.runInContext(compiled, context);
  vm.runInContext(context.exports.THEME_INIT_SCRIPT, context);
  return { module: context.exports, dark: () => isDark, scheme: () => root.style.colorScheme, writes: () => writes,
    os(value) { media.matches = value; mediaEvents.change(); },
    stored(value) { pref = value; events.storage({ key: 'setuflow-theme' }); },
    focus() { events.focus(); },
  };
}

test('system theme updates SETU dark tokens and native color scheme live without freezing the preference', () => {
  const h = harness(null, false);
  assert.equal(h.dark(), false); assert.equal(h.scheme(), 'light');
  h.os(true); assert.equal(h.dark(), true); assert.equal(h.scheme(), 'dark');
  h.os(false); assert.equal(h.dark(), false); assert.equal(h.scheme(), 'light');
  assert.equal(h.writes(), 0);
});
test('explicit light and dark choices override the OS; restoring system resumes automatic mode', () => {
  const h = harness('light', true);
  assert.equal(h.dark(), false); assert.equal(h.scheme(), 'light');
  h.module.setThemePreference('dark'); h.os(false);
  assert.equal(h.dark(), true); assert.equal(h.scheme(), 'dark');
  h.module.setThemePreference('system'); assert.equal(h.dark(), false);
  h.os(true); assert.equal(h.dark(), true);
});
test('storage changes and focus resynchronize without touching authentication or push registration', () => {
  const h = harness('system', true);
  h.stored('light'); h.focus(); assert.equal(h.dark(), false);
  h.stored(null); assert.equal(h.dark(), true);
  const source = read('src/lib/theme.ts');
  assert.doesNotMatch(source, /signOut|unsubscribe|pushManager|removeItem/);
});
test('blocked storage still follows device dark mode and does not throw', () => {
  const h = harness(null, true, true);
  assert.equal(h.dark(), true); assert.equal(h.scheme(), 'dark');
  assert.equal(h.module.getStoredThemePreference(), 'system');
  assert.doesNotThrow(() => h.module.setThemePreference('light'));
  assert.equal(h.dark(), false);
});
test('mobile communications presentation uses semantic SETU colors rather than white/blue fixed themes', () => {
  for (const path of ['src/features/mail/components/mobile-setu-mail-workspace.tsx', 'src/features/calendar/components/mobile-calendar-workspace.tsx', 'src/features/calendar/components/calendar-settings-workspace.tsx', 'src/features/contacts/components/mobile-people-workspace.tsx']) {
    const source = read(path);
    assert.match(source, /themeStyles\.scope/, path);
    const normalized = path.includes('mobile-calendar-workspace')
      ? source.replace("viewMode===view?'bg-white text-brand-900':'bg-white/10 text-white'", "viewMode===view?'ACTIVE_CALENDAR_VIEW':'INACTIVE_CALENDAR_VIEW'")
      : source;
    assert.doesNotMatch(normalized, /bg-white(?:\s|["'])|text-slate-(?:700|800|900|950)|bg-blue-600|bg-\[#0b72bb\]/, path);
    if (path.includes('mobile-calendar-workspace')) assert.match(source, /viewMode===view\?'bg-white text-brand-900':'bg-white\/10 text-white'/);
  }
  assert.match(read('src/components/layout/communication-theme.module.css'), /-webkit-text-fill-color: currentColor/);
  assert.match(read('src/components/layout/mobile-communications-chrome.module.css'), /color: var\(--sf-text-accent\)/);
  assert.match(read('src/components/layout/mobile-communication-drawer.tsx'), /CommunicationAppearanceControl/);
});