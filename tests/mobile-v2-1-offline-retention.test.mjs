import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/trade-events/offline-capture-queue.ts', import.meta.url), 'utf8');
const component = readFileSync(new URL('../src/features/trade-events/components/trade-event-offline-capture.tsx', import.meta.url), 'utf8');

test('offline leads are never silently deleted due to age or full queue', () => {
  assert.doesNotMatch(source, /MAX_QUEUE_AGE_MS|\.filter\(isFresh\)|\.slice\(-MAX_QUEUE_ITEMS\)/);
  assert.match(source, /if \(items\.length > MAX_QUEUE_ITEMS\) return false/);
  assert.match(source, /No lead was queued/);
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(items\)\)/);
});

test('capture UI explains retained pending leads and manual review', () => {
  assert.match(component, /Pending captures are retained until confirmed/);
  assert.match(component, /failedItems\.length > 0/);
});
