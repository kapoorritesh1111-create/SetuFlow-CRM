import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260912014000_calendar_series_anchor_safety.sql', 'utf8');

test('entire-series edits preserve the original recurrence date anchor', () => {
  assert.match(migration, /calendar_preserve_series_anchor_date/);
  assert.match(migration, /old\.recurrence_series_id is null/);
  assert.match(migration, /old\.recurrence_rule is not null/);
  assert.match(migration, /old_local::date is distinct from new_local::date/);
  assert.match(migration, /requested_duration := new\.ends_at - new\.starts_at/);
  assert.match(migration, /new\.starts_at := \(\(old_local::date \+ new_local::time\) at time zone new_tz\)/);
  assert.match(migration, /new\.ends_at := new\.starts_at \+ requested_duration/);
  assert.match(migration, /before update of starts_at, ends_at, timezone, recurrence_rule/);
});
