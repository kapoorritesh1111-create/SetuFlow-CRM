# Supabase Advisor Review — Pass 6

Date: 2026-04-30

This review uses the GPT Supabase connector in read-only mode against the existing SETU Flow CRM Supabase project. No migrations were applied, no data was mutated, and the golden record was not changed.

## Project identity

| Field | Value |
|---|---|
| Project name | SETU Flow CRM |
| Project ID / ref | `sjzfzloggabsmcuxktnl` |
| Region | `us-west-2` |
| Status | `ACTIVE_HEALTHY` |
| Database | Postgres 17.6.1.063, GA channel |
| Created | 2026-03-09T14:58:36.346886Z |

## Table RLS posture

| Metric | Count | Status |
|---|---:|---|
| Public base tables | 80 | Inventory complete for this review |
| Public base tables with RLS enabled | 80 | Good baseline |
| Public base tables with RLS disabled | 0 | No disabled public-table RLS found |
| RLS-enabled tables without policies | 39 | Needs review / remediation plan |

Interpretation: SETU Flow has RLS enabled on every public base table, but enablement alone is not proof of complete authorization safety. Tables with RLS enabled and no policy may be intentionally service-role-only, staging-only, empty, deprecated, or not exposed through app paths, but each must be classified before production claims improve.

## Supabase security advisor findings

| Advisor finding | Current state | Risk | Recommendation | Status |
|---|---|---|---|---|
| `rls_enabled_no_policy` | 39 public tables reported with RLS enabled but no policies. | Medium until classified. | Classify each table as service-role-only, app-readable, app-writable, staging-only, deprecated, or needs policy. | Needs classification |
| `security_definer_view` | `public.active_product_pricing_rules_v` is reported as SECURITY DEFINER. | Possible bypass of caller-level RLS. | Review whether SECURITY DEFINER is required; prefer SECURITY INVOKER or locked grants if not required. | Needs review |
| `function_search_path_mutable` | Multiple functions lack fixed `search_path`. | Search-path hijack risk for privileged functions. | Add `SET search_path = public, pg_temp` or narrower explicit path in migrations after review. | Needs migration plan |
| `anon_security_definer_function_executable` | Several SECURITY DEFINER RPCs are executable by `anon`. | High for production if callable unauthenticated and not internally self-authorizing. | Revoke `EXECUTE` from `anon` for privileged RPCs unless deliberately public and internally safe. | Needs revoke plan |
| `authenticated_security_definer_function_executable` | Many SECURITY DEFINER RPCs are executable by `authenticated`. | Medium/high unless every RPC self-checks org membership and capability. | Add database-level capability checks or tighter grants for privileged workflow RPCs. | Needs hardening plan |
| Leaked password protection disabled | Supabase Auth leaked-password protection is off. | Weakens account security for password users. | Enable leaked-password protection in Supabase Auth settings before production/customer pilot. | Production setting |

## RPC risk review

Read-only SQL sampled quote, order/contract, document, compliance, lead-stage, RFQ, invitation, and membership RPCs. The review checked `has_function_privilege` for `anon` and `authenticated`.

| RPC / Area | `anon` | `authenticated` | Status | Notes |
|---|---:|---:|---|---|
| `app_create_quote_with_line_items_and_fanout_tx` | No | Yes | Acceptable only with app-layer + DB gate review | Quote creation is protected from anon, but authenticated direct execution remains possible. |
| `app_update_quote_with_line_items_and_fanout_tx` | No | Yes | Acceptable only with app-layer + DB gate review | Needs capability/org checks verified at database level. |
| `app_send_quote_version_with_fanout_tx` | No | Yes | Acceptable only with app-layer + DB gate review | App-layer `quote.send` tests exist; direct RPC posture still needs database review. |
| `app_ensure_contract_for_accepted_quote_tx` | No | Yes | Needs DB authorization review | Contract creation from accepted quote is protected from anon but signed-in direct execution must be constrained. |
| `app_progress_contract_with_fanout_tx` | No | Yes | Needs DB authorization review | Contract/order progression requires stronger DB-level proof before production. |
| `app_sync_contract_from_quote_tx` | No | Yes | Needs DB authorization review | Sync helper should be service/internal or self-authorizing. |
| `app_update_contract_workspace_details_tx` | No | Yes | Needs DB authorization review | Contract workspace edits should be capability-bound. |
| `app_update_document_workflow_tx` | Yes | Yes | Needs revoke | Document workflow is privileged and should not be anon-executable unless deliberately public and internally hardened. |
| `app_update_compliance_workflow_tx` | Yes | Yes | Needs revoke | Compliance workflow is privileged and should not be anon-executable unless deliberately public and internally hardened. |
| `app_move_lead_stage_tx` / `app_batch_move_leads_stage_tx` | Yes | Yes | Needs revoke | Lead-stage movement is a write path; anon execution should be revoked or internally denied. |
| `app_record_save_lead_stage_change_fanout_tx` | Yes | Yes | Needs revoke | Fanout helper should be internal or tightly permissioned. |
| `app_create_rfq_with_line_items_and_fanout_tx` / `app_update_rfq_with_line_items_and_fanout_tx` | Yes | Yes | Needs revoke | RFQ write paths should not be anon-executable. |
| `app_upsert_invitation_tx`, `app_update_invitation_role_tx`, `app_finalize_invitation_delivery_tx` | Yes | Yes | Needs revoke / explicit public acceptance split | Invitation delivery/admin updates are privileged; public acceptance should be isolated if needed. |
| `app_update_member_role_tx`, `app_set_membership_active_tx` | Yes | Yes | Needs revoke | Membership role/status changes are admin-only and should not be anon-executable. |
| `is_org_member`, `is_org_admin` | Yes | Yes | SECURITY DEFINER review | Helper functions may be intentionally callable, but grants and implementation must be reviewed. |

## Hardening recommendation table

| Finding | Current state | Risk | Recommendation | Status |
|---|---|---|---|---|
| Table RLS enablement | 80/80 public base tables have RLS enabled. | Low for enablement; remaining risk is policy design. | Keep RLS mandatory for every public table. | Baseline good |
| Tables without policies | 39 RLS-enabled public tables have no policies. | Medium until intent is documented. | Create a table-by-table policy classification register. | Needs classification |
| Anon-executable privileged RPCs | Multiple privileged workflow/admin RPCs are callable by `anon`. | High for production. | Prepare migration to revoke `EXECUTE` from anon for non-public RPCs. | Needs migration plan |
| Authenticated-executable SECURITY DEFINER RPCs | Many core workflow RPCs are callable by any signed-in user. | Medium/high if RPCs lack internal org/capability checks. | Verify or add internal org/capability checks; tighten grants where possible. | Needs DB-level proof |
| Mutable function search path | Multiple functions reported. | Medium. | Add fixed `search_path` to functions, especially SECURITY DEFINER. | Needs migration plan |
| SECURITY DEFINER view | `active_product_pricing_rules_v`. | Medium. | Review view definition and switch to invoker or controlled grants if possible. | Needs review |
| Leaked-password protection | Disabled. | Medium for auth hardening. | Enable in Supabase dashboard. | Production setting |
| App-layer boundary tests | 46 Pass 5 security tests plus prior workspace/order tests. | Reduces UI/action risk but does not prove direct RPC safety. | Keep tests; add database-level RPC tests after grants/functions are hardened. | Partially proven |

## Non-claims

This Pass 6 review does not claim Supabase advisor closure, external security audit completion, production WAF/rate-limit enforcement, full live RLS/RPC E2E denial proof, automated secrets rotation or SIEM, or signed-contract/dispatch proof on a real live customer order.
