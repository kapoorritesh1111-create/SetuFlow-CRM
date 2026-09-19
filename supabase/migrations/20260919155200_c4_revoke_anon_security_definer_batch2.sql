-- C4 Batch 2: remove anonymous execution from privileged lead mutation RPCs.
revoke execute on function public.app_record_save_lead_non_stage_fanout_tx(uuid, uuid, uuid, jsonb) from public, anon;
revoke execute on function public.app_record_save_lead_stage_change_fanout_tx(uuid, uuid, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.app_refresh_lead_relations_tx(uuid, uuid, uuid[], uuid[]) from public, anon;
