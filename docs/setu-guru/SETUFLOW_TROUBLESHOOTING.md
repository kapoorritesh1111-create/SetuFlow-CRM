# SetuFlow CRM — New Organization Onboarding Guide
_For chatbot knowledge base upload — May 2026_

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

_Updated: May 2026. Sprint 10 import/catalog onboarding is closed and protected._
