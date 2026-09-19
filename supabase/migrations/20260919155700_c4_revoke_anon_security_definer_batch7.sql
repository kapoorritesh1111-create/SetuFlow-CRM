-- C4 Batch 7: remove anonymous execution from internal tenant-data read RPCs.
revoke execute on function public.get_orders_execution_lead_display(uuid) from public, anon;
revoke execute on function public.get_effective_notif_pref(uuid, uuid, text, text) from public, anon;
revoke execute on function public.match_guru_embeddings(uuid, vector, integer, text[]) from public, anon;
