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

---

## SPRINT 12-13 FIXES

### Problem: "I can quote this lead" but quote creation fails
**Cause:** UI shows coverage as present but DB gate disagrees — fixed in Sprint 12.
**Fix:**
1. Open Admin → Audit Log and search for lead_quote_gate_log entries for this lead
2. Check the most recent gate_result value
3. If gate_result = 'missing-product-interest': open the lead, use Open Coverage Manager, save product interest, then try again
4. If gate_result = 'coverage-read-error': database connectivity issue — refresh and retry
5. If gate_result = 'gate-passed' but quote still won't open: escalate to engineering

### Problem: Email shows "link_created" but recipient says they didn't receive it
**Sprint 12 update:** email_delivery_status column now tracks Mailtrap delivery.
**Fix:**
1. Check order_document_sends.email_delivery_status for the send row
2. 'sent' = Mailtrap accepted. 'delivered' = Mailtrap confirmed inbox delivery (requires webhook). 'bounced' = email bounced.
3. If status is 'sent' but no delivery: check email_send_log for that send row — look at bounce_reason
4. If status is 'failed': Mailtrap API rejected the email. Check email_send_log.provider_payload for error detail.
5. Note: email_delivery_status = 'delivered' requires the Mailtrap webhook to be configured at /api/webhooks/mailtrap

### Problem: WhatsApp message not being received by buyer
**Updated Sprint 12 behavior:**
1. Check order_document_sends.whatsapp_link — if null, WhatsApp link was not generated
2. If whatsapp_link exists: the operator must click "Open in WhatsApp" and press Send inside WhatsApp
3. SetuFlow NEVER sends WhatsApp messages automatically — operator must send manually
4. Document opens (from the share link) are tracked via order_document_sends.open_count

### Problem: Order shows source_quote_version_id as null
**Sprint 12 fix:** DB constraint now prevents this. If you see a null source_quote_version_id, the order was created before Sprint 12 migration.
**Fix:**
1. Open the order in /orders
2. Check if source_quote_id is set — if yes, run the app_ensure_order_for_accepted_quote_tx RPC manually with the correct version ID
3. For new orders: the CHECK constraint prevents creation without version lineage
4. Check order_stage_events for event_type='order_quote_lineage_set' to verify when lineage was set

### Problem: Pricing shows wrong data across organizations
**Sprint 12 fix:** active_product_pricing_rules_v and v_quote_eligible_products are now SECURITY INVOKER.
**Fix:** No operator action needed. Views now automatically respect the caller's org context via RLS. If pricing still looks wrong, verify the calling session is authenticated and the user has the correct organization membership.

### Problem: Dispatch Invoice not posting to Xero/QuickBooks
**Sprint 13 status:** External finance posting requires the finance adapter to be configured.
**Fix:**
1. Admin → Integrations — check if Xero/QuickBooks is listed as an active integration
2. Currently, no external finance adapter is connected (adapter_name = 'pending')
3. Finance events are queued in finance_integration_events but not sent externally
4. Contact Ritesh to configure the finance adapter for your organization

### Problem: Freight booking not confirmed by carrier
**Sprint 13 status:** External freight booking requires the freight adapter to be configured.
**Fix:**
1. Check freight_booking_events for the order — look for event_type='booking_request' with status='queued'
2. Currently, no external freight adapter is connected (adapter_name = 'pending')
3. Freight events are queued but not sent to Flexport/Freightos/DHL automatically
4. Contact Ritesh to configure the freight adapter for your organization
