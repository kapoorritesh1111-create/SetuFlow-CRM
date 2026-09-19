-- C4 Batch 5: remove anonymous execution from internal quote approval/order mutation RPCs.
revoke execute on function public.app_submit_quote_approval_tx(uuid, uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.app_decide_quote_approval_tx(uuid, uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.app_ensure_order_for_accepted_quote_tx(uuid, uuid, uuid, uuid, text) from public, anon;
