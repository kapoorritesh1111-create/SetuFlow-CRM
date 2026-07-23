# Packaging Workspace — Gap Register (Discovery Phase 1 + Retest 1)

Live-tested against `https://packaging.setuflowcrm.com`, org `3f8ef935-16bf-49de-bc04-85b51a3e0cb8` (Stark Packmate), July 22, 2026 (Discovery Phase 1) and July 23, 2026 (Retest 1 — end-to-end order journey). See `README.md` for scope and `packaging_workspace_user_journey_discovery_v1.html` for the full narrative writeup. This file is the flat, filterable source list; the HTML gap register is generated from the same data.

## Retest 1 summary (July 23, 2026)

A full end-to-end scenario (capture → qualify → quote → configure a Stand Up
Pouches line → design request → proof upload → approval → attempt Order
Handoff) was run against `GUIDE TEST Packing Test Company`. Result:

**Confirmed fixed, holds up under retest:**
- PKG-JOURNEY-001 (Lead Queue "Open" button) — worked directly this time, no Pipeline fallback needed.
- PKG-JOURNEY-002 (no success confirmation) — a real toast now appears on save.
- PKG-JOURNEY-003 (category checkboxes don't persist) — confirmed checked after a hard refresh.
- PKG-JOURNEY-004 (qualification notes reverting) — confirmed intact verbatim after refresh.
- PKG-JOURNEY-005/006/007 (blocking error hidden, new-lead-to-quote path) — the blocking reason is now visibly rendered on-page; a brand-new lead reached the Quote Builder cleanly.

**Not yet confirmed / newly found:** the retest could not complete the scenario — a new, more severe bug (PKG-JOURNEY-009 below) permanently locks a quote after one approval cycle, blocking Send/Accept/Order entirely for that quote. Seven additional smaller gaps were found along the way (PKG-JOURNEY-010 through -016). PKG-JOURNEY-008 (Pipeline modal URL) was not re-tested this round.

---

### PKG-JOURNEY-001

| Field | Value |
|---|---|
| Workflow | Leads / Follow-up (Lead Queue) |
| Page or state | `/leads` — default Follow-up view, "Lead Queue" tab |
| User goal | Open a lead to view or act on it |
| Steps to reproduce | 1. Go to Leads (default Follow-up view loads). 2. Click "Open →" on any lead row, in any lifecycle group. |
| Expected result | Navigates to that lead's Lead Detail page. |
| Actual result | Nothing happens. URL stays on `/leads`, no navigation, no drawer, no error. Also confirmed on the lead's company-name link (same row) — also dead. Verified via console (no JS errors thrown) and network monitoring (no request fired at all on click). |
| Severity | P1 |
| Type | Functional, Navigation |
| Evidence | Live-verified via DOM/network inspection during this session (see HTML §3, Step 6). Reference screenshot: `evidence/00-reference-06-lead-queue-followup.png` (visual layout only — does not prove the click works). |
| Reproducible | Always — tested on 2 independent leads (a newly created test lead and an existing real lead, "Suhana Spices & Snacks Pvt Ltd"). |
| Workaround | Sidebar → Pipeline (opens a kanban modal) → click the lead's card there. This does navigate to Lead Detail correctly. |
| Suspected area | UI / routing — the Follow-up worklist's row-level "Open" action and company-name link appear unwired to the router. *Suspected cause — not yet confirmed.* |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-002

| Field | Value |
|---|---|
| Workflow | Quick Add Lead |
| Page or state | `/leads?quickLead=1` drawer, after clicking "Save lead" |
| User goal | Get clear confirmation that the new lead was saved |
| Steps to reproduce | Open Quick Lead → fill required fields → click "Save lead". |
| Expected result | A visible success confirmation (toast/banner) before or as the drawer closes. |
| Actual result | Drawer closes and the Follow-up view reloads with the new lead present, but no success message was observed in the 2-second window checked. The lead *did* save correctly (verified present in the queue with correct owner/source), so this is a confirmation-messaging gap, not a save failure. |
| Severity | P3 |
| Type | UX, Content |
| Evidence | Observed live; no screenshot captures a toast because none appeared. |
| Reproducible | Once observed — worth a second look with slower/frame-by-frame capture before treating as fully confirmed absence. |
| Workaround | Check the Lead Queue count/list to confirm the save happened. |
| Suspected area | UI — toast may be firing and auto-dismissing faster than the check window, or may not be implemented for this action. *Suspected cause — not yet confirmed.* |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-003

| Field | Value |
|---|---|
| Workflow | Lead Detail — Qualification & Mapping |
| Page or state | `/leads/{id}` — "Pick Categories" checklist |
| User goal | Mark which packaging categories this buyer is interested in |
| Steps to reproduce | Open a lead → scroll to Qualification & Mapping → click any checkbox under "Pick Categories" (e.g., "Digital Label Production Category"). |
| Expected result | Checkbox becomes checked; "0 products" count updates; state holds. |
| Actual result | Checkbox never becomes checked. Verified 3 independent ways: (1) ref-based click, (2) precise pixel-coordinate click directly on the confirmed-visible element's bounding box, (3) direct `.checked` DOM read immediately after each attempt — always `false`. |
| Severity | P1 |
| Type | Functional |
| Evidence | Live DOM inspection during this session (HTML §3, Step 6b). |
| Reproducible | Always, across multiple categories tested. |
| Workaround | None found. |
| Suspected area | UI / state management — click handler may be misattached, or the visible checkbox may not be the one the change handler is bound to (possible responsive-duplicate-DOM mismatch, the same pattern that initially confused this testing session — worth checking first). *Suspected cause — not yet confirmed.* |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-004

| Field | Value |
|---|---|
| Workflow | Lead Detail — Qualification & Mapping |
| Page or state | `/leads/{id}` — "Qualification Notes" textarea |
| User goal | Add/edit a qualification note and have it persist |
| Steps to reproduce | Edit the Qualification Notes textarea → click "Save qualification & mapping" → refresh the page. |
| Expected result | Edited note text persists after refresh. |
| Actual result | After refresh, the textarea reverted to the original auto-populated value (the trade note copied over from Quick Add Lead at creation), not the edited text that was saved. |
| Severity | P2 |
| Type | Data |
| Evidence | Live DOM value inspection before/after refresh during this session. |
| Reproducible | Always (one clean repro cycle run; recommend a second run to fully confirm before fixing). |
| Workaround | None found. |
| Suspected area | API / state management — Save action may not be persisting this specific field, or may be persisting against a stale snapshot. *Suspected cause — not yet confirmed.* |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-005

| Field | Value |
|---|---|
| Workflow | Lead Detail → Quote Creation |
| Page or state | `/leads/{id}/quote` |
| User goal | Start a quote from a lead that has no product interest mapped yet |
| Steps to reproduce | On a lead with 0 products selected, click "+ New Quote" (Commercial section) or "+ Create New Quote" ("Quotes on this Lead" section). |
| Expected result | Either the quote builder opens, or a clear on-page message explains what's missing and how to fix it. |
| Actual result | Page navigates to `/leads/{id}/quote?quoteDraftError=Lead%20needs%20at%20least%20one%20active%20product%20interest%20before%20creating%20a%20quote` — but that message is **only present in the URL query string**. Nothing on the rendered page displays it. The user sees a normal-looking 5-step builder shell with a "Create Quote Draft" button and no indication anything is wrong. |
| Severity | P1 |
| Type | Functional, UX |
| Evidence | Live URL/DOM inspection during this session (HTML §3, Step 8). |
| Reproducible | Always, for any lead with 0 mapped product categories. |
| Workaround | None found from the UI alone — the cause is only discoverable by reading the raw URL. |
| Suspected area | UI — the error param is generated server/route-side but never read and rendered by the client component. Directly downstream of PKG-JOURNEY-003 (if categories saved correctly, this may resolve itself). *Suspected cause — not yet confirmed.* |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-006

| Field | Value |
|---|---|
| Workflow | Lead Detail → Quote Creation |
| Page or state | `/leads/{id}/quote?quoteDraftError=...` |
| User goal | Retry creating the quote draft |
| Steps to reproduce | From the state in PKG-JOURNEY-005, click "Create Quote Draft". |
| Expected result | Either it proceeds (if the blocker no longer applies) or shows a clear error explaining why it can't. |
| Actual result | Nothing happens. Same URL, no new message, no shake/inline error, no navigation. Dead end. |
| Severity | P2 |
| Type | Functional, UX |
| Evidence | Live DOM/URL inspection during this session. |
| Reproducible | Always, in the blocked state. |
| Workaround | None. |
| Suspected area | UI — button likely re-runs the same validation that already failed, without surfacing the result. *Suspected cause — not yet confirmed.* |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-007 (severity rollup)

| Field | Value |
|---|---|
| Workflow | Lead → Quote (core journey) |
| Page or state | End-to-end, `/leads/{id}` → `/leads/{id}/quote` |
| User goal | Take a brand-new lead all the way to a quote |
| Steps to reproduce | Create any new lead via Quick Add Lead → attempt to qualify it with a category → attempt to start a quote. |
| Expected result | A new lead can be walked through to a quote using only on-screen actions. |
| Actual result | **It cannot, currently.** PKG-JOURNEY-003 (categories won't save) directly causes PKG-JOURNEY-005 (quote creation blocked with a silent error) with no workaround visible in the UI. This blocks the entire rest of the pipeline (Quote Builder, Review, Approval, PDF, Order Handoff) for any brand-new lead. |
| Severity | **P0** (this is the root-cause rollup of 003 + 005; fixing 003 likely resolves this) |
| Type | Functional |
| Evidence | Composite of PKG-JOURNEY-003 and -005 evidence. |
| Reproducible | Always, for a new lead. |
| Workaround | None via UI. Existing leads that already have product interest mapped (from before this regression, if it is one) can still get quotes — confirmed via the Quotes/Quote Lifecycle page showing real, populated quotes for other customers. |
| Suspected area | Same as PKG-JOURNEY-003. |
| Fix status | Resolved — confirmed via Retest 1 (2026-07-23), see summary at top of this file |

---

### PKG-JOURNEY-008

| Field | Value |
|---|---|
| Workflow | Global navigation — Pipeline |
| Page or state | Any page, clicking sidebar "Pipeline" |
| User goal | View the lead pipeline as a kanban board |
| Steps to reproduce | Click "Pipeline" in the left sidebar from any page. |
| Expected result | Either navigates to a dedicated Pipeline page/URL, or clearly opens as an in-context view. |
| Actual result | Opens a kanban board correctly, but as a modal overlay on top of the current page — the URL does not change (stays on whatever page you were on, e.g. `/leads`). No deep link, browser back/refresh does not return to this exact view. |
| Severity | P3 |
| Type | Navigation |
| Evidence | Live URL inspection during this session (URL unchanged after opening, `[role="dialog"]` present in DOM). |
| Reproducible | Always. |
| Workaround | None needed — it does work, just isn't a "real" navigable page. |
| Suspected area | Routing/UX design choice — may be intentional. *Suspected cause — not yet confirmed.* |
| Fix status | Not started — discovery only |

---

## Not yet gap-tested (see "Missing Journey States" in the HTML report)

Quote Builder steps 2–5, Order Handoff creation, Customer PDF visual/print output and new-tab behavior (endpoint confirmed returning `200 application/pdf` via direct fetch, but UI click-through was interrupted by a tooling issue before visual confirmation), Send, Orders, Tasks, Events, Docs, Design, Dispatch, and Admin sidebar workspaces, Analytics, Reports, Growth Center, Share vCard, notifications, Setu Guru chat entry points, Smart Scan/camera capture, duplicate-lead detection, and all responsive/mobile layouts.

---

## Retest 1 — new gaps (July 23, 2026)

### PKG-JOURNEY-009

| Field | Value |
|---|---|
| Workflow | Quote Lifecycle / Approval |
| Page or state | Quote Builder — Send Gate, Approval Queue, Quotes Worklist |
| User goal | Get an approved quote from "Submit for Approval" through to Accepted |
| Steps to reproduce | 1. Build a quote, reach Send Gate (shows "Approval required"). 2. Click "Submit for Approval". 3. Go to Approval Queue, add a note, click "Approve Quote". 4. Return to Send Gate. |
| Expected result | Send Gate reflects the approval and allows sending, or the quote can otherwise be moved to Accepted. |
| Actual result | Send Gate still shows "Approval required before sending" as if nothing happened, even after reload. Re-submitting for approval reveals: "This quote version is locked and cannot be submitted for approval. Create a new version first." "Edit / revise quote" does not create a new version — editing the product step instead fails with "Locked quote version cannot be commercially edited; create a revised quote version instead." "Mark accepted" on the Quotes Worklist fails twice with "Could not record that outcome. Please try again, or contact support if this keeps happening." No path found to Accepted. |
| Severity | **P0** |
| Type | Functional, core workflow |
| Evidence | Live-tested during Retest 1, GUIDE TEST Packing Test Company quote. Exact error strings captured above. |
| Reproducible | Always, once a quote has gone through one Submit-for-Approval cycle. |
| Workaround | None found via UI. Untested alternative: create a brand-new quote on the same lead rather than reviving the locked one. |
| Suspected area | Quote-version locking tied to the approval gate — the version locks on submission but never unlocks/advances after approval; all downstream actions reference the same stuck version instead of spawning v2. |
| Fix status | Not started |

### PKG-JOURNEY-010

| Field | Value |
|---|---|
| Workflow | Quote Builder / Product Step |
| Page or state | Quote Builder, Product step |
| User goal | Remove an unwanted auto-added generic product line from a quote |
| Steps to reproduce | Delete the product line that was auto-added from the lead's qualification-category selection, then revisit or save the Product step again. |
| Expected result | The line stays deleted. |
| Actual result | The line reappears every time. Its currency (USD) differs from the real packaging line (INR); Quote Summary/Review/Pricing totals sum both and label the result "USD" with no conversion — total swung between two values purely based on whether this $0–8.25 ghost line was present. |
| Severity | P1 |
| Type | Data integrity, currency handling |
| Evidence | Retest 1 — Review step showed "Product · Qty 1 · USD 0.00"; Quote Summary total moved between "USD 37,458.25" and "USD 37,450.00". |
| Reproducible | Always. |
| Workaround | None. |
| Suspected area | Auto-sync between Lead Qualification & Mapping and the quote's product list; currency total calculation doesn't check for mixed currencies. |
| Fix status | Not started |

### PKG-JOURNEY-011

| Field | Value |
|---|---|
| Workflow | Quote Builder / Pricing Step |
| Page or state | Quote Builder, Pricing step (step 3) |
| User goal | Review an accurate summary of what's being priced |
| Steps to reproduce | Build a quote with a custom packaging line (e.g. Stand Up Pouches), reach the Pricing step. |
| Expected result | The line item name matches the item the dollar figure is actually for. |
| Actual result | Displayed "Flexible Pouch / Roll Stock · SP-FLEX-PACK" (the generic auto-added product) while the dollar total exactly matched the real Stand Up Pouches custom line. |
| Severity | P2 |
| Type | UI/display |
| Evidence | Retest 1. |
| Reproducible | Always. |
| Workaround | None needed to proceed; misleading for review. |
| Suspected area | Pricing step renders from the generic product table rather than the custom packaging lines table. Possibly related to PKG-JOURNEY-010. |
| Fix status | Not started |

### PKG-JOURNEY-012

| Field | Value |
|---|---|
| Workflow | Quote Builder / Packaging Line Configurator |
| Page or state | Packaging line configurator, after switching Pricing Template |
| User goal | Trust the "ready to save" warnings list |
| Steps to reproduce | Switch a packaging line's pricing template, with Artwork Status already set to "Not provided yet". |
| Expected result | Warnings list reflects the actual current field values. |
| Actual result | "Ready to save with N warnings" still lists "Artwork status is missing" despite the dropdown clearly showing a value (confirmed via DOM, not just visually). |
| Severity | P3 |
| Type | UI validation |
| Evidence | Retest 1. |
| Reproducible | Always, right after a template switch. |
| Workaround | Ignore the warning; doesn't block saving. |
| Suspected area | Warning list computed once, not recalculated after template-switch re-render. |
| Fix status | Not started |

### PKG-JOURNEY-013

| Field | Value |
|---|---|
| Workflow | Design Queue |
| Page or state | Design Queue list |
| User goal | See accurate artwork status per job |
| Steps to reproduce | Upload and approve an artwork proof via the external approval link, then check the Design Queue. |
| Expected result | Job no longer shows as needing artwork. |
| Actual result | Still listed as "Not provided yet" even though the packaging line's own proof panel correctly shows "approved". |
| Severity | P3 |
| Type | UI/data freshness |
| Evidence | Retest 1. |
| Reproducible | Always. |
| Workaround | Check the packaging line's proof panel directly. |
| Suspected area | Design Queue badge reads a static `artwork_status` field rather than the proof's live approval state. |
| Fix status | Not started |

### PKG-JOURNEY-014

| Field | Value |
|---|---|
| Workflow | Catalog / Pricing Templates |
| Page or state | Stand Up Pouches family, default pricing template |
| User goal | Quote a realistic small first order |
| Steps to reproduce | Select Stand Up Pouches, enter quantity 5,000 on the default "SUP — Flexographic High-Volume" template (MOQ 50,000). |
| Expected result | Either quotes correctly, or clearly explains the MOQ and points to an alternative. |
| Actual result | First validation attempt showed "Quantity is required" despite the field holding "5000" — misleading. Re-triggering validation correctly showed "Quantity 5,000 is below the template MOQ of 50,000." A lower-MOQ alternative template exists ("SUP — PET/MET PET/PE Standard Pouch", MOQ 1,000) but nothing surfaces it as an option. |
| Severity | P2 |
| Type | Validation UX + possible business-rule/config question |
| Evidence | Retest 1. |
| Reproducible | Always with the high-MOQ template and a sub-MOQ quantity. |
| Workaround | Switch to the lower-MOQ template manually. |
| Suspected area | (1) Validation-message generation shows a generic message before the specific one; (2) catalog/UX doesn't surface template alternatives when one doesn't fit. Also a genuine question for Ritesh on whether 50,000 is the intended default MOQ. |
| Fix status | Not started |

### PKG-JOURNEY-015

| Field | Value |
|---|---|
| Workflow | Design Queue / Artwork Proofs |
| Page or state | Proof panel, "Copy approval link" |
| User goal | Know that the link was actually copied |
| Steps to reproduce | Click "Copy approval link" on an uploaded proof. |
| Expected result | Visible confirmation (toast, button state change). |
| Actual result | Link is copied correctly (verified programmatically) but nothing on screen confirms it. |
| Severity | P3 |
| Type | UX polish |
| Evidence | Retest 1. |
| Reproducible | Always. |
| Workaround | None needed — works, just silent. |
| Suspected area | Missing toast/feedback on the copy action. |
| Fix status | Not started |

### PKG-JOURNEY-016

| Field | Value |
|---|---|
| Workflow | Global / front-end structure |
| Page or state | Lead Detail and Quote pages, pervasive |
| User goal | Reliable, accessible interactive elements |
| Steps to reproduce | Inspect the DOM for nearly any interactive element on these pages (checkboxes, "Save qualification & mapping," "Create New Quote," "Artwork proofs," "Save & Continue," etc). |
| Expected result | One instance of each element. |
| Actual result | Most exist twice — one hidden, one visible. Caused automated clicks to silently hit the wrong instance during testing; required filtering by `offsetParent !== null` to interact reliably. |
| Severity | P3 (engineering hygiene / accessibility risk, not a visible bug for mouse users) |
| Type | Front-end structural |
| Evidence | Retest 1, pervasive across both pages tested. |
| Reproducible | Always. |
| Workaround | N/A for real users; testing tools should target visible instances only. |
| Suspected area | Likely a responsive/mobile variant of each component mounted alongside the desktop one instead of one being conditionally rendered. Plausibly the underlying cause of PKG-JOURNEY-001's earlier intermittent behavior (which worked cleanly in this retest — consistent with a duplicate-DOM race rather than a hard functional bug). |
| Fix status | Not started |
