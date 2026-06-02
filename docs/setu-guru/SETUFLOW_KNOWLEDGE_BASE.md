# SetuFlow CRM — Detailed Workflow Guides
_For chatbot knowledge base upload — June 2026_

---

## WORKFLOW 1: COMPLETE LEAD-TO-ORDER JOURNEY

This is the primary commercial workflow in SetuFlow. Every deal follows this path.

```text
Capture Lead -> Qualify -> Map Products -> Move Pipeline -> Create Quote -> Approve Quote -> Send Quote -> Accept Quote -> Create Order -> Execute Order
```

### Step-by-step

**1. Capture the Lead**
- Desktop: Leads -> "+ New Lead" full form or "Quick Lead" fast entry
- Mobile: `/mobile/capture` for field capture
- Trade Show: Trade Events -> Capture at event
- Business Card: Mobile scan -> AI extracts details -> lead auto-created

**2. Qualify the Lead**
- Open lead -> Qualification section
- Set status: `In Review` -> assess fit -> `Qualified` or `Disqualified`
- Add qualification notes: product categories, deal potential, timeline

**3. Map Products**
- Inside lead detail -> Product Interests tab
- Select product categories and specific products the lead is interested in
- Set mapping status to `Ready` when complete

**4. Move Through Pipeline**
- Pipeline board (`/pipeline`) -> drag lead card to next stage
- Or: Lead detail -> change stage in the sidebar
- Watch for stage gate blockers: compliance/document requirements at certain stages

**5. Create Quote**
- Open lead -> Click "Create Quote"
- Terms step: select Incoterm, set currency, set payment terms, lock terms
- Pricing step: add line items, select product/variant, confirm quantity and unit price
- Review step: check totals, FX, approval, and compliance/document gates

**6. Quote Approval if required**
- If adjustment exceeds the threshold, quote enters `pending_approval`
- Owner/Admin/Manager reviews from Quotes approval queue
- Approve moves quote to `approved`; reject returns it for revision

**7. Send Quote**
- Quotes workspace -> open quote -> send by the governed send flow
- Route through approval-send workflow when applicable
- Quote status moves to `sent`

**8. Customer Accepts**
- Update quote status to `accepted`, or accept through the supported acceptance flow
- Accepted quote becomes the source of order execution truth

**9. Create Order**
- Quotes workspace -> accepted quote -> "Create Order"
- Order appears in Orders workspace

**10. Execute Order**
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
