# SetuFlow CRM — Troubleshooting Guide
_For chatbot knowledge base upload — May 2026_

---

## QUOTE ISSUES

### Problem: Quote stuck in "Pending Approval"
**Cause:** A discount or markup greater than 15% was applied to the quote.
**Fix:**
1. An **owner** or **admin** needs to review the quote
2. Go to Quotes (`/quotes`)
3. The quote appears in the approval queue at the top
4. Click the quote → approval panel shows in the modal
5. Approve: quote moves to `approved`, ready to send
6. Reject: enter a rejection reason → quote returns to `draft` for revision

### Problem: Quote Review shows a compliance/document blocker
**Cause:** The active quote is missing required quote-review evidence, or the reviewer has not yet waived/deferred that quote-send blocker.
**Correct workflow:**
1. Go to Leads (`/leads`)
2. Open the lead from the lead queue
3. Click **Continue quote** in the Lead Command Center
4. Complete Product, Terms, and Pricing
5. On **Step 4 — Review**, use the red **Resolve compliance/document blocker** card inside the quote Review panel
6. Choose one action:
   - **Attach evidence** when the document is available
   - **Waive for quote** when a permitted reviewer decides the quote can proceed without that document
   - **Defer to dispatch** when the quote may proceed but the document must be collected before order/dispatch
7. Enter a human reviewer reason for Waive/Defer
8. Click **Save and refresh gate**, then **Refresh draft after fix** or **Create/open draft preview**
9. Continue to **Step 5 — Send gate** only when Review, pricing, approval, compliance, and quote draft are all clear

**Important:** Do not open a global compliance overlay, sticky helper, or separate Compliance Assist page as the primary fix. The fix belongs inside the active quote Review workflow.

### Problem: Quote Review says clear but Send Gate still says blocked
**Cause:** One read path may still be seeing stale blocker state, most often from pricing coverage, quote-version line count, or an open compliance/document row.
**Fix:**
1. In the quote Review workspace, click **Create/open draft preview** to refresh the governed draft.
2. Verify Step 4 says **Quote Review compliance clear**.
3. Verify the Compliance Check card says **Gate Ready**.
4. Verify the quote has priced quote line items and the quote version line count is refreshed.
5. If the red blocker remains after refresh, escalate to engineering to inspect shared read paths.

### Problem: Top quote badge still says "1 send blocker" after the Review card is clear
**Cause:** The blue quote header, Step 4 blocker card, Compliance Check card, Approval Queue, and Send Gate must all read the same shared quote gate state. If only one area clears, the read path is split.
**Fix:** Refresh the governed draft first. If it still appears, escalate as a shared read-path issue. Do not add a new visual helper or DOM workaround.

### Problem: "Approve" button is not visible on a quote
**Cause:** The quote doesn't require approval, or the current user doesn't have approval authority.
**Fix:** Approval authority requires owner, admin, or manager role.

### Problem: Can't edit a quote
**Cause:** Quote is in a locked state.
**Fix:** Create a new quote version or revised quote. Revisions require manager/admin authorization.

### Problem: Quote PDF is blank or missing products
**Cause:** Product data may not have loaded correctly, or the quote has no line items.
**Fix:** Check the quote has line items, product/variant name, and price, then regenerate the PDF from Quotes.

### Problem: FX rate not showing on quote
**Cause:** The quote currency is the same as the base currency, or FX data is not loaded.
**Fix:** Set a different quote currency in the Terms step when FX is needed.

---

## CATALOG ADMIN / IMPORT ISSUES

### Problem: User is unsure where product setup belongs
**Cause:** Catalog Admin and Products have different jobs.
**Fix:** Use **Admin → Catalog Admin** (`/admin/product-management`) for setup, imports, pricing defaults, import history, setup coverage, owner/admin cleanup, and audit. Use **Products** (`/products`) for day-to-day product rows, variants, units per case, MOQ, and product-specific pricing edits.

### Problem: CSV import fails with validation errors
**Cause:** Data format doesn't match the current template.
**Fix:**
1. Open **Admin → Catalog Admin**
2. Start with **Pricing calculator/defaults**
3. Download a fresh template
4. Import **Categories** second
5. Import **Products + variants** third
6. Fix validation rows shown in the preview and re-upload

### Problem: Product import cannot find a category
**Cause:** Product import is running before category hierarchy is created, or the category name does not match the active workspace categories.
**Fix:** Import Categories first from Catalog Admin, refresh, then import Products using the exact category/subcategory names from the active workspace.

### Problem: Import completed but products aren't showing
**Cause:** Import may be partially successful or the catalog view may need refresh.
**Fix:** Review the import result drawer first, download the row summary if needed, then click refresh. Check **Admin → Catalog Admin → Import History** for row-level summaries and issue reports.

### Problem: Products imported but setup still looks incomplete
**Cause:** Product rows may be missing variant, pack, MOQ, units-per-case, or starting price fields.
**Fix:** Re-import Products with `variant_name`, `variant_code`, `pack_label`, `pack_size_value`, `pack_size_unit`, `units_per_case`, `moq_cases` or `moq_kg`, `pricing_mode_default`, and at least one starting price field such as `ex_factory_per_unit`, `fob_per_unit`, or `bulk_price_per_kg`.

### Problem: Import History says catalog data exists but no import-run history exists
**Cause:** The workspace has older seeded or manually created catalog data, but no current import run records.
**Fix:** Run the current Categories and Products import flow to create an auditable import trail.

### Problem: Import History says products have no variants
**Cause:** Some products do not have variant rows.
**Fix:** Re-import Products with variant and pack fields populated, or edit the product from `/products` and add variants.

### Problem: Import History says pricing-rule coverage is incomplete
**Cause:** Some products do not have catalog pricing-rule rows.
**Fix:** Re-import Products with starting price fields or edit product pricing in `/products`. Quote-only pricing adjustments do not update catalog pricing-rule coverage.

### Problem: CSV template downloaded but columns look wrong
**Cause:** Template format changed in a recent update.
**Fix:** Download a fresh template from Catalog Admin and do not reuse old onboarding spreadsheets.

### Problem: Delete button stays disabled in Data cleanup
**Cause:** The workflow requires eligibility check, cleanup reason, and typed confirmation.
**Fix:**
1. Go to **Admin → Catalog Admin → Cleanup**
2. Select the product
3. Click **Check eligibility**
4. Confirm there is no active quote/order usage in the last 2 years
5. Enter a cleanup reason
6. Type the confirmation phrase shown by the wizard. Capitalization does not matter, but the SKU/text must match.

### Problem: Product cannot be deleted
**Cause:** Product cleanup is owner/admin-only and protected by quote/order history.
**Fix:** If active quote, quote-version, or contract/order usage exists in the last 2 years, do not delete. Deactivate/correct the product instead. Historical quotes/contracts and audit history must remain preserved.

---

## ORDER ISSUES

### Problem: Order is stuck in Draft, can't advance to Ready
**Cause:** One or more blockers are unresolved.
**Fix:** Open the order and review blockers. Common blockers include accepted quote, signed contract, commercial lock snapshot, confirmed lines, documents, and compliance checklist items.

### Problem: Order state advanced by mistake
**Cause:** State was advanced prematurely.
**Fix:** Contact your organization admin. State rollback requires admin action.

---

## LEAD ISSUES

### Problem: Lead doesn't appear in the pipeline
**Cause:** Lead may not have a pipeline stage assigned, or workspace mode is filtering it out.
**Fix:** Switch to All mode, open the lead, and check pipeline/stage.

### Problem: Lead shows as "Dispatch blocked" but Quote Review is clear
**Cause:** Dispatch/order readiness is separate from Quote Review.
**Fix:** Continue the quote/send workflow if Step 4 and Step 5 are clear. Treat dispatch badges as execution reminders unless a quote-send rule makes that document mandatory.

### Problem: Lead shows as "Blocked" in TodayBar
**Cause:** The lead has a compliance or document blocker preventing progression.
**Fix:** Open the lead and identify the blocker. If it is a quote Review blocker, use the inline Step 4 Review card inside Continue quote.

### Problem: Can't find a lead I just created
**Cause:** List may be filtered.
**Fix:** Clear filters, sort by Newest first, or search by company name.

### Problem: Lead qualification status won't change
**Cause:** Your role may not have permission to manage leads.
**Fix:** Lead management requires owner, admin, manager, sales, operations, sourcing, procurement, or contributor role.

---

## USER & PERMISSION ISSUES

### Problem: User can't see certain pages
**Cause:** Role doesn't have access to those features.
**Fix:** Admin → Users → update the user's role.

### Problem: User can't log in after invitation
**Cause:** Role assignment may have failed during invitation acceptance.
**Fix:** Admin → Users → verify they have a role assigned.

### Problem: "Your current role can view this workspace but cannot [action]"
**Cause:** This is the correct permissions message for restricted actions.
**Fix:** Contact your organization admin to request a role upgrade.

---

## MOBILE ISSUES

### Problem: Business card scan not working
**Cause:** AI vision provider may not be configured, or camera permission is denied.
**Fix:** Check `/api/mobile/scan-readiness`, confirm camera permission, or use manual entry.

### Problem: Mobile capture leads aren't syncing
**Cause:** Offline queue may be waiting for connection.
**Fix:** Reconnect to the internet and let sync run automatically.

### Problem: vCard QR code shows as text instead of a QR image
**Cause:** My Card settings may not have been saved correctly, or QR data is too large.
**Fix:** Save My Card settings and use a smaller profile photo if needed.

---

## ADMIN ISSUES

### Problem: "Client Onboarding" page not accessible
**Cause:** This page is Setu-internal only.
**Fix:** It is not available to regular client workspaces.

### Problem: Can't create new pipeline stages
**Cause:** Admin → Stages requires admin or owner role.
**Fix:** Ensure you have admin/owner role.

### Problem: Invitation email not received
**Cause:** Email delivery may not be configured, or email went to spam.
**Fix:** Check spam, resend from Admin → Invitations, or share the invitation link directly.

### Problem: Organization logo not showing
**Cause:** Logo URL may be invalid or upload did not complete.
**Fix:** Admin → Organization → update the logo URL or re-upload.

---

## PRICING ISSUES

### Problem: Pricing calculator shows wrong totals
**Cause:** Incorrect cost layers or starting level.
**Fix:** Verify starting price level, per-unit costs, duty percent, and markup/margin mode.

### Problem: Category-level pricing defaults not applying
**Cause:** Product may have an explicit override, or category is missing.
**Fix:** Open the product and verify category/default mode.

### Problem: Quote price differs from product price
**Cause:** Quote-only adjustments may have been applied.
**Fix:** Open the quote line item and review adjustment notes. Quote-only changes do not rewrite catalog defaults.

---

## PERFORMANCE / DISPLAY ISSUES

### Problem: Dashboard isn't loading data
**Cause:** Data query may be slow, or there is a loading state issue.
**Fix:** Wait briefly, hard refresh, check connection, then contact support if persistent.

### Problem: Page shows blank after login
**Cause:** Hydration or authentication state issue.
**Fix:** Hard refresh, log out/in, clear cache, or try another browser.

---

_This troubleshooting guide should be uploaded alongside the main knowledge base. Sprint 10 import/catalog onboarding is closed and protected._
