# Changes

## 2026-05-24 — SF-18-078 Admin/Settings UX Overhaul — All subtasks resolved (E through K)

Completed the full Admin/Settings UX overhaul epic. All 11 child subtasks (SF-18-078A through SF-18-078K) are now resolved. Verified Supabase live schema before each DB migration. TypeScript compile: 0 errors.

### SF-18-078E — Pipelines & Stages: visual pipeline board
- Replaced the dense inline-form-per-row StagesAdminWorkspace with a horizontal colored stage pill board per pipeline.
- Each stage shows its color bar, name, sort number, and Won/Lost/Closed chips. Clicking a pill opens a CSS `:target` right-side drawer with the full edit form.
- Added Edit pipeline, Add stage, Add pipeline, and Edit/Add next step CSS `:target` drawers throughout.
- Next steps replaced with a clean read-only table + CSS `:target` edit drawers.
- No new client components. No useState. Pure server render + CSS `:target` pattern.

### SF-18-078F — Security & Roles: visual permission matrix
- Added `PERMISSION_GROUPS` registry (10 permissions across Leads, Quotes, Orders, Admin modules).
- Replaced textarea-per-role with a read-only roles table; clicking Edit opens a 500px CSS `:target` drawer with grouped permission checkboxes.
- Updated `updateRolePermissions` server action to use `formData.getAll("permissions")` for checkbox arrays (backward compatible with legacy newline format).
- Create role moved to a CSS `:target` drawer.

### SF-18-078G — Integrations: live status cards
- Rewrote integrations page from static prose to a 3-column live status grid.
- Email status read from `MAILTRAP_API_KEY` env var; finance/freight read from `integrations` table `is_active`.
- Amber warning banner when email is misconfigured.
- Moved to `requireSetuInternalAdminWorkspace` (Platform section is SETU-only).

### SF-18-078H — Rate Limits: new page + DB migration
- Created `/admin/rate-limits` (SETU internal only).
- New Supabase tables: `rate_limit_overrides`, `rate_limit_override_audit` — applied via MCP migration.
- Page shows 5 monitored endpoints merged with per-org overrides. Violet highlight for active overrides.
- CSS `:target` edit drawer per endpoint with limit value and reason fields.
- `saveRateLimitOverride` and `resetRateLimitOverride` server actions write to both tables.
- Audit log table renders last 20 changes.

### SF-18-078I — Setu Guru Config: new page + DB migration
- Created `/admin/guru-config` (all org admins).
- New Supabase table: `workspace_guru_settings` — applied via MCP migration. Default rows seeded for all existing orgs.
- Monthly usage bar reads `rate_limit_hits` for current org; color-coded teal/amber/red.
- Config form: model selector, 4 toggle checkboxes, daily budget input.
- `saveGuruConfig` server action upserts `workspace_guru_settings`. Falls back to env vars if no row exists.
- Env var reference panel at bottom shows current effective values.

### SF-18-078J — Client Onboarding: inbox redesign
- Restructured page: AdminPageHero → Dashboard stat bar → Request inbox → Collapsible docs (bottom).
- Dashboard stat bar: Needs Action (rose), Reviewing (amber), Live (emerald), Total (slate) — 4 card grid.
- Added `StatusPipeline` component: 4-step horizontal pipeline (Intake → Provision → Invite → Live) per request card.
- Plan change request detection: if `status === "live"` AND `pricing_rules_notes` has content, violet banner appears with the notes text and Dismiss button.
- Requests sorted server-side: needs-action first, live clients last.
- Documentation sections moved into `<details>` collapsible at page bottom.

### SF-18-078K — API Keys & Webhooks: new page + DB migration
- Created `/admin/api-keys` (SETU internal only).
- New Supabase table: `api_keys` — applied via MCP migration.
- `generateApiKey`: generates `sf_live_` + 24 hex chars, SHA-256 hashes via Web Crypto API, stores only hash + prefix. Raw key shown once in a green one-time reveal banner via `?preview=`.
- `revokeApiKey`: sets `is_active=false` and `revoked_at`.
- CSS `:target` Generate key drawer with name and scope checkboxes (read:leads, write:quotes, read:orders, admin:read).
- Webhooks empty state with "Coming soon" disabled button.
- Revoked keys table rendered below active keys for audit trail.


## 2026-05-05 — Cleanup and documentation consolidation

- Reviewed the uploaded repo package and live Supabase project before updating README.
- Removed static reference HTML handoff artifacts from `public/` for now.
- Removed local Supabase CLI temp state and root one-off patch scripts from the active package.
- Consolidated mobile docs into `docs/MOBILE.md` and `docs/MOBILE_SCAN_PRODUCTION.md`.
- Updated README, document index, release status, schema, readiness, and proof docs around the current source/test/Supabase truth.
- Updated smoke tests and route manifest expectations so the repo guards against accidental reference HTML reintroduction.

## 2026-05-05 - V17.6.10 Customer-facing quote PDF layout and discount visibility

- Verified live Supabase quote, quote line, product, variant, category, market, country, lead, and organization fields before patching. No new migration is required.
- Reworked the dependency-light quote PDF route into a customer-facing price-list layout inspired by the supplied Roohted reference: header metadata, compact table, SKU, product, pack, units/case, MOQ, basis, unit price, case price, and quote total.
- Added category grouping with category subtotals when a quote contains lines from more than one category.
- Made quote-only discounts/markups visible in the PDF: adjusted lines show the quote price plus the original catalog/list price and adjustment reason.
- Kept the PDF footer short so the quote remains clean; long organization terms remain available from Admin defaults without crowding the customer-facing quote page.

## 2026-05-05 — V17.6.9 Quote modal send/approval/order handoff correction

- Verified live Supabase quote, quote line, document, organization, and contract/order handoff fields before patching. No new migration is required.
- Fixed the Quotes workspace modal close action by using a plain link back to the quote list while preserving the active buyer/supplier mode where possible.
- Changed the modal approval panel so approve/reject actions only show while the quote is actually pending approval; approved quote-only adjustments now show a clear "Approval cleared" state instead of continuing to display an approval form.
- Added explicit Send by email / WhatsApp handoff from the quote modal into the existing `/approval-send` workflow.
- Added a Create order handoff action from the quote modal using the existing accepted-quote/order contract workflow, so accepted/direct quotes can appear in Orders.
- Added toast-copy entries for quote approval, rejection, and order handoff errors so quote actions report through the global notification system.

## 2026-05-05 — V17.6.8 Quote workspace, approval modal, PDF layout, and terms defaults

- Verified live Supabase quote, quote line, organization, document, and lead activity fields before patching.
- Improved the dependency-light quote PDF route with a more commercial quote layout: branded header, bill-to/status cards, line item table, quote-only adjustment flags, totals, and terms/footer sections. No heavy PDF dependency was added; this keeps the Vercel function bundle small.
- Added editable organization-level quote and order terms defaults in Admin → Organization, backed by a new additive migration for `quote_terms_conditions` and `order_terms_conditions`.
- Moved selected quote review in `/quotes?quoteId=...` into a modal-style workspace so the open quote can be reviewed, approved/rejected, PDF-previewed, or handed off without scrolling through the page.
- Added direct approve and reject/revision forms in the Quotes workspace modal, including a required rejection reason.
- Kept quote-only discounts/markups isolated to quote line items and preserved product/category/default pricing rules.

## 2026-05-05 — V17.6.4 Quote approval handler build hotfix

- Verified the live Supabase `quotes` approval fields before patching: `approval_required`, `approved_at`, `approved_by`, and `notes_internal` exist and require no migration.
- Fixed the Vercel TypeScript build error where the inline Quote Builder render was missing the required `onApproveQuoteAdjustment` prop.
- No workflow behavior or database schema changes were made; this is a compile-only wiring fix for the quote approval UI.

## 2026-05-05 — V17.5.1 Add Product pricing unit hotfix

- Fixed the Vercel TypeScript build error in `add-product-drawer.tsx` caused by referencing a non-existent `form.packSizeUnit` field.
- The Add Product pricing calculator now derives the initial pack unit from the product pricing basis and pack label instead of an undefined form property.
- Confirmed the live Supabase `pricing_calculator_default_rules` table includes the V17.5 pricing-default alignment column `internal_margin_percent` and no longer includes product UOM/pack-size fields.

## 2026-05-05 — V17.3 Admin Reference Pages cleanup

- Reworked Admin → Product Management as a governance control center instead of a duplicate Products workspace. The page now focuses on catalog readiness, pricing gaps, variant coverage, trade attributes, approval posture, imports, and audit-oriented exceptions.
- Removed long educational content from the Product Management main surface and moved it into a proper Help drawer covering page purpose, Products-vs-Admin responsibilities, pricing rules, calculator behavior, and default margin hierarchy.
- Redesigned Admin → Categories around taxonomy governance with compact health metrics, a taxonomy workbench, selected category editor, parent-category support, and a Help drawer explaining product/import/quote/pricing-rule connections.
- Added parent category creation/update support to the Admin category server actions so category hierarchy can be managed directly from the taxonomy workbench.
- Expanded the Pricing Calculator help popover with clear EXW → FOB → CIF → DDP → Distributor → Retail explanations, markup vs margin behavior, and default rule priority.
- Kept day-to-day product editing and product-specific pricing in the Products workspace; Admin pages now link to Products instead of embedding duplicate product tables.

## V17.1 - Vercel TypeScript build hotfix

- Added an explicit return type for the recursive `ensureCategoryByName` helper used by the catalog/category CSV import action.
- Kept the import/export and pricing-calculator behavior unchanged; this is a compile-only TypeScript fix for the Vercel build failure.

## V17 - Catalog import/export and pricing calculator upgrade

- Added the catalog command center to the Products workspace for product/category CSV template downloads, CSV validation preview, error reporting, and safe import actions.
- Added lead CSV template support and lead import wiring with role-aware permissions.
- Added a pricing hierarchy engine that calculates EXW, FOB, CIF, DDP, Distributor, and Retail prices from any starting level with explicit cost layers and margin-mode handling.
- Added product-level pricing calculator save support with additive product pricing fields and variant source-payload snapshots.
- Added the additive Supabase migration `20260504_import_export_pricing_calculator.sql` for product pricing fields without removing existing pricing-rule or quote pricing tables.
- Preserved the existing quote pricing SSOT and kept quote/order integration conservative until the product-level calculator is validated.


## V15 - Unified mobile vCard share source

- Fixed inconsistent mobile Share vCard modal data across Dashboard, Leads, Orders, and Admin routes.
- Passed the saved profile photo into the canonical mobile share sheet so the same image appears from every entry point.
- Updated the mobile Leads signed-in summary to load saved My Card settings and share slug before building QR, Save Contact, Copy Link, and Share actions.
- Kept Smart QR as the default public-card link while keeping Save Contact on the compact .vcf endpoint.
- Further reduced newly uploaded profile photo output size to improve iPhone contact-photo import reliability.


## V14 - iPhone vCard import polish

- Added structured `N:` name fields so iOS displays the full contact name instead of falling back to the phone number.
- Tightened vCard output to iOS-friendly fields: name, organization, title, cell phone, email, website, address, note, and revision.
- Kept the public card URL out of visible contact fields.
- Reduced future profile-photo crop output to a smaller square JPEG so iOS is more likely to import the contact photo reliably.
- Added size guard for embedded vCard photos to avoid iOS silently rejecting oversized images.

# Setu Flow vCard QR Hotfix V11

## Fixed
- Removed inline phone-uploaded avatar data URLs from all public card, QR, and .vcf links.
- Fixed `URI_TOO_LONG` errors when downloading `.vcf` files after uploading a profile photo.
- Fixed broken share modal QR by keeping QR payloads compact and stable.
- Fixed My Card settings QR so it renders a real QR code instead of a huge text destination.
- Public card save-contact links now rebuild compact `.vcf` URLs from safe contact fields.
- Global header vCard share links now skip large inline avatar data safely.

## Notes
- Uploaded profile photos still show inside the signed-in product and share modal.
- Public card links use saved share slugs when available; otherwise they use compact fallback query params without large image payloads.

## V12 — Smart vCard sharing architecture

- Default QR now opens the public profile card instead of the raw `.vcf` endpoint.
- Header share modal now uses clean `/card` public links for QR, copy, email, and native share.
- Signed-in shell now prefers saved share slugs, so uploaded profile photos load from the public card instead of being embedded into URLs.
- Added Smart QR / Offline QR toggle on My Card settings: Smart opens the public card; Offline points directly to the `.vcf` contact download.
- Added lightweight public card analytics pixel for view/QR source tracking via `audit_logs` when a share slug is available.
- Added Open Graph metadata for public cards so mobile share previews use the card/profile context instead of a generic page.
- Added Apple Wallet / Google Wallet icon actions with stable wallet-ready endpoints for future pass-provider credentials.

## V13 — vCard mobile contact polish

- Kept Smart QR as the default public-card link and clarified modal copy to “Scan to open card.”
- Cleaned `.vcf` generation so saved iPhone/Android contacts no longer show the Setu Flow public-card URL as an ugly work field.
- Added compressed profile photo support in generated `.vcf` files when the saved avatar is available as an optimized data image.
- Reordered and relabeled share actions to feel more contact-first: Save contact, Copy link, Share card, Send email.
- Added the provided Apple Wallet and Google Wallet icon assets across desktop modal, mobile sheet, My Card settings, and public card.
- Preserved wallet actions as premium pass placeholders until Apple `.pkpass` certificates and Google Wallet issuer credentials are connected.

## V16 - Homepage vCard feature spotlight

- Added a dedicated Contact Exchange section to the marketing homepage after the product showcase so the shareable vCard is presented as a core product feature before the comparison table.
- Added a sanitized, blurred vCard share screenshot asset for homepage use, preserving QR/action/wallet UI while blurring the profile photo and contact details.
- Tuned the section for mobile and desktop: compact proof bullets, strong call-to-action, responsive phone-style visual, and brand-color glow treatment.
- Updated the Connection Layer card copy from generic vCard wording to Smart vCard Exchange positioning.

## 2026-05-05 — V17.2 Product UX + Pricing Workflow

- Fixed the Product Management data query that could surface `column reference "product_variant_id" is ambiguous` by removing the legacy embedded `product_prices` join from the primary products query. Runtime pricing continues to use `product_pricing_rules`; compatibility prices are only fetched through explicit variant IDs when needed.
- Lightened Admin → Product Management with concise page copy, compact metric tiles, and a collapsible help area instead of long explanatory cards on the main surface.
- Promoted the pricing calculator into product workflows with a reusable product pricing calculator panel, help icon, product detail pricing card, Add Product integration, and direct Products workspace access.
- Reused the import/export wizard inside Client Onboarding so category, catalog, lead, and pricing import setup is visible during first-login/customer setup planning.

## V17.4 — Pricing calculator variant/defaults hotfix

- Fixed Product Detail pricing calculator variant selection so products with multiple variants can save against the selected variant instead of falling through to "No product variant is available".
- Added variant selector, default unit of measure, pack size, pack unit, and pricing basis fields to the product pricing calculator.
- Changed pricing calculator help from inline content to a centered pop-up help modal.
- Changed Admin help from side drawer behavior to centered pop-up behavior.
- Added Admin → Product Management pricing rules/defaults screen for organization and category calculator defaults.
- Added additive Supabase migration for `pricing_calculator_default_rules` to store organization/category default cost layers, margins, UOM, pack size, and pricing basis.

## V17.5 pricing calculator clarity alignment

- Clarified default pricing calculator rules so organization/category defaults store shared calculator assumptions only: currency, margin mode, landed-cost layers, internal markup/margin, distributor margin, and retail margin.
- Moved product UOM, pack size, pack unit, and pricing basis responsibility back to product/variant pricing screens instead of default rules.
- Added internal markup/margin to the pricing hierarchy so operator margin is applied after DDP/last landed base and before distributor/retail margins.
- Product pricing calculator now starts in inherited-default mode for saved products and requires an explicit Edit product pricing override action before changing product-specific pricing.
- Clarified quote-level price adjustments as quote-only changes that do not rewrite product/category defaults.
- Added V17.5 additive migration to align pricing_calculator_default_rules with internal margin guidance.

## V17.5.2 TypeScript calculator input hotfix

- Verified live Supabase schema for `pricing_calculator_default_rules`, `product_variants`, and `products` before patching.
- Confirmed product/variant packaging fields live on `product_variants`, while default pricing rule margins live on `pricing_calculator_default_rules`.
- Fixed `ProductPricingCalculatorPanel.toInput` so numeric Supabase fields such as `units_per_case` can be used as safe string input fallbacks without failing strict TypeScript builds.

## V17.5.3 pricing rules, category defaults, and import alignment

- Verified the live Supabase schema for `pricing_calculator_default_rules`, `products`, `product_variants`, and `product_categories` before updating code.
- Added visible success/error redirect notices for default pricing rule saves and category saves.
- Updated Admin Product Management pricing-gap counts to match the Products variant grid instead of counting product masters that have no variants.
- Added a separate variant setup gap so product masters without variants are not mislabeled as pricing gaps.
- Added category-level pricing default editing directly in Admin → Categories → Selected category.
- Updated category open-products links and Products page initial query filters so review links open the correct filtered view.
- Simplified product import/export templates so imports carry product setup and starting prices only, while shared costs/margins stay in pricing default rules.
- Product imports now write product-level starting prices and variant-level UOM/pack/pricing-basis setup.


## V17.5.4 Product Row Pricing Drawer Cleanup

- Focuses Product Detail pricing on the product/variant row selected from Products instead of asking users to choose a variant again.
- Removes the duplicated variant baseline/quote-ready edit cards from the Pricing tab because each variant is already represented as its own product row in Products.
- Keeps the Variants tab as a read-only/summary style list for pack/SKU/MOQ visibility, while pricing edits happen through the selected product row calculator.
- Quick quote links now preserve the selected product variant id so quote flows can stay variant-aware without rewriting product defaults.

## V17.5.5 Save/Error Toast Notifications

- Replaced inline success/error notice banners for admin save flows with floating toast notifications.
- Applied toast behavior to Product Management, Categories, Invitations, Users, Client Onboarding, Orders, and public onboarding validation notices.
- Added shared `NoticeToast` UI component so save/error feedback no longer pushes page content down or creates blank space in the page layout.

## V17.6 Global Help + Toast Consistency Pass

- Added a global Help button to the authenticated app shell so every protected workflow has a consistent pop-up explanation without long instructional text on the page.
- Moved common page/header education out of the main surface by suppressing PageHeader, AdminPageHero, and SectionCard explanatory descriptions from the visual page layout.
- Expanded save/error notification behavior from selected pages to the app shell: any authenticated route using `?notice=` now receives a floating toast notification instead of an inline banner.
- Added handoff toast support for routed workflow transitions such as Dashboard → Follow-up, Capture → Follow-up, and Quote/Approval → Orders.
- Updated toast dismissal so clicking outside the toast clears the notification, while Quick Lead remains a direct quick-entry action without extra help or confirmation clicks.

## V17.6.1 — Quote Builder workflow order, UOM, and FX clarity

- Reordered inline Lead Quote Preview steps so commercial Terms are locked before Pricing.
- Added quote-line pricing basis display for UOM/pack/MOQ context before quantity and unit price edits.
- Enriched lead quote variant data with pack size/unit, pack label, MOQ, and pricing mode defaults from Supabase-backed product variants.
- Added lead-country currency candidate to the Quote Terms currency selector when it can be mapped.
- Updated Follow-up Help to describe the current Quote Builder workflow, pricing basis, UOM/MOQ handling, quote-only adjustments, and FX reference behavior.

## V17.6.2 — Quote Builder basis, adjustments, and approval queue

- Clarified incoterm meanings directly in the quote Terms step.
- Added quote-only line adjustments for discount/markup by percent or quote currency amount.
- Flagged quote-only adjustments beyond the 15% threshold for owner/admin approval.
- Added approval queue visibility and an approve action in the Follow-up quote preview flow.
- Preserved product/category/default pricing rules when quote-only adjustments are made.
- Updated quote help copy for incoterms, pricing basis, UOM/MOQ, FX reference, and approval handling.

## V17.6.3 — Quote approval TypeScript schema alignment hotfix

- Verified live Supabase `quotes` table includes `approval_required`, `approved_at`, `approved_by`, and `notes_internal` before patching.
- Updated the shared Leads workspace `Quote` type so Approval Queue UI can safely read quote approval state.
- Updated the legacy local database `QuoteRow` shape to include current quote workflow fields used by the app.
- No Supabase migration required.

## V17.6.5 — Quote workflow cleanup, approval revision, and PDF preview

- Converted inline Lead/Quote Builder success and error messages to floating toast notifications.
- Hid lead queue filters and duplicate workspace buttons while a lead/quote workspace is active so operators land directly on the quote workflow.
- Added automatic scroll-to-quote behavior when opening Quote Preview from Follow-up so the editable workspace is visible immediately.
- Adjusted approval behavior so unsaved quote-only discounts/markups must be saved before approval, preventing adjustments from disappearing when approved.
- Added reject/request-revision handling for quote adjustments with a required rejection reason.
- Added quote PDF preview/export route without adding a new heavy PDF dependency; the route creates a valid PDF response and records a quote document pointer.
- Updated Quotes workspace export action to open the generated PDF for the selected quote.


## V17.6.6 - quote PDF product typing hotfix

- Verified Supabase product columns through the schema listing before changing the PDF route.
- Typed quote PDF product lookup rows defensively so Vercel does not infer joined product rows as `{}`.
- No Supabase migration required.

## V17.6.7 - Quote PDF strict TypeScript hotfix
- Verified live Supabase quote/PDF fields used by the PDF route.
- Added explicit QuotePdfLineRow typing in the quote PDF API route so Vercel strict TypeScript does not infer reduce/flatMap callback parameters as any.
- No Supabase migration required.

## 2026-05-06 — Setu Guru embedded help and chatbot knowledge base

- Reviewed the upgraded CRM source tree, route manifest, docs, tests, and Supabase mitigation migrations to build a current product understanding for chatbot support.
- Added the embedded Setu Guru widget to the authenticated app shell so users can open route-aware CRM help from a small bottom-right bot avatar.
- Added hide/restore behavior: users can hide Setu Guru from the drawer and restore it from a right-edge Guru tab.
- Added route-aware Setu Guru guidance for onboarding, catalog/pricing, lead-to-order, quote approval, trade events/mobile, documents/compliance, roles/permissions, and AI guardrails.
- Added local feedback capture so early Setu Guru usage can identify helpful answers and missing knowledge until a Supabase-backed learning loop is connected.
- Added Setu Guru avatar and support diagrams to `public/setu-guru/` for UI/runtime access.
- Added chatbot-ready knowledge files, repo review, learning-loop guidance, and exact GPT build prompt under `docs/setu-guru/`.

## 2026-05-06 — Setu Guru live research expansion

- Added Setu Guru documentation gap audit.
- Added live research playbook for industry standards, margins, HS/HSN/commodity codes, tariffs, duties, VAT, and compliance document questions.
- Added HS/HSN enrichment workflow with review-before-write-back guardrails.
- Added margin benchmarking workflow for product/category/country/channel assumptions.
- Added export/import compliance research workflow for destination-market document checks.
- Added product enrichment workflow for missing classification and compliance fields.
- Added exact GPT creation instructions for Custom GPT setup, knowledge upload, live web search behavior, and future Actions.
- Added `POST /api/setu-guru/research` as the secure live research backend hook using OpenAI Responses API web search when configured.
- Updated Setu Guru widget copy and local knowledge topics to include live industry research.
