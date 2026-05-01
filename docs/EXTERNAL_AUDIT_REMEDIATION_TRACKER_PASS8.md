# External Audit Remediation Tracker — Pass 8

Date: 2026-04-30

This tracker is ready for a future third-party audit. The seeded rows below are **known pre-audit items**, not external audit findings.

| Finding ID | Source | Severity | Area | Finding | Owner | Fix plan | Evidence required | Status |
|---|---|---|---|---|---|---|---|---|
| PRE-001 | Supabase advisor | Info | RLS | `rls_enabled_no_policy` remains on 39 RLS-enabled tables | Technical owner / Supabase admin | Add explicit policy, deny-all policy, or remove exposed access by table category | Advisor after screenshot/export, migration diff, tests | Known pre-audit item |
| PRE-002 | Supabase advisor | Error | Pricing view | `security_definer_view` on `active_product_pricing_rules_v` | Technical owner | Convert to invoker-safe access or gated function | View/function diff, cross-workspace negative test | Known pre-audit item |
| PRE-003 | Supabase advisor | Warn | Functions | `function_search_path_mutable` on multiple functions | Technical owner | Add fixed `search_path` to reviewed functions | Migration diff and advisor after evidence | Known pre-audit item |
| PRE-004 | Supabase advisor | Warn | RPC grants | `anon_security_definer_function_executable` remains | Supabase admin | Revoke anon execute except narrow intentionally public functions | Grant diff, advisor after evidence, anon negative tests | Known pre-audit item |
| PRE-005 | Supabase advisor | Warn | RPC grants | `authenticated_security_definer_function_executable` remains | Technical owner | Add DB membership/capability gates to high-risk SECURITY DEFINER functions | Function diff, role negative tests | Known pre-audit item |
| PRE-006 | Supabase Auth | Warn | Auth | Leaked password protection disabled | Supabase admin | Enable in Supabase Auth settings | Dashboard screenshot/export | Known pre-audit item |
| PRE-007 | Pass 6/7 docs | Medium | Edge security | WAF/rate-limit proof missing | Vercel admin / Technical owner | Configure WAF/rate limits and collect evidence | Provider rule export, test evidence | Known pre-audit item |
| PRE-008 | Pass 6/7 docs | Medium | Operations | Monitoring/alerting proof missing | Technical owner | Configure monitoring and alert routing | Alert rules, sample alert, owner | Known pre-audit item |
| PRE-009 | Pass 6/7 docs | Medium | Resilience | Backup/restore drill missing | Supabase admin | Run restore drill in non-production environment | Drill log, timestamp, owner sign-off | Known pre-audit item |
| PRE-010 | Pass 6/7 docs | Medium | Integrations | Live connector proof missing | Product/technical owner | Prove ERP/freight connector with safe pilot path | Event logs, provider evidence, audit entries | Known pre-audit item |

## How to use after audit

- Replace `PRE-*` or add `AUD-*` rows when a third-party auditor issues a finding.
- Keep the original source, severity, and evidence requirement.
- Do not mark a finding closed until there is repo, deployment, or provider evidence.
