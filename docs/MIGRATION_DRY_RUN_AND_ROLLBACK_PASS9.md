# Migration Dry-Run and Rollback Plan — Pass 9

Updated: 2026-04-30  
Status: Draft-only. No migrations applied.

## Purpose

This plan defines how to test and roll back the Pass 9 Supabase remediation drafts before any production change. It is intentionally conservative because the open findings include SECURITY DEFINER RPC exposure and RLS policy gaps.

## Dry-run table

| Migration | Purpose | Dry-run command | Rollback approach | Evidence required | Status |
|---|---|---|---|---|---|
| `pass9_001_rpc_grant_hardening_advisor_remediation.sql` | Revoke unsafe `anon` execution and constrain privileged RPCs | Apply to Supabase branch/staging with `supabase db push --dry-run` or SQL editor transaction on staging | Restore prior grants from captured `has_function_privilege` snapshot | Before/after grant matrix for `anon` and `authenticated`; app smoke test | Draft only |
| `pass9_002_search_path_and_view_advisor_remediation.sql` | Add fixed `search_path`; replace SECURITY DEFINER view pattern | Apply to branch; compare advisor output | Revert function definitions/view definition from schema dump | Advisor diff showing fewer `function_search_path_mutable` and no SECURITY DEFINER view warning | Draft only |
| `pass9_003_rls_policy_advisor_remediation.sql` | Add explicit deny-all or scoped policies for no-policy RLS tables | Apply to branch; run table access probes | Drop newly added policies or restore previous dump | Advisor diff for `rls_enabled_no_policy`; read/write probes by role | Draft only |
| `pass9_004_db_capability_helper_advisor_remediation.sql` | Add DB-level capability helper and example RPC gate | Apply to branch; run negative RPC tests | Drop helper and revert altered function bodies | Negative tests for viewer/sales/operations/anon/inactive/cross-workspace cases | Draft only |
| Supabase Auth leaked password protection | Enable dashboard-level password leak protection | Dashboard staging/project setting review | Disable setting if login regression occurs, after review | Screenshot/export of Auth setting and test login/password behavior | Manual setting, not SQL |

## Required pre-flight evidence

- Fresh production schema dump.
- Fresh function grant matrix for all privileged RPCs.
- Fresh Supabase advisor export.
- Application smoke test plan by role.
- Safe test accounts for owner, admin, sales, operations, viewer, inactive member, and cross-workspace member.
- Rollback SQL reviewed before any live apply.

## Rollback principles

1. Never apply grant changes without a captured grant baseline.
2. Never replace a SECURITY DEFINER view without preserving the original view definition.
3. Never add permissive policies just to satisfy an advisor warning.
4. Prefer deny-all policies for internal staging/import tables unless a scoped policy is intentionally designed.
5. Roll back immediately if owner/admin cannot complete the golden quote/order workflow in staging.

## Live production status

No Pass 9 remediation was applied to production. Buyer confidence remains ~98/100 until applied remediation and evidence improve the live advisor state.
