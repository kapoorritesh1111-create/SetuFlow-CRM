import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
const capture = readFileSync('src/features/mobile/components/quick-capture-sheet.tsx', 'utf8');
const nav = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');

test('mobile home reads grants and only links to real authenticated workflows', () => {
  assert.match(home, /useMobilePermissions\(\)/);
  const shared = readFileSync('src/features/mobile/components/mobile-permissions.tsx', 'utf8');
  assert.match(shared, /fetch\('\/api\/modules\/grants'/);
  assert.match(shared, /getEnabledModuleSet\(grants\)/);
  for (const route of ['/leads', '/quick-quote', '/tasks', '/trade-events', '/mobile/guru', '/contact-exchange/vcard', '/mail']) {
    assert.ok(home.includes(route), 'missing real destination: ' + route);
  }
  assert.doesNotMatch(home, /Mehta Foods|Rahul Sharma|Demo captured|CRM sync queued/);
});

test('capture shortcuts do not bypass module grants or simulate writes', () => {
  assert.match(nav, /canCreateLeads=\{topModules\.has\('full_crm'\)\}/);
  assert.match(nav, /canUseTradeShow=\{topModules\.has\('trade_show'\)\}/);
  assert.match(capture, /canCreateLeads \?/);
  assert.match(capture, /canUseTradeShow \?/);
  for (const route of ['/mobile/capture', '/leads?quickLead=1', '/quick-quote', '/trade-events']) {
    assert.ok(capture.includes(route), 'missing workflow: ' + route);
  }
  assert.match(capture, /aria-modal="true"/);
  assert.match(capture, /aria-label="Close quick capture"/);
  assert.doesNotMatch(capture, /Works offline — syncs automatically|CRM sync and WhatsApp queued/);
});

test('offline trade capture queue never reports queued visitors as delivered', () => {
  const sync = readFileSync('src/features/trade-events/components/trade-event-offline-sync.tsx', 'utf8');
  assert.match(sync, /listOfflineTradeCaptures/);
  assert.match(sync, /retryOfflineTradeCapture/);
  assert.match(sync, /Queued is not delivered/);
  assert.match(sync, /aria-live="polite"/);
});

test('existing lead note dictation can be stopped and appends only new transcript results', () => {
  const drawer = readFileSync('src/features/leads/components/drawer/lead-drawer-implementation.tsx', 'utf8');
  assert.match(drawer, /noteRecognitionRef\.current\.stop\(\)/);
  assert.match(drawer, /results\)\.slice\(current\.resultIndex \?\? 0\)/);
  assert.match(drawer, /Review the note before saving/);
  assert.match(drawer, /Nothing was saved automatically/);
});

test('owner dashboard shortcuts require authenticated admin and module grants', () => {
  const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
  const shared = readFileSync('src/features/mobile/components/mobile-permissions.tsx', 'utf8');
  assert.match(shared, /setCanAccessAdmin\(payload\.canAccessAdmin === true\)/);
  assert.match(home, /canAccessAdmin && crm \?/);
  assert.match(home, /canAccessAdmin \?/);
  assert.match(home, /analytics \?/);
  assert.match(home, /communications \?/);
  assert.doesNotMatch(home, /\broleLabel === 'owner'/);
});

test('media permissions remain denied publicly but allow user consent on authenticated mobile capture routes', () => {
  const middleware = readFileSync('middleware.ts', 'utf8');
  assert.match(middleware, /function permitsAuthenticatedMobileMedia\(pathname: string\)/);
  assert.match(middleware, /'camera=\(self\), microphone=\(self\), geolocation=\(\)'/);
  assert.match(middleware, /'camera=\(\), microphone=\(\), geolocation=\(\)'/);
  assert.match(middleware, /return applySecurityHeaders\(response, nonce, permitsAuthenticatedMobileMedia\(pathname\)\)/);
  assert.doesNotMatch(middleware.split('function permitsAuthenticatedMobileMedia')[1]?.split('function applyPackagingAcademyHeaders')[0] ?? '', /\/admin|\/api/);
});

test('mobile Tasks route uses its real create sheet, not a dead quickTask query', () => {
  const shell = readFileSync('src/features/mobile/components/mobile-shell.tsx', 'utf8');
  const tasks = readFileSync('src/features/tasks/components/mobile-tasks-workspace.tsx', 'utf8');
  assert.doesNotMatch(shell, /href: '\/tasks\?quickTask=1'/);
  assert.match(tasks, /Create new task/);
  assert.match(tasks, /TaskFormSheet/);
});

test('anonymous mobile preview must ask for real sign-in before rendering workspace', () => {
  const layout = readFileSync('src/app/(mobile)/mobile/layout.tsx', 'utf8');
  assert.match(layout, /if \(!workspace\.user\) redirect\('\/client-login\?next=%2Fmobile'\)/);
  assert.match(layout, /if \(!workspace\.organization \|\| !workspace\.membership\) redirect\('\/dashboard'\)/);
});

test('module grant API errors do not misleadingly claim that licensed modules are disabled', () => {
  const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
  const shared = readFileSync('src/features/mobile/components/mobile-permissions.tsx', 'utf8');
  assert.match(shared, /setError\(true\)/);
  assert.match(home, /Workspace permissions could not load/);
  assert.match(home, /!grantsError && actions\.length === 0/);
});

test('device settings do not show fake universal Ready statuses', () => {
  const cards = readFileSync('src/features/mobile/components/mobile-cards.tsx', 'utf8');
  assert.match(cards, /Notification\.permission/);
  assert.match(cards, /countOfflineTradeCaptures/);
  assert.match(cards, /display-mode: standalone/);
  const settings = cards.slice(cards.indexOf('export function SettingsList()'));
  assert.doesNotMatch(settings, />Ready</);
});

test('production mobile screens cannot accidentally restore mock prices or fake saves', () => {
  const components = readFileSync('src/features/mobile/components/mobile-cards.tsx', 'utf8');
  assert.doesNotMatch(components, /qty \* 3\.1|Template pricing, freight basis/);
  assert.doesNotMatch(components, /export function QuickQuoteWidget|export function TradeCaptureForm/);
  assert.doesNotMatch(components, /<button[^>]*>Save \{entity\}/);
});

test('legacy standalone lead list cannot show demo customer records in production', () => {
  const oldRoute = readFileSync('src/app/(mobile)/mobile/leads/page.tsx', 'utf8');
  const leadList = readFileSync('src/app/(app)/leads/page.tsx', 'utf8');
  assert.match(oldRoute, /redirect\('\/leads'\)/);
  assert.doesNotMatch(oldRoute, /RoleAwareLeadList|mobileLeadDemoData/);
  assert.match(leadList, /buildMobileLeadCardsFromAppData/);
});

test('mobile notification close returns to the new home', () => {
  const notifications = readFileSync('src/app/(mobile)/mobile/notifications/page.tsx', 'utf8');
  assert.match(notifications, /href="\/mobile" aria-label="Close notifications"/);
});

test('Guru is a real navigation action, not an event without a listener in standalone shell', () => {
  const topBar = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
  assert.match(topBar, /canUseGuru \? <Link href="\/mobile\/guru"/);
  assert.doesNotMatch(topBar, /setu-guru:open/);
});

test('standalone vCard shares the saved public slug and never a generic login page', () => {
  const layout = readFileSync('src/app/(mobile)/mobile/layout.tsx', 'utf8');
  const bar = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
  assert.match(layout, /getMyCardSettingsForUser\(workspace\.user\.id\)/);
  assert.match(layout, /myCard\?\.is_public && myCard\?\.share_slug/);
  assert.match(layout, /shareHref: shareSlug \? `\/card\?share=\$\{shareSlug\}` : undefined/);
  assert.match(layout, /downloadVcfHref: shareSlug \? `\/api\/public\/card-vcf\?share=\$\{shareSlug\}` : undefined/);
  assert.match(bar, /topModules\.has\('vcard'\) && Boolean\(signedIn\?\.shareHref\)/);
});
