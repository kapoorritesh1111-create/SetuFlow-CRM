import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wizardConfig = readFileSync('src/features/quotes/logic/wizard-config.ts', 'utf8');
const quotesHelp = readFileSync('docs/help/quotes.md', 'utf8');

test('quote builder steps remain a single sequential action surface', () => {
  for (const label of ['Product & currency', 'Price lines', 'Terms & approval', 'Review totals', 'Send & approval checkpoint']) {
    assert.match(wizardConfig, new RegExp(label.replace(/[&]/g, '&')));
  }
  assert.doesNotMatch(wizardConfig, /shortcut|quick action panel|duplicate action/i);
});

test('quote builder labels explain pricing and send boundaries', () => {
  assert.match(wizardConfig, /pack, MOQ, units\/case, basis price, quote price, and line total/);
  assert.match(wizardConfig, /selected currency, totals, quote-only overrides, approval state, and PDF readiness/);
  assert.match(wizardConfig, /blockers are clear, approval is approved or not required, and the customer-send decision is intentional/);
});

test('quotes help records no duplicate quote action surfaces and send approval rule', () => {
  assert.match(quotesHelp, /one primary quote builder sequence/);
  assert.match(quotesHelp, /Do not add duplicate quote action panels/);
  assert.match(quotesHelp, /Product & currency → Price lines → Terms & approval → Review totals → Send & approval checkpoint/);
  assert.match(quotesHelp, /Send only when approval is approved or not required/);
});
