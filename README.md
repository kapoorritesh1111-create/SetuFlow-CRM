# Setu Flow CRM

> **Single source of truth:** `public/internal-dcc/index.html`  
> **Current locked baseline:** `SetuFlow-CRM-main(41)` / commit `89a825a` / Vercel production `READY`  
> **Current operating mode:** Live QA hardening plan active. Do not claim 100/100 until P0/P1 live action defects, build proof, security/ops proof, dispatch/completion proof, and pilot evidence are all closed.

## Current readiness snapshot after merged live QA reviews

| Area | Honest readiness |
|---|---:|
| Build / deploy confidence | **9.5/10** |
| UX / action confidence | **4.5/10** |
| Buyer journey confidence | **4.5/10** |
| Supplier journey confidence | **6.0/10** |
| Admin / setup confidence | **7.5/10** |
| Security / RPC trust | **90–94% cap** |
| Buyer confidence | **~96–97/100 hold** |
| 100/100 | **Not claimable** |

**Why confidence is held:** Vercel production build/deploy proof remains clean for commit `89a825a`, and the live app is connected to Supabase. However, two live UX/CTO reviews identify and reproduce P0/P1 live action defects: global Share my vCard dead action, quote Continue failing to open a workspace, Open order dead action, raw `lead_id is ambiguous` SQL error exposure, lead/quote row-click no-ops, lead tab/filter issues, Quote Preview terms-step failure, and Products Pricing View partial behavior.

**Next path:** Pass 19 fixes P0 action hardening. Pass 20 fixes P1 pilot hardening. Pass 21 verifies data/governance issues read-only before any live cleanup. Pass 22 performs live retest and Vercel/user build proof. Pass 23 closes security/ops. Pass 24 captures pilot and dispatch/completion proof. GPT must not run `npm ci` in sandbox; use Vercel or user logs for install/test/build proof.

---


Setu Flow CRM is a governed commercial system. Commercial truth is the center.

> **Single source of truth:** `public/internal-dcc/index.html`

---

## Architecture order

1. Lead truth → 2. Catalog truth → 3. Quote truth → 4. Override truth → 5. Approval truth → 6. Communication truth → 7. Order/contract truth → 8. Integration truth → 9. AI truth → 10. Hardening

**Governing rule:** AI, communications, integrations, and hardening are subordinate to commercial truth and must never outrun it.

---

## Current readiness snapshot

| Area | Honest readiness |
|---|---:|
| Core CRM workflow | 91–94% |
| Quote → Order revenue path | 92–95% |
| Order execution (sign → dispatch) | 83–87% |
| First paying customer | 88–92% |
| Security / RPC trust | 90–94% |
| Mobile truth / claim safety | 70–76% |
| Mobile-native parity | Not claimed |
| NorthStar sprint | 100% |
| Buyer confidence | **~98.5/100** (target 100; live Vercel production build/deploy for commit `89a825a` is clean; security/ops/pilot evidence still open) |

**Proven:** Live golden journey Q-00025 (accepted quote), signed contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e`, and 11 preserved contract lines. Sign-contract gate. FirstLoginGuide. CIF write path. Shell consolidated. 331 unit tests expected, including 46 Pass 5 security boundary tests. Live Supabase connector inspection verified the project is active/healthy and all 80 public base tables have RLS enabled. Pass 6 adds Supabase advisor/RPC review, external-audit prep, WAF/rate-limit plan, production-scale checklist, claim reconciliation, and a buyer-confidence path to 100. Pass 7 adds pilot launch, live proof planning, success metrics, support runbook, final investor/demo pack, and a live Supabase re-check. Pass 8 adds Supabase advisor remediation planning, RPC grant hardening planning, DB-level capability design, external audit remediation tracking, WAF evidence checklist, and another live read-only re-check. Pass 9 adds draft-only Supabase remediation implementation assets, rollback planning, negative RPC/design assertion tests, live proof-record checklist, and a 100/100 evidence gate. Pass 10 adds the final production launch gate, external auditor response pack, pilot evidence capture, and investor-ready 100/100 proof bundle. Pass 11 adds pilot evidence review, customer readiness decisioning, post-launch remediation backlog, production monitoring proof checklist, and final investor/customer claim lock. Pass 12 adds final remediation execution status, live negative RPC verification status, first-pilot evidence closure, monitoring/backup evidence closure, and final launch/no-launch decision. Pass 13 adds post-decision remediation status, pilot operations checklist, production support activation checklist, customer/investor evidence handoff, and final frozen launch-claim archive. Pass 14 adds actual evidence review, live Supabase proof for accepted quote/signed contract/11 preserved contract lines, production remediation closeout, pilot-to-production transition decision, final customer-facing launch packet, and an archived 100/100 evidence checklist. Pass 15 adds a UX visual review and fix plan for Leads, Orders, Quotes, Trade Events, and Organization Setup. Pass 16 implements the premium UI fixes and Organization Setup SaaS onboarding redesign in code. Advisor findings remain open and no migrations were applied. Pass 17 adds the missing `tsx` devDependency declaration. Pass 18 live-baseline lock closes the prior sandbox-only dependency/build gap using Vercel production evidence for commit `89a825a`: `npm ci --no-audit --no-fund` installed 151 packages, `next build` compiled successfully, type/lint checks ran, 55 pages generated, deployment completed, and Vercel marked production READY. User-provided live validation confirms the deployed app is connected to Supabase.

**Not claimed:** Dispatch/completion proven, live Supabase RLS/RPC advisor closure, integration live connector, automated secrets rotation, deployed WAF/SIEM, mobile-native parity, completed external security audit, backup/restore drill, first-customer pilot evidence, and production-scale operating evidence. Clean Vercel install/build/deploy proof for the Pass 16 premium UI/Organization Setup redesign is now captured for commit `89a825a`.

---

## Test suite

| Command | Tests | Coverage |
|---|---|---|
| `npm run test:pricing` | 102 | FX, freight, compilation services |
| `npm run test:workspace` | 54 | Role permissions, capability gates |
| `npm run test:orders` | 25 | Order execution state machine |
| `npm run test:integrations` | 32 | Governed sync candidates, alerts, connectors |
| `npm run test:security` | 118 | Permission boundaries, order-action gates, RPC grant hardening draft checks, DB capability design checks |
| **`npm run test:all`** | **331** | All unit tests |
| `npm test` | — | Alignment tests (routes, DCC, docs) |

---

## Passes completed

**Pass 1** — Repo hygiene: deleted junk files, archived internal dev logs, stripped DCC to `index.html`.

**Pass 2** — Technical credibility: 102 pricing unit tests, CSP `unsafe-eval` removed, dual lead command center resolved.

**Pass 3** — Revenue path + foundations: `signContractAction`, `FirstLoginGuide`, CIF write path, 79 new tests (RLS + order execution).

**Pass 4** — Code clarity + integration proof + operator docs:
- **Shell consolidated** — 3 directories → 1 (`src/components/shell/`). Dead `setu-shell` deleted. `SHELL_ARCHITECTURE.md` documents every file's responsibility and rules.
- **contact-exchange classified** — `/scan` = Supporting (trade-event wedge). `/vcard` = Experimental-Frozen.
- **32 integration proof tests** — governed sync candidates, ERP/freight readiness, governance alerts, all 4 connector definitions, event reader helpers.
- **`docs/OPERATOR_PRICING_GUIDE.md`** — pricing bases, rule set setup (import + manual), CIF two-path, override/approval flow, role matrix.

---


**Pass 5** — Security hardening + admin onboarding:
- **46 security boundary tests** — `tests/security/rls-boundaries.test.ts` and `tests/security/order-auth-boundaries.test.ts` cover application-layer role/capability gates without live Supabase mutation; live Supabase posture was separately inspected through the GPT Supabase connector.
- **`docs/SECURITY_POLICY.md`** — secrets inventory, location rules, rotation cadence, compromise response, and honest non-claims.
- **`docs/SECURITY_HARDENING_REVIEW_PASS5.md`** — review of existing hardening findings, middleware CSP/header posture, Supabase admin/server client separation, and live read-only Supabase connector findings.
- **`docs/SOP_ADMIN_ONBOARDING.md`** — non-technical admin setup flow from first login through first quote, with deferred items clearly listed.

**Pass 6** — External audit preparation + Supabase RPC hardening plan + production readiness:
- **`docs/SUPABASE_ADVISOR_REVIEW_PASS6.md`** — live read-only Supabase project identity, table RLS posture, advisor findings, sampled RPC grant exposure, and hardening recommendation table.
- **`docs/EXTERNAL_SECURITY_AUDIT_PREP.md`** — third-party audit scope, evidence pack, auditor questions, and pre-audit status.
- **`docs/WAF_RATE_LIMITING_PLAN.md`** — route-level WAF/rate-limit plan and non-claims.
- **`docs/PRODUCTION_SCALE_READINESS.md`** — database, application, operational, and scale-readiness checklist.
- **`docs/CLAIM_RECONCILIATION_PASS6.md`** — claim-by-claim reconciliation across DCC, README, RELEASE_READINESS, and investor wording.
- **`docs/BUYER_CONFIDENCE_TO_100.md`** — remaining proof path from ~92 to 100.


**Pass 7** — Pilot customer launch + live proof pack:
- **`docs/PILOT_CUSTOMER_LAUNCH_CHECKLIST.md`** — pre-launch, launch-day, go/no-go, owner matrix, and pilot non-claims.
- **`docs/LIVE_SIGNED_CONTRACT_AND_DISPATCH_PROOF_PLAN.md`** — new-record proof plan for signed contract and dispatch without mutating Q-00025.
- **`docs/FIRST_CUSTOMER_SUCCESS_METRICS.md`** — activation, operational, and buyer-confidence metrics for the first paying pilot.
- **`docs/PRODUCTION_SUPPORT_RUNBOOK.md`** — support roles, common incidents, triage, severity, placeholder response targets, and non-claims.
- **`docs/FINAL_INVESTOR_DEMO_READINESS_PACK.md`** — demo narrative, proven path, caveats, checklist, and investor Q&A.
- **`docs/SUPABASE_ADVISOR_REVIEW_PASS7.md`** — live read-only re-check confirming advisor/RPC posture is unchanged from Pass 6.


**Pass 9** — Draft Supabase remediation implementation + negative RPC tests:
- **No live Supabase remediation applied** — authorization was not explicit, so production remained untouched.
- **`docs/SUPABASE_REMEDIATION_IMPLEMENTATION_PASS9.md`** — records draft-only implementation status and claim boundaries.
- **`docs/MIGRATION_DRY_RUN_AND_ROLLBACK_PASS9.md`** — dry-run and rollback plan for RPC grants, search path, RLS policies, SECURITY DEFINER view/function changes, DB helper, and Auth dashboard settings.
- **Draft SQL migrations** — four draft-only files under `supabase/migrations/pass9_*_advisor_remediation.sql`.
- **72 new security/design assertion tests** — `tests/security/rpc-grant-hardening.test.ts` and `tests/security/db-capability-design.test.ts`, raising expected full suite to 331 tests.
- **`docs/LIVE_PROOF_RECORD_CREATION_CHECKLIST_PASS9.md`** — new-record proof checklist that preserves Q-00025.
- **`docs/BUYER_CONFIDENCE_100_EVIDENCE_GATE_PASS9.md`** — final evidence gate confirming 100/100 is not claimable yet.

## Next passes

| Pass | Focus | Buyer Confidence |
|---|---|---|
| Pass 5 | RLS boundary tests + live Supabase inspection + security review + secrets policy + admin onboarding SOP | ~80 → 88 |
| Pass 6 | Advisor review + external audit prep + WAF/rate-limit docs + production scale checklist + claim reconciliation | ~88 → 92 |
| Pass 7 | Pilot launch checklist + live proof plan + success metrics + support runbook + investor/demo pack | ~92 → 96 |
| Pass 8 | Supabase advisor remediation plan + RPC hardening plan + DB capability design + audit/WAF evidence checklists | ~96 → 98 |
| Pass 9 | Draft remediation implementation assets + rollback plan + negative RPC/design tests + 100/100 evidence gate | ~98 → ~98 |
| Pass 10 | Final launch gate + auditor response pack + pilot evidence capture + investor 100 proof bundle | ~98 → ~98 |
| Pass 11 | Pilot evidence review + customer readiness decision + monitoring proof checklist + final claim lock | ~98 → ~98 |
| Pass 12 | Final remediation execution status + live negative RPC status + first-pilot/monitoring closure + final launch decision | ~98 → ~98 |
| Pass 13 | Post-decision remediation status + pilot operations + support activation + final evidence handoff + frozen claim archive | ~98 → ~98 |
| Pass 14 | Actual evidence review + live accepted quote/signed contract proof + pilot expansion decision + customer launch packet + 100/100 evidence archive | ~98 → ~98 |
| Pass 15 | UX visual review + premium UI fix plan + Organization Setup redesign brief | ~98 → ~97 |
| Pass 16 | Premium UI implementation + Organization Setup SaaS onboarding redesign; local verification blocked by missing deps | ~97 → ~97.5 |
| Pass 17 | Dependency restoration follow-up; `tsx` declared | ~97.5 → ~97.5 |
| Pass 18 | Live baseline lock; Vercel production `npm ci` + `next build` + deployment READY for commit `89a825a` | ~97.5 → ~98.5 |
| Future evidence passes | Actual advisor closure, deployed WAF/monitoring, backup drill, live connector, dispatch proof, pilot evidence | ~98.5 → 100 |

---

## Shell structure (consolidated in Pass 4)

All shell concerns in `src/components/shell/`. See `SHELL_ARCHITECTURE.md` for file-by-file ownership. Consuming parent: `src/components/layout/app-shell.tsx`.

---

## Setup

```bash
npm install        # restore project-local Next.js/test tooling
npm run dev
npm run test:all   # 331 unit tests expected
npm run build      # required before claiming Pass 16/17 clean verification
npm run verify     # typecheck + contracts + dashboard + tests + build
```


**Pass 8** — Supabase advisor remediation plan + RPC grant hardening evidence checklist:

- **`docs/SUPABASE_ADVISOR_REMEDIATION_PLAN_PASS8.md`** — maps open advisor classes to remediation categories without applying migrations.
- **`docs/RPC_GRANT_HARDENING_PLAN_PASS8.md`** — draft grant hardening, DB gates, and negative-test plan.
- **`docs/DATABASE_CAPABILITY_CHECKS_DESIGN_PASS8.md`** — database-level capability-check design matching the app role model.
- **`docs/EXTERNAL_AUDIT_REMEDIATION_TRACKER_PASS8.md`** — pre-audit remediation tracker seeded with known gaps.
- **`docs/WAF_DEPLOYMENT_EVIDENCE_CHECKLIST_PASS8.md`** — evidence checklist for future WAF/rate-limit deployment proof.
- **`docs/SUPABASE_ADVISOR_REVIEW_PASS8.md`** — confirms findings are materially unchanged from Pass 7.

## What this repo does not claim

- External security audit, automated secrets rotation, WAF, SIEM
- Mobile-native parity
- Production-scale operating evidence, monitoring evidence, backup/restore drill, or pilot evidence
- Signed contract + dispatch proven end-to-end on live Supabase (Pass 7 provides proof plan; Pass 10 provides evidence capture only; Pass 11/12 confirm no new pilot evidence was supplied)
- Integration with live external connector (ERP/freight mocks only)

**Pass 10** — Final production launch gate + auditor/investor evidence pack:
- **No live Supabase remediation applied** — authorization was not explicit, so production remained untouched.
- **`docs/FINAL_PRODUCTION_LAUNCH_GATE_PASS10.md`** — final launch gate with blockers, conditional pilot readiness, and 100/100 gating.
- **`docs/EXTERNAL_AUDITOR_RESPONSE_PACK_PASS10.md`** — auditor-ready response pack covering architecture, known findings, evidence, missing evidence, and remediation ownership.
- **`docs/PILOT_LAUNCH_EVIDENCE_CAPTURE_PASS10.md`** — first-pilot evidence capture template using a new proof record, not Q-00025.
- **`docs/INVESTOR_READY_100_PROOF_BUNDLE_PASS10.md`** — investor-safe 100/100 proof bundle and non-claim boundaries.


**Pass 11** — Pilot evidence review + customer readiness decision + production monitoring proof:
- **`docs/PILOT_EVIDENCE_REVIEW_PASS11.md`** — evidence review template; all pilot/customer evidence remains pending because no new pilot artifacts were provided.
- **`docs/CUSTOMER_READINESS_DECISION_PASS11.md`** — first paying customer decision remains conditional go, not unconditional.
- **`docs/POST_LAUNCH_REMEDIATION_BACKLOG_PASS11.md`** — seeded backlog for advisor remediation, RPC hardening, WAF, monitoring, backup drill, live connector, signed/dispatch proof, and pilot evidence.
- **`docs/PRODUCTION_MONITORING_PROOF_PASS11.md`** — monitoring proof checklist; no production alert evidence claimed.
- **`docs/FINAL_INVESTOR_CUSTOMER_CLAIM_LOCK_PASS11.md`** — locked investor/customer wording boundaries and evidence required to upgrade claims.

Pass 11 does not apply Supabase remediation, does not mutate live data, and does not raise buyer confidence beyond ~98/100 because no new evidence was supplied.


**Pass 12** — Final production remediation execution status + live verification status + launch decision:
- **No live Supabase remediation applied** — authorization was not explicit, so production remained untouched.
- **`docs/FINAL_REMEDIATION_EXECUTION_STATUS_PASS12.md`** — records every remediation area as pending authorization/evidence.
- **`docs/LIVE_NEGATIVE_RPC_VERIFICATION_PASS12.md`** — keeps live mutation-prone RPC verification pending and links to Pass 9 tests.
- **`docs/FIRST_PILOT_EVIDENCE_CLOSURE_PASS12.md`** — marks first-pilot evidence pending because no new proof artifacts were supplied.
- **`docs/MONITORING_AND_BACKUP_EVIDENCE_CLOSURE_PASS12.md`** — marks monitoring/backup proof pending because no provider evidence was supplied.
- **`docs/FINAL_LAUNCH_DECISION_PASS12.md`** — executive decision is **conditional pilot only**, not broad production launch.

Pass 12 does not apply Supabase remediation, does not mutate live data, and does not raise buyer confidence beyond ~98/100 because no new evidence or authorization was supplied.

**Pass 13** — Post-decision remediation status + pilot operations + final evidence handoff:
- **`docs/POST_DECISION_REMEDIATION_STATUS_PASS13.md`** — remediation remains pending authorization; no live changes applied.
- **`docs/PILOT_OPERATIONS_CHECKLIST_PASS13.md`** — controlled pilot operations checklist and evidence capture cadence.
- **`docs/PRODUCTION_SUPPORT_ACTIVATION_PASS13.md`** — production support activation requirements, all marked pending evidence.
- **`docs/CUSTOMER_INVESTOR_FINAL_EVIDENCE_HANDOFF_PASS13.md`** — safe customer/investor wording and missing evidence.
- **`docs/FINAL_FROZEN_LAUNCH_CLAIM_ARCHIVE_PASS13.md`** — frozen claim boundaries after Pass 13.

Pass 13 does not apply Supabase remediation, does not mutate live data, and does not raise buyer confidence beyond ~98/100 because no new evidence or authorization was supplied.

**Pass 14** — Actual evidence review + pilot-to-production transition decision:
- **`docs/ACTUAL_EVIDENCE_REVIEW_PASS14.md`** — records live read-only Supabase proof: Q-00025 is accepted, contract/order `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` is signed, and 11 contract lines are preserved.
- **`docs/PRODUCTION_REMEDIATION_CLOSEOUT_PASS14.md`** — confirms Supabase advisor/RPC remediation remains open because no migrations were applied and advisor findings remain.
- **`docs/PILOT_TO_PRODUCTION_TRANSITION_DECISION_PASS14.md`** — upgrades the decision to pilot expansion approved, not broad production launch.
- **`docs/FINAL_CUSTOMER_FACING_LAUNCH_PACKET_PASS14.md`** — customer-safe launch packet based only on proven evidence.
- **`docs/ARCHIVED_100_EVIDENCE_CHECKLIST_PASS14.md`** — archived checklist of gates still required for 100/100.

Pass 14 closes live signed-contract proof for the golden journey, but does not apply Supabase remediation, does not prove dispatch/completion, and does not raise buyer confidence beyond ~98/100 because production controls remain open.

**Pass 16** — Premium UI implementation + Organization Setup redesign:

- **`src/components/ui/premium-command-bar.tsx`** — shared premium command-bar primitives for filters, fields, inputs/selects, and active chips.
- **Leads / Follow-up** — named active chips and clearer filtered-empty-state copy.
- **Orders** — premium execution command bar with visible dispatch/docs chips.
- **Quotes** — duplicate mode selector removed; shared command bar and active chips added.
- **Trade Events** — premium event cockpit, KPI cards, proof-boundary card, and clearer CTAs.
- **Organization Setup** — SaaS onboarding flow with setup checklist, customer setup cards, catalog readiness, team setup, and governance routing.
- **Verification:** `npm run test:all` and `npm run build` were attempted in order but stopped because project-local binaries were unavailable (`tsx: not found`, `next: not found`).


**Pass 17** — Dependency restoration + verification follow-up:

- **`package.json`** — adds the missing `tsx` devDependency used by `npm run test:all`.
- **`docs/PASS17_VERIFICATION.md`** — records dependency restoration attempts, partial Node 22 smoke test signal, and the remaining verification blocker.
- **Verification:** the earlier sandbox install gap is superseded by live Vercel production evidence for commit `89a825a`: `npm ci --no-audit --no-fund` installed 151 packages and `npm run build` completed successfully before deployment. Buyer confidence is updated to ~98.5/100 while security/ops/pilot evidence remains open.

**Pass 18** — Live baseline lock:

- **`docs/LIVE_BASELINE_LOCK_PASS18.md`** — locks `SetuFlow-CRM-main(41).zip` / commit `89a825a` as the active baseline.
- **Vercel evidence:** production deployment `dpl_2tMU2g417f8wDAtMJPXDHrEkxoD8` is READY after clean dependency install and Next.js build.
- **Supabase connection:** user-provided live validation confirms the deployed app is connected to Supabase; advisor/RPC remediation remains separate and open.

**Pass 15** — UX visual review + premium UI fix plan:
- **`docs/UX_VISUAL_REVIEW_PASS15.md`** — records visual issues across Leads, Orders, Quotes, Trade Events, and Organization Setup.
- **`docs/PREMIUM_UI_FIX_PLAN_PASS15.md`** — defines the shared premium filter bar, page-specific fixes, and build/type-check acceptance criteria.
- **`docs/ORGANIZATION_SETUP_REDESIGN_PASS15.md`** — defines the SaaS onboarding/setup flow needed for first customers.

Pass 15 is a review/planning pass, not an implementation pass. Buyer confidence is adjusted to ~97/100 until the premium UI and Organization Setup fixes are implemented and build-verified.
