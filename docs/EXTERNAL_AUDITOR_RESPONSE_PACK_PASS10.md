# External Auditor Response Pack - Pass 10

**Status:** Ready-to-send preparation pack. This is **not** a completed external audit report.

## 1. Audit scope summary

The requested audit scope should include the Next.js web app and middleware headers, Supabase Auth/session handling, Supabase public schema, RLS policies, views, functions, RPC grants, workspace roles/capabilities, quote/order/contract/document/compliance workflows, upload paths, admin invitation/member-role flows, public quote/share/intake routes, and AI/WhatsApp/provider configuration if enabled.

## 2. System architecture summary

SETU Flow is a governed commercial CRM for export/import trade. Commercial truth is the center: Lead, Catalog, Quote, Override, Approval, Communication, Order/Contract, Integration, AI, then Hardening. Communications, integrations, AI, and hardening must not outrun the commercial record.

## 3. Auth/session handling summary

- Supabase Auth is used for authentication and session handling.
- The anon key is public-facing; RLS and RPC gates must enforce data boundaries.
- The service-role key is server-only by policy and must never enter client bundles.
- Workspace authorization is modeled through nine roles and six capabilities.

## 4. Supabase RLS/RPC posture

Known live read-only checks from Pass 6-8 showed:

| Check | Result |
|---|---:|
| Public base tables | 80 |
| Public tables with RLS enabled | 80 |
| Public tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |

Open advisor classes include `rls_enabled_no_policy`, `security_definer_view`, `function_search_path_mutable`, `anon_security_definer_function_executable`, `authenticated_security_definer_function_executable`, and leaked password protection disabled.

## 5. Known open findings

| Auditor concern | Current answer | Evidence | Status |
|---|---|---|---|
| RLS enabled but no policies | 39 public tables remain RLS-enabled without policies based on prior read-only checks | `docs/SUPABASE_ADVISOR_REVIEW_PASS8.md`, Pass 9 implementation plan | Open |
| SECURITY DEFINER view | `active_product_pricing_rules_v` requires review/remediation | Pass 8 remediation plan | Open |
| Mutable function search path | Several functions need fixed `search_path` review | Pass 8/9 plans | Open |
| Anon SECURITY DEFINER RPC execute grants | Unsafe/public execute surface needs revoke/review | Pass 8/9 RPC hardening plan | Open |
| Authenticated SECURITY DEFINER RPC execute grants | Needs DB-level membership/capability checks for privileged flows | Pass 8 DB capability design | Open |
| Leaked password protection | Supabase Auth dashboard setting remains an operations task | Security advisor review docs | Open |
| External audit | No completed third-party report exists | This pack only | Pending |
| WAF/rate limits | Evidence checklist exists, no deployment proof | WAF plan/checklist | Pending |

## 6. Evidence provided

- `public/internal-dcc/index.html`
- `README.md`
- `docs/RELEASE_READINESS.md`
- `docs/SECURITY_POLICY.md`
- `docs/SECURITY_HARDENING_REVIEW_PASS5.md`
- `docs/SUPABASE_ADVISOR_REVIEW_PASS6.md`
- `docs/SUPABASE_ADVISOR_REVIEW_PASS7.md`
- `docs/SUPABASE_ADVISOR_REVIEW_PASS8.md`
- `docs/SUPABASE_ADVISOR_REMEDIATION_PLAN_PASS8.md`
- `docs/RPC_GRANT_HARDENING_PLAN_PASS8.md`
- `docs/DATABASE_CAPABILITY_CHECKS_DESIGN_PASS8.md`
- `docs/SUPABASE_REMEDIATION_IMPLEMENTATION_PASS9.md`
- Draft migrations under `supabase/migrations/pass9_*_advisor_remediation.sql`
- Security tests under `tests/security/`

## 7. Evidence missing

- Completed external audit report.
- Applied Supabase remediation and before/after advisor output.
- Direct negative RPC integration tests on safe staging/test DB.
- WAF/rate-limit provider evidence.
- Monitoring/alerting evidence.
- Backup/restore drill evidence.
- New signed-contract and dispatch proof record.
- First pilot customer evidence.

## 8. Remediation plan and owner table

| Area | Remediation plan | Owner | Evidence required | Status |
|---|---|---|---|---|
| Supabase advisors | Apply reviewed Pass 9 draft migrations in staging, then production if approved | Technical owner / Supabase admin | Before/after advisor report | Planned |
| RPC grants | Revoke `anon` from privileged RPCs; grant only where needed; add DB capability checks | Technical owner | Grant matrix + negative tests | Planned |
| DB capability checks | Implement helper matching app role model | Technical owner | SQL migration + tests | Planned |
| External audit | Send this pack and remediate findings | Founder / technical owner | Audit report + tracker | Pending |
| WAF/rate limits | Configure provider rules and capture evidence | Vercel/WAF admin | Rule export/screenshots/test requests | Pending |
| Monitoring/backups | Configure alerting and complete restore drill | Ops owner | Alert and drill evidence | Pending |
