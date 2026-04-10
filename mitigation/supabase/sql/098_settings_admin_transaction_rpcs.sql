begin;

create or replace function public.app_save_settings_list_item_tx(p_payload jsonb)
returns table(saved_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text := lower(trim(coalesce(p_payload->>'table', '')));
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_item_id uuid := case
    when coalesce(p_payload->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'id')::uuid
    else null
  end;
  v_operation text := case when v_item_id is null then 'create' else 'update' end;
  v_existing jsonb := null;
  v_existing_org uuid := null;
  v_saved_id uuid := null;
  v_name text := nullif(trim(coalesce(p_payload->>'name', '')), '');
  v_parent_id uuid := case
    when coalesce(p_payload->>'parent_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'parent_id')::uuid
    else null
  end;
  v_market_id uuid := case
    when coalesce(p_payload->>'market_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_payload->>'market_id')::uuid
    else null
  end;
  v_sort_order integer := coalesce((p_payload->>'sort_order')::integer, 0);
  v_is_active boolean := coalesce((p_payload->>'is_active')::boolean, true);
  v_market_code text := nullif(trim(coalesce(p_payload->>'market_code', '')), '');
  v_iso2_code text := nullif(trim(coalesce(p_payload->>'iso2_code', '')), '');
  v_iso3_code text := nullif(trim(coalesce(p_payload->>'iso3_code', '')), '');
  v_phone_code text := nullif(trim(coalesce(p_payload->>'phone_code', '')), '');
  v_audit_action text := coalesce(nullif(trim(coalesce(p_payload->>'audit_action', '')), ''), 'settings_list_item_saved');
  v_audit_metadata jsonb := coalesce(p_payload->'audit_metadata', '{}'::jsonb);
  v_new jsonb := null;
begin
  if v_organization_id is null then
    raise exception 'Organization is required for settings list mutation.';
  end if;

  if v_table not in ('markets', 'countries', 'next_steps', 'product_categories') then
    raise exception 'Unsupported settings list table %', v_table;
  end if;

  if v_name is null then
    raise exception 'Settings list name is required.';
  end if;

  if v_item_id is not null then
    execute format('select organization_id from public.%I where id = $1', v_table)
      into v_existing_org
      using v_item_id;

    if v_existing_org is not null and v_existing_org <> v_organization_id then
      raise exception 'Settings list ID % is outside the active organization.', v_item_id;
    end if;

    execute format('select to_jsonb(t) from (select * from public.%I where id = $1 and organization_id = $2) t', v_table)
      into v_existing
      using v_item_id, v_organization_id;

    if v_existing is null then
      raise exception 'Settings list item % not found in the active organization.', v_item_id;
    end if;
  end if;

  if v_table = 'markets' then
    insert into public.markets (id, organization_id, name, market_code, sort_order, is_active)
    values (coalesce(v_item_id, gen_random_uuid()), v_organization_id, v_name, v_market_code, v_sort_order, v_is_active)
    on conflict (id) do update
      set name = excluded.name,
          market_code = excluded.market_code,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = timezone('utc', now())
    returning id into v_saved_id;

    select to_jsonb(t)
    into v_new
    from (
      select organization_id, name, market_code, sort_order, is_active
      from public.markets
      where id = v_saved_id
    ) t;
  elsif v_table = 'countries' then
    if v_market_id is not null then
      perform 1 from public.markets where id = v_market_id and organization_id = v_organization_id;
      if not found then
        raise exception 'Selected market is not available in the active organization.';
      end if;
    end if;

    insert into public.countries (id, organization_id, name, iso2_code, iso3_code, phone_code, market_id, sort_order, is_active)
    values (coalesce(v_item_id, gen_random_uuid()), v_organization_id, v_name, v_iso2_code, v_iso3_code, v_phone_code, v_market_id, v_sort_order, v_is_active)
    on conflict (id) do update
      set name = excluded.name,
          iso2_code = excluded.iso2_code,
          iso3_code = excluded.iso3_code,
          phone_code = excluded.phone_code,
          market_id = excluded.market_id,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = timezone('utc', now())
    returning id into v_saved_id;

    select to_jsonb(t)
    into v_new
    from (
      select organization_id, name, iso2_code, iso3_code, phone_code, market_id, sort_order, is_active
      from public.countries
      where id = v_saved_id
    ) t;
  elsif v_table = 'next_steps' then
    insert into public.next_steps (id, organization_id, name, sort_order, is_active)
    values (coalesce(v_item_id, gen_random_uuid()), v_organization_id, v_name, v_sort_order, v_is_active)
    on conflict (id) do update
      set name = excluded.name,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = timezone('utc', now())
    returning id into v_saved_id;

    select to_jsonb(t)
    into v_new
    from (
      select organization_id, name, sort_order, is_active
      from public.next_steps
      where id = v_saved_id
    ) t;
  else
    if v_parent_id is not null then
      perform 1 from public.product_categories where id = v_parent_id and organization_id = v_organization_id;
      if not found then
        raise exception 'Selected parent category is not available in the active organization.';
      end if;
    end if;

    insert into public.product_categories (id, organization_id, name, sort_order, is_active, parent_id)
    values (coalesce(v_item_id, gen_random_uuid()), v_organization_id, v_name, v_sort_order, v_is_active, v_parent_id)
    on conflict (id) do update
      set name = excluded.name,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          parent_id = excluded.parent_id,
          updated_at = timezone('utc', now())
    returning id into v_saved_id;

    select to_jsonb(t)
    into v_new
    from (
      select organization_id, name, sort_order, is_active, parent_id
      from public.product_categories
      where id = v_saved_id
    ) t;
  end if;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    v_audit_action,
    v_table,
    v_saved_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'previous', v_existing,
        'new', v_new,
        'metadata', v_audit_metadata || jsonb_build_object('table', v_table, 'operation', v_operation, 'name', v_name)
      )
    )
  );

  return query select v_saved_id;
end;
$$;

create or replace function public.app_delete_settings_list_item_tx(p_payload jsonb)
returns table(deleted_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table text := lower(trim(coalesce(p_payload->>'table', '')));
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_item_id uuid := nullif(trim(coalesce(p_payload->>'id', '')), '')::uuid;
  v_existing jsonb := null;
begin
  if v_table not in ('markets', 'countries', 'next_steps', 'product_categories') then
    raise exception 'Unsupported settings list table %', v_table;
  end if;

  execute format('select to_jsonb(t) from (select * from public.%I where id = $1 and organization_id = $2) t', v_table)
    into v_existing
    using v_item_id, v_organization_id;

  if v_existing is null then
    raise exception 'Settings list item % not found in the active organization.', v_item_id;
  end if;

  execute format('delete from public.%I where id = $1 and organization_id = $2', v_table)
    using v_item_id, v_organization_id;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    'settings_list_item_deleted',
    v_table,
    v_item_id,
    jsonb_build_object(
      'previous', v_existing,
      'metadata', jsonb_build_object(
        'table', v_table,
        'operation', 'delete',
        'name', v_existing->>'name'
      )
    )
  );

  return query select v_item_id;
end;
$$;

create or replace function public.app_import_settings_snapshot_tx(p_payload jsonb)
returns table(
  markets_imported integer,
  countries_imported integer,
  next_steps_imported integer,
  product_categories_imported integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid := nullif(trim(coalesce(p_payload->>'organization_id', '')), '')::uuid;
  v_actor_user_id uuid := nullif(trim(coalesce(p_payload->>'actor_user_id', '')), '')::uuid;
  v_version integer := coalesce((p_payload->>'version')::integer, 1);
  v_exported_at text := nullif(trim(coalesce(p_payload->>'exported_at', '')), '');
  v_market_row jsonb;
  v_country_row jsonb;
  v_next_step_row jsonb;
  v_category_row jsonb;
  v_item_id uuid;
  v_existing_org uuid;
  v_parent_id uuid;
  v_market_id uuid;
  v_markets_count integer := 0;
  v_countries_count integer := 0;
  v_next_steps_count integer := 0;
  v_product_categories_count integer := 0;
begin
  if v_organization_id is null then
    raise exception 'Organization is required for settings snapshot import.';
  end if;

  for v_market_row in
    select value from jsonb_array_elements(coalesce(p_payload->'markets', '[]'::jsonb))
  loop
    v_item_id := case
      when coalesce(v_market_row->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_market_row->>'id')::uuid
      else null
    end;

    if v_item_id is not null then
      select organization_id into v_existing_org from public.markets where id = v_item_id;
      if v_existing_org is not null and v_existing_org <> v_organization_id then
        raise exception 'Imported market ID % is outside the active organization.', v_item_id;
      end if;
    end if;

    insert into public.markets (id, organization_id, name, market_code, sort_order, is_active)
    values (
      coalesce(v_item_id, gen_random_uuid()),
      v_organization_id,
      nullif(trim(coalesce(v_market_row->>'name', '')), ''),
      nullif(trim(coalesce(v_market_row->>'market_code', '')), ''),
      coalesce((v_market_row->>'sort_order')::integer, 0),
      coalesce((v_market_row->>'is_active')::boolean, true)
    )
    on conflict (id) do update
      set name = excluded.name,
          market_code = excluded.market_code,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = timezone('utc', now());

    v_markets_count := v_markets_count + 1;
  end loop;

  for v_country_row in
    select value from jsonb_array_elements(coalesce(p_payload->'countries', '[]'::jsonb))
  loop
    v_item_id := case
      when coalesce(v_country_row->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_country_row->>'id')::uuid
      else null
    end;
    v_market_id := case
      when coalesce(v_country_row->>'market_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_country_row->>'market_id')::uuid
      else null
    end;

    if v_item_id is not null then
      select organization_id into v_existing_org from public.countries where id = v_item_id;
      if v_existing_org is not null and v_existing_org <> v_organization_id then
        raise exception 'Imported country ID % is outside the active organization.', v_item_id;
      end if;
    end if;

    if v_market_id is not null then
      perform 1 from public.markets where id = v_market_id and organization_id = v_organization_id;
      if not found then
        raise exception 'Imported country % references a market that is not available in this workspace.', coalesce(v_country_row->>'name', '');
      end if;
    end if;

    insert into public.countries (id, organization_id, name, iso2_code, iso3_code, phone_code, market_id, sort_order, is_active)
    values (
      coalesce(v_item_id, gen_random_uuid()),
      v_organization_id,
      nullif(trim(coalesce(v_country_row->>'name', '')), ''),
      nullif(trim(coalesce(v_country_row->>'iso2_code', '')), ''),
      nullif(trim(coalesce(v_country_row->>'iso3_code', '')), ''),
      nullif(trim(coalesce(v_country_row->>'phone_code', '')), ''),
      v_market_id,
      coalesce((v_country_row->>'sort_order')::integer, 0),
      coalesce((v_country_row->>'is_active')::boolean, true)
    )
    on conflict (id) do update
      set name = excluded.name,
          iso2_code = excluded.iso2_code,
          iso3_code = excluded.iso3_code,
          phone_code = excluded.phone_code,
          market_id = excluded.market_id,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = timezone('utc', now());

    v_countries_count := v_countries_count + 1;
  end loop;

  for v_next_step_row in
    select value from jsonb_array_elements(coalesce(p_payload->'next_steps', '[]'::jsonb))
  loop
    v_item_id := case
      when coalesce(v_next_step_row->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_next_step_row->>'id')::uuid
      else null
    end;

    if v_item_id is not null then
      select organization_id into v_existing_org from public.next_steps where id = v_item_id;
      if v_existing_org is not null and v_existing_org <> v_organization_id then
        raise exception 'Imported next step ID % is outside the active organization.', v_item_id;
      end if;
    end if;

    insert into public.next_steps (id, organization_id, name, sort_order, is_active)
    values (
      coalesce(v_item_id, gen_random_uuid()),
      v_organization_id,
      nullif(trim(coalesce(v_next_step_row->>'name', '')), ''),
      coalesce((v_next_step_row->>'sort_order')::integer, 0),
      coalesce((v_next_step_row->>'is_active')::boolean, true)
    )
    on conflict (id) do update
      set name = excluded.name,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          updated_at = timezone('utc', now());

    v_next_steps_count := v_next_steps_count + 1;
  end loop;

  for v_category_row in
    select value from jsonb_array_elements(coalesce(p_payload->'product_categories', '[]'::jsonb))
  loop
    v_item_id := case
      when coalesce(v_category_row->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_category_row->>'id')::uuid
      else null
    end;
    v_parent_id := case
      when coalesce(v_category_row->>'parent_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (v_category_row->>'parent_id')::uuid
      else null
    end;

    if v_item_id is not null then
      select organization_id into v_existing_org from public.product_categories where id = v_item_id;
      if v_existing_org is not null and v_existing_org <> v_organization_id then
        raise exception 'Imported product category ID % is outside the active organization.', v_item_id;
      end if;
    end if;

    if v_parent_id is not null then
      perform 1 from public.product_categories where id = v_parent_id and organization_id = v_organization_id;
      if not found then
        raise exception 'Imported category % references a parent that is not available in this workspace.', coalesce(v_category_row->>'name', '');
      end if;
    end if;

    insert into public.product_categories (id, organization_id, name, sort_order, is_active, parent_id)
    values (
      coalesce(v_item_id, gen_random_uuid()),
      v_organization_id,
      nullif(trim(coalesce(v_category_row->>'name', '')), ''),
      coalesce((v_category_row->>'sort_order')::integer, 0),
      coalesce((v_category_row->>'is_active')::boolean, true),
      v_parent_id
    )
    on conflict (id) do update
      set name = excluded.name,
          sort_order = excluded.sort_order,
          is_active = excluded.is_active,
          parent_id = excluded.parent_id,
          updated_at = timezone('utc', now());

    v_product_categories_count := v_product_categories_count + 1;
  end loop;

  insert into public.audit_logs (organization_id, actor_user_id, action, entity_type, entity_id, payload)
  values (
    v_organization_id,
    v_actor_user_id,
    'settings_lists_snapshot_imported',
    'settings_lists',
    null,
    jsonb_build_object(
      'metadata', jsonb_build_object(
        'version', v_version,
        'exported_at', v_exported_at,
        'counts', jsonb_build_object(
          'markets', v_markets_count,
          'countries', v_countries_count,
          'next_steps', v_next_steps_count,
          'product_categories', v_product_categories_count
        )
      )
    )
  );

  return query
  select v_markets_count, v_countries_count, v_next_steps_count, v_product_categories_count;
end;
$$;

commit;
