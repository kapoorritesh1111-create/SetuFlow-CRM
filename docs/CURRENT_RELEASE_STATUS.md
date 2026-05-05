# Current Release Status

## Status

Setu Flow CRM is in an upgraded baseline state with public client onboarding, Setu-internal SaaS workspace provisioning, trade-events command center, mobile scan improvements, current DCC/reference HTML handoffs, catalog import/export, product pricing calculator workflows, cleaned Admin reference pages, and the V17.6.5 Quote workflow cleanup, approval revision, and PDF preview pass.

## Current readiness

| Area | Status | Notes |
|---|---|---|
| Public onboarding | Ready | `/onboarding` is public and posts to the public onboarding API. |
| Admin onboarding | Ready | `/admin/client-onboarding` is Setu-internal only and supports SaaS provisioning plus Mailtrap admin email retry. |
| Workspace URL rule | Ready | New workspace intent uses `companyname.setuflowcrm.com`. |
| Default setup | Ready | All countries are seeded for every org; markets, pipelines, pipeline stages, next steps, roles, and pricing starter settings are provisioned. |
| Product categories | Governance-ready | Admin Categories now focuses on taxonomy health, hierarchy, active state, import readiness, and category help. Product editing stays in Products. |
| Pricing rules | Product-level calculator added | Quote pricing rules remain the commercial SSOT; product records now have additive calculator fields for EXW/FOB/CIF/DDP/Distributor/Retail. V17.3 adds clearer help copy for defaults, category rules, and product overrides. |
| DCC/reference HTML | Ready | Current internal and reference HTMLs are updated. |
| Docs | Ready | Active docs are consolidated and current. |
| Regression tests | Partially verified in sandbox | Typecheck could not complete in this sandbox because dependencies are not installed and `npm ci` was intentionally not run. V17.6.5 continues quote workflow stabilization: toast feedback, hidden queue filters during quote work, approval revision handling, and a dependency-light PDF preview/export route. Typecheck still requires the Vercel dependency install environment because npm ci is not run in sandbox. |

## Test result

```text
npm run typecheck
Blocked: dependencies are not installed in the sandbox, and npm ci was intentionally not run per upgrade constraint.
```

## V17.5.1 Add Product pricing unit hotfix

Status: compile hotfix package ready for Vercel validation.

Highlights:
- Fixed `add-product-drawer.tsx` so it no longer references the missing `FormState.packSizeUnit` property.
- Add Product now initializes calculator pack unit from product pricing basis and pack label.
- Supabase mitigation confirmed: `pricing_calculator_default_rules` exists with `internal_margin_percent` and default pricing-rule fields only; product UOM/pack fields are not stored on the default-rule table.

## V17.3 Admin Reference Pages cleanup

Status: implementation pass complete in repo package; Vercel build still needs to run in the deployment environment with dependencies installed.

Highlights:
- Admin Product Management is now a governance page, not a duplicated Products table.
- Product Management explanations moved into a Help drawer covering page purpose, Products-vs-Admin responsibility, pricing rules, calculator behavior, and margin defaults.
- Admin Categories now uses compact metrics, taxonomy workbench tabs, selected category editing, parent-category support, and a Help drawer.
- Pricing Calculator help now explains the EXW → FOB → CIF → DDP → Distributor → Retail chain, markup vs margin, and organization/category/product default priority.
- Parent category create/update support added to admin category actions.

## V17.2 Product UX + Pricing Workflow

Status: implementation pass complete in repo package; Vercel build still needs to run in the deployment environment with dependencies installed.

Highlights:
- Product Management page reduced to operational copy, compact metrics, and help drawer content.
- Pricing Calculator is now available from Products & Pricing, Product Detail pricing, and Add Product.
- Product-specific calculator snapshots save to product-level pricing fields.
- Client Onboarding now exposes the import/export wizard for setup flows.
- Legacy product_prices embedded join removed from the main products query to avoid ambiguous `product_variant_id` errors.

## V17.4 Pricing calculator defaults and variant fix

- Product calculator now asks for selected variant, default UOM, pack size, pack unit, and pricing basis.
- Product calculator save no longer depends on `product_variants.organization_id`; it validates the parent product and then resolves variants by product ID, which avoids false "No product variant" errors for legacy/null organization variant rows.
- Admin Product Management now includes an editable pricing defaults screen for organization-level and category-level pricing calculator rules.
- Help interactions are pop-up modals, not inline page sections or side drawers.
- Migration added: `20260505_pricing_calculator_default_rules.sql`.

### V17.5 pricing calculator clarity alignment

Status: implementation patch prepared. Supabase migration and Vercel deployment still need operator execution.

- Default pricing rules are now treated as organization/category shared assumptions, not product packaging records.
- Product UOM, pack size, pack unit, and pricing basis remain product/variant responsibilities.
- Internal markup/margin is available before distributor and retail margins.
- Existing products inherit category pricing rules until a user explicitly edits a product-specific pricing override.
- Quote-specific adjustments remain isolated to the quote workflow.

### V17.5.2 TypeScript calculator input hotfix

- Live Supabase schema was checked before code changes.
- Confirmed pricing calculator default rules include internal/distributor/retail margin fields and do not own UOM or pack-size fields.
- Confirmed product variant packaging fields include pack size, pack unit/label, units per case, pricing mode default, and net weight.
- Patched calculator input conversion so numeric variant defaults compile under Vercel strict TypeScript checks.

### V17.5.3 admin pricing/defaults correction

This pass fixes issues found after the V17.5.2 build hotfix:

- Supabase schema was checked before code edits.
- Pricing rule save now redirects with success/error notices instead of failing silently.
- Category save now redirects with success/error notices, including active/inactive changes.
- Category selected panel now includes category pricing defaults.
- Admin Product Management pricing-gap count now matches Products gap filtering and separates product masters without variants.
- Product import/export templates no longer include shared pricing-rule fields; they carry required product setup plus starting prices only.

No `npm ci` was run in the sandbox.


## V17.5.4 Product Row Pricing Drawer Cleanup

- Focuses Product Detail pricing on the product/variant row selected from Products instead of asking users to choose a variant again.
- Removes the duplicated variant baseline/quote-ready edit cards from the Pricing tab because each variant is already represented as its own product row in Products.
- Keeps the Variants tab as a read-only/summary style list for pack/SKU/MOQ visibility, while pricing edits happen through the selected product row calculator.
- Quick quote links now preserve the selected product variant id so quote flows can stay variant-aware without rewriting product defaults.

### V17.5.5 notification cleanup

Save and error notices now use a floating toast pattern instead of inline page banners. This keeps admin/category/product pages stable after form submissions and prevents large blank spaces at the top of pages.

### V17.6 Global Help + Toast Consistency Pass

Status: implementation package prepared for Vercel validation.

- Every authenticated page now receives a shell-level Help button with route-aware pop-up guidance.
- Main page headers and common card shells no longer render long explanatory text directly on the page; education belongs in Help.
- Save/error messages are centralized through a shell-level floating toast for `notice` redirects so page content does not shift down after actions.
- Toast notifications can be dismissed by clicking outside the notification box.
- Quick Lead remains frictionless and does not receive additional help/confirmation steps.

No `npm ci` was run in the sandbox.

### V17.6.1 Quote Builder workflow alignment

This pass aligns Quote Preview workflow order with commercial logic: product lock -> terms/currency/incoterm/validity -> pricing lines. Pricing lines now surface variant UOM, pack, MOQ, and pricing basis so users know whether the quantity/price is by case, unit, or kg/bulk before editing line price. No Supabase migration is required; the patch uses existing `product_variants` fields verified in Supabase (`pack_size_value`, `pack_size_unit`, `units_per_case`, `moq_cases`, `moq_kg`, `pricing_mode_default`).

### V17.6.2 quote builder alignment

The quote builder now locks commercial terms before pricing, explains incoterms, shows UOM/MOQ pricing basis, supports quote-only margin/discount adjustments, and routes >15% quote-only deviations to approval before send. No Supabase migration is required for this pass; it uses existing quote approval fields.

## V17.6.3 Quote approval TypeScript schema alignment hotfix

Status: compile hotfix package ready for Vercel validation.

Highlights:
- Confirmed Supabase `quotes` table has approval workflow fields: `approval_required`, `approved_at`, `approved_by`, and `notes_internal`.
- Fixed the Vercel-reported TypeScript error in the Lead Follow-up Approval Queue by updating the shared `Quote` type.
- No migration required; this is an app type alignment fix against the live schema.


## V17.6.4 Quote approval handler hotfix

Status: compile hotfix package ready for Vercel validation.

Highlights:
- Confirmed the live Supabase `quotes` table includes approval workflow fields: `approval_required`, `approved_at`, `approved_by`, and `notes_internal`.
- Passed `onApproveQuoteAdjustment` into the inline Quote Builder render so the required component prop is satisfied.
- No Supabase migration is required for this hotfix.


## V17.6.5 Quote workflow cleanup

Status: implementation package ready for Vercel validation.

Highlights:
- Quote Builder local success/error messages now use floating toast notifications instead of inline green banners.
- Follow-up filters and duplicate navigation buttons are hidden while the quote workspace is active.
- Opening Quote Preview scrolls to the quote workspace so the operator can see the active editor immediately.
- Approval flow now requires saving quote-only discounts/markups before approval, includes an approval action, and adds a reject/request-revision action with a required reason.
- Quote PDF preview/export now uses a lightweight built-in PDF response route and updates the Documents table with a quote PDF pointer. No new npm dependency was added.

### V17.6.6 quote PDF product typing hotfix

- Build hotfix for `src/app/api/quotes/[quoteId]/pdf/route.ts`.
- Supabase schema listing confirms `products.id`, `products.name`, and legacy `products.sku` exist.
- No new migration required.
