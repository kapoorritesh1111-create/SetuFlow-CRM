# C4 Security Closeout — Anonymous SECURITY DEFINER Classification

Date: 2026-09-19

## Result
Anonymous-callable SECURITY DEFINER functions reduced from 36 to 9.

## Preserve for now — RLS/auth helpers
These are referenced by production RLS policies and must not be revoked without policy redesign:
- is_org_member(uuid)
- is_org_admin(uuid)
- is_setu_platform_admin()
- is_smc_owner()

## Intentional public endpoints
These support public/tokenized behavior and should remain exposed while their input validation remains intact:
- get_order_document_preview_by_token(text)
- increment_kb_article_view_count(uuid)
- provision_trade_show_trial_workspace(...)

## Needs dedicated redesign / trace
Do not blanket-revoke until the calling flow is fully traced:
- app_finalize_invitation_acceptance_tx(jsonb)
  - privileged membership/role mutation
  - current function body does not itself validate an invitation token
  - caller supplies invitation/org/user/email fields
  - should ultimately sit behind a validated acceptance flow or include strong token/auth validation

- create_guided_trial_entitlement(uuid, uuid, text, date)
  - creates/updates entitlement state
  - currently anonymous-callable
  - should ultimately be reachable only through a validated provisioning path or explicit authorization guard

## C4 closeout
C4 blanket grant hardening is complete.
Further work on the two redesign candidates should be treated as feature-flow hardening, not bulk security cleanup.

Production runtime errors after Batches 1-11: 0.
