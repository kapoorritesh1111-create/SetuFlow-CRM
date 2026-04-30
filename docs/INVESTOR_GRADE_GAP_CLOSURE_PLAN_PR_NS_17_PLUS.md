# Investor-Grade Gap Closure Plan — PR-NS-17+

Updated: 2026-04-30  
Current baseline: PR-NS-16B Live Connector DCC Baseline

## Operating change

Supabase and Vercel are now connected to GPT and were tested in this pass. That changes the build process from static repo-only review to live-verified product engineering.

Future PRs must check live systems when relevant:

- Supabase for schema, RLS, RPCs, seed/demo data, storage, auth/membership, logs, and advisors.
- Vercel for deployment status, build logs, protected deployment access, and runtime route checks.

Do not run `npm ci`.

## Verified connector baseline

| System | Result | ID |
|---|---|---|
| Supabase | Connected and SETU Flow CRM project found ACTIVE_HEALTHY | `sjzfzloggabsmcuxktnl` |
| Vercel team | Connected and team found | `team_FUuclvXHj0efPiI9SQJvY1nK` |
| Vercel project | Connected and project found | `prj_j3kkTnBcjXKyLLEw9IEMXBfVzfFG` |
| Latest Vercel deployment | READY production deployment observed | `dpl_AbF8tddXDqGQKpKxiNMjLvpCx8rr` |

## Critical path to 100%

### Critical

1. **PR-NS-17 — Sent quote outcome handoff fix**  
   Fix the revenue-path blocker. Must start with live Supabase quote/order/RLS verification.

2. **PR-NS-18 — Golden demo data reconciliation**  
   Use live Supabase data to create/verify one complete buyer journey.

### High

3. **PR-NS-19 — Mobile promise alignment**  
   Make mobile claim match actual routes and reference HTMLs.

4. **PR-NS-20 — Order execution proof hardening**  
   Make docs, blockers, execution state, and next action visible and credible.

5. **PR-NS-21 — Trade show wedge proof**  
   Capture → lead → follow-up → quote handoff → stats must be demonstrable.

### Medium

6. **PR-NS-22 — Integration proof mode**  
   Provide proof-mode evidence for WhatsApp/email/integration flow if real provider wiring is unavailable.

7. **PR-NS-23 — First-login and empty-state hardening**  
   Make fresh-org onboarding and empty states buyer-safe.

### Low

8. **PR-NS-24 — Claim reconciliation and investor script lock**  
   Ensure all docs, DCC, root page, and investor HTML claims match proven behavior.

### Nice-to-have / final lock

9. **PR-NS-25 — Final 100% verification pass**  
   Final manual checklist, route confidence, DCC lock, and regression notes.

## Live verification template for every PR

```text
LIVE VERIFICATION:
- Supabase project identified: yes/no + project ref
- Supabase schema checked: yes/no/not applicable
- Supabase data checked: yes/no/not applicable
- Supabase RLS/advisors checked: yes/no/not applicable
- Supabase logs checked: yes/no/not applicable
- Vercel project identified: yes/no + project id
- Vercel latest deployment checked: yes/no/not applicable
- Vercel build logs checked: yes/no/not applicable
- Runtime route checked through Vercel: yes/no/not applicable
```

## Build output rule

Every build must return:

- full updated repo zip
- exact changed-file list
- buyer impact
- investor demo impact
- verification performed
- verification not performed
- next prompt added to internal DCC
