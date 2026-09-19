-- C4 Batch 10: remove anonymous execution from internal entitlement/support helper RPCs.
revoke execute on function public.get_trial_capability(uuid) from public, anon;
revoke execute on function public.is_trial_org(uuid) from public, anon;
revoke execute on function public.is_platform_support_user(uuid) from public, anon;
