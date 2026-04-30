-- PR-NS-20: Quote/order RPC permission hardening and trigger search_path cleanup.
-- Scope: revoke anonymous execution only for quote/order RPCs used by app workflows,
-- grant back to authenticated users, and pin search_path for quote/order helpers.

revoke execute on function public.app_create_quote_with_line_items_and_fanout_tx(uuid, uuid, uuid, uuid, text, text, text, text, jsonb, text, boolean, text, text) from public;
grant execute on function public.app_create_quote_with_line_items_and_fanout_tx(uuid, uuid, uuid, uuid, text, text, text, text, jsonb, text, boolean, text, text) to authenticated;

revoke execute on function public.app_create_quote_with_line_items_tx(uuid, uuid, uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.app_create_quote_with_line_items_tx(uuid, uuid, uuid, uuid, text, text, text, jsonb) to authenticated;

revoke execute on function public.app_update_quote_with_line_items_and_fanout_tx(uuid, uuid, uuid, text, text, text, text, text, uuid, jsonb, text, boolean, text, text) from public;
grant execute on function public.app_update_quote_with_line_items_and_fanout_tx(uuid, uuid, uuid, text, text, text, text, text, uuid, jsonb, text, boolean, text, text) to authenticated;

revoke execute on function public.app_update_quote_with_line_items_tx(uuid, uuid, text, text, text, text, uuid, jsonb) from public;
grant execute on function public.app_update_quote_with_line_items_tx(uuid, uuid, text, text, text, text, uuid, jsonb) to authenticated;

revoke execute on function public.app_send_quote_version_with_fanout_tx(uuid, uuid, text, text, boolean, text, text) from public;
grant execute on function public.app_send_quote_version_with_fanout_tx(uuid, uuid, text, text, boolean, text, text) to authenticated;

revoke execute on function public.app_send_quote_version_tx(uuid, uuid) from public;
grant execute on function public.app_send_quote_version_tx(uuid, uuid) to authenticated;

revoke execute on function public.app_ensure_contract_for_accepted_quote_tx(uuid, uuid, uuid, text) from public;
grant execute on function public.app_ensure_contract_for_accepted_quote_tx(uuid, uuid, uuid, text) to authenticated;

revoke execute on function public.app_sync_contract_from_quote_tx(uuid, uuid, uuid, uuid) from public;
grant execute on function public.app_sync_contract_from_quote_tx(uuid, uuid, uuid, uuid) to authenticated;

revoke execute on function public.app_progress_contract_with_fanout_tx(uuid, uuid, uuid, text, text, text) from public;
grant execute on function public.app_progress_contract_with_fanout_tx(uuid, uuid, uuid, text, text, text) to authenticated;

revoke execute on function public.app_update_contract_workspace_details_tx(jsonb) from public;
grant execute on function public.app_update_contract_workspace_details_tx(jsonb) to authenticated;

revoke execute on function public.app_quote_contract_snapshot(uuid) from public;
grant execute on function public.app_quote_contract_snapshot(uuid) to authenticated;

alter function public.sync_quote_current_version() set search_path = public;
alter function public.sync_quote_status_from_version() set search_path = public;
alter function public.app_sync_quote_from_version() set search_path = public;
alter function public.app_create_draft_quote_version_from_compile_tx(jsonb) set search_path = public;
alter function public.app_quote_before_insert_defaults() set search_path = public;
alter function public.app_contract_progression_blocker_count(uuid, uuid) set search_path = public;
alter function public.app_assert_contract_progression_ready() set search_path = public;
alter function public.generate_quote_number(uuid) set search_path = public;
alter function public.app_send_quote_version_tx(uuid, uuid) set search_path = public;
