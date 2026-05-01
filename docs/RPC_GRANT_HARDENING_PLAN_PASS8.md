# RPC Grant Hardening Plan — Pass 8

Date: 2026-04-30

This document is a grant-hardening plan. SQL snippets are **draft only** and were not applied.

## Current posture summary

Live Supabase advisor checks remain materially unchanged from Pass 7. Several SECURITY DEFINER RPCs are executable by `anon` and many are executable by `authenticated`. App-layer gates are necessary and already tested, but database-level gates are needed for high-risk direct RPC exposure.

## RPC category plan

| RPC category | Current exposure | Recommended grant | Required DB check | Negative test | Status |
|---|---|---|---|---|---|
| Lead stage movement | Some lead movement RPCs executable by `anon` and `authenticated` | Revoke `anon`; grant only to `authenticated` where app path requires | Active workspace membership + `lead.manage` | Anon and viewer cannot move stage | Draft only |
| Quote create/update/send | Quote write/send RPCs generally authenticated; send/update are SECURITY DEFINER | Revoke `anon`; authenticated only through DB capability gate | `quote.send` for send/finalize; `lead.manage` for quote workspace mutation as designed | Viewer cannot send; operations cannot send quote | Draft only |
| RFQ create/update | RFQ RPCs reported executable by `anon` and `authenticated` | Revoke `anon`; authenticated only after membership/capability check | `lead.manage` or procurement/sourcing-specific DB rule if added | Anon cannot create/update RFQ | Draft only |
| Contract/order sync/progress | Contract/order progress RPCs authenticated; some helpers SECURITY DEFINER | Revoke `anon`; keep authenticated only with DB gate | `lead.manage` or `compliance.review` depending action | Viewer cannot progress; inactive member blocked | Draft only |
| Document/compliance workflow updates | Document/compliance RPCs executable by `anon` and authenticated | Revoke `anon`; authenticated only with DB gate | `compliance.review` or allowed document upload capability | Viewer cannot review/update document workflow | Draft only |
| Admin invitation/member role changes | Invitation/member RPCs executable by `anon` and authenticated | Revoke broad anon/admin writes; preserve only narrow token acceptance if needed | `settings.manage` or owner/admin DB gate | Sales/viewer cannot change roles | Draft only |
| Catalog/product/pricing writes | Catalog/pricing write RPCs executable by `anon` and authenticated | Revoke `anon`; authenticated with catalog capability | `catalog.manage` | Sales/operations/viewer cannot manage catalog | Draft only |

## Draft SQL snippets — not applied

```sql
-- Example only: exact signatures must be verified before execution.
revoke execute on function public.app_move_lead_stage_tx(uuid, uuid, uuid, uuid, timestamptz) from anon;
revoke execute on function public.app_update_document_workflow_tx(uuid, uuid, uuid, text, text, text) from anon;
revoke execute on function public.app_update_compliance_workflow_tx(uuid, uuid, uuid, text, text, text) from anon;
revoke execute on function public.app_upsert_invitation_tx(jsonb) from anon;

grant execute on function public.app_move_lead_stage_tx(uuid, uuid, uuid, uuid, timestamptz) to authenticated;
```

```sql
-- Search-path hardening example only.
alter function public.app_move_lead_stage_tx(uuid, uuid, uuid, uuid, timestamptz)
  set search_path = public, extensions;
```

```sql
-- Placeholder database-level gate pattern only.
-- Do not apply until the canonical membership schema and role mapping are reviewed.
create or replace function public.app_has_workspace_capability(
  p_organization_id uuid,
  p_user_id uuid,
  p_capability text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = p_user_id
      and coalesce(om.is_active, true) = true
      and public.app_role_has_capability(om.role, p_capability)
  );
$$;
```

## Required follow-up before applying

1. Verify exact function signatures from `pg_proc`.
2. Decide which functions are intentionally public.
3. Add DB capability helper and tests before broad grants remain.
4. Dry-run in a non-production branch.
5. Capture advisor before/after evidence.

## Non-claims

No grants were changed in Pass 8. This plan does not close advisor findings or prove DB-level capability enforcement.
