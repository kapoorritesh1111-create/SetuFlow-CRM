import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260812162000_catalog_brochure_sharing.sql');
const categoryMigration = read('supabase/migrations/20260812162500_catalog_brochure_category_mapping.sql');
const server = read('src/features/catalog-brochures/server.ts');
const adminPage = read('src/app/(app)/admin/catalog/brochures/page.tsx');
const catalogPage = read('src/app/(app)/admin/categories/page.tsx');
const publicPage = read('src/app/public/brochure/[token]/page.tsx');
const publicFile = read('src/app/api/public/brochures/[token]/file/route.ts');
const choicesApi = read('src/app/api/catalog-brochures/route.ts');
const shareApi = read('src/app/api/catalog-brochures/share/route.ts');
const inboundComposer = read('src/features/integrations/interakt/components/sales-message-composer.tsx');
const inboundActions = read('src/features/integrations/interakt/sales-message-actions.ts');
const followUpComposer = read('src/features/leads/canonical/FollowUpComposer.tsx');

test('S51-CAT-011 stores organization brochures and opaque shares under RLS', () => {
  for (const marker of ['catalog_brochures', 'catalog_brochure_families', 'catalog_brochure_shares', 'enable row level security', 'is_org_member', 'is_org_admin', 'token text not null unique', 'open_count']) assert.match(migration, new RegExp(marker));
  assert.match(server, /organization-assets/);
  assert.match(server, /randomBytes\(24\)/);
  assert.match(server, /\/public\/brochure\//);
});

test('S51-CAT-011 supports generic product categories and packaging families', () => {
  assert.match(categoryMigration, /catalog_brochure_categories/);
  assert.match(categoryMigration, /product_categories/);
  assert.match(server, /category_names/);
  assert.match(server, /packaging_service_families/);
  assert.match(adminPage, /Standard product categories/);
  assert.match(adminPage, /Packaging service families/);
});

test('S51-CAT-011 admin Catalog exposes brochure upload and management', () => {
  assert.match(catalogPage, /\/admin\/catalog\/brochures/);
  assert.match(adminPage, /Upload a PDF catalog/);
  assert.match(adminPage, /Available to sales/);
  assert.match(adminPage, /uploadCatalogBrochure/);
  assert.match(adminPage, /updateCatalogBrochure/);
});

test('S51-CAT-011 public brochure viewer stays login-free and private-storage backed', () => {
  assert.match(publicPage, /Shared catalog/);
  assert.match(publicPage, /\/api\/public\/brochures\//);
  assert.match(publicFile, /createSignedUrl/);
  assert.match(publicFile, /open_count/);
  assert.match(publicFile, /last_opened_at/);
});

test('S51-CAT-011 inbound inquiry composer can select and send a brochure link', () => {
  assert.match(inboundComposer, /Catalog \/ brochure/);
  assert.match(inboundComposer, /Recommended ·/);
  assert.match(inboundComposer, /name="brochureId"/);
  assert.match(inboundActions, /createCatalogBrochureShare/);
  assert.match(inboundActions, /View our.*catalog/);
  assert.match(inboundActions, /brochure_share_id/);
});

test('S51-CAT-011 converted lead follow-up can insert family-aware brochure links', () => {
  assert.match(choicesApi, /lead_id/);
  assert.match(choicesApi, /main_product_category/);
  assert.match(choicesApi, /recommended/);
  assert.match(shareApi, /createCatalogBrochureShare/);
  assert.match(followUpComposer, /Insert brochure link/);
  assert.match(followUpComposer, /lead’s product-family context/);
  assert.match(followUpComposer, /\/api\/catalog-brochures\/share/);
});
