# SETU Flow — Operator Pricing Rule Setup Guide

**Audience:** Admin, Manager, or Owner roles.
**Requires:** `catalog.manage` capability.

---

## 1. What the catalog is

The catalog is the **commercial baseline**. Every quote starts from a catalog price. Override requires a reason. Approval gates sending when the override crosses the threshold configured in Admin → Organization.

The catalog does NOT determine customer-specific prices — those belong in RFQ and quote flows. The catalog defines the default price posture for each product variant per pricing basis.

---

## 2. Pricing bases

| Basis | What it means | When to use |
|---|---|---|
| **Ex-Factory** | Price at the factory gate. Buyer arranges freight. | Default for domestic / close-market buyers |
| **FOB** | Price at the port of loading. Buyer pays ocean freight. | Most common export pricing basis |
| **CIF** | Cost + Insurance + Freight to destination port. | When SETU provides door-to-port cost. Quote CIF = FOB + freight profile. |
| **Bulk/kg** | Per-kilogram price for powder or bulk commodities. | Powders, ingredients sold by weight |

---

## 3. Setting up a pricing rule set

### 3.1 Via spreadsheet import (recommended for first setup)

1. Go to **Catalog** → click **Import pricing sheet**.
2. Upload a CSV or Excel file with these required columns:
   - `sku_code` — must match an existing product variant SKU
   - `product_name` — for display only, not used for matching
   - `ex_factory_usd_per_unit` or `ex_factory_usd_per_case` — at least one price field
   - Optional: `fob_usd_per_unit`, `fob_usd_per_case`, `bulk_usd_per_kg`
3. Review the import issues panel — fix any mapping failures before proceeding.
4. The import creates or updates a **pricing rule set** and marks it active.

### 3.2 Via product detail drawer (manual entry)

1. Go to **Catalog** → find your product → click to open it.
2. Select the **Pricing** tab.
3. For each variant:
   - Enter the price value and select the unit (unit / case / kg)
   - Toggle **Quote-ready** once the variant is fully priced and ready to appear in quote line items
   - Optionally enter a **CIF Reference** price — this is for catalog display only; actual CIF in quotes uses your freight profile
4. Click **Save changes**.

---

## 4. Quote readiness gating

A product variant will not appear in a new quote unless:
- It is **active** (product and variant both have `is_active = true`)
- It is **quote-ready** (`is_quoteable = true`)
- It has **at least one price** for the selected pricing basis

The catalog page shows a gap badge ("Pricing gap") on products with active but unpriced variants. Resolve all gaps before a trade show or before a new buyer meeting.

---

## 5. Pricing modes

| Mode | How it is determined | When it applies |
|---|---|---|
| **Unit** | `ex_factory_usd_per_unit` or `fob_usd_per_unit` is set | Chips, snacks priced per bag/packet |
| **Case** | `ex_factory_usd_per_case` or `fob_usd_per_case` is set | Bulk carton pricing |
| **Bulk/kg** | `bulk_usd_per_kg` is set | Powders, dehydrated products, ingredients |

The pricing mode flows through to the quote line. If the quote basis is `bulk_chips` but the rule has no `bulk_usd_per_kg`, it automatically falls back to `ex_factory`.

---

## 6. CIF pricing — two paths

### Path A: CIF reference price (catalog display)
Enter a direct CIF reference value in the product drawer pricing tab. This appears in the catalog table and can be used for quick buyer communication. It does **not** flow into quote compilation.

### Path B: CIF via freight profile (quote compilation — recommended)
1. Go to **Admin** → configure a freight profile for the destination port.
2. Enter freight line items (ocean freight, port charges, insurance) in the freight profile.
3. When building a quote with CIF basis, select the freight profile.
4. The system computes: `CIF line price = FOB price + freight add-on per unit (or per kg for powders)`.

Path B is the governed CIF — it traces every price component and produces an auditable CIF calculation that can be reviewed, overridden with a reason, and approved if the override crosses threshold.

---

## 7. Override and approval flow

If a quote line price differs from the catalog rule price:
1. An **override reason** is required before the quote can be sent.
2. If the override percentage exceeds the organization's `approval_threshold_pct` (set in Admin → Organization), the quote goes into **approval queue** before it can be sent.
3. Only roles with `quote.send` capability (owner, admin, manager, sales) can send a quote after approval.

Never change the catalog to match a one-off customer request. Use the override mechanism in the quote itself.

---

## 8. Catalog audit trail

Every pricing rule update (import or manual edit) is recorded in the audit log:
- Go to **Admin** → **Audit** to view a timestamped history of pricing changes.
- Each record shows who changed what, when, and what the previous value was.

---

## 9. Common issues

| Issue | Cause | Fix |
|---|---|---|
| Product shows "Pricing gap" badge | Variant is active and quote-ready but has no price | Open the drawer → Pricing tab → enter a price |
| Product does not appear in quote line items | `is_quoteable = false` or product/variant is inactive | Toggle Quote-ready in the drawer |
| CIF shows "— add" in the catalog table | No CIF reference entered and no freight profile linked | Enter a CIF reference price or configure a freight profile |
| Import fails with "sku_code mapping failure" | The uploaded SKU does not match any product variant SKU | Fix the SKU in the import file or add the variant in the catalog first |
| Approval threshold triggered unexpectedly | Override % exceeds the organization's configured threshold | Review Admin → Organization → Approval threshold. Talk to the approver before sending. |

---

## 10. Roles and permissions

| Action | Required role |
|---|---|
| View catalog | Any authenticated role |
| Edit pricing, toggle quote-ready | owner, admin, manager (`catalog.manage`) |
| Import pricing rule set | owner, admin, manager (`catalog.manage`) |
| Override a quote line price | Any role with access to quotes |
| Approve a quote before sending | Configured approver role (owner, admin, manager) |
| Send a quote | owner, admin, manager, sales (`quote.send`) |
