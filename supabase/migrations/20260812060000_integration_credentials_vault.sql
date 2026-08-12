-- S51-INTEG-007: Secure provider credential storage for inbound integrations.
-- Secrets live in Supabase Vault; public metadata never contains the raw credential.

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  credential_type text not null default 'api_key',
  secret_id uuid not null,
  key_hint text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rotated_at timestamptz,
  constraint integration_credentials_provider_type_key unique (organization_id, provider, credential_type)
);

alter table public.integration_credentials enable row level security;

revoke all on table public.integration_credentials from anon;
grant select on table public.integration_credentials to authenticated;

create policy "Org admins view integration credential metadata"
on public.integration_credentials
for select
to authenticated
using (public.is_org_admin(organization_id));

create or replace function public.set_integration_credential(
  p_organization_id uuid,
  p_provider text,
  p_credential_type text,
  p_secret text
)
returns table(key_hint text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_provider text := lower(trim(coalesce(p_provider, '')));
  v_credential_type text := lower(trim(coalesce(p_credential_type, 'api_key')));
  v_secret text := trim(coalesce(p_secret, ''));
  v_secret_id uuid;
  v_existing_secret_id uuid;
  v_hint text;
  v_updated_at timestamptz := now();
begin
  if auth.uid() is null or not public.is_org_admin(p_organization_id) then
    raise exception 'Not authorized to manage integration credentials';
  end if;

  if v_provider = '' or v_provider !~ '^[a-z0-9_-]{2,64}$' then
    raise exception 'Invalid integration provider';
  end if;

  if v_credential_type = '' or v_credential_type !~ '^[a-z0-9_-]{2,64}$' then
    raise exception 'Invalid credential type';
  end if;

  if length(v_secret) < 6 then
    raise exception 'Credential is too short';
  end if;

  v_hint := '••••' || right(v_secret, 4);

  select ic.secret_id
    into v_existing_secret_id
  from public.integration_credentials ic
  where ic.organization_id = p_organization_id
    and ic.provider = v_provider
    and ic.credential_type = v_credential_type
  limit 1;

  if v_existing_secret_id is not null then
    perform vault.update_secret(
      v_existing_secret_id,
      v_secret,
      'setuflow:' || p_organization_id::text || ':' || v_provider || ':' || v_credential_type,
      'SETU Flow integration credential'
    );
    v_secret_id := v_existing_secret_id;
  else
    select vault.create_secret(
      v_secret,
      'setuflow:' || p_organization_id::text || ':' || v_provider || ':' || v_credential_type,
      'SETU Flow integration credential'
    ) into v_secret_id;
  end if;

  insert into public.integration_credentials (
    organization_id,
    provider,
    credential_type,
    secret_id,
    key_hint,
    created_by,
    created_at,
    updated_at,
    rotated_at
  ) values (
    p_organization_id,
    v_provider,
    v_credential_type,
    v_secret_id,
    v_hint,
    auth.uid(),
    v_updated_at,
    v_updated_at,
    case when v_existing_secret_id is not null then v_updated_at else null end
  )
  on conflict (organization_id, provider, credential_type)
  do update set
    secret_id = excluded.secret_id,
    key_hint = excluded.key_hint,
    updated_at = excluded.updated_at,
    rotated_at = excluded.rotated_at;

  return query select v_hint, v_updated_at;
end;
$$;

revoke all on function public.set_integration_credential(uuid, text, text, text) from public;
revoke all on function public.set_integration_credential(uuid, text, text, text) from anon;
grant execute on function public.set_integration_credential(uuid, text, text, text) to authenticated;

comment on table public.integration_credentials is
  'Admin-visible metadata for provider credentials. Raw secrets are stored only in Supabase Vault.';
comment on function public.set_integration_credential(uuid, text, text, text) is
  'Creates or rotates a Vault-backed integration credential after organization-admin authorization.';
