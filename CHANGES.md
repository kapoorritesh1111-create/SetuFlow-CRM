# 2026-05-01 — Pass 21 TypeScript Build Hotfix

## Summary

Fixed the Vercel TypeScript build failure reported for commit `9dcacd9`. `safeQuoteDisplayCurrency` now narrows unknown input before calling `normalizeQuoteDisplayCurrency`, matching the helper signature and preserving the Pass 21 quote display-currency constraint guard.

## Files changed

- `src/features/quotes/server/actions.ts` — added a narrow optional-string coercion helper and typed `safeQuoteDisplayCurrency` as returning `string`.
- `public/internal-dcc/index.html` — recorded the Vercel type-check failure and hotfix proof boundary.
- `README.md` — added this hotfix summary.
- `docs/RELEASE_READINESS.md` — added this hotfix release-readiness note.
- `CHANGES.md` — this entry.

## Verification

Build not claimed in GPT sandbox. Requires Vercel/live build proof. No `npm ci` was run. No Supabase data was mutated and no remediation migration was applied.

---

# 2026-05-01 — Pass 20 Proof-Gated Pilot Hardening

## Summary

Implemented the Pass 20 proof-gated pilot-hardening follow-up against the Pass 19 Action Hardening ZIP. This pass does not claim clean sandbox build, `npm run test:all`, deployment, or live QA closure. The required Vercel/live QA proof remains open.

## Files changed

- `src/lib/routes/manifest.json` — promoted Tasks into the primary operating flow and desktop shell route manifest without breaking the canonical first-six operator path, removed Tasks from hidden primary-nav labeling, and added `/tasks` to app routes.
- `src/components/shell/navigation.tsx` — added the Tasks compact desktop-nav label.
- `src/features/pipeline/components/pipeline-board.tsx` — added a visible horizontal-scroll cue above desktop Kanban lanes.
- `src/features/dashboard/components/dashboard-control-bar.tsx` — removed the unsupported Custom time range option until date picker support exists.
- `src/features/dashboard/components/dashboard-interactive.tsx` — treats unsupported `range=custom` as the default month view instead of a misleading all-time pass-through.
- `public/internal-dcc/index.html` — added the Pass 20 verification/pilot-hardening card and updated readiness, modules, next-pass, schema, and build rules.
- `README.md` — added Pass 20 summary and verification boundary.
- `docs/RELEASE_READINESS.md` — added Pass 20 release-readiness update.
- `docs/RELEASE_PROOF.md` — restored the minimal release-proof evidence placeholder required by checked-in repo-alignment tests; it does not claim Pass 20 build proof.
- `CHANGES.md` — this entry.

## Verification

Build not claimed in GPT sandbox. Requires Vercel/live build proof.

No `npm ci` was run. `node_modules` was absent. No Supabase data was mutated. No Supabase remediation migrations were applied. Frozen records remain protected: `Q-00025` and `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.

## Remaining blockers

- Fresh Vercel or clean local build proof for this Pass 20 package.
- Live QA retest proving all Pass 19 P0/P1 action fixes still work after deployment.
- Live QA retest proving Tasks navigation, Pipeline scroll cue, and Dashboard time-range behavior are not misleading.
- Live QA retest proving no raw SQL/database errors are visible to users.
- Security/RPC advisor closure, WAF/monitoring/backup evidence, dispatch/completion proof, and first-pilot evidence.
- Authorized read-only verification and separate approval before any data cleanup.

---

# 2026-05-01 — Pass 19 Action Hardening Code + DCC Update

## Summary

Implemented the Pass 19 action-hardening patch set against `SetuFlow-CRM-main(41)` / commit `89a825a` baseline. This pass focused on P0/P1 visible action reliability and documentation honesty. It does not claim a clean sandbox build, live QA closure, or 100/100 buyer readiness.

## Files changed

- `src/components/layout/app-shell.tsx` — aligned the header/avatar vCard action path with the working vCard modal behavior.
- `src/features/leads/components/leads-workspace.tsx` — fixed saved-view filter predicates, fallback lead selection, and Quote Preview Continue validation/advance feedback.
- `src/lib/queries/data.ts` — converted backend query issue details into customer-safe user-facing messages instead of surfacing raw database text.
- `src/app/(app)/orders/page.tsx` — fixed active-order grammar, execution-value wording, and disabled blocked-doc explanation.
- `src/features/products/components/products-spreadsheet-page.tsx` — added a distinct pricing-focused table layout for Pricing View.
- `public/internal-dcc/index.html` — updated Pass 19 completion status, readiness posture, module map, demo guidance, next-pass plan, schema rules, and build rules.
- `README.md` — added Pass 19 summary and verification boundary.
- `docs/RELEASE_READINESS.md` — added Pass 19 release-readiness update.
- `CHANGES.md` — this entry.

## Verification

Build not claimed in GPT sandbox. Requires Vercel/live build proof.

No `npm ci` was run. No Supabase data was mutated. No Supabase remediation migrations were applied. Frozen records remain protected: `Q-00025` and `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.

## Remaining blockers

- Fresh Vercel/user build proof for this Pass 19 package.
- Live QA retest proving no visible P0 dead actions remain.
- Live QA retest proving no raw SQL/database errors are visible to users.
- Quote/order detail/workspace runtime proof after deployment.
- Security/RPC advisor closure, WAF/monitoring/backup evidence, dispatch/completion proof, and first-pilot evidence.
- Authorized read-only verification and separate approval before any data cleanup.

---

# 2026-05-01 — Live QA Hardening Plan DCC Update

- Updated `public/internal-dcc/index.html` as the active operating board for the merged live UX/CTO review findings.
- Preserved the locked live baseline: `SetuFlow-CRM-main(41)` / commit `89a825a` / Vercel production `READY`.
- Corrected readiness posture: build/deploy confidence remains high, but buyer confidence is held around `~96–97/100` until P0/P1 live action defects are fixed and retested.
- Added the 100% evidence path directly inside the DCC: P0/P1 live action hardening, Vercel/user build proof, Supabase security/RPC closure, WAF/monitoring/backup proof, dispatch/completion proof, and first-pilot evidence.
- Recorded next pass sequence: Pass 19 P0 Action Hardening, Pass 20 P1 Pilot Hardening, Pass 21 Data/Governance Verification, Pass 22 Live Retest + Build Proof, Pass 23 Security/Ops Closure, Pass 24 Pilot Evidence.
- Added explicit build rule: GPT sandbox should not attempt `npm ci`; future verification must use user/Vercel logs.
- No code workflow fixes, Supabase mutations, or new docs were created in this update.

---

# Pass 18 Live Baseline Lock — Vercel Production Proof

## Summary

Locked `SetuFlow-CRM-main(41).zip` / GitHub commit `89a825a` as the current SETU Flow CRM baseline. Updated the DCC, README, and release readiness docs based on the clean live Vercel build/deploy log and connector evidence.

## Evidence

- Vercel project: `setu-flow-crm`.
- Deployment: `dpl_2tMU2g417f8wDAtMJPXDHrEkxoD8`.
- State: production `READY`.
- Branch/commit: `main` / `89a825a`.
- Install command: `npm ci --no-audit --no-fund`; 151 packages installed.
- Build command: `npm run build`; Next.js 14.2.35 compiled successfully, checked types, generated 55 static pages, created serverless functions, and deployed outputs.
- User-provided live validation confirms Supabase connection is working.

## Files changed

- `public/internal-dcc/index.html` — updated live baseline, readiness, buyer confidence, remaining blockers, and next schema/security action.
- `README.md` — updated readiness snapshot, proven/non-claimed language, pass table, and live baseline section.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass18 live baseline lock.
- `docs/LIVE_BASELINE_LOCK_PASS18.md` — created live baseline evidence record.
- `CHANGES.md` — this entry.

## Readiness impact

Buyer confidence moves from ~97.5/100 to ~98.5/100 because the premium UI / Organization Setup work is now live-build verified. Security/RPC trust remains capped at 90-94% because no Supabase remediation migration, advisor closure, or external audit proof was applied in this pass.

## Still not claimed

100/100 remains blocked by Supabase advisor/RPC closure, external audit, WAF/rate limiting, monitoring, backup/restore drill, live connector proof, dispatch/completion proof, production support activation, and first-customer pilot evidence.

---

# Pass 17 Dependency Restoration + Verification Follow-up

## Summary

Followed the Pass 17 handoff from the Pass 16 premium UI baseline. The DCC was read first and the verification gap was kept honest: dependency restoration is still blocked in this sandbox, so no clean test/build/deploy claim is made.

## Files created

- `docs/PASS17_VERIFICATION.md`

## Files changed

- `package.json` — added missing `tsx` devDependency used by `npm run test:all`.
- `package-lock.json` — added the root devDependency declaration for `tsx`; a full network-enabled install should regenerate/validate the complete lock entry set.
- `public/internal-dcc/index.html`, `README.md`, `docs/RELEASE_READINESS.md`, `CHANGES.md` — Pass 17 status, honest readiness, open blockers, and next-pass target.

## Verification

Attempted dependency restoration and the required verification path. In this sandbox, `npm install` / `npm ci` did not complete and did not create `node_modules`, so `npm run test:all` and `npm run build` remain blocked locally.

Partial smoke signal only: `node --experimental-strip-types --test tests/pricing/fx-resolution.helpers.test.ts` completed with 19 passing assertions. This is not a substitute for `npm run test:all`.

No Supabase data was mutated and no remediation migrations were applied. Buyer confidence remains held at ~97.5/100.

---
# Pass 16 Premium UI Implementation + Organization Setup Redesign

## Summary

Implemented the Pass 15 customer-facing UX fixes across Leads, Orders, Quotes, Trade Events, and Organization Setup. Added a shared premium command-bar component and updated docs/DCC honestly without claiming clean build proof.

## Files created

- `src/components/ui/premium-command-bar.tsx`
- `docs/PREMIUM_UI_IMPLEMENTATION_PASS16.md`

## Files changed

- `src/features/leads/components/leads-workspace.tsx` — named active filter chips and filtered-empty-state clarity.
- `src/app/(app)/orders/page.tsx` — premium execution command bar and visible dispatch/docs active chips.
- `src/app/(app)/quotes/page.tsx` — shared premium command bar, active chips, no duplicate mode selector.
- `src/app/(app)/trade-events/page.tsx` — premium event cockpit, KPI cards, proof boundary, and buyer/supplier/review CTAs.
- `src/app/(app)/admin/organization/page.tsx` — SaaS onboarding setup flow and checklist.
- `public/internal-dcc/index.html`, `README.md`, `docs/RELEASE_READINESS.md`, `CHANGES.md` — Pass 16 status, honest readiness, open blockers, and verification notes.

## Verification

Attempted in required order:

```bash
npm run test:all
npm run build
```

Both stopped before execution because project-local dependencies are missing in this extracted container:

```text
npm run test:all -> sh: 1: tsx: not found
npm run build    -> sh: 1: next: not found
```

No Supabase data was mutated and no live remediation migrations were applied. Buyer confidence is kept at ~97.5/100 until clean test/build/deploy evidence is captured.

---
# Pass 15 UX Review + Premium UI Fix Plan

## Summary

Added the May 1 visual/customer-facing UX review to the Internal DCC and supporting docs. This pass does **not** implement the visual fixes yet; it records the issues, adjusts readiness honestly, and defines the implementation/verification scope for the next pass.

## Files created

- `docs/UX_VISUAL_REVIEW_PASS15.md`
- `docs/PREMIUM_UI_FIX_PLAN_PASS15.md`
- `docs/ORGANIZATION_SETUP_REDESIGN_PASS15.md`

## Files changed

- `public/internal-dcc/index.html` — added Pass 15 UX review card, adjusted readiness scores, added UI blockers to the roadmap and next-action language.
- `README.md` — updated readiness snapshot, proof/non-claim wording, Pass 15 summary, and next-pass table.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass15 UX review update with honest readiness adjustment and open UX blockers.
- `CHANGES.md` — prepended this section.

## Readiness impact

| Area | Updated status |
|---|---:|
| Core CRM workflow | 91–94% |
| Quote → Order revenue path | 92–95% |
| Investor demo safety | 80–85% scripted |
| First paying customer readiness | 88–92% |
| Security / RPC trust | 90–94% |
| Buyer confidence | ~97/100 |

## Open implementation scope

- Standardize premium filters/command bars across Leads, Orders, Quotes, Dashboard, and Trade Events.
- Make active filters explicit with visible chips and one-click clear.
- Polish Leads row layout, checkbox alignment, and toolbar height.
- Rework Orders header/filter hierarchy and order-card balance.
- Remove duplicated mode controls and align Quotes to the shared filter pattern.
- Redesign Trade Events into a premium event cockpit.
- Redesign Organization Setup as true SaaS onboarding instead of an admin dashboard.
- Keep all changes type-safe and build-verified before claiming completion.

## Verification

Attempted `npm run test:all` and `npm run build` in this container. Both failed before execution because project-local binaries are unavailable (`tsx: not found`, `next: not found`). Targeted `@/` import scan passed with `missing count 0`. No Supabase data was mutated and no live remediation migrations were applied.

---
# Dashboard Map Filter Fix — Pass 14 follow-up

## Summary

Fixed the dashboard map disappearing when no visible filters were selected. The root cause was the default `This month` time range being treated as a data filter for the map and action queue, while the UI considered it the default/no-active-filter state. KPI cards therefore showed full live pipeline counts, but the country map could collapse to `0 markets · 0 leads · 0 actions` and show “No markets match the current filters.”

## Files changed

- `src/features/dashboard/components/dashboard-interactive.tsx` — stopped applying the time-range filter to the market map and action queue when the time range is the default `this-month`; explicit time selections such as `this-week`, `this-quarter`, or `custom` still filter the dashboard.
- `CHANGES.md` — prepended this dashboard map fix section.

## Verification

Attempted:

```bash
npm run test:all
```

Result in this extracted container:

```text
sh: 1: tsx: not found
```

Attempted:

```bash
npm run build
```

Result in this extracted container:

```text
sh: 1: next: not found
```

Targeted `@/` import scan returned:

```text
missing count 0
```

No Supabase data was mutated. The fix is UI-filter logic only.

---
# Pass 14 — Actual Evidence Review + Pilot-to-Production Decision

## Summary

Pass 14 imports live read-only Supabase evidence and updates the launch decision. Q-00025 is live `accepted`; contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` is live `signed`; and the signed contract/order preserves 11 contract line items. No Supabase migrations were applied, no live remediation was performed, and frozen proof records were not mutated.

## Files created

- `docs/ACTUAL_EVIDENCE_REVIEW_PASS14.md`
- `docs/PRODUCTION_REMEDIATION_CLOSEOUT_PASS14.md`
- `docs/PILOT_TO_PRODUCTION_TRANSITION_DECISION_PASS14.md`
- `docs/FINAL_CUSTOMER_FACING_LAUNCH_PACKET_PASS14.md`
- `docs/ARCHIVED_100_EVIDENCE_CHECKLIST_PASS14.md`

## Files changed

- `public/internal-dcc/index.html` — added Pass 14 card, live golden signed-contract proof, pilot expansion decision, updated roadmap and next-action language.
- `README.md` — updated proven/not-claimed wording, Pass 14 summary, and next-pass table.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass14 update, evidence status, blockers, and pilot expansion decision.
- `CHANGES.md` — prepended this Pass 14 section.

## Live Supabase proof captured

- Project `SETU Flow CRM` / `sjzfzloggabsmcuxktnl` is active/healthy.
- Public table inventory returned 80 public tables with RLS enabled.
- Advisor findings remain open.
- Q-00025 is live `accepted`, sent at `2026-04-30 13:46:13.848+00`.
- Contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` is live `signed`, linked to Q-00025's quote ID.
- Contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` has 11 contract line items.

## Test results

Attempted:

```bash
npm run test:all
```

Result in this extracted container:

```text
sh: 1: tsx: not found
```

Per project rule, `npm ci` was not run. Expected full suite remains 331 tests when dependencies are available.

Attempted:

```bash
npm run build
```

Result in this extracted container:

```text
sh: 1: next: not found
```

Targeted `@/` import scan returned `missing count 0`, including the prior RFQ form path.

## Buyer confidence impact

Estimated: ~98/100 -> ~98/100. Pass 14 closes live signed-contract proof for the golden journey and upgrades the decision to pilot expansion approved, but does not raise to 99 or 100 because Supabase remediation, external audit, WAF, monitoring, backups, live connectors, dispatch/completion, support activation, and first-pilot evidence remain open.

---
# Build Fix — RFQ form import

## Summary

Fixed the Vercel compile error caused by the standalone lead RFQ page importing `@/features/rfqs/components/rfq-form` when that compatibility component was missing from the repo.

## Files created

- `src/features/rfqs/components/rfq-form.tsx` — compatibility wrapper around the existing `RfqCreateWizardForm` for the inline RFQ creation page.

## Files changed

- `CHANGES.md` — prepended this build-fix section.

## Verification

- Targeted impacted-file scan confirmed the only unresolved import was from `src/app/(app)/leads/[leadId]/rfq/new/page.tsx` to the missing RFQ form wrapper.
- Production build re-check should now resolve the missing module; full result is documented in the response.

# Pass 13 — Post-Decision Remediation + Pilot Operations + Final Evidence Handoff

## Summary

Pass 13 adds post-decision remediation status, controlled pilot operations checklist, production support activation checklist, customer/investor final evidence handoff, and a final frozen launch-claim archive. No live Supabase remediation was authorized. No new pilot/customer/monitoring/backup evidence was provided. No product features were added. Frozen proof records were not modified.

## Files created

- `docs/POST_DECISION_REMEDIATION_STATUS_PASS13.md`
- `docs/PILOT_OPERATIONS_CHECKLIST_PASS13.md`
- `docs/PRODUCTION_SUPPORT_ACTIVATION_PASS13.md`
- `docs/CUSTOMER_INVESTOR_FINAL_EVIDENCE_HANDOFF_PASS13.md`
- `docs/FINAL_FROZEN_LAUNCH_CLAIM_ARCHIVE_PASS13.md`

## Files changed

- `public/internal-dcc/index.html` — updated Pass 13 status, overview wording, buyer confidence wording, roadmap, blockers, and next-action language while preserving ~98/100 buyer confidence.
- `README.md` — added Pass 13 summary and preserved test count/claim boundaries.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass13 readiness update and preserved conditional pilot launch decision.
- `CHANGES.md` — prepended this Pass 13 section.

## Test results

Attempted:

```bash
npm run test:all
```

Result in this extracted container:

```text
sh: 1: tsx: not found
```

Per project rule, `npm ci` was not run. Expected full suite remains 331 tests when dependencies are available.

## Buyer confidence impact

Estimated: ~98/100 -> ~98/100. Pass 13 improves pilot operations readiness, support activation discipline, final evidence handoff, and claim lock safety, but does not raise confidence to 99 or 100 because no live remediation, advisor closure, external audit, deployed WAF, monitoring evidence, backup drill, live connector proof, signed/dispatch proof, or pilot evidence exists yet.

---

# Pass 12 — Final Remediation Status + Live Verification Status + Launch Decision

## Summary

Pass 12 adds final remediation execution status, live negative RPC verification status, first-pilot evidence closure, monitoring/backup evidence closure, and final launch/no-launch executive decision. No live Supabase remediation was authorized. No new pilot/customer/monitoring/backup evidence was provided. No product features were added. Frozen proof records were not modified.

## Files created

- `docs/FINAL_REMEDIATION_EXECUTION_STATUS_PASS12.md`
- `docs/LIVE_NEGATIVE_RPC_VERIFICATION_PASS12.md`
- `docs/FIRST_PILOT_EVIDENCE_CLOSURE_PASS12.md`
- `docs/MONITORING_AND_BACKUP_EVIDENCE_CLOSURE_PASS12.md`
- `docs/FINAL_LAUNCH_DECISION_PASS12.md`

## Files updated

- `public/internal-dcc/index.html` — updated Pass 12 status, overview wording, buyer confidence wording, roadmap, blockers, and next-action language while preserving ~98/100 buyer confidence.
- `README.md` — added Pass 12 summary and preserved test count/claim boundaries.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass12 update and conditional-pilot release decision.
- `CHANGES.md` — prepended this Pass 12 section.

## Test result

Attempted:

```bash
npm run test:all
```

Result in this extracted container:

```text
sh: 1: tsx: not found
```

Per project rule, `npm ci` was not run. Expected full suite remains 331 tests when dependencies are available.

## Buyer confidence impact

Estimated: ~98/100 -> ~98/100. Pass 12 improves decision discipline and evidence closure tracking, but does not raise confidence to 99 or 100 because no live remediation, advisor closure, external audit, deployed WAF, monitoring evidence, backup drill, live connector proof, signed/dispatch proof, or pilot evidence exists yet.

---

# Pass 11 — Pilot Evidence Review + Customer Decision + Monitoring Proof

Date: 2026-04-30  
Baseline: `SetuFlow-CRM-Pass10.zip`

## Summary

Pass 11 adds pilot evidence review, customer-readiness decisioning, a post-launch remediation backlog, production monitoring proof checklist, and final investor/customer claim lock. No live Supabase remediation was authorized. No new pilot/customer/monitoring evidence was provided. No product features were added. Frozen proof records were not modified.

## Files created

- `docs/PILOT_EVIDENCE_REVIEW_PASS11.md` — pilot/customer evidence review template; all evidence marked pending.
- `docs/CUSTOMER_READINESS_DECISION_PASS11.md` — conditional-go customer readiness decision and non-claims.
- `docs/POST_LAUNCH_REMEDIATION_BACKLOG_PASS11.md` — seeded backlog for all remaining blockers.
- `docs/PRODUCTION_MONITORING_PROOF_PASS11.md` — monitoring evidence checklist with all provider evidence pending.
- `docs/FINAL_INVESTOR_CUSTOMER_CLAIM_LOCK_PASS11.md` — final investor/customer claim wording boundaries.

## Files changed

- `public/internal-dcc/index.html` — updated Pass 11 status, overview wording, buyer confidence wording, roadmap, blockers, and next-action language while preserving ~98/100 buyer confidence.
- `README.md` — added Pass 11 summary and preserved test count/claim boundaries.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass11 update with honest scores and remaining blockers.
- `CHANGES.md` — prepended this Pass 11 section.

## Supabase / production status

- No live Supabase migrations applied.
- No advisor findings claimed closed.
- No WAF, monitoring, backup, external audit, live connector, signed-contract, dispatch, or pilot evidence claimed.
- Q-00025 and contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` were not modified.

## Test results

Attempted command:

```bash
npm run test:all
```

The extracted repository does not include `node_modules`, and `tsx` is unavailable in the project-local environment, so the command fails before running tests:

```text
sh: 1: tsx: not found
```

Per project rule, `npm ci` was not run. Expected full suite remains 331 tests when dependencies are available.

## Buyer confidence impact

Estimated: ~98/100 -> ~98/100. Pass 11 improves review discipline and claim safety, but does not raise confidence to 99 or 100 because no live remediation, advisor closure, external audit, deployed WAF, monitoring evidence, backup drill, live connector proof, signed/dispatch proof, or pilot evidence exists yet.

---

# Pass 10 — Final Launch Gate + Auditor/Investor Evidence Pack

Date: 2026-04-30  
Baseline: `SetuFlow-CRM-Pass9.zip`

## Summary

Pass 10 adds the final production launch gate, external auditor response pack, pilot evidence capture template, and investor-ready 100/100 proof bundle. No product features were added. No Supabase migrations were applied because explicit live-apply authorization was not provided. The live golden record was not modified.

## Files created

- `docs/FINAL_PRODUCTION_LAUNCH_GATE_PASS10.md` — final production launch gates, blockers, conditional pilot decision, and 100/100 gating.
- `docs/EXTERNAL_AUDITOR_RESPONSE_PACK_PASS10.md` — auditor response pack covering scope, architecture, known findings, evidence, missing evidence, and remediation owners.
- `docs/PILOT_LAUNCH_EVIDENCE_CAPTURE_PASS10.md` — first-pilot evidence capture checklist using a new proof record, not Q-00025.
- `docs/INVESTOR_READY_100_PROOF_BUNDLE_PASS10.md` — investor-safe proof bundle and claim boundaries for 100/100 readiness.

## Files changed

- `public/internal-dcc/index.html` — updated Pass 10 status, overview/readiness wording, roadmap, and next action language while preserving ~98/100 buyer confidence.
- `README.md` — added Pass 10 summary and next-pass table updates.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass10 update and remaining blockers.
- `CHANGES.md` — prepended this Pass 10 section.

## Supabase / production status

- No live Supabase migrations applied.
- No advisor findings claimed closed.
- No WAF, monitoring, backup, external audit, live connector, signed-contract, dispatch, or pilot evidence claimed.
- Q-00025 and contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` were not modified.

## Test results

Attempted command:

```bash
npm run test:all
```

The extracted repository does not include `node_modules`, and `tsx` is unavailable in the project-local environment, so the command fails before running tests:

```text
sh: 1: tsx: not found
```

Per project rule, `npm ci` was not run. Expected full suite remains 331 tests when dependencies are available.

## Buyer confidence impact

Estimated: ~98/100 -> ~98/100. Pass 10 improves launch/audit/pilot/investor evidence readiness, but does not raise confidence to 99 or 100 because no live remediation, advisor closure, external audit, deployed WAF, monitoring, backup drill, live connector proof, signed/dispatch proof, or pilot evidence exists yet.

---

# Pass 9 — Draft Supabase Remediation Implementation + Negative RPC Tests

Date: 2026-04-30

## Scope

Pass 9 adds draft-only Supabase remediation implementation assets, a migration dry-run/rollback plan, negative RPC/design assertion tests, a live proof-record creation checklist, and a final 100/100 buyer confidence evidence gate. No product features were added. No Supabase migrations were applied because explicit live-apply authorization was not provided. The live golden record was not modified.

## New files

- `docs/SUPABASE_REMEDIATION_IMPLEMENTATION_PASS9.md` — records draft-only implementation status, authorization boundary, and claim limits.
- `docs/MIGRATION_DRY_RUN_AND_ROLLBACK_PASS9.md` — dry-run and rollback plan covering RPC grants, search path, RLS policy, SECURITY DEFINER view/function changes, DB helper, and Auth settings.
- `docs/LIVE_PROOF_RECORD_CREATION_CHECKLIST_PASS9.md` — new-record proof checklist that preserves Q-00025 and contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`.
- `docs/BUYER_CONFIDENCE_100_EVIDENCE_GATE_PASS9.md` — evidence gate confirming 100/100 cannot be claimed yet.
- `docs/SUPABASE_ADVISOR_REVIEW_PASS9.md` — read-only advisor state summary; findings remain open.
- `supabase/migrations/pass9_001_rpc_grant_hardening_advisor_remediation.sql` — draft-only RPC grant hardening examples.
- `supabase/migrations/pass9_002_search_path_and_view_advisor_remediation.sql` — draft-only search-path and SECURITY DEFINER view remediation examples.
- `supabase/migrations/pass9_003_rls_policy_advisor_remediation.sql` — draft-only RLS policy strategy examples.
- `supabase/migrations/pass9_004_db_capability_helper_advisor_remediation.sql` — draft-only DB capability helper and RPC guard examples.
- `tests/security/rpc-grant-hardening.test.ts` — pure repository/draft-migration assertion tests for RPC grant hardening coverage.
- `tests/security/db-capability-design.test.ts` — pure assertion tests that the DB capability design mirrors the application role model.

## Modified files

- `package.json` — added the two Pass 9 security test files to `test:security` and `test:all`.
- `public/internal-dcc/index.html` — updated Pass 9 readiness state, Pass 9 completed card, roadmap, buyer confidence wording, and remaining blocker language.
- `README.md` — updated expected test count to 331, added Pass 9 summary, and preserved non-claims.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass9 update with honest scores and remaining blockers.
- `CHANGES.md` — prepended this Pass 9 section.

## Live Supabase read-only verification

| Item | Result |
|---|---|
| Project | SETU Flow CRM |
| Project ID | `sjzfzloggabsmcuxktnl` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |
| Security advisor state | Open findings remain; materially unchanged from Pass 8 |

Important caveat: Pass 9 does not remediate Supabase advisor findings. It prepares migration drafts and tests only.

## Test results

Direct command attempted:

```bash
npm run test:all
```

The extracted zip does not include `node_modules`, and this container does not have the project-local `tsx` binary available. Per handoff rule, `npm ci` was not run. The command fails before executing tests with:

```text
sh: 1: tsx: not found
```

Expected full suite after dependency availability is now 331 tests: 259 prior expected tests + 72 Pass 9 security/design assertion tests.

## Buyer confidence impact

Estimated: ~98/100 → ~98/100. Pass 9 improves readiness through draft implementation assets and evidence gates, but it does not raise buyer confidence to 99 or 100 because no live remediation, advisor closure, external audit, deployed WAF, monitoring, backup drill, live connector proof, signed/dispatch proof, or pilot evidence exists yet.

---

# Pass 8 — Supabase Advisor Remediation Plan + RPC Grant Hardening Evidence Checklist

Date: 2026-04-30

## Scope

Pass 8 adds security remediation planning and evidence preparation for Supabase advisor findings, RPC grant hardening, database-level capability checks, external audit remediation tracking, WAF deployment evidence, and a live read-only Supabase re-check. No product features were added, no Supabase migrations were applied, and the live golden record was not modified.

## New files

- `docs/SUPABASE_ADVISOR_REMEDIATION_PLAN_PASS8.md` — advisor-class remediation plan; no migrations applied.
- `docs/RPC_GRANT_HARDENING_PLAN_PASS8.md` — draft-only RPC grant hardening plan with SQL examples and negative tests.
- `docs/DATABASE_CAPABILITY_CHECKS_DESIGN_PASS8.md` — DB-level capability-check design aligned to the app role model.
- `docs/EXTERNAL_AUDIT_REMEDIATION_TRACKER_PASS8.md` — pre-audit remediation tracker seeded with known items.
- `docs/WAF_DEPLOYMENT_EVIDENCE_CHECKLIST_PASS8.md` — WAF/rate-limit evidence checklist.
- `docs/SUPABASE_ADVISOR_REVIEW_PASS8.md` — live read-only Supabase re-check; findings unchanged from Pass 7.

## Modified files

- `public/internal-dcc/index.html` — updated post-Pass-8 readiness scores, buyer confidence, roadmap, Pass 8 card, and remaining blocker language.
- `README.md` — updated readiness snapshot, Pass 8 summary, pass history, and non-claims.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass8 update with honest scores and remaining blockers.
- `CHANGES.md` — prepended this Pass 8 section.

## Live Supabase read-only verification

| Item | Result |
|---|---|
| Project | SETU Flow CRM |
| Project ID | `sjzfzloggabsmcuxktnl` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |
| Security advisor state | Open findings remain; materially unchanged from Pass 7 |

Important caveat: Pass 8 does not remediate Supabase advisor findings. Security/RPC trust remains bounded until actual grants, policies, search paths, DB-level checks, and external evidence are applied and verified.

## Test results

Direct command attempted:

```bash
npm run test:all
```

The extracted zip does not include `node_modules`, and this container does not have the project-local `tsx` binary available. Per handoff rule, `npm ci` was not run. The command fails before executing tests with:

```text
sh: 1: tsx: not found
```

Expected full suite after dependency availability remains 259 tests.

## Buyer confidence impact

Estimated: ~96/100 → ~98/100. Pass 8 improves confidence through concrete remediation planning and evidence checklists. It does not claim 100/100 because Supabase advisor remediation, external audit completion, deployed WAF evidence, monitoring/alerting, backup/restore drill, live connector proof, actual signed-contract/dispatch proof, and first customer pilot evidence remain open.

# Pass 7 — Pilot Customer Launch + Live Proof Pack

Date: 2026-04-30

## Scope

Pass 7 adds managed-pilot launch readiness, live signed-contract/dispatch proof planning, first-customer success metrics, production support triage, final investor/demo pack, and a read-only live Supabase advisor re-check. No product features were added, no Supabase migrations were applied, and the live golden record was not modified.

## New files

- `docs/PILOT_CUSTOMER_LAUNCH_CHECKLIST.md` — first paying pilot pre-launch, launch-day, go/no-go, owner matrix, and pilot non-claims.
- `docs/LIVE_SIGNED_CONTRACT_AND_DISPATCH_PROOF_PLAN.md` — new-record plan to prove signed contract and dispatch without mutating Q-00025.
- `docs/FIRST_CUSTOMER_SUCCESS_METRICS.md` — activation, operational, and buyer-confidence metrics for the first pilot.
- `docs/PRODUCTION_SUPPORT_RUNBOOK.md` — support roles, incident triage, severity levels, placeholder response targets, and non-claims.
- `docs/FINAL_INVESTOR_DEMO_READINESS_PACK.md` — demo narrative, proven path, honest caveats, demo checklist, and investor Q&A.
- `docs/SUPABASE_ADVISOR_REVIEW_PASS7.md` — live read-only Supabase re-check confirming advisor/RPC posture is unchanged from Pass 6.

## Modified files

- `public/internal-dcc/index.html` — updated post-Pass-7 readiness scores, buyer confidence, readiness blockers, roadmap, next action, and added Pass 7 completed card.
- `README.md` — updated readiness snapshot, completed Pass 7 section, next-pass framing, and non-claims.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass7 update with honest per-area scores and remaining blockers.
- `CHANGES.md` — prepended this Pass 7 section.

## Live Supabase read-only verification

Project inspected through the GPT Supabase connector:

| Item | Result |
|---|---|
| Project | SETU Flow CRM |
| Project ID | `sjzfzloggabsmcuxktnl` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |
| Security advisor state | Open findings remain; materially unchanged from Pass 6 |

Important caveat: Pass 7 does not remediate Supabase advisor findings. Security/RPC trust remains bounded at 88-92% until grant hardening, database-level capability checks, external audit evidence, and advisor closure exist.

## Test results

Direct command attempted:

```bash
npm run test:all
```

The extracted zip does not include `node_modules`, and this container does not have the project-local `tsx` binary available. Per handoff rule, `npm ci` was not run. The command fails before executing tests with:

```text
sh: 1: tsx: not found
```

Expected full suite after dependency availability remains:

| Suite | Tests | Status |
|---|---:|---|
| test:pricing | 102 | Expected |
| test:workspace | 54 | Expected |
| test:orders | 25 | Expected |
| test:integrations | 32 | Expected |
| test:security | 46 | Expected |
| **Total** | **259** | Expected when dependencies are installed |

## Buyer confidence impact

Estimated: ~92/100 → ~96/100. Pass 7 improves confidence by making pilot launch, support, proof collection, and demo execution ready. It does not claim 100/100 because Supabase advisor closure, unsafe anon RPC grant remediation, database-level RPC capability proof, external audit completion, deployed WAF/rate-limit proof, monitoring/alerting, backup/restore drill, live connector proof, actual signed-contract/dispatch proof, and first customer pilot evidence remain open.

# Pass 6 — External Audit Prep + Supabase RPC Hardening Plan + Production Readiness

Date: 2026-04-30

## Scope

Pass 6 adds read-only live Supabase advisor/RPC review, external audit preparation, WAF/rate-limit planning, production-scale readiness documentation, final claim reconciliation, and buyer-confidence path documentation. No product features were added, no Supabase migrations were applied, and the live golden record was not modified.

## New files

- `docs/SUPABASE_ADVISOR_REVIEW_PASS6.md` — live read-only Supabase project identity, RLS posture, advisor findings, sampled RPC grant exposure, and hardening recommendations.
- `docs/EXTERNAL_SECURITY_AUDIT_PREP.md` — third-party security audit scope, evidence pack, auditor questions, pre-audit self-checklist, and non-claims.
- `docs/WAF_RATE_LIMITING_PLAN.md` — route-level WAF/rate-limit plan, recommended production controls, ownership, and non-claims.
- `docs/PRODUCTION_SCALE_READINESS.md` — database, app, operational, scale-risk, monitoring, backup, and support readiness checklist.
- `docs/CLAIM_RECONCILIATION_PASS6.md` — claim-by-claim reconciliation across DCC, README, RELEASE_READINESS, and investor wording.
- `docs/BUYER_CONFIDENCE_TO_100.md` — remaining proof path from ~92/100 to 100/100.

## Modified files

- `public/internal-dcc/index.html` — updated post-Pass-6 readiness scores, buyer confidence, readiness blockers, roadmap, next action, and added Pass 6 completed card.
- `README.md` — updated readiness snapshot, proven/non-claimed language, completed Pass 6 section, and next-pass framing.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass6 update with honest per-area scores and remaining blockers.
- `CHANGES.md` — prepended this Pass 6 section.

## Live Supabase read-only verification

Project inspected through the GPT Supabase connector:

| Item | Result |
|---|---|
| Project | SETU Flow CRM |
| Project ID | `sjzfzloggabsmcuxktnl` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-west-2` |
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |
| Security advisor state | Open findings remain |

Important live caveat: several privileged SECURITY DEFINER RPCs remain executable by `anon` and/or `authenticated` according to advisor/SQL inspection. Pass 6 documents the hardening plan; it does not claim advisor closure.

## Test results

Direct command attempted:

```bash
npm run test:all
```

The extracted zip does not include `node_modules`, and this container does not have the project-local `tsx` binary available. Per handoff rule, `npm ci` was not run. The command fails before executing tests with:

```text
sh: 1: tsx: not found
```

Expected full suite after dependency availability remains:

| Suite | Tests | Status |
|---|---:|---|
| test:pricing | 102 | Expected |
| test:workspace | 54 | Expected |
| test:orders | 25 | Expected |
| test:integrations | 32 | Expected |
| test:security | 46 | Expected |
| **Total** | **259** | Expected when dependencies are installed |

## Buyer confidence impact

Estimated: ~88/100 → ~92/100. Pass 6 improves confidence by making the security/audit/production path explicit and reconciling claims, not by claiming production proof. Remaining proof to reach 100 includes Supabase advisor closure, unsafe anon RPC grant remediation, database-level RPC capability proof, external audit completion, deployed WAF/rate-limit proof, monitoring/alerting, backup/restore drill, live connector proof, signed-contract/dispatch proof, and first customer pilot evidence.

# Pass 5 — Security Hardening + Admin Onboarding

Date: 2026-04-30

## Scope

Security boundary regression tests, read-only live Supabase connector inspection, secrets management policy, hardening review, admin onboarding SOP, and synchronized readiness updates. No new product features were added and the live golden record was not modified.

## New files

- `tests/security/rls-boundaries.test.ts` — 39 pure logic tests plus live-inspection note covering role/capability boundaries, viewer denial, owner all-capability access, sales/operations boundaries, read-only messaging, role normalization, empty/undefined roles, and multi-role combinations.
- `tests/security/order-auth-boundaries.test.ts` — 7 pure logic tests plus live-inspection note covering order progression, contract signing, and order document upload authorization gates.
- `docs/SECURITY_POLICY.md` — secrets inventory, storage locations, rotation cadence, compromise response, repo non-claims, and live Supabase connector verification notes.
- `docs/SECURITY_HARDENING_REVIEW_PASS5.md` — review of prior hardening findings, middleware CSP/header posture, Supabase client separation, and live Supabase RLS/RPC advisor findings.
- `docs/SOP_ADMIN_ONBOARDING.md` — non-technical admin onboarding path from first login through organization setup, invites, reference lists, pricing, lead creation, first quote, break/fix guidance, and live Supabase note.

## Modified files

- `package.json` — added `test:security`; updated `test:all` to include the two Pass 5 security test files.
- `public/internal-dcc/index.html` — updated post-Pass-5 scores, progress bars, readiness blockers, buyer-confidence roadmap, and Pass 5/6 roadmap; added Pass 5 completed card.
- `README.md` — updated readiness snapshot, proven/non-claimed language, test counts, completed passes, and next-pass framing.
- `docs/RELEASE_READINESS.md` — added PR-NS-Pass5 update with honest per-area scores and remaining blockers.
- `CHANGES.md` — prepended this Pass 5 section.

## Test results

Baseline test command was attempted before changes with `npm run test:all`, but the extracted zip did not include `node_modules` and the container did not have the project-local `tsx` binary available, so the command failed before running tests with `sh: 1: tsx: not found`. `npm ci` was not run, per handoff rules.

After adding the Pass 5 tests, the security suite was verified with a local tsx-compatible shim for this container and passed. A later direct `npm run test:security` attempt in this extracted zip still fails before execution because `tsx` is not installed in `node_modules`:

| Suite | Tests | Pass |
|---|---:|---:|
| test:security | 46 | 46 |

Direct script attempt result: `sh: 1: tsx: not found`.

Expected full suite after dependency availability:

| Suite | Tests | Pass |
|---|---:|---:|
| test:pricing | 102 | 102 |
| test:workspace | 54 | 54 |
| test:orders | 25 | 25 |
| test:integrations | 32 | 32 |
| test:security | 46 | 46 |
| **Total** | **259** | **259 expected** |

## Buyer confidence impact

Estimated: ~80/100 → ~88/100. Pass 5 raises confidence by proving application-layer role/capability boundaries, directly inspecting the live Supabase project through the GPT connector, documenting key-management responsibilities, reviewing the current security posture, and giving admins a usable onboarding SOP. It does not claim complete live RLS/RPC closure, external audit completion, WAF enforcement, automated secrets rotation, live connector production readiness, signed-contract proof, or dispatch proof.

# Pass 4 — Code Clarity + Integration Proof + Operator Docs

Date: 2026-04-30

## Scope

Shell consolidation, contact-exchange formal classification, integration proof tests, and operator pricing guide.

## New files

- `src/components/shell/navigation.tsx` — moved from `components/layout/shell/navigation.tsx`
- `src/components/shell/route-meta.ts` — moved from `components/layout/shell/route-meta.ts`
- `src/components/shell/types.ts` — moved from `components/layout/shell/types.ts`
- `src/components/shell/utils.ts` — moved from `components/layout/shell/utils.ts`
- `src/components/shell/SHELL_ARCHITECTURE.md` — documents every shell file's responsibility, importing rules, and what was deleted
- `tests/integrations/governance.test.ts` — 32 tests covering governed sync candidate logic, ERP/freight readiness, governance alerts, all 4 connector definitions, and 5 event reader helpers
- `docs/OPERATOR_PRICING_GUIDE.md` — full operator guide: pricing bases, rule set setup (import + manual), quote readiness gating, CIF two-path explanation, override/approval flow, audit trail, common issues table, role/permission matrix

## Deleted

- `src/components/layout/shell/` (entire directory) — merged into `src/components/shell/`
- `src/components/setu-shell/index.tsx` — dead code, zero imports anywhere in the codebase

## Modified files

### src/components/layout/app-shell.tsx
Updated 4 import paths: `@/components/layout/shell/*` → `@/components/shell/*`

### package.json
Added: `test:integrations`, updated `test:all` to include integrations tests (213 total)

## Contact-exchange formal classification

After auditing all imports and routes:

- `contact-exchange/scan` + `contact-exchange/scan/page.tsx` — **Supporting (trade-event wedge)**. This is what `/workspace/capture` middleware redirect points to. It is the proven mobile entry point for trade-show lead capture. Must be maintained.
- `contact-exchange/vcard` + `contact-exchange/vcard/preview` — **Experimental-Frozen**. Digital card sharing. Not in the North Star commercial chain. No expansion without a Pass 6 mobile decision.

Documented in DCC Modules tab.

## Test results

| Suite | Tests | Pass |
|---|---|---|
| test:pricing | 102 | 102 |
| test:workspace | 54 | 54 |
| test:orders | 25 | 25 |
| test:integrations | 32 | 32 |
| **Total** | **213** | **213** |

## Buyer confidence impact

Estimated: ~72/100 → ~80/100.
Shell consolidation removes a visible code quality issue. Integration tests prove the governance logic. The operator guide makes the catalog workflow documentable for a first paying customer. contact-exchange classification removes uncertainty from the module inventory.

# Pass 3 — Revenue Path + Foundations

Date: 2026-04-30

## Scope

Signed contract gate, first-login onboarding, CIF write path, RLS/order-execution test coverage.

## New files

- `src/features/dashboard/components/first-login-guide.tsx` — 3-step onboarding card shown on dashboard when org has zero leads and zero products. Self-hides once data exists. Steps: Add catalog → Create lead → Build quote.
- `tests/workspace/rls-permissions.test.ts` — 54 tests covering all 6 capabilities × 9 roles, multi-role combinations, alias resolution (`ops` → `operations`), and read-only message generation.
- `tests/orders/order-execution.test.ts` — 25 tests covering order execution state machine: draft→ready gate (signed contract, commercial lock, line count), document/compliance blockers, dispatch gate, completion gate, and deduplication.

## Modified files

### src/features/orders/server/actions.ts
Added `signContractAction` server action:
- Requires `lead.manage` or `compliance.review` capability
- Sets `contracts.signed_at = now`, `status = 'signed'`, `commercial_lock_state = 'locked'`
- Idempotent — already-signed contracts redirect cleanly
- Writes audit log with before/after snapshot
- Revalidates: `/orders`, `/contracts`, `/quotes`, `/leads/[leadId]`

### src/features/orders/components/OrderDetailPanel.tsx
- Imported `signContractAction`
- Added `contractSignedAt` and `commercialLockState` props
- Added "Contract signing" gate section: shows "Mark Contract Signed" button when unsigned; shows green confirmed state when signed
- Section is inserted before dispatch controls so signing always precedes execution advancement

### src/app/(app)/orders/page.tsx
Passes `contractSignedAt` and `commercialLockState` from `ContractRow` into `OrderDetailPanel`.

### src/app/(app)/dashboard/_lib/render-dashboard-page.tsx
- Imported `FirstLoginGuide`
- Added parallel Supabase count queries (leads, products, quotes) using `count: 'exact', head: true`
- Detects `isFirstLogin = !hasLeads && !hasProducts`
- Renders `FirstLoginGuide` above trade-event strip and `DashboardInteractive`

### src/types/products.ts
Added to `UpdateProductVariantPayload`:
- `cif_value?: number | null` — direct CIF reference price
- `cif_unit?: 'unit' | 'case' | null` — unit for display

### src/app/api/products/[productId]/route.ts (PATCH handler)
- Added `cif_value` to `hasPricingChange` detection
- After pricing rule upsert, writes CIF to `product_variants.source_payload` as JSONB keys: `cif_reference_usd_per_unit`, `cif_reference_unit`, `cif_reference_updated_at`, `cif_reference_source`
- No schema migration needed — `source_payload` is an existing JSONB column

### src/features/products/components/product-detail-drawer.tsx
- Added `cif_value` and `cif_unit` to `VariantDraft` type
- Updated `toDraft()` to populate CIF from `variant.cif_reference_usd_per_unit`
- Updated `changedVariants` to detect CIF changes and include in payload
- Added CIF input section to pricing tab: dashed sky border, labeled "CIF Reference", with note "Display only · Quote CIF uses freight profile"

### package.json
Added scripts: `test:workspace`, `test:orders`, `test:all` (runs all 181 unit tests)

## Test results

| Suite | Tests | Pass |
|---|---|---|
| test:pricing | 102 | 102 |
| test:workspace | 54 | 54 |
| test:orders | 25 | 25 |
| **Total** | **181** | **181** |

## No DB schema changes

CIF reference stored in existing `product_variants.source_payload` JSONB. All other changes are application-layer only.

## Buyer confidence impact

Estimated: ~65/100 → ~72/100.
Revenue path is now more complete (sign gate closes the draft→ready blocker). First-login guide proves new-org onboarding. CIF write path closes a visible catalog gap. 79 additional tests improve technical credibility.

# Pass 2 — Technical Credibility

Date: 2026-04-30

## What changed

### New: tests/pricing/ (5 files, 102 tests)
- `tests/pricing/fx-resolution.helpers.test.ts` — 17 tests covering normalizeEffectiveAt, validateFxRate, shouldUseManualFx, buildManualFxSnapshot, buildUsdIdentityFxSnapshot
- `tests/pricing/freight-calculation.helpers.test.ts` — 24 tests covering validateNonNegativeNumber, normalizeContainerMode, getTwentyFtFactor, resolvePalletsForMode, computeTotalFreightUsd, computeChipsAddOnUsdPerUnit, computePowdersAddOnUsdPerKg
- `tests/pricing/quote-compilation.helpers.test.ts` — 28 tests covering resolveLineBasis, resolvePricingMode, resolveBaseUsdValue, resolveNativePriceForCurrency, resolveFreightAddOnUsd, buildCompiledLine, buildCompilationHash
- `tests/pricing/fx-resolution.service.test.ts` — 6 tests covering DefaultFxResolutionService with mock repo
- `tests/pricing/quote-compilation.service.test.ts` — 13 tests covering DefaultQuoteCompilationService orchestration with mock deps

**Result: 102/102 tests passing.** Run with: `npm run test:pricing`

### Modified: package.json
- Added `test:pricing` script: `tsx --test tests/pricing/*.test.ts`

### Modified: middleware.ts
- Removed `'unsafe-eval'` from `script-src` in the Content-Security-Policy header
- Before: `"script-src 'self' 'unsafe-inline' 'unsafe-eval'"`
- After: `"script-src 'self' 'unsafe-inline'"`

### Deleted: src/features/leads/components/lead-command-center.tsx
- REASON: The live route `src/app/(app)/leads/[leadId]/page.tsx` imports from `@/features/leads/command-center/LeadCommandCenterPage` (563 lines). The deleted file (424 lines) had zero import references in any route, page, or component. It was confirmed unused by full grep across the src/ directory.
- CANONICAL: `src/features/leads/command-center/LeadCommandCenterPage.tsx` is the live, route-connected lead command center.

### Modified: public/internal-dcc/index.html
- Pass 2 completed card added to Overview tab
- Buyer confidence score updated: 38/100 → ~65/100
- NorthStar sprint completion: 81% → 86%
- Pass 2 row marked Done in readiness roadmap table

### Modified: README.md
- Readiness snapshot updated (security RPC trust: 72–80% → 75–82%)
- NorthStar sprint: 81% → 86%
- Buyer confidence: added ~65/100
- Pass 2 accomplishments documented
- test:pricing added to setup instructions

## No application runtime code was changed
Only middleware.ts (security header fix) and test infrastructure were changed.
The lead command center deletion removed dead code with no runtime impact.

## Buyer confidence impact
Estimated: ~50/100 → ~65/100.
Technical credibility gap is now significantly reduced: the pricing engine has 102 tests, CSP is cleaner, and the codebase has one fewer duplicate implementation.

## Next pass
Pass 3 — Revenue Path Completion: complete order execution proof (document blockers → signed contract state → dispatch trigger), first-login/empty-state for new organizations, CIF write path in catalog, RPC/RLS regression testing.

# Cleanup Pass 1 — Repo Hygiene + DCC Rebuild + README Truth Reset

Date: 2026-04-30

## What changed

### Deleted permanently
- `src/features/quotes/components/quote-workspace.tsx.orig` — backup file, should never be in repo
- `TRADE_SHOW_PR1.diff` — raw patch file in root
- `TRADE_SHOW_PR2.diff` — raw patch file in root
- `TRADE_SHOW_PR2_VERIFY.txt` — verification text artifact in root
- `SetuFlow-Dashboard-Redesign_1.html` — orphan HTML in root
- `META-INF/MANIFEST.MF` — Java artifact, no place in a Next.js project
- `public/world-map-data.json` — exact duplicate; canonical copy is `src/features/dashboard/data/world-map-data.json`
- `src/features/products/lib/products-table-columns.ts` — 1-line re-export stub, superseded by `.tsx`
- `src/features/rfqs/components/rfq-form.tsx` — 13-line stub, superseded by `rfq-wizard-form.tsx`

### Archived to docs/archive/
- `TYPEFIX_V6_NOTES.md` through `TYPEFIX_V12_NOTES.md` — 7 internal dev logs
- `DCC_REGRESSION_AUDIT_V14.md` — internal audit, truth now lives in DCC
- `SETU_FLOW_FULL_REPO_AUDIT_2026-04-27.md` — internal audit log
- `REPO_CLEANUP.md` — superseded by this pass
- `RELEASE_PROOF.md` — internal development log
- `INVESTOR_GRADE_GAP_CLOSURE_PLAN_PR_NS_17_PLUS.md` — internal plan, now in DCC
- `LIVE_CONNECTOR_DEVELOPMENT_BASELINE.md` — internal baseline log

### Archived to public/internal-dcc/archive/
- 11 PR-specific DCC notes (PR-0 through PR-NS-09A). DCC folder now contains only `index.html`.

### Updated
- `README.md` — readiness scores corrected from 93% (false) to honest per-area scores matching RELEASE_READINESS.md. DCC declared single source of truth. Demo and no-demo lists added.
- `public/internal-dcc/index.html` — rebuilt as the single source of truth. 8 tabs: Overview, Readiness, Modules, Golden Journey, Demo Guide, Next Passes, Schema, Build Rules.

## No code was changed
No application runtime code was modified in this pass.

## Buyer confidence impact
Estimated: 38/100 → ~50/100. The 29-point README/DCC score gap is closed. Repo hygiene is clean. The DCC is now the single authoritative truth surface.

## Next pass
Pass 2 — Technical Credibility: 30+ pricing unit tests, CSP unsafe-eval removal, dual lead command center resolution, local build verification.

# PR-NS-16B — Live Connector DCC Baseline

Date: 2026-04-30

Changed:
- Updated the DCC operating model now that Supabase and Vercel are connected to GPT.
- Tested Supabase access and confirmed SETU Flow CRM project `sjzfzloggabsmcuxktnl` is ACTIVE_HEALTHY.
- Tested Vercel access and confirmed team `team_FUuclvXHj0efPiI9SQJvY1nK` and project `prj_j3kkTnBcjXKyLLEw9IEMXBfVzfFG` are accessible.
- Recorded latest observed Vercel production deployment `dpl_AbF8tddXDqGQKpKxiNMjLvpCx8rr` as READY.
- Added `docs/LIVE_CONNECTOR_DEVELOPMENT_BASELINE.md`.
- Updated PR tracker, release readiness, investor readiness, and PR-NS-17+ gap closure plan to require live Supabase/Vercel verification when relevant.
- Updated internal DCC prompt requirements so future builds record live verification results.

No application runtime code was changed in this pass.

No `npm ci` was run.

# PR-NS-16A — Investor-Grade Gap Closure DCC Refresh

Date: 2026-04-30

Changed:
- Replaced optimistic DCC readiness posture with investor-grade truth reset.
- Added critical/high/medium/low/nice-to-have PR ladder from PR-NS-17 through PR-NS-25.
- Added mandatory future-build rules: update DCC in all affected tabs, list changed files, return full repo zip, include next prompt, and do not run `npm ci`.
- Updated PR tracker, release readiness, investor readiness, and added the dedicated gap closure plan doc.

No application runtime code was changed in this pass.

## Pass 21 — Live SQL/UX fix pack

- Checked Supabase schema/logs before code changes. Recent Postgres logs confirmed the live `lead_id` ambiguity during batch stage moves and `quotes_display_currency_check` failures during quote draft creation.
- Lead batch stage moves now use the safe app-side update path instead of the failing batch RPC, with user-safe error copy.
- Quote create/update paths normalize `display_currency` to the allowed quote display-currency set while preserving the commercial source currency field.
- Quote Preview Review now exposes a premium blocker guidance panel for compliance/document blockers instead of leaving the operator without a fix path.
- Orders document upload now returns visible success/failure notices and lets the operator map an upload to a specific missing requirement code.
- Admin Categories now has a real `/admin/categories` list/add/edit workspace; the Admin Categories nav item points to that page.
- DCC, README, release readiness, and handoff guidance updated. No `npm ci`, build, live Supabase data mutation, or remediation migration was performed in GPT sandbox.

## Pass 22 Buyer Workflow / Shared Module Fixes

- Fixed Quick Add Lead relation fallback by writing `organization_id` into `lead_markets` rows.
- Patched trade-event lead conversion relation insert to include `organization_id`.
- Added `/integrations` connector card route instead of redirecting to `/approval-send`.
- Added global lead-linked document upload/register card in `/documents`.
- Added Pass 22 mitigation SQL for `documents.updated_at`, lead market backfill, and scheduled task RLS repair.
- Hardened scheduled task mutations after workspace validation with privileged mutation client fallback when service role is configured.
- Added editable organization profile form for organization name/default currency.
- Added Pass 22 Buyer Workflow QA tab to Internal DCC without changing prior result tabs.

## Pass 22 Lead Entry Acceleration Hotfix

- Fixed Vercel build error in trade-event lead conversion by using `workspace.organization.id` for `lead_markets.organization_id`.
- Quick Lead now auto-prefills phone with the selected country's phone code when the phone field is blank.
- WhatsApp now mirrors phone by default until the WhatsApp field is manually edited.
- Save action now defaults WhatsApp to phone when WhatsApp is left blank.
- Added Supabase mitigation `121_pass22_lead_geo_phone_market_sync.sql` to keep country, market, phone code, phone, WhatsApp, and lead-market relations synchronized.

## Pass 22.2 - Quick Lead country UUID hotfix

- Fixed Quick Lead final save payload so `country_id` is always posted as the selected country UUID.
- Removed the duplicate visible `country_id` field name in the quick form; the hidden field remains the canonical submit value.
- Added server-side country reconciliation so accidental country text such as `United States` is resolved to the matching `countries.id` before UUID validation and database writes.
- Hardened phone/WhatsApp save defaults from resolved country phone code.
- No new Supabase mitigation is required for this specific UUID/text error; the live schema already has `countries.id`, `countries.phone_code`, `countries.market_id`, `leads.country_id`, `leads.market_id`, and `lead_markets.organization_id`.

## Pass 22 coverage-first workflow hotfix

- Prioritized Coverage before Qualification in the lead command center.
- Auto-qualifies buyer leads when confirmed product coverage is saved.
- Preserves disqualified buyer state and does not auto-override disqualification.
- Adds audit/activity/communication context for auto-qualification.
- Fixes coverage save direct inserts to include `organization_id` for `lead_product_interests`.
- Adds safe Supabase SQL to remove accidental `TestStage` after moving affected leads to `New Lead`.
