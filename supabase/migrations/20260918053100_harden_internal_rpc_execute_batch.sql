-- Paid-client hardening Batch 2: remove unnecessary direct RPC execution.
-- rls_auto_enable is an event-trigger function and should not be callable through PostgREST.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

-- repair_quote_number_counter is maintenance/internal workflow logic.
-- Preserve trusted server access only.
revoke execute on function public.repair_quote_number_counter(uuid) from public, anon, authenticated;
grant execute on function public.repair_quote_number_counter(uuid) to service_role;

-- Packaging defaults are an authenticated org-scoped action guarded by is_org_member().
-- Remove anonymous/public execution while preserving authenticated use.
revoke execute on function public.seed_packaging_reference_defaults(uuid) from public, anon;
grant execute on function public.seed_packaging_reference_defaults(uuid) to authenticated, service_role;
