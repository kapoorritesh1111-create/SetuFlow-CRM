import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync('src/features/mobile/components/role-aware-lead-list.tsx', 'utf8');

test('mobile leads offers Active, Closed and All lifecycle filters', () => {
  assert.match(source, /lifecycleFilter/);
  assert.match(source, /\['Active', 'Closed', 'All'\]/);
  assert.match(source, /isClosedLead/);
  assert.match(source, /won\|lost\|closed\|rejected/);
});

test('closed leads never display in urgent or active work groups', () => {
  for (const group of ['critical', 'today', 'active']) {
    const line = source.split('\n').find((s) => s.includes(`id: '${group}'`));
    assert.ok(line, `missing ${group} group`);
    assert.match(line, /!isClosedLead\(l\)/);
  }
  assert.match(source, /id: 'closed'/);
});
