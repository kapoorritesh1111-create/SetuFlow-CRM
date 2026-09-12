import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');
const chrome = read('src/components/layout/mobile-communications-chrome.tsx');
const chromeCss = read('src/components/layout/mobile-communications-chrome.module.css');
const installNudge = read('src/components/layout/mobile-setu-mail-install-nudge.tsx');
const installNudgeCss = read('src/components/layout/mobile-setu-mail-install-nudge.module.css');
const shell = read('src/components/layout/mail-product-shell.tsx');
const metadata = read('src/lib/setu-mail-app-metadata.ts');
const mailLayout = read('src/app/(app)/mail/layout.tsx');
const calendarLayout = read('src/app/(app)/calendar/layout.tsx');
const contactsLayout = read('src/app/(app)/contacts/layout.tsx');
const contactsPage = read('src/app/(app)/contacts/page.tsx');
const mobilePeople = read('src/features/contacts/components/mobile-people-workspace.tsx');
const manifest = JSON.parse(read('public/setu-mail-manifest.webmanifest'));

test('SETU Mail standalone manifest opens mail and exposes communications shortcuts', () => {
  assert.equal(manifest.name, 'SETU Mail');
  assert.equal(manifest.start_url, '/mail?app=setu-mail');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.shortcuts.map(item => item.name), ['Mail', 'Calendar', 'People']);
  assert.deepEqual(manifest.icons.map(item => item.src), ['/icons/setu-mail-192.png', '/icons/setu-mail-512.png']);
  assert.match(manifest.icons[1].purpose, /maskable/);
  assert.ok(existsSync('public/icons/setu-mail-192.png'));
  assert.ok(existsSync('public/icons/setu-mail-512.png'));
  assert.ok(existsSync('public/icons/setu-mail-apple-touch.png'));
});

test('Mail Calendar and People routes override the generic CRM install metadata', () => {
  assert.match(metadata, /manifest:\s*'\/setu-mail-manifest\.webmanifest'/);
  assert.match(metadata, /applicationName:\s*'SETU Mail'/);
  assert.match(metadata, /\/icons\/setu-mail-192\.png/);
  assert.match(metadata, /\/icons\/setu-mail-512\.png/);
  assert.match(metadata, /\/icons\/setu-mail-apple-touch\.png/);
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
  assert.match(chrome, /params\.get\('app'\) === 'setu-mail'/);
  assert.match(chrome, /sessionStorage\.setItem\('setu-communications-from-crm'/);
  assert.match(chrome, /sessionStorage\.setItem\('setu-communications-return-to'/);
  assert.match(chrome, /sessionStorage\.removeItem\('setu-communications-from-crm'/);
  assert.match(chrome, /value\.startsWith\('\/\/'\)/);
  assert.match(chrome, /app=setu-mail/);
  assert.match(shell, /MobileCommunicationsChrome/);
});

test('mobile communications nav respects phone safe areas, unread Mail badges, and desktop isolation', () => {
  assert.match(chromeCss, /@media \(max-width: 767px\)/);
  assert.match(chromeCss, /env\(safe-area-inset-bottom\)/);
  assert.match(chromeCss, /position:\s*fixed/);
  assert.match(chromeCss, /grid-template-columns:\s*repeat\(3/);
  assert.match(chromeCss, /repeat\(4/);
  assert.match(chrome, /unreadMailCount/);
  assert.match(chrome, /unread messages/);
  assert.match(chromeCss, /\.badge/);
  assert.match(shell, /unreadMailCount=\{access\.unreadMailCount\}/);
});

test('People has a dedicated Outlook-style mobile workspace without replacing desktop Contacts', () => {
  assert.match(contactsPage, /MobilePeopleWorkspace/);
  assert.match(contactsPage, /md:hidden/);
  assert.match(contactsPage, /hidden h-full md:block/);
  assert.match(mobilePeople, />People</);
  assert.match(mobilePeople, /Search people/);
  assert.match(mobilePeople, /Add person/);
  assert.match(mobilePeople, /grid h-10 w-10 shrink-0 place-items-center rounded-full/);
  assert.match(mobilePeople, /Object\.entries\(groups\)/);
  assert.match(mobilePeople, /\/mail\?compose=1&to=/);
  assert.match(mobilePeople, /\/calendar\?compose=1&guest=/);
  assert.match(mobilePeople, /Archive person/);
});

test('mobile install guidance supports Android install prompts and iPhone home-screen instructions', () => {
  assert.match(installNudge, /beforeinstallprompt/);
  assert.match(installNudge, /display-mode: standalone/);
  assert.match(installNudge, /iphone\|ipad\|ipod/i);
  assert.match(installNudge, /Add to Home Screen/);
  assert.match(installNudge, /setu-mail-install-dismissed/);
  assert.match(shell, /MobileSetuMailInstallNudge/);
  assert.match(installNudgeCss, /safe-area-inset-bottom/);
});
