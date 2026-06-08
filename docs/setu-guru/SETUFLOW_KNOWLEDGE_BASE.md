# SetuFlow CRM — Detailed Workflow Guides
_For chatbot knowledge base upload — June 2026_

---

## WORKFLOW 1: COMPLETE LEAD-TO-ORDER JOURNEY

This is the primary commercial workflow in SetuFlow. Every deal follows this path.

```text
Capture Lead -> Qualify -> Map Products -> Move Pipeline -> Create/Launch Quote -> Approve Quote -> Send Quote -> Log Outcome -> [Accept -> Move to Orders] -> Execute Order
```

_Updated June 2026: Quote workspace is now a customer-grouped lifecycle command centre. Lead rows now have inline contact CTAs. See Sprint 24 notes below._

### Step-by-step

**1. Capture the Lead**
- Desktop: Leads (`/leads`) -> "+ New Lead" full form or "+ Quick Lead" fast entry
- Mobile: `/mobile/capture` for field capture
- Trade Show: Trade Events -> Capture at event
- Business Card: Mobile scan -> AI extracts details -> lead auto-created

**2. Contact the Lead (Sprint 24 — S24-200)**
- From the lead list, use the inline contact buttons on each row (no need to open the full Command Center):
  - **Email** icon → opens `mailto:` with pre-filled subject
  - **WhatsApp** icon (green) → opens `https://wa.me/[number]`; uses `whatsapp_number` field first, falls back to `phone`
  - **Phone** icon → opens `tel:` link
- From the Lead Command Center, the same three icons appear in the lead hero section alongside the company name

**3. Qualify the Lead**
- Open lead Command Center -> Qualification card -> Inspect
- Set status: `In Review` -> assess fit -> `Qualified` or `Disqualified`
- Add qualification notes: product categories, deal potential, timeline
- Quote prep checklist in the Command Center shows live readiness: Pricing ready · Quote draft · Compliance clear

**4. Map Products**
- Inside lead Command Center -> Coverage card -> Inspect
- Select product categories and specific products the lead is interested in
- Coverage card shows: product count · market count · readiness status

**5. Move Through Pipeline**
- Pipeline stage strip in the Lead Command Center shows current stage
- Click a stage to advance or drag on Pipeline board (`/pipeline`)
- Watch for compliance gate status (shown in the Gate status panel, bottom-right of the Command Center)

**6. Create or Launch a Quote (Sprint 24 — S24-201)**
- Lead Command Center -> Commercial card -> "Continue quote →" or "Create quote"
- **Quote Launcher** provides explicit choices:
  - Continue latest draft
  - Create new quote (new opportunity for the same customer)
  - Create revision from a sent quote (creates a new version; original stays locked and immutable)
  - Clone an accepted quote into a new opportunity quote
  - View quote history
- Terms: Incoterm, currency, payment terms
- Lines: products, quantities, unit prices
- Review: totals, FX, approval, compliance gate

**7. Quote Approval if required**
- If adjustment exceeds the threshold, quote enters `pending_approval`
- Owner/Admin/Manager reviews from Quotes approval queue
- Approve moves quote to `approved`; reject returns it for revision

**8. Send Quote**
- Quotes workspace (`/quotes`) -> find customer in the worklist -> open quote -> send via governed send flow
- After sending, the `/send` page confirms: "Quote [ref] sent to [buyer]" with the full tracked quote link
- Copy or share the tracked link; use "Open WhatsApp" to send via WhatsApp with buyer-safe wording
- Status moves to `sent`; the quote moves into the Needs Review / Follow-up Due section of the worklist

**9. Log the Outcome (Sprint 24 — S24-206)**
- Sent quotes require an explicit outcome. Five choices:
  1. **Mark accepted** — locks the quote; creates order handoff; quote exits the Quote workspace
  2. **Mark rejected** — captures reason; quote moves to archive with clone option
  3. **Revision requested** — creates a governed new version; original stays immutable
  4. **No response** — schedules a follow-up task; quote stays in Needs Review
  5. **Expire quote** — archives the quote; shows clone-to-new-version option
- Outcome persistence rule: the main quote/order transition is authoritative. Optional timeline/lifecycle logging failures must not undo a successful outcome.

**10. Accepted Quote — Move to Orders (Sprint 24 — S24-207)**
- Once accepted and order handoff is created, the quote **exits the Quote workspace worklist**
- It no longer appears as active quote work in `/quotes`
- Orders workspace (`/orders`) is now the primary workspace for this deal
- The quote remains readable in the customer's lifecycle timeline in the Quote workspace
- Setu Guru should route the user to Orders, not back to the Quote workspace

**11. Execute Order**
- Operations opens `/orders`, the Orders Execution Cockpit
- Stages: Actual Lines -> Buyer Doc -> Packing -> Freight Queue -> Processing -> Delivery Note -> Final Invoice -> Paid & Closed
- Each governed step requires explicit human action. Setu Guru can explain blockers and draft checklists, but must not approve, send, waive, sync finance, book freight, or close the order.

### Orders Execution Cockpit current boundaries

Orders is an execution cockpit, not a Quote clone.

- Finance queue-ready means final invoice approval exists and the user can queue a pending `finance_integration_events` payload with `adapter_name='pending'`. It does not sync to Xero, QuickBooks, Tally, bank feeds, or payment processors.
- Freight queue-ready means packing approval exists and the freight payload is complete. Queue freight request creates a pending freight event/request payload. It does not book a carrier or call any freight provider.
- WhatsApp is manual tracked-link only. SetuFlow opens WhatsApp or WhatsApp Web with prefilled text; the operator manually sends.
- PDFs use server rendering where available and browser print fallback from tracked preview pages.
- Order confirmation and invoice PDFs require actual line items. Empty `contract_line_items` should return a clear error, not a placeholder PDF.

### Quote value bucket rules (critical — Setu Guru must follow these)

**Proposed** = sent quotes awaiting buyer outcome.
**Accepted** = buyer confirmed; quote locked; no order yet.
**Order** = accepted quote with confirmed order handoff.
**Cleanup** = zero-line or zero-value accepted records; stale/historical; void candidates. NOT active value.
**Archive** = expired or rejected quotes.
**Exposure** = max of Proposed/Accepted/Order per customer — not the sum.

Do NOT add Proposed + Accepted values together. A customer with one sent quote ($35 proposed) and one accepted quote ($35 accepted) has $35 in exposure, not $70.

Do NOT label a zero-value cleanup record as customer-level Risk. Cleanup means archive/void it. Risk means a bad record is about to be treated as operationally valid (e.g. order handoff from a zero-line quote).

---

## WORKFLOW 2: PRODUCT SETUP WORKFLOW

New organization or new product line setup.

**1. Create Categories: Admin -> Categories**
- Plan taxonomy first
- Create parent categories first
- Then create child categories
- Set category-level pricing defaults

**2. Add Products: Products workspace**
- Click "+ Add Product"
- Fill in name, SKU, category, and trade attributes
- Save product

**3. Add Variants**
- Inside product -> Variants tab
- Add variant for each pack size/configuration
- Set pack size, units per case, MOQ, UOM, and pricing basis

**4. Set Pricing**
- Inside product -> Pricing tab
- Open pricing calculator
- Enter starting price level and price
- Fill in cost layers and margins
- Save as product pricing rules

**5. Set Organization-Level Defaults**
- Admin -> Organization
- Set default currency, margin mode, standard margins, seller/exporter details, and terms
- These support quoting and order PDFs

**6. Import in Bulk**
- Products or Catalog Admin -> import workflow
- Download current CSV template
- Upload -> validate -> confirm

---

## WORKFLOW 3: USER ONBOARDING WORKFLOW

New team member setup.

**1. Admin Sends Invitation**
- Admin -> Invitations (`/admin/invitations`)
- Enter user email
- Select role
- Send invitation

**2. User Accepts Invitation**
- User follows the secure onboarding flow
- Sets account access information when prompted
- Lands in the organization workspace
- Profile is created automatically

**3. Admin Verifies Profile**
- Admin -> Users (`/admin/users`)
- Confirm role and workspace access

**4. User Sets Up Profile**
- Header avatar menu -> Profile (`/profile`)
- Upload profile photo
- Set My Card information
- Configure Smart vCard if field work is expected

**5. User Gets Oriented**
- Dashboard shows command-center data
- Leads shows the user portfolio
- Setu Guru can explain page-specific next steps

---

## WORKFLOW 4: TRADE EVENT WORKFLOW

How to use SetuFlow at a trade show or conference.

**Before the Event**
1. Admin -> Trade Events (`/admin/trade-events`)
2. Create the event
3. Assign team members
4. Confirm mobile scan readiness (`/api/mobile/scan-readiness`)

**During the Event**
5. Mobile: `/mobile/capture`
6. Business Card Scan: capture, review extracted fields, create lead
7. Manual Fast Capture: enter key fields and queue for sync
8. Share vCard: show QR or share link manually

**After the Event**
9. Leads workspace -> filter by event/source
10. Follow up from TodayBar or Leads
11. Begin qualification
12. AI Suggestions may provide draft follow-up text

---

## WORKFLOW 5: COMPLIANCE & DOCUMENT WORKFLOW

When orders have document or compliance requirements.

**Understanding Blockers**
- Document blocker: required document type is missing
- Compliance blocker: checklist item is unresolved
- Both can prevent stage advancement

**Resolving Document Blockers**
1. Open order -> blockers panel
2. Identify required document
3. Upload or attach the required file from the correct entity workflow
4. Tag it with the correct document type
5. Return to order and refresh blocker state

**Resolving Compliance Blockers**
1. Open order or lead -> Compliance section
2. Review open compliance items
3. Take required human action
4. Mark item resolved when authorized
5. Operations/Admin confirms resolution when required

**Who Can Resolve**
- Compliance review: owner, admin, manager, operations roles
- Document upload: most workspace roles can upload
- Compliance confirmation: owner, admin, manager, operations

---

## WORKFLOW 6: AI SUGGESTIONS WORKFLOW

How to use AI drafts effectively.

**Where AI Suggestions Appear**
- `/ai-suggestions` page
- Lead detail follow-up section
- Quote workflow cover-note drafts
- Setu Guru route-aware suggestions

**Using an AI Suggestion**
1. Open suggestion
2. Read carefully
3. Edit as needed; drafts are starting points, not final authority
4. Use or approve only after human review

---

## SETU GURU CURRENT CAPABILITIES

Setu Guru should answer as an operating copilot grounded in current SetuFlow workflows.

Current capabilities include:

- Route-aware help based on page, role, organization, and workspace context
- Source-search answers from internal help/knowledge snippets
- Guidance for blockers, setup, order execution, quote gates, product setup, and trade-show workflows
- Action guidance that explains where a user should go and what permission is required
- Feedback and telemetry awareness for improvement and support triage
- Playbook-style answers for onboarding, Orders, Quotes, Leads, Products, and Admin setup

Current boundaries:

- Guru can explain, summarize, and draft checklists or user-facing copy.
- Guru must not directly approve quotes, waive compliance, send commercial documents, sync finance, book freight, close orders, alter pricing truth, or bypass permissions.
- Guru must not claim external integrations are live when the product only creates pending queue events.
- Guru should call out manual steps clearly, especially for WhatsApp, freight, finance, and buyer-document workflows.

### Manual regression prompt

Ask Setu Guru: "I am on Orders. What can you do for me, and can you approve buyer docs, queue finance, book freight, or send WhatsApp automatically?"

Expected answer:
Guru should explain Orders Execution Cockpit stages, say it can guide and draft checklists, clarify finance/freight are queue-ready only, clarify WhatsApp is manual tracked-link sending, and say governed actions require authorized human users.

---

## CURRENT NAVIGATION GUIDANCE

Desktop shell uses a workflow sidebar:

- Command: Dashboard, Analytics
- Growth: Capture, Leads, Pipeline
- Commercial: Quotes, Send, Orders
- Work: Tasks, Events
- Setup: Catalog, Admin where role allows

The organization logo remains visible on desktop and links to `/dashboard`. Sidebar can be collapsed, expanded, or hidden. Profile and sign out live in the header avatar menu.

`/reports` exists in the app but should only be described as primary navigation once it is linked in the current shell. `/documents` should not be described as a dedicated document library unless the current route has been validated as distinct from compliance.

---

_Updated: June 2026. Includes Sprint 21 Setu Guru operating copilot capabilities, current Orders PDF guidance, and current desktop navigation guidance._
