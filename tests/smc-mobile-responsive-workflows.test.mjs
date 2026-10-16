import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');
const billing = read('src/app/smc/billing/page.tsx');
const clients = read('src/app/smc/clients/client-view.tsx');
const clientsLayout = read('src/app/smc/clients/layout.tsx');
const css = read('src/app/smc/smc-mobile.css');

test('SMC invoice forms have a dedicated mobile layout and retain the draft workflow', () => {
  assert.match(billing, /smc-billing-page/);
  assert.match(billing, /smc-billing-line/);
  assert.match(css, /\.smc-billing-line\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(billing, /Save invoice draft/);
  assert.match(billing, /Download customer PDF/);
});

test('Client Orgs reflows list, metrics and details on narrow screens', () => {
  for (const name of ['smc-client-workspace', 'smc-client-metrics', 'smc-client-body', 'smc-client-list', 'smc-client-details']) {
    assert.ok(clients.includes(name), name + ' must be present');
    assert.ok(css.includes('.' + name), name + ' needs mobile CSS');
  }
  assert.match(css, /\.smc-client-body\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/);
  assert.match(css, /\.smc-client-list\s*>\s*div:last-child\s*\{[^}]*overflow:\s*visible/);
});

test('Client User Setup button stays in the mobile document flow', () => {
  assert.match(clientsLayout, /className="smc-clients-route-layout"/);
  assert.match(clientsLayout, /className="smc-client-setup-action"/);
  assert.match(css, /\.smc-client-setup-action\s*\{[^}]*position:\s*relative\s*!important/);
});

test('Shared mobile SMC navigation provides safe area and tappable controls', () => {
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.smc-mtab\s*\{[^}]*min-height:\s*44px/);
});
