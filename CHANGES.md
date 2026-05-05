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
