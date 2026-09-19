-- C4 Batch 3: remove anonymous execution from privileged Settings mutation RPCs.
revoke execute on function public.app_save_settings_list_item_tx(jsonb) from public, anon;
revoke execute on function public.app_delete_settings_list_item_tx(jsonb) from public, anon;
revoke execute on function public.app_import_settings_snapshot_tx(jsonb) from public, anon;
