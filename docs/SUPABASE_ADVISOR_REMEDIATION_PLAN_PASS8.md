# Supabase Advisor Remediation Plan — Pass 8

Date: 2026-04-30

This is a remediation **plan**, not an applied migration record. The GPT Supabase connector was used read-only. No migrations were applied and no production data was mutated.

## Live read-only baseline

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

## Advisor class remediation plan

### 1. `rls_enabled_no_policy`

The live advisor continues to report RLS-enabled tables with no policies. The affected objects fall into categories rather than one uniform policy shape:

- **Reference / lookup tables:** `hs_codes`, `hs_duties`, `exchange_rates`, `document_requirement_rules`, freight assumptions, and similar configuration tables.
- **Import / staging tables:** `import_runs`, `import_issues`, normalization rules, and `stg_*` product/pricing/lead/quote tables.
- **Empty future workflow tables:** playbooks, lead scoring, tags, integration rows, compliance item scaffolding.
- **Pricing/catalog compatibility or SSOT tables:** product variants, product prices, pricing rule sets, product pricing rules, quote templates.
- **Operational support tables:** `rate_limit_hits`, `scheduled_tasks`, role permission support data.

Recommended treatment:

- Do **not** add permissive `using (true)` policies just to silence the advisor.
- Tables used directly by app screens should receive explicit workspace-scoped read/write policies or be accessed only through gated server actions.
- Internal staging/import tables should be removed from public API exposure or locked to service-role/admin-only paths.
- Empty future tables should either receive explicit deny-all policies, move out of exposed public API paths, or remain documented as deferred until activated.

### 2. `security_definer_view`

The live advisor reports `public.active_product_pricing_rules_v` as a SECURITY DEFINER view.

Risk: the view may evaluate privileges/RLS as the view owner instead of the querying user. For pricing truth, this is sensitive because quote-ready pricing should remain workspace-scoped and governed.

Recommended remediation:

- Review the view definition before changing it.
- Prefer SECURITY INVOKER semantics where supported, or replace with a gated function that performs explicit organization membership/capability checks.
- Add regression tests proving users cannot see another workspace's active pricing rules.

### 3. `function_search_path_mutable`

The live advisor reports mutable search path on trigger helpers, pricing helpers, lead helpers, and utility functions.

Recommended remediation:

- Add fixed `search_path` to trusted functions, usually `set search_path = public, extensions` or a narrower schema list.
- Review SECURITY DEFINER functions before alteration so the security boundary is understood.
- Prioritize high-impact functions used by quote, lead, catalog, and contract/order workflows.

### 4. `anon_security_definer_function_executable`

The live advisor reports anon executable SECURITY DEFINER RPCs across lead movement, RFQ, catalog/pricing, invitations/memberships, document/compliance workflow, and helper functions.

Recommended remediation:

- Revoke `EXECUTE` from `anon` for every privileged write RPC unless it is intentionally public and independently safe.
- Invitation acceptance may need a narrow public path, but it should validate signed tokens and avoid broad workspace mutation.
- Direct lead, RFQ, quote, catalog, member, document, and compliance mutations should not be callable anonymously.

### 5. `authenticated_security_definer_function_executable`

The live advisor reports signed-in users can execute many SECURITY DEFINER functions.

Recommended remediation:

- Keep authenticated grants only where the app needs direct RPC access.
- Add database-level membership and capability checks inside high-risk SECURITY DEFINER functions.
- Align DB capability checks with the app capability model in `src/lib/workspace/permissions.ts`.
- Add negative integration tests for viewer, sales, operations, inactive member, and anon paths after remediation is authorized.

### 6. `auth_leaked_password_protection`

This is a Supabase Auth setting, not a repo-code issue.

Recommended remediation:

- Enable leaked-password protection in Supabase Auth dashboard before production launch.
- Capture screenshot/export evidence for the audit pack.

## Remediation table

| Advisor finding | Affected object/class | Risk | Recommended remediation | Migration needed? | Status |
|---|---|---|---|---|---|
| `rls_enabled_no_policy` | 39 RLS-enabled public tables without policies | Future table access can be ambiguous and advisors remain open | Add explicit workspace policy, deny-all policy, or remove exposed access by table category | Yes, after review | Planned, not applied |
| `security_definer_view` | `active_product_pricing_rules_v` | Pricing data may be evaluated with definer privileges | Convert to invoker-safe view/function or add explicit gated access | Likely | Planned, not applied |
| `function_search_path_mutable` | Pricing, lead, trigger, and utility functions | Search-path hijack risk | Add fixed `search_path` to reviewed functions | Yes | Planned, not applied |
| `anon_security_definer_function_executable` | Lead/RFQ/catalog/admin/document/compliance RPCs | Anonymous execution path for privileged functions | Revoke from `anon`, keep only explicitly public narrow functions | Yes | Planned, not applied |
| `authenticated_security_definer_function_executable` | Quote/order/admin/catalog/document RPCs | Any signed-in user may hit SECURITY DEFINER functions unless function gates enforce boundaries | Add DB membership/capability gates and negative tests | Yes | Planned, not applied |
| `auth_leaked_password_protection` | Supabase Auth project setting | Weak password reuse risk | Enable leaked-password protection in dashboard | Environment setting | Planned, not applied |

## Non-claims

This document does not claim advisor closure, production migration application, external audit completion, or DB-level capability enforcement. It is a reviewed remediation plan ready for Pass 9 authorization.
