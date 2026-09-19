-- C4 Batch 4: remove anonymous execution from privileged lead mutation RPCs.
revoke execute on function public.app_replace_lead_follow_up_tx(uuid, uuid, timestamptz, uuid) from public, anon;
revoke execute on function public.app_upsert_lead(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, text, timestamptz, uuid, uuid, text[], text[]) from public, anon;
