-- C4 Batch 1: remove anonymous execution from privileged SECURITY DEFINER RPCs.
revoke execute on function public.app_advance_order_stage_tx(uuid, uuid, text, uuid, jsonb) from public, anon;
revoke execute on function public.app_convert_external_opportunity_to_lead(uuid, uuid, text, uuid) from public, anon;
revoke execute on function public.app_create_lead_quote_draft_tx(uuid, uuid, uuid, text) from public, anon;
