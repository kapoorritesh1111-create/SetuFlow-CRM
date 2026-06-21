# SetuFlow CRM — New Organization Onboarding Guide
_For chatbot knowledge base upload — June 2026_

## Orders Execution Cockpit onboarding note

Use `/orders` after quote acceptance. The active Orders direction is **Execution Cockpit**, not a Quote clone.

Stages:

```text
Actual Lines -> Buyer Doc -> Packing -> Freight Queue -> Processing -> Delivery Note -> Final Invoice -> Paid & Closed
```

New users should understand these boundaries:

- Finance and Freight are queue-ready only with `adapter_name='pending'`.
- Queue invoice sync does not sync to Xero, QuickBooks, Tally, bank feeds, or payment processors.
- Queue freight request does not book carriers or call Flexport, Freightos, DHL, or freight providers.
- WhatsApp opens a manual tracked link for the operator to send; no WhatsApp Business API is live.
- Setu Guru can explain blockers and draft checklists, but cannot approve, send, waive, close, sync, book, or mutate commercial truth.

## Catalog Admin vs Products

Use **Admin → Catalog Admin** (`/admin/product-management`) for back-office setup and governance: pricing calculator defaults, imports, readiness issues, owner/admin-only product data cleanup, import history, setup coverage, and audit review.

Use **Products** (`/products`) for day-to-day product rows, variants, units per case, MOQ, product-specific pricing snapshots, and quote-ready catalog work.

Quote-only customer discounts or negotiated prices stay inside **Quotes** and must not rewrite catalog defaults.

## Correct setup order

1. **Pricing calculator/defaults first** — confirm currency, margin mode, freight, duty, internal margin, distributor margin, and retail margin assumptions.
2. **Categories second** — import category hierarchy and category defaults.
3. **Products + variants third** — import products, variants, packs, MOQ, starting pricing snapshots, HSN/origin, shelf life, lead time, and shipment notes.

Do not start product import before categories exist. Products resolve categories inside the active workspace organization only.

## Category template

```csv
category_name,parent_category,category_code,description,sort_order,active_status,default_country_of_origin,default_shelf_life_months,default_lead_time_days,default_shipment_notes
```

## Product template

```csv
product_name,sku_code,brand_name,category,subcategory,pricing_type,active_status,quoteable_status,description,variant_name,variant_code,pack_label,pack_size_value,pack_size_unit,units_per_case,net_weight_kg,moq_cases,moq_kg,pricing_mode_default,supports_bulk_pricing,country_of_origin,shelf_life_months,lead_time_days,shipment_notes,hsn_code,currency,ex_factory_per_unit,fob_per_unit,cif_per_unit,ddp_per_unit,distributor_per_unit,retail_per_unit,bulk_price_per_kg,price_effective_from,price_effective_to,row_action,notes
```

Important setup notes:
- `units_per_case` is required because pack/MOQ and quote pricing depend on it.
- `pricing_mode_default` should be `unit`, `case`, or `kg`.
- Use `moq_cases` for chips/cases and `moq_kg` for powders/bulk products.
- Use `row_action=upsert` for normal imports.
- Category names should match imported categories.
- Include at least one starting price such as `ex_factory_per_unit`, `fob_per_unit`, or `bulk_price_per_kg` so pricing-rule coverage can be created.

## Import result review

After importing, the wizard stays open so the user can review the result before refreshing the catalog.

Users should check:
- inserted rows;
- updated rows;
- skipped rows;
- pricing rules created;
- pricing rules updated;
- row-level summaries;
- any blocking or warning messages.

Use **Download row summary** or **Download report** when a user needs to share import results with an admin.

## Import History and setup coverage

Use **Admin → Catalog Admin → Import History** to review previous setup imports and workspace readiness.

Import History shows:
- recent import runs;
- run status and source file;
- row counts and issue details;
- row-level summaries;
- downloadable reports;
- import audit trail coverage;
- products without variants;
- pricing-rule coverage.

If the page says catalog data exists but no import-run history exists, the workspace likely has older manually seeded or pre-import catalog data. Run the current Categories and Products import flow to create auditable import history.

If **Products without variants** is greater than zero, re-import Products with variant, pack, MOQ, units per case, and pricing fields.

If **Pricing rule coverage** is incomplete, re-import Products with starting price fields or update product pricing in the Products workspace.

## Product data cleanup

Product deletion is an admin cleanup workflow, not a daily Products action.

Use **Admin → Catalog Admin → Data cleanup** when a product was imported by mistake, duplicated, or used only as test data.

Rules:
- Only owners/admins can mark a product deleted.
- Search by product name, product SKU, variant SKU, or category.
- The system checks active quote, quote-version, and contract/order usage in the last 2 years.
- If protected usage exists, do not delete. Deactivate or correct the product instead.
- If eligible, enter a cleanup reason and type the confirmation phrase shown by the wizard. Capitalization does not matter.
- The product, variants, and pricing rows are removed from active catalog surfaces.
- Historical quotes/contracts and audit records are preserved.

Do not erase audit history. The system records a clear `catalog_admin_mark_product_deleted` audit event with reason, actor, timestamp, eligibility check, and product/variant snapshot.

## Sprint 21 Setu Guru operating copilot capabilities

Setu Guru is no longer only static help text. Current behavior includes these governed capabilities:

- **Brain layer**: route-aware answers that use the current workspace, page title, user role, and organization context.
- **Source search**: Guru can summarize matching internal help/knowledge snippets when the user asks about workflows, blockers, setup, or troubleshooting.
- **Action layer**: Guru may guide the user toward actions and explain next steps, but must not directly approve quotes, send commercial documents, waive compliance, book freight, sync finance, close orders, or mutate governed commercial records.
- **Feedback and telemetry**: Guru interactions may be tracked for product improvement and follow-up triage.
- **Playbook routes**: onboarding, order execution, product setup, quote send gates, and trade-show workflows should be answered from the current docs and product rules.

When Guru answers an operating question, it should identify the relevant page, explain the allowed action, call out permissions or blockers, and avoid inventing integrations that are not live.

## Current known issue guidance for Guru

### Order PDF line items

If a user says an order confirmation or invoice PDF shows a placeholder or zero-value line, Guru should explain that current guarded routes now return a clear error when no `contract_line_items` exist. The user should add product lines to the order/contract before generating the order confirmation or invoice PDF.

### Order PDF seller identity and terms

Order PDFs should include seller/exporter identity and terms from the organization profile where available. If those details are missing, Guru should direct admins to update Admin → Organization before regenerating documents.

### Desktop navigation and profile access

The desktop shell now has a workflow sidebar with command, growth, commercial, work, and setup groupings. The organization logo stays visible and links to `/dashboard`; the sidebar can be collapsed, expanded, or hidden. Profile access is through the header avatar menu.

### Reports and documents visibility

`/reports` exists but should only be described as accessible if it is linked in the active shell/navigation. `/documents` should not be described as a dedicated document library unless the current product route has been validated as distinct from compliance.

### Sign out

Desktop sign-out is available from the header avatar menu. Mobile sign-out depends on the mobile shell/account surface.

## Troubleshooting

### Product import cannot find a category
Set Pricing calculator defaults first, import Categories second, refresh, then import Products using exact category names from the Categories list.

### Products import but setup still looks incomplete
Check `units_per_case`, `pack_label`, `pricing_mode_default`, `moq_cases` or `moq_kg`, and at least one starting price such as `ex_factory_per_unit` or `fob_per_unit`.

### Import History says products have no variants
Re-import Products with variant fields populated: `variant_name`, `variant_code`, `pack_label`, `pack_size_value`, `pack_size_unit`, `units_per_case`, MOQ, and pricing mode.

### Import History says pricing-rule coverage is incomplete
Re-import Products with starting price columns or edit product pricing from `/products`. Quote-only pricing changes do not update catalog pricing-rule coverage.

### Users are unsure where import belongs
Use Catalog Admin for full setup and onboarding imports. Use Products for day-to-day product row editing and product-specific pricing updates.

### Delete button stays disabled in Data cleanup
Run **Check eligibility** first. Then enter a cleanup reason and type the exact confirmation phrase shown by the wizard. Capitalization is accepted either way, but the SKU/text must match.

### Setting up Price Lists and Catalog Sharing
Price Lists and Catalog Sharing are available once products exist. Create reusable price lists in **Price Lists** (products, MOQ, base price, up to three quantity tiers, currency, incoterm, validity). Then share a curated catalog with a buyer from **Catalog → Share Catalog** or from a lead's **Send Catalog** action. Buyers open a secure, branded link (optionally PIN-protected) and can browse, ask questions, select products, and request a quote. Engagement is tracked on the Shared Links tab and the lead timeline, and buyer selections convert to a draft quote with one click. Sharing and price-list creation require catalog-management permission (owner/admin/manager).

_Updated: June 2026. Includes catalog sharing and price-list setup guidance, Sprint 21 Setu Guru operating copilot guidance, and current PDF/navigation troubleshooting notes._
