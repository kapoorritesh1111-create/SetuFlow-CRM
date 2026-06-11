// S24-TRIAL-204 Pass B regression: tour registry integrity, data-tour anchors
// present in source, provider mounted gated, and forbidden patterns absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const registry = read('src/lib/trial/tour-registry.ts');
const provider = read('src/features/trial/tour-provider.tsx');
const layout = read('src/app/(app)/layout.tsx');
const banner = read('src/features/trial/trial-workspace-banner.tsx');
const trialPage = read('src/app/(app)/trial/page.tsx');

const anchorFiles = {
  'quick-lead-button': 'src/components/layout/app-shell.tsx',
  'lead-row': 'src/features/leads/ui/lead-table-row.tsx',
  'create-quote': 'src/features/quotes/components/quote-workspace.tsx',
  'convert-order': 'src/features/quotes/components/quote-workspace.tsx',
  'dispatch-strip': 'src/features/orders/components/OrderStageAdvanceStrip.tsx',
  'add-product': 'src/features/products/components/products-spreadsheet-page.tsx',
  'add-task': 'src/features/tasks/components/tasks-workspace.tsx',
  'add-trade-event': 'src/features/trade-events/components/trade-events-manager.tsx',
};

test('registry declares every anchor exactly as wired in components', () => {
  for (const [anchor, file] of Object.entries(anchorFiles)) {
    assert.ok(registry.includes(`anchor: '${anchor}'`), `registry missing anchor ${anchor}`);
    assert.ok(read(file).includes(`data-tour="${anchor}"`), `${file} missing data-tour="${anchor}"`);
  }
});

test('registry covers the core trial journey milestones', () => {
  for (const milestone of ["milestone: 'lead'", "milestone: 'quote'", "milestone: 'order'", "milestone: 'dispatch'"]) {
    assert.ok(registry.includes(milestone), `registry missing ${milestone}`);
  }
  assert.ok(registry.includes('export function deriveTrialJourney'));
});

test('tour provider is mounted in app layout gated by guided_mode_enabled', () => {
  assert.ok(layout.includes('TrialTourProvider'), 'layout must mount TrialTourProvider');
  assert.ok(layout.includes('guided_mode_enabled'), 'mount must be gated by guided_mode_enabled');
  assert.ok(layout.includes('guidedTourEnabled ?'), 'provider must be conditional');
});

test('trial banner exposes the replay control', () => {
  assert.ok(banner.includes('TrialTourRelaunchButton'));
});

test('provider honors forbidden-pattern rules (no DOM hacks)', () => {
  assert.ok(!provider.includes('MutationObserver'), 'no MutationObserver allowed');
  assert.ok(!provider.includes('setTimeout'), 'no timeout polling allowed');
  assert.ok(!provider.includes('addEventListener'), 'no global listeners allowed');
  assert.ok(!provider.includes('.remove()'), 'no DOM pruning allowed');
  assert.ok(!provider.includes('innerHTML'), 'no DOM injection allowed');
  assert.ok(provider.includes("'use client'"), 'provider must be a client component');
  assert.ok(provider.includes('localStorage'), 'dismissed state persists in localStorage');
});

test('/trial renders journey checklist from shared derivation', () => {
  assert.ok(trialPage.includes('deriveTrialJourney'));
  assert.ok(trialPage.includes('Your trial journey'));
  assert.ok(trialPage.includes("from('contracts')"), 'dispatch milestone reads contracts.execution_state');
});
