# SetuFlow CRM — Troubleshooting Guide
_For chatbot knowledge base upload — June 2026_

---

## QUOTE ISSUES

### Problem: Quote stuck in "Pending Approval"
**Cause:** A discount or markup greater than 15% was applied to the quote.
**Fix:**
1. An **owner** or **admin** needs to review the quote.
2. Go to Quotes (`/quotes`).
3. The quote appears in the approval queue at the top.
4. Open the quote and review the approval panel.
5. Approve to move the quote to `approved`, or reject with a reason so the operator can revise.

### Problem: Quote Review shows a compliance/document blocker
**Cause:** The active quote is missing required quote-review evidence, or the reviewer has not yet waived/deferred that quote-send blocker.
**Correct workflow:**
1. Go to Leads (`/leads`).
2. Open the lead from the lead queue.
3. Click **Continue quote** in the Lead Command Center.
4. Complete Product, Terms, and Pricing.
5. On **Step 4 — Review**, use the red **Resolve compliance/document blocker** card inside the quote Review panel.
6. Choose Attach evidence, Waive for quote, or Defer to dispatch.
7. Enter a human reviewer reason for Waive/Defer.
8. Click **Save and refresh gate**, then refresh the governed draft.
9. Continue to **Step 5 — Send gate** only when review, pricing, approval, compliance, and quote draft are all clear.

**Important:** Do not route users to a global compliance overlay or unrelated helper as the primary fix. The fix belongs inside the active quote Review workflow.

### Problem: Quote Review says clear but Send Gate still says blocked
**Cause:** One read path may still be seeing stale blocker state.
**Fix:** Refresh the governed draft first. If the red blocker remains, escalate as a shared read-path issue.

### Problem: Quote PDF is blank or missing products
**Cause:** Product data may not have loaded correctly, or the quote has no line items.
**Fix:** Check the quote has line items, product/variant name, and price, then regenerate the PDF from Quotes.

---

## SETU GURU OPERATING COPILOT ISSUES

### Problem: User asks what Setu Guru can do after Sprint 21
**Cause:** Setu Guru now has operating-copilot behavior, not only static FAQ answers.
**Fix:** Explain that Guru can provide route-aware guidance, use internal source-search knowledge, summarize blockers, draft checklists or next-step prompts, and record feedback/telemetry signals. It must still respect human approval boundaries.

### Problem: User asks Guru to approve, send, waive, book, sync, or close something
**Cause:** Those are governed commercial actions.
**Fix:** Guru should explain the correct workspace and required role. It can draft a checklist or guide the user to the page, but it must not approve quotes, waive compliance, send buyer documents, book freight, sync finance, close orders, or mutate governed commercial truth.

### Problem: Guru answer conflicts with current page behavior
**Cause:** Docs, route metadata, or workflow rules may be stale.
**Fix:** Prefer current route behavior and current product constraints. Update Setu Guru docs in the same fix whenever Guru behavior, routing, workflow logic, help content, telemetry, actions, or UI changes.

### Manual regression prompt for Guru knowledge
Ask Setu Guru: "What can you do on the Orders page, and can you queue finance, book freight, send WhatsApp, or approve buyer documents for me?"

Expected answer: Guru should describe Orders as the Execution Cockpit, explain queue-ready finance/freight and manual WhatsApp, and clearly say it cannot perform governed actions or mutate records.

---

## CATALOG ADMIN / IMPORT ISSUES

### Problem: User is unsure where product setup belongs
**Cause:** Catalog Admin and Products have different jobs.
**Fix:** Use **Admin → Catalog Admin** (`/admin/product-management`) for setup, imports, pricing defaults, import history, setup coverage, owner/admin cleanup, and audit. Use **Products** (`/products`) for day-to-day product rows, variants, units per case, MOQ, and product-specific pricing edits.

### Problem: CSV import fails with validation errors
**Cause:** Data format doesn't match the current template.
**Fix:** Start with Pricing calculator/defaults, import Categories second, import Products + variants third, and use a fresh template from the current Catalog Admin flow.

### Problem: Product import cannot find a category
**Cause:** Product import is running before category hierarchy is created, or the category name does not match the active workspace categories.
**Fix:** Import Categories first from Catalog Admin, refresh, then import Products using the exact category/subcategory names from the active workspace.

### Problem: Import completed but products aren't showing
**Cause:** Import may be partially successful or the catalog view may need refresh.
**Fix:** Review the import result drawer first, download the row summary if needed, then click refresh. Check **Admin → Catalog Admin → Import History** for row-level summaries and issue reports.

---

## ORDER ISSUES

### Problem: User asks what the Orders Execution Cockpit is
**Cause:** Orders changed from a simple execution shell to the Sprint 18 cockpit.
**Fix:** Explain that `/orders` is the execution workspace after quote acceptance, not a Quote clone. The stages are Actual Lines -> Buyer Doc -> Packing -> Freight Queue -> Processing -> Delivery Note -> Final Invoice -> Paid & Closed.

### Problem: Order is blocked or the next best action is unclear
**Cause:** One or more execution blockers are unresolved.
**Fix:** Open the order and review the Action Stack. Check accepted quote/source lineage, actual line approval, discount reasons/context, buyer document approval, packing approval, freight payload readiness, processing/QC, delivery note, final invoice, finance queue, payment/reconciliation, archive, and trade requirements.

### Problem: User asks what must be approved before the first buyer document
**Cause:** Buyer document send is locked by the actual-lines gate.
**Fix:** Approve actual order lines, line/total discount reasons, and the actual-lines approval gate. Do not mutate accepted quote version lines.

### Problem: User asks whether finance can sync now
**Cause:** Finance is queue-ready only.
**Fix:** Queue invoice sync only after Final Invoice approval. It creates a pending `finance_integration_events` payload with `adapter_name='pending'` and `event_type='invoice_sync_requested'`. No Xero, QuickBooks, Tally, bank feed, or payment processor sync is live.

### Problem: User asks whether freight can be booked from Orders
**Cause:** Freight is queue-ready only.
**Fix:** Queue freight request only after packing is saved/approved and the payload has cartons, pallets, weights/CBM, pickup/delivery, shipment mode, and incoterm. It creates a pending freight event/request payload. It does not book freight or call Flexport, Freightos, DHL, or any carrier.

### Problem: User asks why WhatsApp did not send automatically
**Cause:** WhatsApp remains manual tracked link.
**Fix:** SetuFlow opens WhatsApp or WhatsApp Web with prefilled text containing a secure document preview link; the operator manually sends. No WhatsApp Business API is live.

### Problem: Order PDF does not generate
**Cause:** The order/contract may have no product lines, or required seller/org details may be incomplete.
**Fix:** Confirm `contract_line_items` exist before generating order confirmation or invoice PDFs. Empty order lines now return HTTP 422 instead of a placeholder PDF. If seller/exporter or terms are missing, update Admin → Organization and regenerate.

### Problem: Order state advanced by mistake
**Cause:** State was advanced prematurely.
**Fix:** Contact your organization admin. State rollback requires admin action.

---

## NAVIGATION / SHELL ISSUES

### Problem: User cannot find Analytics, Capture, Send, or Reports
**Cause:** Desktop navigation can change across releases and some routes may exist before primary navigation is updated.
**Fix:** Use the current workflow sidebar order: Command, Growth, Commercial, Work, Setup. Analytics lives near Dashboard; Capture, Leads, and Pipeline belong together; Quotes, Send, and Orders belong together; Tasks and Events belong together. Only describe Reports as primary navigation after it is linked in the current shell.

### Problem: User cannot find profile or sign out on desktop
**Cause:** Account actions are not side-navigation workflow items.
**Fix:** Use the header avatar menu for Profile and Sign out. The profile page is `/profile`.

### Problem: Sidebar controls are hidden on short screens
**Cause:** The sidebar nav list can scroll independently.
**Fix:** The org logo and sidebar expand/hide controls should stay visible in the fixed top area. Only the workflow navigation list should scroll.

---

## DOCUMENTS / COMPLIANCE ISSUES

### Problem: User asks whether `/documents` is a full document library
**Cause:** The route may share or reuse compliance workspace behavior.
**Fix:** Do not overstate document-library functionality. If `/documents` renders compliance behavior, direct users to the active compliance/document workflow and escalate if a dedicated document library is required.

### Problem: A required document blocker will not clear
**Cause:** The document may not be attached to the expected entity, type, or workflow gate.
**Fix:** Confirm the document type, related entity, and current blocker source. Refresh the relevant order or quote review gate after upload.

---

## LEAD ISSUES

### Problem: Lead does not appear in the pipeline
**Cause:** Lead may not have a pipeline stage assigned, or workspace mode is filtering it out.
**Fix:** Switch to All mode, open the lead, and check pipeline/stage.

### Problem: Lead shows as "Dispatch blocked" but Quote Review is clear
**Cause:** Dispatch/order readiness is separate from Quote Review.
**Fix:** Continue the quote/send workflow if Step 4 and Step 5 are clear. Treat dispatch badges as execution reminders unless a quote-send rule makes that document mandatory.

### Problem: Lead shows as "Blocked" in TodayBar
**Cause:** The lead has a compliance or document blocker preventing progression.
**Fix:** Open the lead and identify the blocker. If it is a quote Review blocker, use the inline Step 4 Review card inside Continue quote.

---

## USER & PERMISSION ISSUES

### Problem: User cannot see certain pages
**Cause:** Role does not have access to those features.
**Fix:** Admin → Users → update the user's role.

### Problem: User cannot log in after invitation
**Cause:** Role assignment may have failed during invitation acceptance.
**Fix:** Admin → Users → verify they have a role assigned.

### Problem: Restricted-action message appears
**Cause:** This is the correct permissions message for restricted actions.
**Fix:** Contact your organization admin to request a role upgrade.

---

## MOBILE ISSUES

### Problem: Business card scan not working
**Cause:** AI vision provider may not be configured, or camera permission is denied.
**Fix:** Check `/api/mobile/scan-readiness`, confirm camera permission, or use manual entry.

### Problem: Mobile capture leads are not syncing
**Cause:** Offline queue may be waiting for connection.
**Fix:** Reconnect to the internet and let sync run automatically.

---

## ADMIN ISSUES

### Problem: Client Onboarding page is not accessible
**Cause:** This page is Setu-internal only.
**Fix:** It is not available to regular client workspaces.

### Problem: Cannot create new pipeline stages
**Cause:** Admin → Stages requires admin or owner role.
**Fix:** Ensure the user has admin/owner role.

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

### Problem: Dashboard is not loading data
**Cause:** Data query may be slow, or there is a loading state issue.
**Fix:** Wait briefly, hard refresh, check connection, then contact support if persistent.

### Problem: Page shows blank after login
**Cause:** Hydration or authentication state issue.
**Fix:** Hard refresh, sign out/in, clear cache, or try another browser.

_Updated: June 2026. Includes Sprint 21 Setu Guru capabilities, current Orders PDF guidance, desktop navigation guidance, and document/compliance route cautions._
