-- C4 Batch 8: remove anonymous execution from internal quote approval-state RPC.
revoke execute on function public.app_quote_version_approval_state(uuid) from public, anon;
