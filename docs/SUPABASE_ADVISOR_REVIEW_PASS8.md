# Supabase Advisor Review — Pass 8

Date: 2026-04-30

This is a read-only live re-check. No Supabase migrations were applied. No production data or golden record was mutated.

## Project identity

| Item | Live read-only result |
|---|---|
| Project | SETU Flow CRM |
| Project ID | `sjzfzloggabsmcuxktnl` |
| Region | `us-west-2` |
| Status | `ACTIVE_HEALTHY` |
| Database | PostgreSQL 17.6.1.063, GA |
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |
| Advisor state | Open findings remain; materially unchanged from Pass 7 |

## Security advisor result

Materially unchanged from Pass 7. Open advisor classes remain:

- `rls_enabled_no_policy`
- `security_definer_view`
- `function_search_path_mutable`
- `anon_security_definer_function_executable`
- `authenticated_security_definer_function_executable`
- `auth_leaked_password_protection`

## Sample privileged RPC exposure classes

The advisor continues to report SECURITY DEFINER grant exposure across lead movement, quote/RFQ, catalog/pricing, contract/order, document/compliance, and admin invitation/member workflows. Pass 8 produced remediation and evidence plans only; it did not apply grants or function changes.

## Pass 8 interpretation

- **Improved:** documentation and remediation readiness.
- **Unchanged:** live Supabase advisor findings and RPC grant exposure.
- **Not claimed:** advisor closure, external audit completion, WAF deployment, monitoring proof, backup drill, live connector proof, signed/dispatch proof.
