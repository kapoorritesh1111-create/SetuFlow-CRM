-- C4 Batch 11: remove anonymous execution from internal invitation delivery and quote acceptance RPCs.
revoke execute on function public.app_safe_accept_sent_quote_tx(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.app_finalize_invitation_delivery_tx(jsonb) from public, anon;
