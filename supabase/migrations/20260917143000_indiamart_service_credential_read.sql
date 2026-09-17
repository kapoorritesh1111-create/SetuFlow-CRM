-- Service-only secret reader for server-side integration adapters.
-- Never expose raw integration credentials to authenticated or anon clients.

create or replace function public.get_integration_credential_service(
  p_organization_id uuid,
  p_provider text,
  p_credential_type text default 'api_key'
)
returns text
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_secret_id uuid;
  v_secret text;
begin
  select ic.secret_id
    into v_secret_id
  from public.integration_credentials ic
  where ic.organization_id = p_organization_id
    and ic.provider = lower(trim(coalesce(p_provider, '')))
    and ic.credential_type = lower(trim(coalesce(p_credential_type, 'api_key')))
  limit 1;

  if v_secret_id is null then
    return null;
  end if;

  select ds.decrypted_secret
    into v_secret
  from vault.decrypted_secrets ds
  where ds.id = v_secret_id;

  return v_secret;
end;
$$;

revoke all on function public.get_integration_credential_service(uuid, text, text) from public;
revoke all on function public.get_integration_credential_service(uuid, text, text) from anon;
revoke all on function public.get_integration_credential_service(uuid, text, text) from authenticated;
grant execute on function public.get_integration_credential_service(uuid, text, text) to service_role;

comment on function public.get_integration_credential_service(uuid, text, text) is
  'Returns a Vault-backed integration credential only to Supabase service_role for server-side adapters.';
