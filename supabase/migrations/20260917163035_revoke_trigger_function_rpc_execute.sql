-- Paid-client hardening: SECURITY DEFINER trigger functions must only run through
-- their owning PostgreSQL triggers, not as directly callable Data API RPCs.
-- Trigger execution does not require EXECUTE grants for anon/authenticated roles.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as identity
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.prorettype = 'trigger'::regtype
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      fn.identity
    );
  end loop;
end
$$;
