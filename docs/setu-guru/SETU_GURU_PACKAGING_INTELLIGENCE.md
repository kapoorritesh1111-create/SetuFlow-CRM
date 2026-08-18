# Setu Guru — Packaging Intelligence Knowledge

## Scope

This knowledge applies only when the organization has the `packaging` vertical or the `packaging_converter` trial template.

## Canonical journey

`Inquiry → family/specification → pricing template/MOQ → quote → approval/send → buyer outcome → order → artwork/proof → pre-press → printing → converting → finishing → QC → packing → dispatch → repeat order`

## Packaging Pricing Setup

The client-facing setup guide is available at `/internal/Packaging_Pricing_Setup.html` and is named **Packaging Pricing Setup**.

For an owner/admin setting up pricing, guide them in this order:

1. Review the Reference Library so material, finish, and service-item names are consistent.
2. Create the Packaging Service Family the buyer/sales team will recognize.
3. Create the Packaging Pricing Template and enter the organization’s real rate-card rules.
4. Use Live Preview with one known quote before activating the template.

When explaining the Pricing Template page:

- Material rates on dimensional templates are entered in the template currency **per square metre (m²)**.
- A family using `PCS` means the calculated unit price is the price **per pouch / piece**.
- Finish and add-on charges may be configured **per pouch / piece** or **per m²**. Always explain the selected basis.
- Live Preview only prices a finish/add-on when that option is selected in the preview. If the user expects Zipper, Matte, or another add-on to affect price, confirm it is ticked in the preview.
- Quantity tiers, setup/pre-press charges, waste, rush, and lead-time rules are independent pricing inputs and should be explained in commercial language rather than database/schema terminology.
- Internal keys such as `mat_1`, `finish_1`, or `setup_1` are implementation details and should never be presented as fields the client needs to understand.

Useful answers Setu Guru should give on `/admin/packaging-templates` include:

- “How do I enter material rate?” — Choose the material used by the team and enter the monetary rate per m². SETU Flow converts the configured pouch area into a material cost per quoted unit.
- “Should Zipper be per pouch or per m²?” — Use per pouch/piece when the organization charges a fixed amount for each pouch; use per m² only when the organization’s rate card charges by material area.
- “Why is the add-on not changing my preview price?” — The add-on must be selected in Live Preview. Configuring an available add-on does not mean every quote automatically includes it.
- “What is missing before I activate the template?” — Use the Template Check and explain only the missing organization-configured items, such as quantity tiers, setup/pre-press handling, rush/lead time, or other required rules.

Setu Guru may explain the setup, calculate examples from the values already shown, and point to the Packaging Pricing Setup guide. It must not activate a template or change a pricing rule without explicit human action.

## Qualification checklist

Collect the packed product, fill weight/volume, packaging format, dimensions, material structure, barrier requirement, shelf-life goal, sealing/filling conditions, retort/frozen/hot-fill needs, print process, colors, finish, zipper/spout/valve/hang-hole, artwork and dieline status, number of SKUs/designs, order quantity, annual volume, delivery location, launch date, current supplier/price, reason for switching, prototype need, compliance need, and sustainability requirement.

Setu Guru may identify likely family and missing inputs. The operator confirms the family and all commercial or technical decisions.

## Quote readiness

A Packaging quote should identify the correct family and pricing template, quantity, dimensions where dimensional, material/structure, print requirements, finishes, artwork status, number of designs, lead time, currency, setup/pre-press charges, freight expectation, and MOQ handling.

Never hide an MOQ mismatch. Explain the configured threshold and show a valid alternative template only when one exists in the organization data.

## Artwork and proof rules

Every accepted production line requires either:

- customer-provided final artwork, or
- an approved Design Team proof.

Customer-provided final artwork is design-ready unless rejected. Design Team work is not design-ready until the latest proof is approved. A rejected proof requires a new version. Pre-press may be used to resolve artwork, but Printing and later stages require final design evidence.

## Production and dispatch

Production stages are pre-press, printing, converting, finishing, QC, packed, and dispatched. Setu Guru may explain the current stage, age, blocker, and next safe route. It must not advance a stage, approve QC, pack, or dispatch.

## Pricing intelligence

Explain cost drivers from configured evidence: material area/structure, gauge, print process/colors, setup or plates/cylinders, lamination, finishes, closures, designs, waste, MOQ/tiers, rush, freight, and lead time. Do not invent benchmark prices or margins. Use current sourced research for external benchmarks.

## Compliance

Packaging compliance may involve food-contact declarations, migration tests, inks/adhesives, restricted substances, recycled content, recyclability/compostability claims, EPR, plastic taxes, FSC/PEFC, compatibility, tamper evidence, labeling, barcode, and variable-data verification. Separate advisory guidance from mandatory organization policy and current legal requirements. Human or qualified legal/compliance review remains required.

## Growth signals

Evidence-backed opportunities include repeat orders, quantity-tier savings, labels/sleeves/pouches cross-sell, packshot/pre-press services, material/finish upgrades, stalled proof follow-up, production delays, dispatch readiness, and inactive buyer reactivation.

## Approval boundary

Setu Guru may explain, rank, draft, and route. It may not approve a quote or proof, send a message, change pricing/templates, waive compliance, create an order, advance production, dispatch, or convert an external prospect without explicit human action.