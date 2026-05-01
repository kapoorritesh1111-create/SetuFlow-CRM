# Supabase Advisor Review — Pass 9

Updated: 2026-04-30  
Mode: Read-only / no migrations applied  
Project: `SETU Flow CRM / sjzfzloggabsmcuxktnl / us-west-2 / ACTIVE_HEALTHY`

## Summary

Pass 9 did not apply live remediation. The Supabase state is treated as materially unchanged from Pass 8 unless a future authorized migration and advisor export prove otherwise.

| Check | Result |
|---|---:|
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |
| Advisor state | Open findings remain |
| Pass 9 status | Draft remediation only; no advisor closure claimed |

## Open advisor classes still considered active

| Advisor class | Current Pass 9 interpretation | Status |
|---|---|---|
| `rls_enabled_no_policy` | 39 tables still need deny-all/scoped policy decisions or removal from exposed API surface | Open |
| `security_definer_view` | `public.active_product_pricing_rules_v` still requires SECURITY INVOKER/replacement review | Open |
| `function_search_path_mutable` | Trusted functions still need reviewed fixed `search_path` migrations | Open |
| `anon_security_definer_function_executable` | Privileged RPCs callable by `anon` still require revocation unless intentionally public | Open |
| `authenticated_security_definer_function_executable` | SECURITY DEFINER functions callable by signed-in users still need DB-level gates | Open |
| `auth_leaked_password_protection` | Supabase Auth setting remains a dashboard/ops task | Open |

## RPC grant posture

Pass 9 adds draft SQL and pure assertion tests for the intended hardening posture. It does not prove the live DB blocks direct RPC execution.

## Claim boundary

No readiness document should claim Supabase advisor closure, applied grant hardening, DB-level capability enforcement, or 100/100 buyer confidence based on Pass 9 alone.
