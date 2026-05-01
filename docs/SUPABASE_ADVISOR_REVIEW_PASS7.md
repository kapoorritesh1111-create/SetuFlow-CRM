# SETU Flow CRM — Supabase Advisor Review Pass 7

**Status:** Read-only live re-check  
**Date:** 2026-04-30  
**Mutation policy:** No migrations applied. No production data mutated. Golden quote Q-00025 and contract `d129ffe2-c913-4cf7-9a7b-86ea6c9da54e` were not touched.

## 1. Project identity

| Item | Result |
|---|---|
| Project | SETU Flow CRM |
| Project ID | `sjzfzloggabsmcuxktnl` |
| Region | `us-west-2` |
| Status | `ACTIVE_HEALTHY` |
| Postgres | 17.6.1.063 / Postgres 17 |

## 2. Table RLS count check

| Check | Result |
|---|---:|
| Public base tables | 80 |
| Public base tables with RLS enabled | 80 |
| Public base tables with RLS disabled | 0 |
| RLS-enabled tables without policies | 39 |

## 3. Security advisor check

Pass 7 re-check is unchanged from Pass 6 in the important categories:

| Advisor category | Current state | Pass 7 status |
|---|---|---|
| `rls_enabled_no_policy` | 39 public tables are RLS-enabled but have no policies. | Unchanged / open |
| `security_definer_view` | `public.active_product_pricing_rules_v` reported as SECURITY DEFINER view. | Unchanged / open |
| `function_search_path_mutable` | Multiple public functions have mutable search paths. | Unchanged / open |
| `anon_security_definer_function_executable` | Several SECURITY DEFINER functions remain executable by `anon`. | Unchanged / open |
| `authenticated_security_definer_function_executable` | Several SECURITY DEFINER functions remain executable by `authenticated`. | Unchanged / open |
| `auth_leaked_password_protection` | Leaked password protection disabled. | Unchanged / open |

## 4. Sample privileged RPC grant check

The sampled privileged RPC posture remains materially unchanged from Pass 6. Examples of remaining risk classes include lead-stage movement, RFQ/quote/order/document/compliance/admin invitation/member functions where SECURITY DEFINER and broad execute grants need deliberate review.

| Area | Example functions / class | Pass 7 status | Recommendation |
|---|---|---|---|
| Quote | quote create/update/send functions | Some authenticated SECURITY DEFINER exposure remains | Keep app-layer gate; plan database-level capability checks and grant hardening. |
| Contract/order | contract sync/progress/detail functions | Authenticated exposure remains | Review grants and add DB-level capability checks before live negative RPC testing. |
| Document/compliance | document and compliance workflow update functions | Some anon/auth exposure remains | Revoke unsafe anon grants; enforce DB-level membership/capability. |
| Admin/invitations | invitation/member role functions | Some anon/auth exposure remains | Review public necessity; restrict grants where not intentionally public. |
| Lead movement | lead stage movement/fanout functions | Some anon/auth exposure remains | Restrict direct execution and add DB-level role/capability checks. |

## 5. Conclusion

Pass 7 did not remediate Supabase advisor findings. It confirms the same open security hardening path from Pass 6 while adding pilot launch, support, and demo readiness documentation. Security/RPC trust should remain bounded at 88-92% until advisor closure, grant hardening, and external audit evidence exist.
