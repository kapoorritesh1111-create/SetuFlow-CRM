import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');
const chrome = read('src/components/layout/mobile-communications-chrome.tsx');
const chromeCss = read('src/components/layout/mobile-communications-chrome.module.css');
const shell = read('src/components/layout/mail-product-shell.tsx');
const metadata = read('src/lib/setu-mail-app-metadata.ts');
const mailLayout = read('src/app/(app)/mail/layout.tsx');
const calendarLayout = read('src/app/(app)/calendar/layout.tsx');
const contactsLayout = read('src/app/(app)/contacts/layout.tsx');
const manifest = JSON.parse(read('public/setu-mail-manifest.webmanifest'));

test('SETU Mail standalone manifest opens mail and exposes communications shortcuts', () => {
  assert.equal(manifest.name, 'SETU Mail');
  assert.equal(manifest.start_url, '/mail?app=setu-mail');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.shortcuts.map(item => item.name), ['Mail', 'Calendar', 'People']);
});

test('Mail Calendar and People routes override the generic CRM install metadata', () => {
  assert.match(metadata, /manifest:\s*'\/setu-mail-manifest\.webmanifest'/);
  assert.match(metadata, /applicationName:\s*'SETU Mail'/);
  assert.match(metadata, /\/icons\/setu-mail\.svg/);
  for (const layout of [mailLayout, calendarLayout, contactsLayout]) {
    assert.match(layout, /SETU_MAIL_APP_METADATA/);
    assert.match(layout, /export const metadata/);
  }
});

test('mobile communications chrome keeps one-tap Mail Calendar People navigation and optional CRM return', () => {
  assert.match(chrome, /label:\s*'Mail'/);
  assert.match(chrome, /label:\s*'Calendar'/);
  assert.match(chrome, /label:\s*'People'/);
  assert.match(chrome, /params\.get\('from'\) === 'crm'/);
  assert.match(chrome, /returnTo/);
  assert.match(chrome, /sessionStorage\.setItem\('setu-communications-from-crm'/);
  assert.match(chrome, /sessionStorage\.removeItem\('setu-communications-from-crm'/);
  assert.match(chrome, /value\.startsWith\('\/\/'\)/);
  assert.match(shell, /MobileCommunicationsChrome/);
});

test('mobile communications nav respects phone safe areas and stays hidden on desktop', () => {
  assert.match(chromeCss, /@media \(max-width: 767px\)/);
  assert.match(chromeCss, /env\(safe-area-inset-bottom\)/);
  assert.match(chromeCss, /position:\s*fixed/);
  assert.match(chromeCss, /grid-template-columns:\s*repeat\(3/);
  assert.match(chromeCss, /repeat\(4/);
});
