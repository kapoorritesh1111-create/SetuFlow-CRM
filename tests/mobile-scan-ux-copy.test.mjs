import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const drawer = readFileSync('src/features/leads/components/lead-drawer.tsx', 'utf8');
const footer = readFileSync('src/features/leads/components/LeadDrawerFooter.tsx', 'utf8');

test('mobile scan UX baseline scan UX keeps scan progress visible after camera/file picker closes', () => {
  assert.match(drawer, /sticky top-0 z-30/);
  assert.match(drawer, /aria-live="assertive"/);
  assert.match(drawer, /Reading card…/);
  assert.match(drawer, /Card scan complete/);
});

test('mobile scan UX baseline scan success uses customer-safe copy without field dump duplication', () => {
  assert.match(drawer, /Card details added\. Please review before saving\./);
  assert.doesNotMatch(drawer, /message: `Lead details filled from scan\. \$\{summary\}`/);
  assert.doesNotMatch(drawer, /setState\(\{ success: `Lead details filled from scan\. \$\{summary\}`/);
  assert.match(footer, /success && !quickScanStatus\?\.message/);
});

test('mobile scan UX baseline footer shows only loading scan state so success is not duplicated below form', () => {
  assert.match(footer, /quickScanStatus\?\.tone === 'loading'/);
  assert.doesNotMatch(footer, /quickScanStatus\.tone === 'success' \? 'Scan complete\./);
});
