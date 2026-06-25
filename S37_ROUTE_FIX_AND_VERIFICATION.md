# S37 — Route Fix + In-Review Verification

## TL;DR
The new screens were already built as routes and the whole repo type-checks (0 errors), **but clicking a
lead never navigated to them.** The `/leads` queue was deliberately intercepting the lead's
`/leads/[leadId]` href and forcing the *retired inline workspace* (`setActiveView('cc')`) instead of
navigating. That is why you kept seeing the old screens. This pass rewires every entry point to the
dedicated routes. All seven Sprint-37 In-Review issues were also re-verified line-by-line against the
live DB and the `__4_` code — they are solid.

---

## 1. Root cause — why the old screens kept opening

`src/features/leads/components/workspace/leads-workspace-implementation.tsx` kept a local
`activeView` state (`'list' | 'cc' | 'quote'`) and rendered an **inline** command-center / quote
wizard (`InlineLeadWorkspace`) for any non-list value. Every "open lead" path set `activeView` instead
of navigating:

- **Lead row click** (and Enter/Space key) — the row was given the correct `/leads/[leadId]` href, but
  the `openLeadCommandCenter` callback parsed the href and called `setActiveView('cc')`, deliberately
  staying inline. *(This was the main culprit you saw in the screenshots.)*
- **Legacy deep-link effect** — `?leadId=X&view=cc|quote` set `activeView` inline.
- **In-list tab bar** — "Command Center" / "Quote Preview" / "Approval Queue" tabs set `activeView`.
- **Lead drawer** `onOpenInlineQuote`, the **quick-lead-needs-coverage** branch, and the two open
  helpers (`openLeadInlineCommandCenter` / `openLeadInlineQuoteBuilder`).

So `/leads/[leadId]` and `/leads/[leadId]/quote` (real, 218- and 510-line pages that the build deploys)
were simply **never reached**.

## 2. The fix (this pass)

All seven entry points in `leads-workspace-implementation.tsx` now navigate via
`navigateToLeadCommandCenter(router, href)` (which does `router.push` with a hard-navigation fallback):

| Entry point | Now navigates to |
|---|---|
| Lead row click / keyboard | `/leads/[leadId]` |
| Legacy `?view=cc` deep-link | `/leads/[leadId]` |
| Legacy `?view=quote` deep-link | `/leads/[leadId]/quote` |
| In-list "Command Center" tab | `/leads/[leadId]` |
| "Quote Preview" / "Approval Queue" tabs | `/leads/[leadId]/quote` |
| Lead drawer "open quote" | `/leads/[leadId]/quote` |
| "Create / Open quote" CTA | creates/opens the draft, then `/leads/[leadId]/quote?quoteId=…` |

Result: `activeView` can now only ever be `'list'`, so the inline workspace render path is unreachable —
the old inline screens are retired from navigation without deleting ~2,000 lines (low-risk). Two
self-referencing links inside the new quote page were also pointed at the new routes to avoid a bounce.
Other `/leads?leadId=…&view=…` links elsewhere in the app (compliance, rfq, buyer-detail, orders) now
**self-heal**: they land on `/leads`, and the deep-link effect immediately forwards them to the new route.

**Files changed:** `src/features/leads/components/workspace/leads-workspace-implementation.tsx`,
`src/app/(app)/leads/[leadId]/quote/page.tsx`.
**Validation:** `npx tsc --noEmit` → **0 errors** on the full repo.

## 3. In-Review issues — line-by-line verification

Verified against the **live DB** (`sjzfzloggabsmcuxktnl`) and the `__4_` source:

| Issue | DB check | Code check | Status |
|---|---|---|---|
| TASK-001 approval_requests table | table + status CHECK + one-pending-per-version index present | — | ✅ solid |
| TASK-002 version integrity | `quotes.quote_creation_request_key` present; lock guard present | — | ✅ solid |
| TASK-005 canonical draft RPC | `app_create_lead_quote_draft_tx` present | `openOrCreateLeadQuoteDraft` calls it | ✅ solid |
| BUG-004 dedup line seeding | only the lock-guard trigger remains on quote_version_line_items (no seed trigger) | — | ✅ solid |
| BUG-006 unify on RPC | — | `createQuoteDirect` is comment-only (retired); RPC wired | ✅ solid |
| BUG-007 server-side gate | — | `src/lib/quote-gate.ts` present; gate + sanitized errors wired | ✅ solid |
| ENH-008 approval flow | `app_submit/decide_quote_approval_tx` + `app_quote_version_approval_state` present | submit/approve/reject + send-guard wired | ✅ solid |

Sync trigger (`trg_quote_versions_sync_quote_parent`), parent-status guard, lock guard, and
`app_send_quote_version_with_fanout_tx` all confirmed live. **The backend spine is intact.**

## 4. What is still missing (honest gap vs. the mockups)

The navigation fix makes the new **routes** load. But the parallel agent's UX-009/010 pass only added
**data enrichment** to the *existing* command-center and quote-workspace components and created the route
shells — it did **not** build the premium redesign shown in your mockups. Specifically:

1. **Lead Detail (`/leads/[leadId]`)** renders the existing `LeadCommandCenterPage` (712 lines). It does
   **not** contain the planned premium layout from `Leads_Detail_Page.jpeg` (the "Lead Status" rail,
   "Quotes on this Lead" v1/v2 cards, "About Buyer", "Open Current Quote" hero). → **UX-009 UI build remains.**
2. **Quote Builder (`/leads/[leadId]/quote`)** renders the existing `QuoteWorkspace`, not the clean
   `Quote_Builder.jpeg` layout (4-step rail, Setu Guru guidance column, "What happens on save" panel,
   version-history with `approval_pending`/`superseded` chips). → **UX-010 UI build remains.**
3. **Share Price List (`Share_PriceList_from_Lead.jpeg`)** — **no route or component exists anywhere** in
   the repo. → **UX-011 not started.**

So: "load as planned" has two layers — *(a) reach the new routes* (fixed now) and *(b) render the premium
designs* (still to build). This pass delivers (a) and verifies the backend; (b) is the remaining
UX-009/010/011 front-end build.

## 5. Recommended next chunk
Build the three premium pages to match the mockups, on top of the now-correct routing + the verified
backend: UX-009 Lead Detail layout, UX-010 Quote Builder layout (wire the existing approval actions +
`buildQuoteSendDecisionSnapshot` blockers + version history), and UX-011 Share Price List (new route
reusing the Sprint-34 share room). Also delete the orphaned `src/lib/leads/lead-quote-gate.ts` (parallel
agent duplicate; unused) in favour of the canonical `src/lib/quote-gate.ts`.
