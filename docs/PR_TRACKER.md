# SETU Flow PR Tracker

Updated: 2026-04-30  
Current baseline: PR-NS-19 Controlled Golden Acceptance Run and Orders Proof.

## Current truth reset

PR-NS-19 completed the controlled live golden acceptance proof for `Setu Groups` / `Q-00025`. The full buyer revenue path is now proven through:

```text
Lead -> Quote -> Sent -> Accepted -> Draft Order / Contract Execution
```

This does **not** yet prove signed contract readiness, release readiness, dispatch, completion, or full RPC/RLS hardening.

## Live verification baseline

Supabase and Vercel were checked before PR-NS-19 mutation and repo changes.

- Supabase SETU Flow CRM project: `sjzfzloggabsmcuxktnl` — ACTIVE_HEALTHY.
- Vercel project `setu-flow-crm` latest production deployment: `dpl_AbF8tddXDqGQKpKxiNMjLvpCx8rr` — READY.
- Golden candidate before mutation: quote `Q-00025`, quote ID `b6f8111a-3b32-456d-92f0-412c898bf13b`, current version `7f8efd6b-6e19-4941-b974-a5fc61738b0f`, both quote and version status `sent`, with 11 quote lines and 11 version lines.
- First acceptance attempt failed safely and rolled back because `contract_line_items.organization_id` was required but missing from the accepted-quote RPC insert.
- Live RPC `app_ensure_contract_for_accepted_quote_tx` was patched and the same patch was added as a migration.
- Controlled acceptance succeeded. Quote and version are now `accepted`.
- Contract/order execution record created: `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.
- Contract line item count: `11`.
- Communication proof: `5d2395f6-3a88-4399-b578-2142ac767f8a`.
- Negotiation event proof: `5bbc4b7b-a6f7-4db6-99f2-d987da5f7260`.
- Audit proof: `a4ac95ed-bf28-4853-aff8-f40678d4e9a8`.
- Orders source query returned accepted quote `Q-00025` with contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` and execution state `draft`.

## Completed before this DCC refresh

- PR-NS-01 to PR-NS-07.6 — Core NorthStar rebuild and visual parity sequence.
- PR-NS-08 — Catalog-to-Quote data wiring hardening.
- PR-NS-09 / 09A — Orders panel, hotfixes, trade events visibility, quote constraints, orders empty state.
- PR-NS-10 — Vercel build proof and dispatch wiring posture.
- PR-NS-11 — Schema category_type fix and code sweep.
- PR-NS-12 — Mobile-first PWA shell.
- PR-NS-13 — WhatsApp quote delivery posture.
- PR-NS-14 — Offline trade-show capture posture.
- PR-NS-16 — Premium mobile shell alignment.
- PR-NS-16A — Investor-grade gap closure DCC refresh.
- PR-NS-16B — Live Supabase/Vercel connector baseline and DCC prompt update.
- PR-NS-17 — Sent quote outcome handoff fix.
- PR-NS-18 — Golden demo data and RPC/RLS reconciliation.
- PR-NS-19 — Controlled golden acceptance run and Orders proof.

## Completed PR

### PR-NS-19 — Controlled golden acceptance run and Orders proof

Status: Complete.

What changed:
- Verified Q-00025 before mutation.
- Confirmed the PR-NS-18 quote/version mismatch was already reconciled in live data.
- Ran a guarded acceptance attempt and discovered a real contract-line schema blocker.
- Patched `app_ensure_contract_for_accepted_quote_tx` so contract line items include `organization_id` and contract continuity fields.
- Reran controlled acceptance successfully.
- Updated DCC, demo, readiness, investor, and tracker files.
- Restored the full 9-item PR queue in the DCC so later roadmap items are no longer hidden.

Verification:
- Live Supabase project/status/RPC/data checks were performed.
- Live Vercel latest deployment state was checked.
- Quote status, quote version status, accepted version, contract, contract line count, communication, negotiation event, audit log, and Orders source visibility were verified.
- No `npm ci`, local typecheck, or local build was run.

## Active next PR

### PR-NS-21 — Mobile promise alignment

Priority: High

Scope:
- Reconcile desktop-supported vs mobile-supported claims.
- Keep mobile claims honest for investor and buyer demos.
- Update DCC, investor script, release readiness, and page score wording.
- Do not remove the proven Q-00025 quote/order handoff claims.

## Queued PRs to 100%

1. PR-NS-20 — Quote/order RPC permission hardening and trigger search-path cleanup.
2. PR-NS-21 — Mobile promise alignment.
3. PR-NS-22 — Order execution proof hardening.
4. PR-NS-23 — Trade show wedge proof.
5. PR-NS-24 — Integration proof mode.
6. PR-NS-25 — First-login and empty-state hardening.
7. PR-NS-26 — Claim reconciliation and investor script lock.
8. PR-NS-27 — Final 100% verification pass.
9. PR-NS-28 — Post-lock launch rehearsal and regression buffer.

## Mandatory build-output rule

Every future build must return the full updated repo zip and include the next prompt in `public/internal-dcc/index.html`. Do not run `npm ci` unless explicitly requested.

## PR-NS-19B build syntax fix

Status: Complete in this returned zip.

What changed:
- Fixed the Vercel compile blocker in `src/features/quotes/server/actions.ts` where two TypeScript union members (`'quote_accepted'` / `'quote_rejected'`) were accidentally inserted inside two `writeQuoteAuditLog` object literals.
- Confirmed the bad fragments no longer appear outside the intended `writeQuoteAuditLog` action type definition.
- Preserved the full 9-item PR queue and PR-NS-20 as the next planned PR.

Verification:
- Live Vercel state was checked and showed the latest production deployment in `ERROR` on the failed build.
- No `npm ci` was run.
- Full local build was not run in this pass.


## PR-NS-20 quote/order RPC permission hardening

Status: Complete.

What changed:
- Verified Supabase project `sjzfzloggabsmcuxktnl` was `ACTIVE_HEALTHY` before hardening.
- Verified Vercel latest production deployment `dpl_6WDgCcGH8xSgdwVN89BdBwdoxQic` was `READY` before packaging.
- Re-verified Q-00025 remains `accepted` with accepted version `7f8efd6b-6e19-4941-b974-a5fc61738b0f`.
- Re-verified contract/order execution record `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` remains linked and has 11 contract line items.
- Reviewed Supabase advisor findings for quote/order RPC exposure and mutable search_path.
- Applied safe quote/order hardening in live Supabase: revoked broad `PUBLIC`/anonymous execute from scoped quote/order RPCs, granted back to `authenticated`, and pinned search_path on quote/order helper/trigger functions.
- Added matching migration `20260430_pr_ns_20_quote_order_rpc_hardening.sql`.

Verification:
- Scoped quote/order RPC privilege re-check confirmed key exposed RPCs now show `authenticated` only, not `anon`.
- Search path re-check confirmed quote/order helper functions are pinned to `search_path=public`.
- Golden source check after hardening confirmed Q-00025 remains accepted and linked to contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` with 11 contract lines.
- No `npm ci`, local typecheck, or local build was run.

## Active next PR

### PR-NS-21 — Mobile promise alignment

Priority: High

Scope:
- Reconcile mobile-supported vs desktop-only product claims.
- Make demos, docs, DCC, and investor scripts honest about mobile readiness.
- Preserve the live Q-00025 accepted quote/order proof.
- Keep all DCC tabs and the full 9-item PR queue synchronized.
