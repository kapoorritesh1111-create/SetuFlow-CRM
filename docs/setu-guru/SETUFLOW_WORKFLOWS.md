# SetuFlow CRM — Troubleshooting Guide
_For chatbot knowledge base upload — June 2026_

---

## QUOTE ISSUES

_Quote workspace is a customer-grouped lifecycle command centre._

### Problem: Where do I find my quotes now?

**Cause:** The Quotes page is now a customer-grouped lifecycle workspace, not a flat table.
**Fix:** Go to `/quotes`. The left panel shows customers grouped by section (Needs Review, Revision Requested, Order Handoff, Follow-up Due, Archive, Draft). Click a customer card to open their Quote Story on the right. Use the search/filter bar to find a specific quote by number, product, or customer name.

### Problem: My sent quote is not showing as active — where did it go?

**Cause:** Sent quotes move into the "Needs Review / Follow-up Due" sections. If the quote was accepted and an order was created, it has exited the Quote workspace entirely.
**Fix:**
- If sent but no outcome logged → look in the "Needs Review" or "Follow-up Due" section
- If accepted → it moved to Orders (`/orders`); it is no longer in the active Quote worklist
- If expired or rejected → it is in the Archive section (use the archive filter or grouping mode)
- Quote history is always readable in the customer's Lifecycle Timeline panel on the right

### Problem: Quote stuck in "Pending Approval"

**Cause:** A discount or markup greater than 15% was applied to the quote.
**Fix:**
1. An **owner** or **admin** needs to review the quote.
2. Go to Quotes (`/quotes`) → find the customer → the quote shows in their card with a "pending_approval" state.
3. Open the quote and review the approval panel.
4. Approve to move the quote to `approved`, or reject with a reason so the operator can revise.

### Problem: How do I log an outcome for a sent quote?

**Cause:** Sent quotes require explicit outcome logging before they can progress or close.
**Fix:** Open the customer's quote story in the Quote workspace → find the sent quote → choose one of five outcomes:
1. **Mark accepted** → locks quote; creates order handoff; quote exits Quote workspace; go to Orders
2. **Mark rejected** → captures reason; moves to archive; shows clone option
3. **Revision requested** → creates a governed new version; original stays locked
4. **No response** → schedules follow-up task; quote stays in Needs Review
5. **Expire quote** → archives the quote; shows clone option

### Problem: Outcome action returns an error even though the quote moved

**Cause:** Optional lifecycle event logging (timeline records) failed after the main quote/order transition succeeded.
**Fix:** This is a known outcome persistence rule. The main transition is authoritative. If the quote shows as accepted/moved to Orders, the outcome succeeded. Optional logging failures are server-side logged and do not invalidate the outcome. Do not retry the main action.

### Problem: The customer shows double the expected value

**Cause:** Proposed and accepted values are being added together incorrectly.
**Fix:** Value buckets are separate — they must NOT be summed together. A customer with a sent quote (Proposed $35) and an accepted quote (Accepted $35) has **$35 in Exposure**, not $70. The Exposure bucket shows the max of Proposed/Accepted/Order, not the sum.

### Problem: A zero-value accepted record is showing as customer Risk

**Cause:** A stale zero-line or zero-value accepted quote is being treated as active value.
**Fix:** Zero-line / zero-value accepted records are **Cleanup** candidates, not Risk. Cleanup means archive or void it — it is not an active deal. Only use Risk when the system is about to treat a bad record as operationally valid (e.g. an order handoff pending from an invalid quote).

### Problem: I need a second quote for the same customer

**Cause:** The previous model only allowed one active quote per lead.
**Fix:** From the Lead Command Center, use the Quote Launcher. Explicit choices: Continue latest draft · Create new quote · Create revision from sent quote · Clone accepted quote into new opportunity · View quote history. Do not edit a sent quote in place — always create a revision.

### Problem: Quote Review shows a compliance/document blocker

**Cause:** The active quote is missing required quote-review evidence, or the reviewer has not yet waived/deferred that quote-send blocker.
**Correct workflow:**
1. Go to Leads (`/leads`).
2. Open the lead from the lead queue.
3. Click **Continue quote →** in the Lead Command Center (via the Quote prep checklist).
4. Complete Product, Terms, and Pricing.
5. On **Step 4 — Review**, use the red **Resolve compliance/document blocker** card inside the quote Review panel.
6. Choose Attach evidence, Waive for quote, or Defer to dispatch.
7. Enter a human reviewer reason for Waive/Defer.
8. Click **Save and refresh gate**, then refresh the governed draft.
9. Continue to **Step 5 — Send gate** only when review, pricing, approval, compliance, and quote draft are all clear.

**Important:** Do not route users to a global compliance overlay or unrelated helper as the primary fix. The fix belongs inside the active quote Review workflow.

### Problem: Accepted quote is still visible in the Quote workspace

**Cause:** The accepted quote and order handoff were created but the quote has not been removed from the active worklist view.
**Fix:** Once accepted and an order handoff is created, the quote should exit the active Quote worklist automatically. If it still appears, check that the order handoff was successfully created (`orders` table entry with `source_quote_id` set). Route the user to Orders (`/orders`) — that is now the primary workspace for this deal.

### Problem: Quote PDF is blank or missing products

**Cause:** Product data may not have loaded correctly, or the quote has no line items.
**Fix:** Check the quote has line items, product/variant name, and price, then regenerate the PDF from Quotes. Zero-line quotes cannot generate a buyer-ready PDF — they should be treated as Cleanup.

### Problem: Quote approaching expiry — what should I do?

**Cause:** Quote validity date is near or passed.
**Fix:** For expiring quotes: follow up, revise, or send a reminder to the buyer before validity passes. For expired quotes: the quote moves to archive automatically. Use "Clone to new version" to restart the commercial conversation without losing history. Setu Guru will prompt you when a quote is approaching expiry.

---

## SETU GURU OPERATING COPILOT ISSUES

### Problem: User asks what Setu Guru can do
**Cause:** Setu Guru's primary surface is now Growth Center (`/growth-agent`), not a floating widget alone.
**Fix:** Explain that Guru's main entry point is Growth Center: a Today work queue, Revenue workspace, Supplier workspace, Research/Opportunity workspace, Trade Event workspace, and Pricing Intelligence workspace, plus an executive business brief. It also surfaces as compact Lead Detail "Smart Actions" (Research, Draft outreach, Analyze reply, Quote readiness, Supplier RFQ assistance) and a Dashboard business-brief strip. Guru still provides route-aware guidance, live org data reads, drafts, and checklists, and still must respect human approval boundaries — nothing sends, prices, or activates automatically.

### Problem: User asks about ICP, Opportunity Finder, Research Drawer, Outreach Generator, Reply Analyzer, Supplier RFQ Assistant, or Trade Event Assistant
**Cause:** These were introduced as separate features and are now unified under Growth Center, which reuses rather than replaces them.
**Fix:** Explain each capability in its Growth Center workspace context: ICP setup and Opportunity Finder fit scoring live in Research; Outreach Generator and Reply Analyzer are part of Lead Detail Smart Actions and the Revenue workspace; Supplier RFQ Assistant and the supplier comparison engine live in the Supplier workspace; the Trade Event Assistant (pre-show prioritization, post-show follow-up, summary generation) lives in the Trade Events workspace. All remain review-first and human-approved.

### Problem: User asks about Pricing Intelligence or a suggested price list
**Cause:** Catalog pricing-gap detection and a draft price-list generator.
**Fix:** Explain Pricing Intelligence is available at `/products?mode=pricing` (compact summary) and `/growth-agent?workspace=pricing` (full recommendation set). It detects missing EXW/FOB/CIF/DDP coverage, missing MOQ, stale prices, and missing pricing-rule coverage, and can prepare a suggested price list from stored SETU Flow pricing/margin/FX data. The suggested list is a reviewable draft only — SETU Flow does not activate or share it automatically, and Guru does not claim external competitor pricing unless verified external data has been stored.

### Problem: User asks about a supplier lead and Guru responds with buyer-side guidance
**Cause:** Supplier Mode is a parallel lead journey with its own compliance, approval, and RFQ/cost-request workflow — it is not the buyer journey with different labels.
**Fix:** Explain that supplier leads use `lead_type` to scope pipeline, compliance rules, approval state, and the commercial action (Supplier Cost Request replaces the buyer Quote CTA). Point to `/pipeline/suppliers`, the Supplier Lead Command Center tabs, Supplier Offer Comparison, and the Growth Center Supplier workspace. Never assume buyer defaults apply to a supplier record.

### Problem: User asks Guru to approve, send, waive, book, sync, or close something
**Cause:** Those are governed commercial actions.
**Fix:** Guru should explain the correct workspace and required role. It can draft a checklist or guide the user to the page, but it must not approve quotes, waive compliance, send buyer documents, book freight, sync finance, close orders, or mutate governed commercial truth. This applies equally inside Growth Center — Pricing Intelligence and suggested price lists are drafts, not actions.

### Problem: Guru answer conflicts with current page behavior
**Cause:** Docs, route metadata, or workflow rules may be stale.
**Fix:** Prefer current route behavior and current product constraints. Update Setu Guru docs in the same fix whenever Guru behavior, routing, workflow logic, help content, telemetry, actions, or UI changes. Check `sprint_issues` for the latest `Resolved` sprint before assuming a Guru capability is undocumented by design.

### Manual regression prompt for Guru knowledge
Ask Setu Guru: "What can you do on the Orders page, and can you queue finance, book freight, send WhatsApp, or approve buyer documents for me?"

Expected answer: Guru should describe Orders as the Execution Cockpit, explain queue-ready finance/freight and manual WhatsApp, and clearly say it cannot perform governed actions or mutate records.

### Manual regression prompt for Growth Center knowledge
Ask Setu Guru on `/growth-agent`: "What is Growth Center and can you send outreach or activate a suggested price list for me?"

Expected answer: Guru should identify the current page as Growth Center (not fall back to Dashboard framing), describe the six workspaces (Today, Revenue, Supplier, Research, Trade Events, Pricing Intelligence) and business brief, and clearly say it cannot send outreach or activate/share a price list without human action.

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
**Cause:** Orders changed from a simple execution shell to the execution cockpit.
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

_Lead rows have inline contact CTAs. Lead Command Center is a one-page workspace._

### Problem: How do I call, WhatsApp, or email a lead quickly?

**Cause:** Inline contact CTAs are now live on every lead row.
**Fix:** From the lead list (`/leads`), look for the contact action buttons on each row — no need to open the full Command Center:
- **Email icon** → opens `mailto:` with pre-filled subject "SETU Flow follow-up: [Company]"
- **WhatsApp icon** (green) → opens `https://wa.me/[number]`; uses `whatsapp_number` field first, falls back to `phone`
- **Phone icon** → opens `tel:` link

From the Lead Command Center, the same three icons appear in the lead hero section next to the company name. If a field is empty, the button is hidden.

### Problem: Contact CTA buttons are not visible on a lead row

**Cause:** The contact fields (`email`, `phone`, `whatsapp_number`) may be empty for that lead.
**Fix:** Open the lead Command Center → Quick edit → fill in email, phone, or WhatsApp number. Save, then return to the lead list — the CTAs will appear once the fields are populated.

### Problem: Lead does not appear in the pipeline

**Cause:** Lead may not have a pipeline stage assigned, or workspace mode is filtering it out.
**Fix:** Switch to All mode, open the lead, and check pipeline/stage in the pipeline stage strip.

### Problem: Lead shows as "Dispatch blocked" but Quote Review is clear

**Cause:** Dispatch/order readiness is separate from Quote Review.
**Fix:** Continue the quote/send workflow if Step 4 and Step 5 are clear. Treat dispatch badges as execution reminders unless a quote-send rule makes that document mandatory.

### Problem: Lead shows as "Blocked" in TodayBar

**Cause:** The lead has a compliance or document blocker preventing progression.
**Fix:** Open the lead Command Center and check the Gate status panel (bottom-right). If it is a quote Review blocker, use the inline Step 4 Review card inside "Continue quote →".

### Problem: I want to create a second quote for the same lead

**Cause:** The old model returned the latest existing quote. The Quote Launcher is now the correct entry point.
**Fix:** Open the Lead Command Center → Commercial card → "Continue quote →" or use the Quote Launcher for: Continue latest draft / Create new quote / Revision from sent / Clone from accepted / View history.

---

## SUPPLIER MODE ISSUES

_Covers the supplier-side lead journey._

### Problem: User asks how supplier leads differ from buyer leads
**Cause:** Supplier and buyer leads share the same `leads` table and pipeline, but supplier leads use a strict `lead_type` scope with no silent buyer fallback anywhere in the save path, pipeline resolver, or mobile capture defaults.
**Fix:** Explain that supplier leads have their own dedicated pipeline view (`/pipeline/suppliers`), their own compliance document requirement rules, their own approval/stage-transition model, and their own primary commercial action — a Supplier Cost Request (RFQ) instead of the buyer Quote CTA.

### Problem: User can't find where to request pricing from a supplier
**Cause:** The buyer Quote button is intentionally replaced on supplier leads.
**Fix:** Point to the Supplier Cost Request action on the supplier Lead Detail Command Center. RFQ responses link back to the originating supplier lead automatically.

### Problem: User wants to compare multiple supplier quotes/offers
**Cause:** Supplier Offer Comparison is a dedicated panel, not a generic list view.
**Fix:** Open the Sourcing Review / Supplier Offer Comparison panel from the supplier lead or RFQ. It is built for side-by-side comparison before selecting a source.

### Problem: Supplier compliance blocker won't clear the same way a buyer one does
**Cause:** Supplier compliance uses its own document requirement rule seed and its own readiness/approval blockers, separate from buyer compliance.
**Fix:** Check Supplier Compliance Readiness on the supplier Lead Detail, not the buyer Compliance workspace defaults.

### Problem: User wants supplier-specific performance or analytics
**Cause:** Supplier Performance KPIs, dashboard metrics, and the supplier analytics funnel/movement model are tracked separately from buyer-side Reports.
**Fix:** Point to the supplier-specific dashboard metrics and Reports sourcing views, and to the Supplier workspace inside Growth Center for a prioritized readiness view.

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

## CATALOG SHARE / PRICE LIST ISSUES

### Problem: Where do I create a price list?
Go to **Price Lists** in the sidebar. Create a list, add products, set MOQ and base price, and add up to three quantity tiers per product. Set the status to active to use it in a catalog share.

### Problem: How do I share a catalog with a buyer?
Open **Catalog** → **Share Catalog**, or open a lead and use **Send Catalog** on the timeline. Pick products, choose a price list, set the buyer details and link controls, optionally let Setu Guru draft the message, then create the link and send it via Copy / WhatsApp / Email / QR.

### Problem: The buyer says the link doesn't work
**Cause:** The link may have expired or been revoked, or it is PIN-protected.
**Fix:** Check the Shared Links tab. If the status is Expired, use **Extend** to set a new validity date. If it was Revoked, create a new share. If a PIN was set, make sure the buyer has it. Expired and revoked links intentionally show the buyer a polished "no longer available" page.

### Problem: A product shows "price on request" to the buyer
**Cause:** The product is not in the selected price list, or has no base price.
**Fix:** Add the product to the price list with a price, or select a price list that covers it. The wizard warns in step 1 when a selected product has no price and no price list.

### Problem: A warning says products are missing data before sharing
**Cause:** Selected products are missing fields buyers expect (price, image, MOQ, pack size, etc.).
**Fix:** You can continue and share anyway, or complete the products in the catalog editor first. Products with no price and no price list raise a stronger error — add pricing or remove them.

### Problem: How do I turn buyer selections into a quote?
When a buyer has selected products on a shared catalog, use **Create Quote** in the Shared Links tab or on the lead timeline. This creates a draft quote pre-filled with the selected products, quantities, and tier prices. The share must be linked to a lead first (a quote always belongs to a lead).

### Problem: Setu Guru suggestions / drafts didn't appear
**Cause:** The AI assistant is not configured in this environment.
**Fix:** Catalog AI (product suggestions, message drafting, engagement summaries) requires the workspace's AI keys to be configured. When unavailable, SetuFlow falls back to template-based drafts and rule-based suggestions so you can still share — nothing is blocked.

### Problem: I can't see the Share Catalog or Create Price List buttons
**Cause:** These actions require catalog-management permission.
**Fix:** Ask an owner/admin/manager to share, or to grant the appropriate role. Read-only members can still view the catalog.

---

## PERFORMANCE / DISPLAY ISSUES

### Problem: Dashboard is not loading data
**Cause:** Data query may be slow, or there is a loading state issue.
**Fix:** Wait briefly, hard refresh, check connection, then contact support if persistent.

### Problem: Page shows blank after login
**Cause:** Hydration or authentication state issue.
**Fix:** Hard refresh, sign out/in, clear cache, or try another browser.

_Includes catalog sharing (price lists, secure buyer share rooms, engagement tracking, quote conversion, Setu Guru catalog assistance), Setu Guru capabilities, current Orders PDF guidance, desktop navigation guidance, and document/compliance route cautions._
