import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync('src/features/mobile/components/quick-capture-sheet.tsx', 'utf8');

test('quick capture uses existing lead and event routes rather than dead attachment buttons', () => {
  assert.match(source, /\/mobile\/capture/);
  assert.match(source, /\/leads\?quickLead=1/);
  assert.match(source, /\/trade-events/);
  assert.doesNotMatch(source, /onClick=\{onClose\}[^>]*>\s*<span/);
  assert.doesNotMatch(source, /Works offline — syncs automatically/);
});

test('capture dialog can be dismissed explicitly', () => {
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-label="Close quick capture"/);
});
