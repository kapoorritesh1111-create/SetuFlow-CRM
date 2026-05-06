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

### Problem: "Approve" button is not visible on a quote
**Cause:** The quote doesn't require approval (no adjustment > 15%), OR the current user doesn't have approval authority.
**Fix:** Approval authority requires owner, admin, or manager role. If you're trying to approve and can't, ask your admin to update your role.

### Problem: Can't edit a quote
**Cause:** Quote is in a locked state (sent, accepted, rejected, or expired).
**Fix:** A locked quote cannot be edited directly. Create a new quote version or a revised quote. Revisions require manager/admin authorization.

### Problem: Quote PDF is blank or missing products
**Cause:** Product data may not have loaded correctly, or the quote has no line items.
**Fix:** 
1. Check the quote has at least one line item saved
2. Check the product/variant has a name and price set
3. Try regenerating the PDF from the Quotes modal → PDF Preview

### Problem: FX rate not showing on quote
**Cause:** The quote currency is the same as the base currency, OR the FX rate data isn't loaded.
**Fix:** FX is only shown when quote currency differs from source currency. If you need FX, set a different quote currency in the Terms step.

---

## ORDER ISSUES

### Problem: Order is stuck in Draft, can't advance to Ready
**Cause:** One or more blockers are unresolved.
**Fix:** Open the order → look at the blockers panel. Common blockers:

| Blocker | How to Resolve |
|---|---|
| "Quote must remain accepted" | Verify quote status is `accepted` in Quotes workspace |
| "Contract record is missing" | A contract must be linked to this order. Check Contracts page. |
| "Signed contract posture is still missing" | Go to Contracts → open the contract → mark as signed / upload signed copy |
| "Commercial lock snapshot is not fully locked" | The accepted quote must be locked. Admin action required. |
| "Confirmed quote lines are missing" | Verify the order has line items from the accepted quote. |
| "X document blocker(s) still open" | Upload the required documents (see Documents tab) |
| "X compliance blocker(s) still open" | Resolve compliance checklist items |

### Problem: Order state advanced by mistake
**Cause:** State was advanced prematurely.
**Fix:** Contact your organization admin. State rollback requires admin action. SetuFlow does not automatically roll back states.

---

## LEAD ISSUES

### Problem: Lead doesn't appear in the pipeline
**Cause:** Lead may not have a pipeline stage assigned, OR workspace mode is filtering it out.
**Fix:**
1. Check the workspace mode — are you in Buyers, Suppliers, or All mode? Switch to "All"
2. Open the lead → check if a pipeline and stage are set
3. Set the pipeline and stage if missing

### Problem: Lead shows as "Blocked" in TodayBar
**Cause:** The lead has a compliance or document blocker preventing progression.
**Fix:** Open the lead → look for the compliance or document section → identify and resolve the blocking item.

### Problem: Can't find a lead I just created
**Cause:** List may be filtered.
**Fix:** 
1. Go to Leads page
2. Clear all active filters (look for filter chips near the search bar)
3. Sort by "Newest first"
4. Or use the search bar to find by company name

### Problem: Lead qualification status won't change
**Cause:** Your role may not have permission to manage leads.
**Fix:** Lead management requires: owner, admin, manager, sales, operations, sourcing, procurement, or contributor role. Viewers cannot edit leads.

---

## USER & PERMISSION ISSUES

### Problem: User can't see certain pages
**Cause:** Role doesn't have access to those features.
**Common restrictions by role:**
- **Viewer**: Cannot access Admin pages, cannot create/edit leads or quotes
- **Contributor**: Cannot send quotes, cannot access Admin
- **Sales**: Cannot access Admin governance pages, cannot review compliance
- **Operations**: Cannot send quotes

**Fix:** Admin → Users → update the user's role.

### Problem: User can't log in (invitation accepted but no access)
**Cause:** Role assignment may have failed during invitation acceptance.
**Fix:** Admin → Users → find the user → verify they have a role assigned → if no role, assign one manually.

### Problem: "Your current role can view this workspace but cannot [action]"
**Cause:** This is the correct permissions message for restricted actions.
**Fix:** Contact your organization admin to request a role upgrade. Explain what you need to do and they'll assign the appropriate role.

---

## IMPORT/EXPORT ISSUES

### Problem: CSV import fails with validation errors
**Cause:** Data format doesn't match the template requirements.
**Fix:**
1. Download a fresh CSV template from Products → Catalog Command Center
2. Compare your data format against the template headers exactly
3. Common issues: wrong date format, missing required fields, special characters in names
4. Fix the errors shown in the validation preview
5. Re-upload the corrected file

### Problem: Import completed but products aren't showing
**Cause:** Import may have been partially successful, or products need a page refresh.
**Fix:**
1. Go to Products workspace and refresh the page
2. Check the import run status in Admin → Product Management
3. Look for import errors — some rows may have failed
4. Contact support if the product count doesn't match expectations

### Problem: CSV template downloaded but columns look wrong
**Cause:** Template format changed in a recent update.
**Fix:** Always download a fresh template from the current Products → Catalog Command Center. Don't reuse old templates.

---

## MOBILE ISSUES

### Problem: Business card scan not working
**Cause:** AI vision provider may not be configured, OR camera permission is denied.
**Fix:**
1. Check `/api/mobile/scan-readiness` — this shows if AI scan is properly configured
2. Ensure camera permission is granted in your browser/device settings
3. Try the manual entry option as a fallback
4. Contact your admin if scan readiness check shows a configuration error

### Problem: Mobile capture leads aren't syncing
**Cause:** Offline queue may be waiting for connection.
**Fix:**
1. Ensure you have a stable internet connection
2. The offline queue syncs automatically when reconnected
3. Check the mobile sync status indicator
4. If leads are still not appearing, open each captured entry and manually save

### Problem: vCard QR code shows as text instead of a QR image
**Cause:** My Card settings may not have been saved correctly, or the QR data is too large.
**Fix:**
1. Go to Profile → My Card settings
2. Make sure you've saved your card settings (don't just fill in and close)
3. If QR was showing before a profile photo upload, the photo may be too large — re-upload a smaller image
4. Try regenerating by toggling between Smart QR and Offline QR

---

## ADMIN ISSUES

### Problem: "Client Onboarding" page not accessible
**Cause:** This page is Setu-internal only. It's hidden from regular client workspaces.
**Explanation:** `/admin/client-onboarding` is only accessible to Setu platform admins, not to organization admins. It's used by the Setu team to set up new client workspaces.

### Problem: Can't create new pipeline stages
**Cause:** Admin → Stages requires admin or owner role.
**Fix:** Ensure you have admin role → Admin → Stages (`/admin/stages`) → Click "+ Add Stage"

### Problem: Invitation email not received
**Cause:** Email delivery may not be configured, OR email went to spam.
**Fix:**
1. Ask the invitee to check spam/junk folder
2. If not there, admin can resend from Admin → Invitations
3. If still not delivering, check email provider configuration (Mailtrap settings)
4. Admin can also share the invitation link directly from Admin → Invitations

### Problem: Organization logo not showing
**Cause:** Logo URL may be invalid, or logo wasn't uploaded correctly.
**Fix:** Admin → Organization → update the logo URL with a valid, publicly accessible image URL. If using a file upload, make sure the upload completed before saving.

---

## PRICING ISSUES

### Problem: Pricing calculator shows wrong totals
**Cause:** Incorrect cost layers entered, or wrong starting level selected.
**Fix:**
1. Verify the starting price level matches where your price begins (usually EXW)
2. Verify each cost layer is a per-unit cost, not a total
3. Check that import duty is entered as a percentage (%), not a flat amount
4. Verify margin mode is correct (markup vs margin give different results)

### Problem: Category-level pricing defaults not applying
**Cause:** Product may have an explicit override, or category wasn't set on the product.
**Fix:**
1. Open the product → verify it's assigned to the correct category
2. In the pricing calculator, check if the product is in "inherited" or "override" mode
3. Inherited mode uses category defaults; override mode uses product-specific settings
4. Switch back to inherited mode to use category defaults

### Problem: Quote price differs from product price
**Cause:** Quote-only adjustments may have been applied.
**Fix:** Open the quote → line item detail → look for adjustment notes. Any quote-only discounts or markups are visible in the quote line items and on the PDF.

---

## PERFORMANCE / DISPLAY ISSUES

### Problem: Dashboard isn't loading data
**Cause:** Data query may be slow, or there's a loading state issue.
**Fix:**
1. Wait 10-15 seconds — some dashboards load multiple data queries
2. Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
3. Check your internet connection
4. If consistently slow, contact support — may be a backend issue

### Problem: Page shows blank after login
**Cause:** Hydration or authentication state issue.
**Fix:**
1. Hard refresh the page
2. Log out and log back in
3. Clear browser cache if problem persists
4. Try a different browser to isolate if it's browser-specific

---

_This troubleshooting guide should be uploaded alongside the main knowledge base to the GPT's Knowledge section. Update this file whenever new known issues or resolutions are discovered._
