import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260930080000_stark_courier_bags_phase1.sql', 'utf8');
const fileRoute = fs.readFileSync('src/app/catalogs/[token]/file/route.ts', 'utf8');
const brochurePage = fs.readFileSync('src/app/brochures/courier-bags/page.tsx', 'utf8');

test('Courier Bags stays active but outside automated quotation and pricing', () => {
  assert.match(migration, /'courier-bags'/);
  assert.match(migration, /'custom_dimensions'/);
  assert.match(migration, /is_quoteable = false/);
  assert.match(migration, /pricing_engine_type = null/);
  assert.doesNotMatch(migration, /packaging_pricing_templates/);
  assert.doesNotMatch(migration, /packaging_size_profiles/);
});

test('Courier Bags has a sales brochure mapped to the family', () => {
  assert.match(migration, /catalog_brochures/);
  assert.match(migration, /catalog_brochure_families/);
  assert.match(migration, /'public-static'/);
  assert.match(migration, /'\/brochures\/courier-bags'/);
  assert.match(fileRoute, /public-static/);
  assert.match(fileRoute, /NextResponse\.redirect/);
  assert.match(brochurePage, /Custom dimensions/);
  assert.match(brochurePage, /Manual pricing/);
  assert.match(brochurePage, /Artwork/);
});
