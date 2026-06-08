# Follow-up (Leads) help

Route: `/leads` and `/leads/[leadId]`
Last updated: 2026-06-08 (S24-200 resolved — contact CTAs live)

## Purpose

The Follow-up workspace is the command centre for buyers and suppliers. It shows the full lead queue with status, pipeline stage, follow-up timing, pipeline value, owner, and — as of Sprint 24 — one-tap contact actions directly on every lead row.

---

## Lead list — what's new in Sprint 24 (S24-200)

### Contact CTAs on every lead row

Each lead row now shows inline contact action buttons alongside the company name and contact details:

| Button | Action |
|---|---|
| 📧 Email icon | Opens `mailto:` with pre-filled subject: "SETU Flow follow-up: [Company]" |
| 💬 WhatsApp icon (green) | Opens `https://wa.me/[number]` in a new tab; uses `whatsapp_number` field first, falls back to `phone` |
| 📞 Phone icon | Opens `tel:` link for direct dial |

These buttons are visible directly in the lead list without opening the Lead Command Center. On mobile, they appear as tappable circular icons. On desktop, they appear inline on hover.

The data behind the CTAs comes from: `contact_name`, `email`, `phone`, `whatsapp_number`, `phone_secondary`, `phone_country_code`, `phone_secondary_country_code`.

If a phone or email field is empty, the corresponding button is hidden — it does not show a disabled state that confuses users.

### Lead list structure (unchanged)

- The row itself opens the Lead Command Center
- **Open** button — primary CTA to open the full Command Center
- **More** — secondary dropdown: Continue quote · Edit lead · Remove lead
- **Action column header**: Open / More

Filters: Journey · Pipeline · Commercial scope groupings in the advanced panel. Source Event filter narrows owner, stage, country, market, and product to values present in that event's leads.

---

## Lead Command Center — current structure

The Lead Command Center (`/leads/[leadId]`) is a one-page workspace. It does not use nested routes.

### Header bar

- Back to Lead Queue · Command Center · Quote Preview tabs
- Top-right badge: ONE PAGE WORKSPACE · NO NESTED ROUTE

### Context bar (below header)

Status pills showing live readiness at a glance:
- ✓ Pricing ready — catalog pricing is set
- ✓ Compliance clear — no active gate blockers
- Next follow-up: date and time
- Buyer / Supplier badge

### Lead hero

- Initials avatar + Company name + buyer/owner/source/country line
- Three contact CTAs inline: Email · WhatsApp (green) · Phone
- View quote button (dark) · Schedule follow-up · Quick edit

### Pipeline stage strip

Horizontal stage progress: New Lead → Qualified → Contacted → Samples Sent → Negotiation → Won → Lost

Current stage highlighted in teal/green. Completed stages in green. Upcoming stages greyed out.

### Four workflow action cards

| Card | Shows |
|---|---|
| FOLLOW-UP | Next follow-up date; OVERDUE badge if past; Reschedule now prompt |
| QUALIFICATION | qualification status; product count |
| COVERAGE | Product · Market count; coverage readiness |
| COMMERCIAL | Quote active status; create or review quote |

Each card has an **Inspect →** link.

### Priority action panel (right rail)

- Priority action label + description
- **Open follow-up lane** button (dark) — primary CTA
- Lead queue Hot list showing adjacent leads

### Quote prep checklist

Below the four cards:
- Buyer qualification status
- Pricing ready status
- Quote draft status (with accepted date if accepted)
- Compliance clear status

**Continue quote →** button top-right of checklist.

### Sticky action bar (bottom)

- ✏ Continue quote (dark) · 📅 Schedule follow-up · 🖊 Quick edit
- Right: COMMAND CENTER · WORKFLOW PILLARS · [stage label]

### Compliance gate panel (bottom-right)

- Gate status heading
- Live compliance result: "Compliance is currently clear" or active blockers

---

## Setu Guru answer policy for leads

When a user asks about a lead, Setu Guru uses the active route, visible lead text, and the lead record before generic answers.

Setu Guru should help answer:
1. Is this buyer or supplier qualified enough to quote?
2. What product interest or coverage is missing?
3. What next action should be taken?
4. What quote, compliance, document, or pricing blocker exists?
5. Does a human need to approve a decision?
6. How do I contact this lead? (Route to email, WhatsApp, or phone CTA)

---

## Common blockers

- Lead has no product interest mapped
- Buyer country or market is missing
- Quote currency or incoterm is not set
- Compliance gate is open (shown in Gate status panel)
- Follow-up date is overdue
- Contact fields (phone, email, whatsapp_number) are blank — CTAs will be hidden
- Supplier or buyer type is unclear

---

## Allowed guidance

Setu Guru may suggest: opening the lead, adding product interest, reviewing quote prep checklist, checking compliance gate status, using the contact CTAs, opening the follow-up lane, creating a task, or opening the Quote Launcher for a new or revised quote.

## Human approval rules

Setu Guru must not: change lead status, approve price changes, waive compliance, send quotes, mark leads won/lost, remove lead records, or write back field changes without explicit operator approval.

---

## Suggested prompts

- Can I quote this lead now?
- How do I contact this lead on WhatsApp?
- What is blocking this lead?
- Which products or country details are missing?
- What evidence do I need before quote send?
- Which leads came from this trade event?
- When should I mark a lead won or lost?
- How do I schedule a follow-up?
