# 🚀 NEXT PROMPT — PR-UX-03

You are continuing Setu Flow CRM from the latest full repo and internal DCC baseline.

Use the repo as the only source of truth.
Use `public/internal-dcc/index.html` as the single source of truth for:
- release truth
- UX 99 roadmap
- active PR scope
- execution order
- pass rules
- archived reset history

---

## Critical rule

We are no longer in reset recovery.
Do not reopen solved workflow logic unless repo workflow truth actually changes.
Do not change the workflow diagram image unless repo workflow truth changes.
Treat this as a **repo-wide UX architecture pass**, not a single-screen tweak.

PR-UX-01 and PR-UX-02 are already complete.
Do not reopen completed language cleanup or action hierarchy cleanup unless a visible user-facing conflict still remains in repo truth.

---

## Immediate objective

**Execute PR-UX-03: Screen density and collapse system**

---

## Goals

1. Reduce above-the-fold reading load on major workspaces without hiding the real next step.
2. Collapse secondary detail blocks, helper cards, and deep evidence until the user asks for them.
3. Make long workspaces feel scannable in under 5 seconds on Dashboard, Orders, Follow-up, Quote, Pipeline, and Approvals & Sending.
4. Preserve compact AI advisory behavior and keep it secondary to workflow actions.
5. Update the DCC honestly with only what this pass actually changes.

---

## Patterns to fix everywhere they appear

Fix density problems such as:
- stacked info cards that repeat the same message in different words
- long hero sections that push the working list or board below the fold
- full-detail cards that expose every diagnostic section before the user chooses to inspect
- helper panels, metric strips, or AI summaries that duplicate the real workspace state
- tables or cards where secondary metadata visually outweighs the primary decision signal

Important: do not change workflow truth to make a page feel simpler. Only change framing, collapse behavior, and visible density.

---

## Files to inspect and update

- major workspaces in `src/features/**`
- route entry framing in `src/app/**`
- shared surface/collapse components in `src/components/**`
- `public/internal-dcc/index.html`
- `NEXT_PROMPT.md`

---

## Return

1. Updated full repo zip
2. Updated internal DCC HTML
3. PR-UX-03 summary
4. Which density/collapse conflicts were fixed
5. Which routes became faster to scan
6. True remaining UX PR count
7. Next prompt

---

## Delivery rule

I will always provide the full repo.
Always return the full repo, the updated internal DCC HTML with current status of the build based on PR completed, what was done, and the next prompt.
