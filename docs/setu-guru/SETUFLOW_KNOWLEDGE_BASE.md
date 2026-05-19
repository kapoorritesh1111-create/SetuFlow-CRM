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
- Operations resolves blockers (documents, compliance, contract)
- State advances: Draft → Ready → Released → Dispatched → Completed
- Each advance requires explicit action (no automation)

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

---

## SPRINT 11 UPDATES: Email and WhatsApp

### Email Integration (Mailtrap — Active)

SetuFlow now sends actual emails via **Mailtrap** as the configured email provider.

**What Mailtrap handles:**
- Invitation emails (existing, unchanged)
- Order document sends when channel = `email` and `Send tracked` is clicked
- Future: quote send notifications, compliance reminders

**Email send flow:**
1. Operator clicks `Send tracked` with channel = email
2. Server action creates `order_document_sends` row with `status = link_created`
3. Server action calls Mailtrap API to send the email with the tracked share link
4. Mailtrap API returns a message ID stored in `email_send_log.provider_message_id`
5. `order_document_sends.email_sent = true` and `email_delivery_status = 'sent'` when Mailtrap accepts
6. External delivery (inbox receipt) remains unconfirmed until a webhook records it

**Important:** `email_sent = true` means Mailtrap accepted the email for delivery. It does NOT prove the recipient's inbox received it. Bounces and delivery failures require webhook integration (future sprint).

**Environment variables:**
- `MAILTRAP_API_KEY` — required
- `MAILTRAP_USE_SANDBOX` — set to `true` for testing (requires `MAILTRAP_SANDBOX_ID`)
- `SETU_EMAIL_PROVIDER` — defaults to `mailtrap`
- `SETU_NOTIFICATION_FROM_EMAIL` — from address (defaults to `help@setugroups.com`)

**Setu Guru response policy for email questions:**
- "Was the email sent?" → Check `order_document_sends.email_sent` and `email_delivery_status`. If `email_sent = true`, Mailtrap accepted it. If `email_delivery_status = 'delivered'`, a webhook confirmed delivery (not yet enabled).
- "Did the recipient open it?" → Check `order_document_sends.open_count`. Open count increments when the tracked share link is accessed. This is document-link-open, not email-open.
- "Why didn't they receive it?" → Possible bounce or spam filter. Check `email_send_log.bounce_reason` when webhook is enabled. Currently forward to support.

---

### WhatsApp Integration (Link-Based — No API)

SetuFlow does NOT use the WhatsApp Business API. WhatsApp sends are **link-based only**.

**How it works:**
1. Operator clicks `Send tracked` with channel = whatsapp
2. Server action creates `order_document_sends` row with `status = link_created`
3. Server action generates a `wa.me` link (mobile) or `web.whatsapp.com` link (desktop)
4. The link is stored in `order_document_sends.whatsapp_link`
5. UI shows an "Open in WhatsApp" button that opens the link in the browser
6. WhatsApp opens with the message **pre-filled** — the operator must press **Send** inside WhatsApp
7. SetuFlow records `link_created` — this does NOT confirm the message was sent

**Device behavior:**
- **Desktop browser**: Opens `https://web.whatsapp.com/send?phone=[number]&text=[message]` (WhatsApp Web)
- **Mobile browser**: Opens `https://wa.me/[number]?text=[message]` (WhatsApp mobile app)
- Device detection is automatic based on `navigator.userAgent`

**The pre-filled message includes:**
- Organization name
- Document type (e.g. Proforma Invoice)
- Order number and company name
- Amount in selected currency (when available)
- Tracked share URL
- Optional note from the operator

**Important rules for Setu Guru:**
- `link_created` for WhatsApp = a wa.me link was generated and shown to the operator
- It does NOT mean the operator sent it in WhatsApp
- It does NOT mean the recipient received it
- The operator must open WhatsApp and press Send manually
- Setu Guru must NEVER say "the WhatsApp message was sent" based on `link_created` status alone
- Setu Guru may say: "A WhatsApp link was created. The operator opened WhatsApp with the message pre-filled."

**What Setu Guru should say when asked about WhatsApp delivery:**
- "A WhatsApp link was generated for [recipient phone]. The operator needs to open WhatsApp and press Send to complete the delivery. SetuFlow does not send WhatsApp messages automatically."

---

### New Database Tables (Sprint 11)

- `email_send_log` — Per-email send event log. One row per Mailtrap API call. Links to `communications` and `order_document_sends`.
- `sprint_issues` — Internal sprint issue tracker. Maps to Section 15 of the documentation HTML.

### New Schema Columns (Sprint 11)

**`communications` table:**
- `email_provider` — Provider used (mailtrap | resend)
- `email_message_id` — Provider message ID from Mailtrap response
- `email_delivery_status` — pending | sent | delivered | bounced | failed
- `email_delivered_at`, `email_opened_at`, `email_bounce_reason` — Future webhook fields
- `whatsapp_link` — Generated wa.me/web.whatsapp.com link
- `whatsapp_link_type` — wa_me | web_whatsapp | both

**`order_document_sends` table:**
- `email_sent` — Boolean: Mailtrap accepted the email
- `email_provider`, `email_message_id`, `email_delivery_status` — Mailtrap tracking
- `whatsapp_link` — Generated WhatsApp link for the operator to click
- `whatsapp_phone` — E.164 phone number used for link generation

### Security Fixes (Sprint 11)

Sprint 11 applied RLS policies to 38 tables that previously had RLS enabled but no policies. These tables now enforce org-membership-based access control. Setu Guru should note:
- `compliance_checklist_items`, `exchange_rates`, `hs_codes`, `hs_duties` are now read-only for authenticated users (global reference data)
- All `stg_*` staging tables now join through `import_runs` for org isolation
- `integrations` table is now read-for-members, write-for-admins

---

## SPRINT 12 UPDATES: Security Hardening + Handoff Integrity

### Security — SECURITY DEFINER RPCs Fixed

Sprint 12 revoked anon EXECUTE on 32 non-trigger SECURITY DEFINER RPCs. This means:
- Unauthenticated requests can NO LONGER call app_ RPCs like app_advance_order_stage_tx, app_safe_accept_sent_quote_tx, etc.
- Trigger functions (14 total) still run as SECURITY DEFINER — this is correct behavior for triggers.
- get_order_document_preview_by_token intentionally keeps anon access (token-gated, public document preview).
- is_org_member, is_org_admin, is_setu_platform_admin keep anon access (required by RLS policies).

### Security — SECURITY INVOKER Views

Sprint 12 converted both SECURITY DEFINER views to SECURITY INVOKER:
- active_product_pricing_rules_v — now respects RLS on product_pricing_rules per caller session
- v_quote_eligible_products — now respects RLS on products, pricing_rule_sets, product_variants per caller session
- Cross-org pricing data can no longer be exposed through these views

### Quote-to-Order Handoff Integrity (S12-ORDER-001)

A DB-level CHECK constraint now enforces: when source_quote_id is set on an order, source_quote_version_id MUST also be set. This prevents the silent null handoff bug where orders could be created without accepted quote version lineage.

Audit trigger added: every time source_quote_version_id is set or changed, a row is written to order_stage_events with event_type = 'order_quote_lineage_set'. Setu Guru can look here when asked "was this order linked to the correct quote version?"

### Lead Coverage Gate (S12-LEAD-001)

A new table lead_quote_gate_log records every gate check result. Fields: gate_result (gate-passed | lead-not-found | lead-disqualified | missing-product-interest | coverage-read-error), product_interest_count, coverage_source.

The canonical gate check is now in src/lib/leads/lead-quote-gate.ts — checkLeadQuoteGate(). Both the UI display AND gate enforcement must call this function for UI/DB alignment.

Setu Guru response policy: When asked "why can't I quote this lead?", check lead_quote_gate_log for the most recent gate_result for that lead_id. Report the exact reason: gate-passed (should be quoting), missing-product-interest (need to add product coverage), lead-disqualified (cannot proceed), coverage-read-error (DB issue).

### Email — Sprint 12 Wiring Complete

Sprint 12 wired the email utility into the send action:
- sendOrderDocumentLinkAction now calls sendOrderDocumentEmail() when channel=email
- On success: email_sent=true, email_delivery_status='sent', email_message_id stored
- On failure: email_sent=false, email_delivery_status='failed', non-fatal (send row still created)
- email_send_log row written for every Mailtrap API call with provider_message_id

Mailtrap webhook receiver added at /api/webhooks/mailtrap:
- Receives delivery, bounce, open, click events from Mailtrap
- Updates email_send_log.status from sent → delivered / bounced
- Updates order_document_sends.email_delivery_status

### WhatsApp — Sprint 12 Wiring Complete

Sprint 12 wired WhatsApp link generation into the send action:
- sendOrderDocumentLinkAction now calls generateWhatsAppLinks() when channel=whatsapp
- whatsapp_link stored in order_document_sends (mobile wa.me link)
- whatsapp_phone stored in E.164 format
- UI uses getWhatsAppLinkForDevice() to pick desktop vs mobile link

---

## SPRINT 13 UPDATES: Admin Templates + Finance + Freight Adapters

### Admin Document Templates (S13-TMPL-001, S13-TMPL-002)

organization_document_terms_profiles now has version history support:
- version_number: starts at 1, increments on each publish
- parent_profile_id: links to previous version for history chain
- review_status: draft → under_review → approved → published → superseded
- reviewed_by, reviewed_at, published_at: audit fields
- bank_details: JSONB with bank name, account number, SWIFT/IBAN, branch, IFSC
- export_declarations: JSONB with LUT ARN, IEC, AD Code, GSTIN, PAN
- clause_overrides: JSONB for country-pair, HS code, Incoterm specific clauses

document_template_history table: immutable snapshot per save that changes review_status or content. One row per version per profile.

Admin document templates editor at /admin/document-templates now supports:
- View and edit page_one_terms (array of operational terms)
- View and edit annexure_terms (array of legal/annexure terms)
- View and edit bank_details (bank name, account, SWIFT, IFSC)
- View and edit export_declarations (IEC, LUT ARN, GSTIN, etc.)
- View and edit tax_profile (GST/VAT mode, tax numbers, rates)
- View and edit identity_fields (legal name, address, registrations)
- Save → creates history row → advances version_number
- Review workflow: admin submits for review → owner approves → publishes

Setu Guru policy: When asked "what bank details are on our documents?", look in organization_document_terms_profiles.bank_details for the active published profile matching the document type and org country. When asked "what IEC/LUT number is on export documents?", look in export_declarations.

### Finance Integration Adapter (S13-FIN-001)

finance_integration_events table created as the adapter event queue:
- event_type: invoice_create | invoice_void | payment_received | reconciliation_complete | credit_note_create
- adapter_name: xero | quickbooks | tally | pending
- status: queued | sent | confirmed | failed | retrying

src/lib/finance/finance-adapter.ts created:
- queueFinanceEvent() — only entry point for external finance posting
- getFinanceAdapterStatus() — check events for an order
- getConnectedFinanceAdapter() — returns adapter name or 'pending'

CRITICAL RULE: Finance posting is NEVER automatic. A human must approve the final invoice before any finance event is queued. Finance sync requires explicit operator action.

Setu Guru policy: When asked "has this order been posted to Xero/QuickBooks?", check finance_integration_events for event_type='invoice_create' with status='confirmed'. If no confirmed row exists, the invoice has NOT been posted externally. Do not say finance sync happened unless confirmed.

### Freight Integration Adapter (S13-FRT-001)

freight_booking_events table created as the adapter event queue:
- event_type: rate_request | booking_request | booking_confirmed | tracking_update | bol_received | awb_received
- adapter_name: flexport | freightos | dhl | manual | pending
- Fields: booking_reference, tracking_reference, carrier_name, forwarder_name

src/lib/freight/freight-adapter.ts created:
- queueFreightEvent() — only entry point for external freight booking
- getFreightAdapterStatus() — check booking events for an order
- getConnectedFreightAdapter() — returns adapter name or 'pending'

CRITICAL RULE: External freight booking is NEVER automatic. SetuFlow prepares and approves the freight request data. The operator must explicitly queue a booking event, and the external carrier must independently confirm.

Setu Guru policy: When asked "has freight been booked?", check freight_booking_events for event_type='booking_confirmed' with status='confirmed' AND the order has a dispatched shipment in shipments table. Do not say freight was booked unless both conditions are true.
