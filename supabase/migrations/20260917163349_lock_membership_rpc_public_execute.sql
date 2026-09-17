-- CREATE OR REPLACE preserves a function's PUBLIC execute ACL. Remove that
-- inherited path explicitly after hardening the function bodies.
revoke execute on function public.app_update_member_role_tx(jsonb) from public, anon;
revoke execute on function public.app_set_membership_active_tx(jsonb) from public, anon;
grant execute on function public.app_update_member_role_tx(jsonb) to authenticated, service_role;
grant execute on function public.app_set_membership_active_tx(jsonb) to authenticated, service_role;
