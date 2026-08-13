import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260812162000_catalog_brochure_sharing.sql');
const categoryMigration = read('supabase/migrations/20260812162500_catalog_brochure_category_mapping.sql');
const hardeningMigration = read('supabase/migrations/20260812165500_catalog_brochure_share_hardening.sql');
const contactMigration = read('supabase/migrations/20260813070500_organization_client_contact_channels.sql');
const server = read('src/features/catalog-brochures/server.ts');
const adminPage = read('src/app/(app)/admin/catalog/brochures/page.tsx');
const brochureModal = read('src/features/catalog-brochures/components/brochure-manager-modal.tsx');
const contactActions = read('src/features/catalog-brochures/contact-actions.ts');
const catalogPage = read('src/app/(app)/admin/categories/page.tsx');
const legacyPublicPage = read('src/app/public/brochure/[token]/page.tsx');
const clientCatalogPage = read('src/app/catalogs/[token]/page.tsx');
const clientCatalogFile = read('src/app/catalogs/[token]/file/route.ts');
const clientCatalogLogo = read('src/app/catalogs/[token]/logo/route.ts');
const publicCatalog = read('src/features/catalog-brochures/public-catalog.ts');
const choicesApi = read('src/app/api/catalog-brochures/route.ts');
const shareApi = read('src/app/api/catalog-brochures/share/route.ts');
const inboundComposer = read('src/features/integrations/interakt/components/sales-message-composer.tsx');
const inboundActions = read('src/features/integrations/interakt/sales-message-actions.ts');
const followUpComposer = read('src/features/leads/canonical/FollowUpComposer.tsx');

test('S51-CAT-011 stores organization brochures and compact opaque shares under RLS', () => {
  for (const marker of ['catalog_brochures', 'catalog_brochure_families', 'catalog_brochure_shares', 'enable row level security', 'is_org_member', 'is_org_admin', 'token text not null unique', 'open_count']) assert.match(migration, new RegExp(marker));
  assert.match(server, /organization-assets/);
  assert.match(server, /randomBytes\(18\).*base64url/);
  assert.match(server, /\/catalogs\//);
  assert.doesNotMatch(server, /url: `\$\{[^}]+\}\/public\/brochure\//);
});

test('S51-CAT-011 enforces same-organization share relationships and atomic opens', () => {
  assert.match(hardeningMigration, /enforce_catalog_brochure_share_scope/);
  assert.match(hardeningMigration, /brochure\.organization_id = new\.organization_id/);
  assert.match(hardeningMigration, /lead_row\.organization_id = new\.organization_id/);
  assert.match(hardeningMigration, /intake_row\.organization_id = new\.organization_id/);
  assert.match(hardeningMigration, /increment_catalog_brochure_share_open/);
  assert.match(hardeningMigration, /open_count = open_count \+ 1/);
  assert.match(clientCatalogFile, /rpc\('increment_catalog_brochure_share_open'/);
});

test('S51-CAT-011 supports generic product categories and packaging families', () => {
  assert.match(categoryMigration, /catalog_brochure_categories/);
  assert.match(categoryMigration, /product_categories/);
  assert.match(server, /category_names/);
  assert.match(server, /packaging_service_families/);
  assert.match(brochureModal, /Product categories/);
  assert.match(brochureModal, /Packaging families/);
  assert.match(inboundComposer, /category_names/);
});

test('S51-CAT-011 admin Catalog manages brochures and buyer contact in a premium in-window modal', () => {
  assert.match(catalogPage, /BrochureManagerModal/);
  assert.match(brochureModal, /role="dialog"/);
  assert.match(brochureModal, /aria-modal="true"/);
  assert.match(brochureModal, /Manage library/);
  assert.match(brochureModal, /Upload brochure/);
  assert.match(brochureModal, /Buyer contact/);
  assert.match(brochureModal, /Sales WhatsApp/);
  assert.match(brochureModal, /connected to Interakt/);
  assert.match(brochureModal, /updateCatalogBuyerContact/);
  assert.match(contactMigration, /contact_phone/);
  assert.match(contactMigration, /whatsapp_phone/);
  assert.match(contactActions, /contact_phone/);
  assert.match(contactActions, /whatsapp_phone/);
  assert.match(adminPage, /redirect\('\/admin\/catalog\?brochures=1'\)/);
  assert.doesNotMatch(catalogPage, /Why is this one admin page/);
  assert.doesNotMatch(brochureModal, /How sales uses this|Use this for any organization|opaque Setu Flow link|CRM login/);
  assert.doesNotMatch(brochureModal, /tracking-\[|font-black|font-extrabold/);
});

test('S51-CAT-011 client catalog is organization branded and keeps private files behind normalized routes', () => {
  assert.match(clientCatalogPage, /organization\.displayName/);
  assert.match(clientCatalogPage, /\/catalogs\/\$\{share\.token\}\/logo/);
  assert.match(clientCatalogPage, /\/catalogs\/\$\{share\.token\}\/file/);
  assert.match(clientCatalogPage, /Contact us/);
  assert.match(clientCatalogPage, /Request a quote/);
  assert.match(clientCatalogPage, /wa\.me/);
  assert.doesNotMatch(clientCatalogPage, /Setu Flow|SETU Flow|powered by/i);
  assert.match(clientCatalogFile, /storage[\s\S]*download/);
  assert.doesNotMatch(clientCatalogFile, /createSignedUrl/);
  assert.match(clientCatalogLogo, /org-logos/);
  assert.match(publicCatalog, /catalogQuoteMessage/);
  assert.match(legacyPublicPage, /redirect\(`\/catalogs\/\$\{token\}`\)/);
});

test('S51-CAT-011 inbound inquiry composer recommends but requires explicit brochure selection', () => {
  assert.match(inboundComposer, /Catalog \/ brochure/);
  assert.match(inboundComposer, /Recommended ·/);
  assert.match(inboundComposer, /name="brochureId"/);
  assert.match(inboundComposer, /No brochure/);
  assert.match(inboundComposer, /Select it above to attach it/);
  assert.doesNotMatch(inboundComposer, /setBrochureId\(recommended\.id\)/);
  assert.match(inboundActions, /createCatalogBrochureShare/);
  assert.match(inboundActions, /View our.*catalog/);
  assert.match(inboundActions, /brochure_share_id/);
});

test('S51-CAT-011 failed inbound sends discard only unsent brochure shares', () => {
  assert.match(inboundActions, /discardUnsentBrochureShare/);
  assert.match(inboundActions, /catch \(error\)[\s\S]*discardUnsentBrochureShare/);
  assert.match(inboundActions, /recordOutboundMessage/);
});

test('S51-CAT-011 converted lead follow-up can insert family-aware brochure links', () => {
  assert.match(choicesApi, /lead_id/);
  assert.match(choicesApi, /main_product_category/);
  assert.match(choicesApi, /recommended/);
  assert.match(shareApi, /createCatalogBrochureShare/);
  assert.match(followUpComposer, /Insert brochure link/);
  assert.match(followUpComposer, /lead’s product-family context/);
  assert.match(followUpComposer, /\/api\/catalog-brochures\/share/);
  assert.doesNotMatch(followUpComposer, /font-black|font-extrabold/);
});
