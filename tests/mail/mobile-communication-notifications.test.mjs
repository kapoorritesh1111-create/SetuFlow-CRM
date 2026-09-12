import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = path => readFileSync(path, 'utf8');

function loadTs(path, mocks = {}, extras = {}) {
  const exports = {};
  const source = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (name in mocks) return mocks[name]; throw new Error(`Unexpected dependency: ${name}`); }, URL, setTimeout, clearTimeout, ...extras });
  return exports;
}
const scope = loadTs('src/lib/notifications/communication-scope.ts');

test('product boundary accepts only exact Mail/Calendar types, not CRM text or SMC alerts', () => {
  for (const type of ['mail_received', 'calendar_reminder']) assert.equal(scope.isCommunicationNotification(type), true);
  for (const type of ['smc_issue_status', 'quote_email', 'mail_received_extra', 'calendar', null, undefined]) assert.equal(scope.isCommunicationNotification(type), false);
  assert.equal(JSON.stringify(scope.pushScopesFor('mail_received', 'org-a')), '["crm","setu-mail"]');
  assert.equal(JSON.stringify(scope.pushScopesFor('calendar_reminder')), '["crm"]');
  assert.equal(JSON.stringify(scope.pushScopesFor('smc_issue_new', 'org-a')), '["crm"]');
});

test('deep links stay inside the correct product and preserve authorized mailbox handoff', () => {
  assert.equal(scope.communicationActionUrl('mail_received', '/api/mail/open?mailboxId=a&messageId=b'), '/api/mail/open?mailboxId=a&messageId=b');
  assert.equal(scope.communicationActionUrl('calendar_reminder', '/calendar?event=e'), '/calendar?event=e');
  for (const url of ['//evil.example/x', '/\\evil.example', '/mail/../../smc', '/mailicious', 'https://evil.example/mail', '/smc', '/api/mail/open/other']) assert.equal(scope.communicationActionUrl('mail_received', url), '/mail');
  assert.equal(scope.communicationActionUrl('calendar_reminder', '/mail/message/1'), '/calendar');
});

test('device registration is separated from CRM and other org/user registrations', () => {
  assert.equal(scope.communicationWorkerScope('org-a', 'user-a'), '/mail/push/org-a/user-a/');
  assert.notEqual(scope.communicationWorkerScope('org-a', 'user-a'), scope.communicationWorkerScope('org-b', 'user-a'));
  assert.notEqual(scope.communicationWorkerScope('org-a', 'user-a'), scope.communicationWorkerScope('org-a', 'user-b'));
});

test('worker activation has a bounded wait and cleans up its state listener', async () => {
  const ready = { active: { state: 'activated' } };
  assert.equal(await scope.waitForPushWorker(ready), ready);
  let listener;
  let removals = 0;
  const worker = { state: 'installing', addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { removals++; } };
  const registration = { installing: worker };
  const pending = scope.waitForPushWorker(registration, 100);
  worker.state = 'activated'; listener();
  assert.equal(await pending, registration);
  assert.equal(removals, 1);
  await assert.rejects(scope.waitForPushWorker({ installing: { ...worker, state: 'installing' } }, 5), /timed out/);
});

function senderHarness(fail = false) {
  const sends = [], pruned = [];
  const rows = [
    { id: 'crm-a', user_id: 'user-a', organization_id: 'org-a', app_scope: 'crm', endpoint: 'crm-a' },
    { id: 'mail-a', user_id: 'user-a', organization_id: 'org-a', app_scope: 'setu-mail', endpoint: 'mail-a' },
    { id: 'mail-b', user_id: 'user-a', organization_id: 'org-b', app_scope: 'setu-mail', endpoint: 'mail-b' },
    { id: 'other', user_id: 'user-b', organization_id: 'org-a', app_scope: 'setu-mail', endpoint: 'other' },
  ];
  const db = { from() { let selected = [...rows]; return {
    select() { return this; }, in(key, values) { selected = selected.filter(row => values.includes(row[key])); return this; }, eq(key, value) { selected = selected.filter(row => row[key] === value); return this; },
    then(resolve, reject) { return Promise.resolve({ data: selected, error: fail ? new Error('DB unavailable') : null }).then(resolve, reject); },
    delete() { return { in: async (_, ids) => { pruned.push(...ids); } }; },
  }; } };
  const push = { setVapidDetails() {}, async sendNotification(subscription) { sends.push(subscription.endpoint); } };
  const module = loadTs('src/lib/notifications/web-push.ts', { 'web-push': push, './communication-scope': scope }, { process: { env: { WEB_PUSH_PUBLIC_KEY: 'test', WEB_PUSH_PRIVATE_KEY: 'test' } } });
  return { db, sends, pruned, send: module.sendWebPushToUsers };
}

test('actual server sender excludes SETU Mail devices for CRM/SMC events', async () => {
  const h = senderHarness();
  await h.send(h.db, ['user-a'], { title: 'CRM', body: 'CRM', type: 'smc_issue_new' });
  assert.deepEqual(h.sends, ['crm-a']);
});

test('actual communication send is user-, organization-, and product-scoped', async () => {
  const h = senderHarness();
  await h.send(h.db, ['user-a'], { title: 'Mail', body: 'Mail', type: 'mail_received' }, 'org-a');
  assert.deepEqual(h.sends.sort(), ['crm-a', 'mail-a']);
});

test('subscription lookup errors fail closed without sending or broadening scope', async () => {
  const h = senderHarness(true);
  const result = await h.send(h.db, ['user-a'], { title: 'Mail', body: 'Mail', type: 'mail_received' }, 'org-a');
  assert.equal(result.skipped, 'subscription-query-failed');
  assert.deepEqual(h.sends, []);
});

function workerHarness() {
  const handlers = {}, shown = [], opened = [];
  const self = { location: { origin: 'https://www.setuflowcrm.com' }, addEventListener: (name, handler) => { handlers[name] = handler; }, registration: { showNotification: async (title, options) => { shown.push({ title, options }); } }, clients: { matchAll: async () => [], openWindow: async url => { opened.push(url); } } };
  vm.runInNewContext(read('public/setu-mail-sw.js'), { self, URL });
  const push = async payload => { let work; handlers.push({ data: { json: () => payload }, waitUntil: promise => { work = promise; } }); await work; };
  return { handlers, shown, opened, push };
}

test('real worker suppresses unrelated pushes and renders Mail with the approved icon', async () => {
  const h = workerHarness();
  await h.push({ type: 'smc_issue_status', title: 'No' });
  assert.equal(h.shown.length, 0);
  await h.push({ type: 'mail_received', title: 'New mail', action_url: '/api/mail/open?mailboxId=a&messageId=b' });
  assert.equal(h.shown.length, 1);
  assert.equal(h.shown[0].options.icon, '/icons/setu-mail-source.png');
  assert.equal(h.shown[0].options.data.url, '/api/mail/open?mailboxId=a&messageId=b');
});

test('worker notification clicks cannot navigate to CRM or another origin', async () => {
  const h = workerHarness();
  let work;
  h.handlers.notificationclick({ notification: { close() {}, data: { type: 'calendar_reminder', url: '//evil.example/' } }, waitUntil: promise => { work = promise; } });
  await work;
  assert.deepEqual(h.opened, ['https://www.setuflowcrm.com/calendar']);
});

test('mobile bell and onboarding are visible without the hidden desktop header', () => {
  const chrome = read('src/components/layout/mobile-communications-chrome.tsx');
  const ui = read('src/components/notifications/communication-notifications.tsx');
  assert.match(chrome, /CommunicationNotifications[^>]*mobile/);
  assert.match(ui, /Notification\.requestPermission\(\)/);
  assert.match(ui, /mobile && standalone && !snoozed/);
  assert.match(ui, /Enable notifications/);
  assert.match(ui, /\.in\('type', \[\.\.\.COMMUNICATION_NOTIFICATION_TYPES\]\)/);
  assert.match(ui, /\.eq\('user_id', userId\)/);
  assert.doesNotMatch(ui, /from\('(?:lead_follow_ups|quotes|orders|scheduled_tasks)'\)/);
  assert.match(ui, /waitForPushWorker/);
  assert.doesNotMatch(ui, /navigator\.serviceWorker\.ready/);
});
