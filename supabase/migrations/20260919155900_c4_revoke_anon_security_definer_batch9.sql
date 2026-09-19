-- C4 Batch 9: remove anonymous execution from internal trade-show trial maintenance RPCs.
revoke execute on function public.seed_trade_show_trial_preview_data(uuid) from public, anon;
revoke execute on function public.sync_trade_show_trial_onboarding_request(uuid) from public, anon;
