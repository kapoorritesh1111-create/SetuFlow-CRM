import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260817113000_s51_pkg_050_packaging_v4_atomic_quote_persistence.sql'), 'utf8');
const pdfRoute = readFileSync(resolve(process.cwd(), 'src/app/api/quotes/[quoteId]/pdf/route.ts'), 'utf8');

function count(text: string, needle: string) {
  return text.split(needle).length - 1;
}

test('S51-PKG-049: separate quote charges are rebuilt as canonical mutable and version lines', () => {
  assert.match(migration, /line_kind'\s*,\s*'separate_charge'/);
  assert.match(migration, /parent_source_quote_line_id/);
  assert.match(migration, /jsonb_array_elements[\s\S]*separate_charges/);
  assert.match(migration, /basis_applied, pricing_mode[\s\S]*'service_fee', 'unit'/);
  assert.ok(count(migration, "from public.quote_line_items qli") >= 1);
});

test('S51-PKG-049: repricing removes stale derived charge lines for the parent before rebuilding', () => {
  assert.match(migration, /delete from public\.quote_line_items[\s\S]*line_kind'[\s\S]*separate_charge[\s\S]*parent_source_quote_line_id/);
  assert.match(migration, /delete from public\.quote_version_line_items[\s\S]*parent_source_quote_line_id/);
  assert.match(migration, /coalesce\(pricing_breakdown_json ->> 'line_kind',''\) <> 'separate_charge'/);
});

test('S51-PKG-049: canonical PDF already renders packaging rows from mutable quote lines', () => {
  assert.match(pdfRoute, /from\('quote_line_items'\)/);
  assert.match(pdfRoute, /if \(line\.line_type === 'packaging'\)/);
  assert.match(pdfRoute, /input_snapshot_json\?\.spec_summary/);
});

test('S51-PKG-050: RPC remains service-role only', () => {
  assert.match(migration, /revoke all on function public\.app_save_packaging_v4_quote_line_tx[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.app_save_packaging_v4_quote_line_tx[\s\S]*to service_role/);
});
