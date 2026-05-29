import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const widget = readFileSync('src/features/setu-guru/setu-guru-widget.tsx', 'utf8');
test('widget has confidence badges for high/medium/low', () => {
  assert.match(widget, /confidenceBadge/);
  assert.match(widget, /High confidence/);
  assert.match(widget, /Medium confidence/);
  assert.match(widget, /Low confidence/);
});
test('widget shows risk badges for high and medium risk actions', () => {
  assert.match(widget, /riskBadge/);
  assert.match(widget, /High risk — approval required/);
  assert.match(widget, /Review before applying/);
});
test('widget shows provenance badges and fetchedAt timestamps', () => {
  assert.match(widget, /provenanceBadge/);
  assert.match(widget, /fetchedAt/);
  assert.match(widget, /SourceCard/);
});
test('widget shows source-unavailable warning on stale sources', () => {
  assert.match(widget, /Source unavailable/);
  assert.match(widget, /isStale/);
});
