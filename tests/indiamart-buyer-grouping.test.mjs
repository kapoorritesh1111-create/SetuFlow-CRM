import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adapter = fs.readFileSync('src/features/integrations/indiamart/server.ts','utf8');
const migration = fs.readFileSync('supabase/migrations/20261006083000_group_indiamart_buyer_events.sql','utf8');

test('IndiaMART sync groups same-buyer events after staging', () => {
  assert.match(adapter, /groupRecentIndiaMartBuyerEvents/);
  assert.match(adapter, /group_recent_indiamart_buyer_events/);
  assert.match(adapter, /p_session_hours: 24/);
});

test('grouping keeps one active buyer card and suppresses same-session events', () => {
  assert.match(migration, /right\(regexp_replace/);
  assert.match(migration, /make_interval\(hours/);
  assert.match(migration, /indiamart_same_buyer_event_grouped/);
  assert.match(migration, /has_terminal/);
  assert.match(migration, /sales_queue_suppressed = true/);
});
