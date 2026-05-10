# SetuFlow CRM — New Organization Onboarding Guide
_For chatbot knowledge base upload — May 2026_

---

## WHO THIS IS FOR

This guide is for:
1. **Brand new SetuFlow clients** — organizations that have just signed up and received workspace access
2. **First admins** — the person who accepted the owner invitation and is setting up the workspace for their team

---

## PHASE 1: FIRST 30 MINUTES — Core Setup

### Step 1: Verify Organization Settings
**Go to: Admin → Organization (`/admin/organization`)**

Check company name, logo, website, headquarters country, quote/order terms, and approval threshold.

### Step 2: Review Pipelines, Stages, and Markets
Use Admin → Pipelines, Admin → Stages, and Admin → Markets to confirm your selling process and geographic focus.

---

## PHASE 2: FIRST HOUR — Catalog Admin and Product Setup

### Catalog Admin vs Products

Use **Admin → Catalog Admin** (`/admin/product-management`) for back-office setup and governance:
- category/product onboarding imports,
- category and taxonomy setup,
- pricing default rules,
- import health,
- readiness issues,
- audit review.

Use **Products** (`/products`) for day-to-day commercial catalog work:
- add or edit product rows,
- edit variants and packs,
- update units per case and MOQ,
- adjust product-specific pricing snapshots,
- fix pricing gaps before quoting.

Quote-only customer discounts or negotiated prices stay inside **Quotes** and must not rewrite catalog defaults.

### Step 3: Create Product Categories First

Preferred path:
1. Go to **Admin → Catalog Admin** (`/admin/product-management`).
2. Open **Import center**.
3. Choose **Categories**.
4. Download the Categories template.
5. Confirm preview says **0 blocking issues**.
6. Apply the validated import.

The category template now includes:
```
category_name,parent_category,category_code,description,sort_order,active_status,default_country_of_origin,default_shelf_life_months,default_lead_time_days,default_shipment_notes
```

The Categories import is safe to rerun: existing categories are matched by organization + category name and updated instead of duplicated. Missing parent categories are created first, then child categories are linked to them. Sort order is assigned after the current organization maximum to avoid conflicts.

### Step 4: Import or Add Products

Recommended bulk order:
1. Import Categories first.
2. Refresh and confirm categories exist.
3. Download the Products template from Catalog Admin → Import center.
4. Fill in product, variant, pack, MOQ, pricing, and trade-default fields.
5. Upload the CSV, review validation, then apply the import.
6. Open Products to edit any row-level product details.

The product template now asks for setup fields a new org needs:
```
product_name,sku_code,brand_name,category,subcategory,pricing_type,active_status,quoteable_status,description,variant_name,variant_code,pack_label,pack_size_value,pack_size_unit,units_per_case,net_weight_kg,moq_cases,moq_kg,pricing_mode_default,supports_bulk_pricing,country_of_origin,shelf_life_months,lead_time_days,shipment_notes,hsn_code,currency,ex_factory_per_unit,fob_per_unit,cif_per_unit,ddp_per_unit,distributor_per_unit,retail_per_unit,bulk_price_per_kg,price_effective_from,price_effective_to,row_action,notes
```

Important setup notes:
- `units_per_case` is required because pack/MOQ and quote pricing depend on it.
- `pricing_mode_default` should be `unit`, `case`, or `kg`.
- Use `moq_cases` for chips/cases and `moq_kg` for powders/bulk products.
- Use `row_action=upsert` for normal imports.
- Category names should match the imported categories.

### Step 5: Pricing Defaults

Go to **Admin → Catalog Admin → Pricing defaults** for organization/category calculator defaults such as freight, duty, internal margin, distributor margin, retail margin, and margin mode.

Product-specific UOM, pack size, units per case, MOQ, and pricing snapshots belong in **Products**, not in pricing defaults.

---

## IMPORT WIZARD TROUBLESHOOTING

### Problem: Categories import preview passes, but no categories are inserted
**Cause:** Older import paths could collide on category sort order.
**Fix:** Use Admin → Catalog Admin → Import center → Categories. The importer assigns unique sort orders, creates missing parents first, and updates existing categories by name.

### Problem: Product import cannot find a category
**Cause:** Products should reference categories that already exist in the active organization.
**Fix:** Import Categories first, refresh, then import Products using exact category names from the Categories list.

### Problem: Products import but setup still looks incomplete
**Cause:** Product setup now depends on product + variant + pack + MOQ + pricing fields.
**Fix:** Check `units_per_case`, `pack_label`, `pricing_mode_default`, `moq_cases` or `moq_kg`, and at least one starting price such as `ex_factory_per_unit` or `fob_per_unit`.

### Problem: Users are unsure where import belongs
**Fix:** Use Catalog Admin for full setup and onboarding imports. Use Products for day-to-day product row editing and product-specific pricing updates.

---

## PHASE 3: FIRST DAY — Team Setup

Invite team members from Admin → Invitations and assign roles.

---

## PHASE 4: FIRST WEEK — First Leads & Quotes

Create leads from `/leads`, then create or continue quotes from the lead. Quote Review compliance is fixed inside the quote Review step's inline blocker card only.

---

## CHECKLIST: READY TO OPERATE

**Organization:** company details, terms, approval threshold.

**Catalog Admin:** categories imported, products imported, pricing defaults reviewed, import issues cleared.

**Products:** product rows, variants, units per case, MOQ, pricing snapshots, origin/HSN/trade fields complete.

**Team:** users invited and roles assigned.

**First Leads:** existing key contacts entered and assigned.

---

_This onboarding guide is part of the SetuFlow CRM knowledge base. Updated: May 2026._
