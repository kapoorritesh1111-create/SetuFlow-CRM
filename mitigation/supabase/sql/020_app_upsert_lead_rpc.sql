create or replace function public.app_upsert_lead(
  organization_id uuid,
  lead_type text,
  company_name text,
  contact_name text,
  email text,
  phone text,
  country text,
  source_label text,
  stage_id uuid,
  next_step_id uuid,
  owner_user_id uuid,
  trade_event_id uuid,
  notes text,
  next_follow_up_at timestamptz,
  updated_by uuid,
  created_by uuid,
  market_ids text[],
  product_ids text[]
)
returns void
language plpgsql
security definer
as $$
declare
  v_lead_id uuid;
  v_market_id text;
  v_product_id text;
begin
  insert into public.leads (
    organization_id, lead_type, company_name, contact_name, email, phone, country,
    source_label, stage_id, next_step_id, owner_user_id, trade_event_id, notes,
    next_follow_up_at, updated_by, created_by
  ) values (
    organization_id, lead_type::public.lead_type, company_name, nullif(contact_name,''), nullif(email,''), nullif(phone,''), nullif(country,''),
    nullif(source_label,''), stage_id, next_step_id, owner_user_id, trade_event_id, nullif(notes,''),
    next_follow_up_at, updated_by, created_by
  )
  returning id into v_lead_id;

  delete from public.lead_markets where lead_id = v_lead_id;
  foreach v_market_id in array coalesce(market_ids, array[]::text[]) loop
    insert into public.lead_markets (lead_id, market_id) values (v_lead_id, v_market_id::uuid);
  end loop;

  delete from public.lead_product_interests where lead_id = v_lead_id;
  foreach v_product_id in array coalesce(product_ids, array[]::text[]) loop
    insert into public.lead_product_interests (lead_id, product_id) values (v_lead_id, v_product_id::uuid);
  end loop;

  insert into public.audit_logs (organization_id, actor_user_id, event_type, entity_type, entity_id, payload)
  values (organization_id, updated_by, 'lead.upsert', 'lead', v_lead_id, jsonb_build_object('company_name', company_name));
end;
$$;
