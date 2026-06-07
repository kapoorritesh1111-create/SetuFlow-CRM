# Changes

## 2026-06-06 — Reverted public marketing View Transition pass

- Removed the experimental View Transition navigation handler from the public marketing shell after live testing showed poor transition quality and language picker/dropdown interference.
- Deleted the marketing motion CSS module and removed global `::view-transition-*` timing rules.
- Restored standard Next.js link navigation for public marketing pages, preserving header, language selector, workspace entry, and Setu Guru lite behavior.

## 2026-06-06 — Public marketing motion polish

- Added a scoped View Transition API polish layer for the public marketing shell so supported browsers get a calm page-to-page fade/lift between public pages.
- Limited animated navigation to public marketing routes only: `/`, `/platform`, `/solutions`, `/setu-guru-ai`, `/field-mobile`, `/pricing`, `/compare`, `/training`, and `/book-demo`.
- Kept `/client-login`, `/workspace`, SMC, authenticated CRM routes, and the internal `/mobile` experience outside the transition handler so operational surfaces remain plain and predictable.
- Added persistent shared-element naming for the public header, logo, and footer plus reduced-motion safeguards and browser fallback behavior.

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
