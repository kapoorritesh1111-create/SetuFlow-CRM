# SETU Flow CRM — Sprint 37 Handoff

**Sprint:** 37 — Quote lifecycle / versioned quotes + first-class approval
**Project:** Supabase `sjzfzloggabsmcuxktnl` · Repo `kapoorritesh1111-create/SetuFlow-CRM` (branch `main`)
**As of this handoff:** 7 In Review, 4 Open.

---

## 1. Status snapshot

| Issue | Title | Status | DB migration |
|---|---|---|---|
| S37-TASK-001 | Create `approval_requests` table (first-class quote approval) | **In Review** | `s37_task_001_approval_requests` |
| S37-TASK-002 | Quote version integrity: unique version_no, idempotency, supersede-on-send | **In Review** | `s37_task_002_quote_version_integrity` |
| S37-TASK-005 | Canonical quote-draft RPC (gate + create + seed-once + fanout + audit) | **In Review** | `s37_task_005_create_lead_quote_draft_rpc` (+ idempotency-return fix) |
| S37-BUG-004 | Remove duplicate quote line seeding (app + DB trigger) | **In Review** | `s37_bug_004_drop_duplicate_line_seed` |
| S37-BUG-006 | Unify Drawer + Wizard onto canonical RPC; retire `createQuoteDirect` | **In Review** | none (app wiring) |
| **S37-BUG-007** | Enforce quote gate server-side (disqualified / no coverage / required) | **In Review** *(this chunk)* | none (app consolidation) |
| **S37-ENH-008** | First-class approval flow (submit → `approval_requests` → send guard) | **In Review** *(this chunk)* | `20260625150000_s37_enh_008_quote_approval_flow.sql` |
| S37-UX-009 | Lead Detail — status timeline + quote v1/v2 + Open Current Quote | Open | — |
| S37-UX-010 | Quote Builder — edit sent quote creates v2 + approval gate + send guard | Open | — |
| S37-UX-011 | Share Price List — curated buyer catalog (reuse Sprint 34 share room) | Open | — |
| S37-TEST-012 | E2E + regression: quote lifecycle integrity | Open | — |

> **Tracker note:** there is **no `S37-TASK-003` row** in `sprint_issues`, although earlier handoffs
> referenced one. The TASK numbering jumps 002 → 005. Nothing is missing functionally; flagging so the
> gap isn't mistaken for lost work.

---

## 2. The backend spine is now complete

The data-layer work for versioned quotes + approval is done and validated. **The remaining Open
issues are all UI/UX and tests** that sit on top of this spine. The next agent should treat the DB
as the authority and build presentation on top — do **not** re-implement status logic in the app.

Flow, end to end:

```
Lead (qualified, ≥1 active product, has company name)
  └─ app_create_lead_quote_draft_tx ........ creates quote + v1 draft + lines + audit (idempotent)   [TASK-005, BUG-006]
       └─ app_submit_quote_approval_tx ...... approval_requests(pending); version draft→approval_pending [ENH-008]
            ├─ app_decide_quote_approval_tx('approved') . request→approved (version stays mutable)        [ENH-008]
            └─ app_decide_quote_approval_tx('rejected') . request→rejected; version→draft                 [ENH-008]
                 └─ send: updateQuoteWorkflow(status='sent')
                      guard consults app_quote_version_approval_state → blocks if pending/rejected         [ENH-008]
                      → app_send_quote_version_with_fanout_tx  (version→sent, immutable)                    [TASK-002]
```

---

## 3. DB invariants the UX work MUST respect (read this before UX-009/010)

These are non-obvious and already cost design iterations. **Build the UI to these rules; don't fight them.**

1. **Parent `quotes.status` and all version pointers are DB-derived.** `trg_quote_versions_sync_quote_parent`
   (AFTER INSERT/UPDATE on `quote_versions`) derives `quotes.status`, `current_version_id`,
   `sent_version_id`, `accepted_version_id`, `version_no`. **Never** write `quotes.status` from the app —
   the `trg_quotes_guard_parent_status_write` guard silently reverts it anyway (it's a no-op).
2. **`approved` is an IMMUTABLE version status.** `app_quote_version_is_immutable` = true for
   `sent / approved / accepted / rejected / expired`. The lock guard only permits `sent →
   {accepted,rejected,superseded}` and `approved → superseded`. **`approved → sent` is blocked.**
   ⇒ The approval flow deliberately keeps the working version in the mutable `approval_pending`/`draft`
   state and records the decision in `approval_requests`. **UX must not try to set a version to `approved`.**
3. **`approval_requests` is the source of truth for the approval decision.** Read it (or
   `app_quote_version_approval_state(version_id)`) for badges/blockers. The `quotes.approved_at /
   approved_by / approval_required` columns are **display-only** denormalized mirrors — fine to show,
   never authoritative.
4. **One pending approval per version** is enforced by the `approval_requests_one_pending_per_version`
   partial unique index. Submit is idempotent (`created=false` when a pending one exists).
5. **Editing a sent quote must create v2** (UX-010). The supersede-on-send trigger (TASK-002) keeps old
   versions immutable; a new draft version becomes current. UX-010 should create a new version, not mutate
   the sent one.

---

## 4. What shipped in this chunk (BUG-007 + ENH-008)

Files touched:
- **`src/lib/quote-gate.ts`** *(new)* — typed gate codes/messages + RPC error mappers (BUG-007) and
  `QuoteApprovalState` + `quoteApprovalBlocker` (ENH-008). Shared by both leads and quotes features.
- **`src/features/leads/server/actions/legacy-actions.ts`** — typed gate in `getLeadQuoteGate`,
  sanitized lead-load errors, `resolveLeadQuoteForApproval` helper, and the three approval actions
  rewired to the new RPCs (removed the `test_mode` note on the approval-request path).
- **`src/features/quotes/server/actions.ts`** — typed gate copy in `ensureLeadCommercialReadiness`;
  send guard now consults `app_quote_version_approval_state` (additive blocker).
- **`supabase/migrations/20260625150000_s37_enh_008_quote_approval_flow.sql`** *(applied live)* —
  `app_submit_quote_approval_tx`, `app_decide_quote_approval_tx`, `app_quote_version_approval_state`.

See `FIX_REPORT_S37_BUG_007.md` and `FIX_REPORT_S37_ENH_008.md` for the detailed write-ups and the
rollback-safe live validation transcripts.

---

## 5. Remaining Open work + ready-to-build guidance

### S37-UX-009 — Lead Detail: status timeline + quote v1/v2 + "Open Current Quote"
- Render the quote version history from `quote_versions` (ordered by `version_no`), highlight
  `current_version_id`, and show each version's status badge.
- Approval badges: call `app_quote_version_approval_state(version_id)` (or read `approval_requests`)
  → `pending` (amber) / `approved` (teal) / `rejected` (red) / `none`.
- "Open Current Quote" routes to the builder via `?view=quote&quoteId=` (same contract BUG-006 preserved).
- Pure presentation — no new server actions needed.

### S37-UX-010 — Quote Builder: edit-sent-creates-v2 + approval gate + send guard
- Wire the builder's "Submit for approval" / "Approve" / "Reject" buttons to the existing actions
  (`recordLeadQuoteApprovalRequest`, `approveLeadQuoteAdjustment`, `rejectLeadQuoteAdjustment`) — they
  are now `approval_requests`-backed.
- Surface send blockers from the snapshot: `buildQuoteSendDecisionSnapshot` returns
  `blockers[{code,detail}]` and `safe_to_send`. Show `APPROVAL_PENDING` / `APPROVAL_REJECTED` /
  `QUOTE_LINES_EMPTY` / `QUOTE_VERSION_MISSING` inline.
- Editing a **sent** quote should create v2 (new draft version) rather than mutating the locked one.
- **Also clean up the 3 harmless app-side `quotes.update({status})` writes** (see §6) while in here.

### S37-UX-011 — Share Price List: curated buyer catalog
- Reuse the Sprint 34 catalog share room. No quote-lifecycle dependency; can be done independently.

### S37-TEST-012 — E2E + regression: quote lifecycle integrity
- Do this **last** (depends on the UX). Cover: gate (disqualified / no coverage), draft idempotency,
  submit→approve→send, submit→reject→revise→resubmit, edit-sent→v2, and the send guard blocking on
  pending/rejected. The rollback-safe SQL probes in the two fix reports are good seeds for DB-level assertions.

---

## 6. Known pre-existing items (NOT regressions from this work)

1. **Three harmless app-side `quotes.update({status})` writes** remain at
   `src/app/(app)/approval-send/page.tsx` (~L91), `src/features/quotes/server/actions.ts` (~L1010),
   and `src/features/quotes/pricing/repositories/quote-pricing.repository.ts` (~L901). They are
   **no-ops** under `trg_quotes_guard_parent_status_write`. Cleanup candidate for UX-010 — left in place
   here to keep this chunk low-risk.
2. **Three pre-existing `pricingBasis` contract advisories** from `scripts/check-contract-boundaries.mjs`
   in untouched files: `leads-workspace-implementation.tsx`, `OrdersProductionWorkspace81DRepair3.tsx`,
   `order-document-pdf.ts`. This chunk introduces **no new** advisories.
3. The remaining `test_mode: true` is in `recordLeadCommunicationSent` (communications, unrelated to
   quotes) — out of scope here.

---

## 7. Standing conventions (unchanged)

- `tsc --noEmit` zero-error gate before every delivery. ✅ (0 errors this chunk.)
- Apply DB changes **live**; ship the migration file in `supabase/migrations/` too. ✅
- **Never** mark a tracker row `Resolved` without explicit approval — use `In Review`. ✅
- Parallel ChatGPT agent shares `main`; **Ritesh** pull-rebases and pushes / triggers Vercel. This
  agent does **not** push or deploy.
- Delivery = updated repo zip + next-prompt. Future review cycles based on the development pages.

---

## 8. Suggested next chunk (ready-to-paste prompt)

> Sprint 37 next chunk. The quote backend spine (TASK-001/002/005, BUG-004/006/007, ENH-008) is In
> Review. Implement **S37-UX-009 (Lead Detail: version timeline + approval badges + Open Current
> Quote)** and **S37-UX-010 (Quote Builder: submit/approve/reject wired to the approval_requests-backed
> actions, send-guard blockers surfaced, edit-sent-creates-v2)**. Respect the DB invariants in
> HANDOFF_S37 §3 — read `approval_requests` / `app_quote_version_approval_state` for state, never write
> `quotes.status`, and never set a version to the immutable `approved` status. While in UX-010, also
> retire the 3 harmless app-side `quotes.update({status})` writes (§6). `tsc --noEmit` must be 0 before
> delivery; return the repo zip + a TEST-012 prompt.
