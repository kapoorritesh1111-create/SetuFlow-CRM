/*
PASS 9 DRAFT ONLY — DO NOT APPLY WITHOUT AUTHORIZATION
Purpose: RPC grant hardening draft for privileged SETU Flow functions.
Status: Not applied in Pass 9.

Pre-flight required:
1. Capture current grants with has_function_privilege for anon/authenticated.
2. Apply to staging/branch only.
3. Run negative RPC tests and owner/admin smoke tests.
4. Capture advisor diff.

Draft examples:

-- Lead stage movement
revoke execute on function public.app_move_lead_stage_tx(uuid, uuid, uuid, uuid, timestamptz) from anon;
revoke execute on function public.app_batch_move_leads_stage_tx(uuid, uuid[], uuid, uuid, timestamptz) from anon;

-- RFQ create/update
revoke execute on function public.app_create_rfq_with_line_items_and_fanout_tx(uuid, uuid, uuid, text, text, date, text, jsonb, text, integer, text) from anon;
revoke execute on function public.app_update_rfq_with_line_items_and_fanout_tx(uuid, uuid, uuid, text, text, date, text, jsonb, text, integer, text) from anon;
revoke execute on function public.app_update_rfq_with_line_items_tx(uuid, uuid, text, text, date, text, jsonb) from anon;

-- Document/compliance workflow
revoke execute on function public.app_update_document_workflow_tx(uuid, uuid, uuid, text, text, text) from anon;
revoke execute on function public.app_update_compliance_workflow_tx(uuid, uuid, uuid, text, text, text) from anon;

-- Admin invitation/member role changes
revoke execute on function public.app_upsert_invitation_tx(jsonb) from anon;
revoke execute on function public.app_update_invitation_role_tx(jsonb) from anon;
revoke execute on function public.app_update_member_role_tx(jsonb) from anon;
revoke execute on function public.app_set_membership_active_tx(jsonb) from anon;

-- Catalog/product/pricing writes
revoke execute on function public.app_save_catalog_price_tx(jsonb) from anon;
revoke execute on function public.app_delete_catalog_price_tx(jsonb) from anon;
revoke execute on function public.app_save_product_with_catalog_pricing_tx(jsonb) from anon;
revoke execute on function public.app_deactivate_product_tx(jsonb) from anon;

-- Quote/contract functions that remain callable by authenticated users must include DB-level membership/capability checks.
grant execute on function public.app_create_quote_with_line_items_and_fanout_tx(uuid, uuid, uuid, uuid, text, text, text, text, jsonb, text, boolean, text, text) to authenticated;
grant execute on function public.app_send_quote_version_with_fanout_tx(uuid, uuid, text, text, boolean, text, text) to authenticated;
grant execute on function public.app_progress_contract_with_fanout_tx(uuid, uuid, uuid, text, text, text) to authenticated;
*/
