# SetuFlow CRM — Detailed Workflow Guides
_For chatbot knowledge base upload — May 2026_

---

## WORKFLOW 1: COMPLETE LEAD-TO-ORDER JOURNEY

This is the primary commercial workflow in SetuFlow. Every deal follows this path.

```
Capture Lead → Qualify → Map Products → Move Pipeline → Create Quote → 
Approve Quote → Send Quote → Accept Quote → Create Order → Execute Order
```

### Step-by-step

**1. Capture the Lead**
- Desktop: Leads → "+ New Lead" (full form) or "Quick Lead" (fast entry)
- Mobile: `/mobile/capture` for field capture
- Trade Show: Trade Events → Capture at event
- Business Card: Mobile scan → AI extracts details → lead auto-created

**2. Qualify the Lead**
- Open lead → Qualification section
- Set status: `In Review` → assess fit → `Qualified` or `Disqualified`
- Add qualification notes (product categories, deal potential, timeline)

**3. Map Products**
- Inside lead detail → Product Interests tab
- Select product categories and specific products the lead is interested in
- Set mapping status to `Ready` when complete

**4. Move Through Pipeline**
- Pipeline board (`/pipeline`) → drag lead card to next stage
- Or: Lead detail → change stage in the sidebar
- Watch for stage gate blockers (compliance/document requirements at certain stages)

**5. Create Quote**
- Open lead → Click "Create Quote"
- **Terms step:**
  - Select Incoterm (EXW / FOB / CIF / DDP)
  - Set currency (system suggests lead's country currency)
  - Set payment terms
  - Lock terms before moving to pricing
- **Pricing step:**
  - Add line items: select product + variant
  - System loads pack size, MOQ, pricing basis defaults
  - Set quantity and unit price
  - Add any quote-only adjustments (discounts/markups)
- **Review step:**
  - Check totals
  - Verify FX rate if multi-currency
  - Save quote

**6. Quote Approval (if required)**
- If adjustment > 15%: quote enters `pending_approval` status
- Owner/Admin sees it in Quotes workspace approval queue
- Approve: quote moves to `approved`
- Reject: operator gets rejection reason, must revise

**7. Send Quote**
- Quotes workspace → click quote → modal opens
- Click "Send by Email" or "Send by WhatsApp"
- Routes through approval-send workflow
- Quote status → `sent`

**8. Customer Accepts**
- Update quote status to `accepted` (or system detects acceptance)
- Quote is now locked — no more edits

**9. Create Order**
- Quotes workspace → accepted quote → "Create Order" button
- Order created in Draft state in Orders workspace

**10. Execute Order**
- Operations opens `/orders`, the Orders Execution Cockpit.
- Stages are Actual Lines -> Buyer Doc -> Packing -> Freight Queue -> Processing -> Delivery Note -> Final Invoice -> Paid & Closed.
- Each governed step requires explicit human action. Setu Guru can explain blockers and draft checklists, but must not approve, send, waive, sync finance, book freight, or close the order.

### Orders Execution Cockpit v2 details

Orders is an execution cockpit, not a Quote clone.

The top KPI filters are All orders, Ready now, Blocked, Finance queue-ready, Freight queue-ready, and WhatsApp-ready docs.

Finance queue-ready means final invoice approval exists and the user can queue a pending `finance_integration_events` payload with `adapter_name='pending'`. It does not sync to Xero, QuickBooks, Tally, bank feeds, or payment processors.

Freight queue-ready means packing approval exists and the freight payload is complete. Queue freight request creates a pending freight request/event payload. It does not book a carrier or call Flexport, Freightos, DHL, or any freight provider.

WhatsApp is manual tracked link only. SetuFlow opens WhatsApp/WhatsApp Web with prefilled text containing `View secure document: https://www.setuflowcrm.com/order-documents/preview/...`; the operator manually sends.

PDF uses free/open-source server rendering where available and browser print fallback from tracked preview pages.

---

## WORKFLOW 2: PRODUCT SETUP WORKFLOW

New organization or new product line setup.

**1. Create Categories (Admin → Categories)**
- Plan your taxonomy first (e.g., "Dehydrated Products" → "Garlic" / "Onion")
- Create parent categories first
- Then create child categories under each parent
- Set category-level pricing defaults (currency, margin mode, standard margins)

**2. Add Products (Products workspace)**
- Click "+ Add Product"
- Fill in: Name, SKU, Category, Trade Attributes (HS code, origin)
- Save product

**3. Add Variants**
- Inside product → Variants tab
- Add variant for each pack size/configuration
- Set: Pack size, Units per case, MOQ, UOM, Pricing basis
- Save variant

**4. Set Pricing**
- Inside product → Pricing tab
- Open pricing calculator
- Enter starting price level (EXW or FOB usually)
- Enter starting price
- Fill in cost layers (transport, customs, freight, insurance, duties)
- Set margin percentages
- System calculates all levels
- Save as product pricing rules

**5. Set Organization-Level Defaults (Admin → Organization)**
- Set default currency
- Set default margin mode (markup vs margin)
- Set standard margin percentages
- These are inherited by all products that don't have explicit overrides

**6. Import in Bulk (if many products)**
- Products → Catalog Command Center
- Download CSV template
- Fill in product data
- Upload → validate → confirm

---

## WORKFLOW 3: USER ONBOARDING WORKFLOW

New team member setup.

**1. Admin Sends Invitation**
- Admin → Invitations (`/admin/invitations`)
- Enter new user's email
- Select appropriate role (refer to role guide)
- Click "Send Invitation"
- User receives email with secure link

**2. User Accepts Invitation**
- User clicks link in email
- Creates password on first login
- Lands in the organization workspace
- Profile is created automatically

**3. Admin Assigns Profile (optional)**
- Admin → Users (`/admin/users`)
- Find new user
- Verify role is correct
- Update role if needed

**4. User Sets Up Profile**
- Click profile menu → Profile (`/profile`)
- Upload profile photo
- Set My Card information (name, title, phone, email)
- Configure Smart vCard if field work is expected

**5. User Gets Oriented**
- Dashboard → TodayBar shows their assigned leads needing action
- Leads → filter by Owner = self to see their portfolio
- Use the Help button (top right, on every page) for page-specific guidance

---

## WORKFLOW 4: TRADE EVENT WORKFLOW

How to use SetuFlow at a trade show or conference.

**Before the Event**

1. Admin → Trade Events (`/admin/trade-events`)
2. Create the event: name, date, location
3. Assign team members
4. Confirm mobile scan is configured (`/api/mobile/scan-readiness`)

**During the Event**

5. Mobile: `/mobile/capture`
6. Option A — Business Card Scan:
   - Tap "Scan Business Card"
   - Take clear photo of card
   - AI extracts: name, company, email, phone, title
   - Review and confirm extracted data
   - Lead is created instantly
7. Option B — Manual Fast Capture:
   - Tap "Quick Entry"
   - Fill in key fields
   - Lead queued for sync

8. Share Your Card:
   - Tap Share vCard button in mobile navigation
   - Show QR to contact for them to scan
   - Or: Share link via WhatsApp / email on the spot

**After the Event**

9. Leads workspace → filter by Source = Trade Event + Event = [your event]
10. TodayBar → "All Open" shows event-captured leads needing follow-up
11. Begin qualification: mark each lead In Review
12. AI Suggestions (`/ai-suggestions`) may have drafted follow-up messages

---

## WORKFLOW 5: COMPLIANCE & DOCUMENT WORKFLOW

When orders have document or compliance requirements.

**Understanding Blockers**
- A **Document Blocker** = a required document type hasn't been uploaded
- A **Compliance Blocker** = a compliance checklist item hasn't been resolved
- Both types prevent order state advancement

**Resolving Document Blockers**
1. Open order → check blockers panel
2. Note which document is required (e.g., "Certificate of Origin required")
3. Go to Documents (`/documents`) or open lead → Documents tab
4. Upload the required document
5. Tag it with the correct document type
6. Return to order → blocker should clear

**Resolving Compliance Blockers**
1. Open order or lead → Compliance section
2. Review open compliance items
3. Take required action (e.g., submit compliance form, get approval)
4. Mark item as resolved
5. Operations or Admin confirms resolution

**Who Can Resolve**
- Compliance review: owner, admin, manager, operations roles
- Document upload: most roles can upload
- Compliance confirmation: owner, admin, manager, operations

---

## WORKFLOW 6: AI SUGGESTIONS WORKFLOW

How to use AI drafts effectively.

**Where AI Suggestions Appear**
- `/ai-suggestions` page (all pending suggestions)
- Lead detail → Follow-up section (contextual drafts)
- Quote workflow → cover note drafts

**Using an AI Suggestion**
1. Open suggestion
2. Read the draft carefully
3. Edit as needed (AI drafts are starting points, not final)
4. Click "Use this" or "Approve"
5. Draft becomes a communication ready to send

**What AI Drafts Well**
- Follow-up email after a trade event
- Introduction email for a new buyer contact
- Quote cover note with product highlights
- Summary of next steps after a call

**What AI Does NOT Do (Important)**
- Does NOT set or change prices
- Does NOT approve quotes
- Does NOT send messages autonomously
- Does NOT advance order states
- Does NOT make compliance decisions

**If a Suggestion is Wrong**
- Click "Dismiss" or "Not helpful"
- Edit the lead notes to give AI better context for next time
- AI improves as more context is added to the lead

---

## WORKFLOW 7: SMART VCARD SETUP AND SHARING

**Setup (Once)**
1. Go to Profile → My Card or `/contact-exchange/vcard`
2. Fill in: Full name, Title, Company, Phone (mobile), Email, Website
3. Upload profile photo (will be compressed for iOS compatibility)
4. Set Smart QR as default (recommended)
5. Save → share slug is created

**Sharing Your Card**
- From desktop: Profile menu → Share Card → shows modal with QR + actions
- From mobile: Navigation → Share vCard → shows mobile share sheet
- Actions: Save Contact, Copy Link, Share Card, Send Email

**Receiving a Contact's Card**
- Mobile: `/mobile/capture` → Scan Business Card
- Take photo of their business card
- AI extracts details → creates lead

**Smart QR vs Offline QR**
- Smart QR (default): Opens your public profile page. Looks professional. Tracks views.
- Offline QR: Directly downloads .vcf file. Works without internet. No analytics.
- Change in: My Card Settings → Smart QR / Offline QR toggle

---

_These workflow guides should be uploaded alongside the main knowledge base to the GPT's Knowledge section._
