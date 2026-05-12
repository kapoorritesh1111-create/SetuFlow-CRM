import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const quoteWorkflow = readFileSync('src/lib/quoteWorkflow.ts', 'utf8');
const quoteHelp = readFileSync('docs/help/quotes.md', 'utf8');
const roadmap = readFileSync('docs/implementation/SETU_FLOW_MASTER_ROADMAP.md', 'utf8');
const migration = readFileSync('supabase/migrations/20260512_sprint_8q_quote_version_integrity.sql', 'utf8');

test('quote workflow exposes immutable version and accepted-version helpers', () => {
  assert.match(quoteWorkflow, /QUOTE_VERSION_IMMUTABLE_STATUSES/);
  assert.match(quoteWorkflow, /isQuoteVersionImmutableStatus/);
  assert.match(quoteWorkflow, /shouldQuoteStatusSetAcceptedVersionId/);
  assert.match(quoteWorkflow, /status\) === 'accepted'/);
  assert.match(quoteWorkflow, /getQuoteVersionLineageLabel/);
});

test('quote documentation separates sent from accepted and requires revision instead of mutation', () => {
  assert.match(quoteHelp, /Sending a quote does \*\*not\*\* mean acceptance/);
  assert.match(quoteHelp, /Editing a sent, approved, accepted, rejected, expired, or order-source quote must create a new quote version/);
  assert.match(quoteHelp, /Orders must start from `accepted_version_id`/);
  assert.match(quoteHelp, /Setu Guru must not recommend editing earlier sent quote lines/);
});

test('roadmap records quote version source of truth and deprecated legacy flows', () => {
  assert.match(roadmap, /quote_versions` and `quote_version_line_items` are the commercial source of truth/);
  assert.match(roadmap, /Sent is not accepted/);
  assert.match(roadmap, /quote_line_items` as commercial truth/);
  assert.match(roadmap, /Orders must start from accepted quote version lineage/);
});

test('database migration prevents sent-as-accepted and locked version mutation', () => {
  assert.match(migration, /app_enforce_quote_accepted_version_integrity/);
  assert.match(migration, /lower\(coalesce\(new\.status, ''\)\) <> 'accepted'/);
  assert.match(migration, /new\.accepted_version_id := old\.accepted_version_id/);
  assert.match(migration, /app_prevent_locked_quote_version_mutation/);
  assert.match(migration, /app_prevent_locked_quote_version_line_mutation/);
  assert.match(migration, /app_enforce_order_source_accepted_quote_version/);
  assert.match(migration, /Orders can only start from an explicitly accepted quote/);
});
