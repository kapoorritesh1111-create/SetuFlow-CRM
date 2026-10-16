-- Atomic draft handoff for Quick Quote. Run only after the prerequisite
-- quick_quote_estimates_draft_rls.sql has been reviewed and applied.
-- Creates an UNSENDABLE, unpriced draft. Final commercial prices must be
-- recalculated and saved through the existing governed V5 quote builder.
create or replace function public.app_quick_quote_convert_draft(
  p_estimate_id uuid,
  p_existing_lead_id uuid default null,
  p_company_name text default null,
  p_contact_name text default null,
  p_phone text default null,
  p_email text default null
) returns table(lead_id uuid, quote_id uuid, was_existing boolean)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_est public.quick_quote_estimates%rowtype;
  v_lead uuid;
  v_quote uuid;
  v_version uuid;
  v_item jsonb;
  v_currency text;
  v_company text := nullif(btrim(coalesce(p_company_name,'')),'');
  v_phone text := nullif(btrim(coalesce(p_phone,'')),'');
  v_email text := nullif(lower(btrim(coalesce(p_email,''))),'');
  v_existing boolean := false;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_est from public.quick_quote_estimates
    where id=p_estimate_id and owner_user_id=v_user for update;
  if not found then raise exception 'Estimate unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.organization_members m
    where m.organization_id=v_est.organization_id and m.user_id=v_user and m.is_active=true)
    then raise exception 'Active organization membership required' using errcode='42501'; end if;
  if v_est.status='converted' then
    select q.lead_id into v_lead from public.quotes q
      where q.id=v_est.converted_quote_id and q.organization_id=v_est.organization_id;
    if v_lead is null then raise exception 'Converted quote not found'; end if;
    return query select v_lead,v_est.converted_quote_id,true;
    return;
  end if;
  if v_est.status<>'draft' or jsonb_typeof(v_est.items)<>'array'
     or jsonb_array_length(v_est.items) not between 1 and 30
    then raise exception 'Estimate must contain 1 to 30 valid lines'; end if;
  for v_item in select value from jsonb_array_elements(v_est.items) loop
    if coalesce(v_item->>'engine','') not in ('sup','frame')
       or coalesce(v_item->>'templateId','')=''
       or coalesce(v_item->>'familyId','')=''
       or jsonb_typeof(v_item->'input')<>'object'
       or coalesce((v_item->>'quantity')::numeric,0)<=0
       or coalesce((v_item->'input'->>'quantity')::numeric,0)<>(v_item->>'quantity')::numeric
       then raise exception 'All products require valid published V5 configuration; manual price requires standard quote approval'; end if;
    if not exists(select 1 from public.packaging_pricing_templates t
      join public.packaging_service_families f on f.id=t.family_id
      where t.id=(v_item->>'templateId')::uuid
        and t.family_id=(v_item->>'familyId')::uuid
        and t.organization_id=v_est.organization_id and f.organization_id=v_est.organization_id
        and t.status='published' and t.is_active=true and f.is_active=true and f.is_quoteable=true)
      then raise exception 'One selected product is no longer quotable'; end if;
  end loop;
  v_currency := upper(v_est.items->0->>'currency');
  if v_currency is null or length(v_currency)<>3
    or exists(select 1 from jsonb_array_elements(v_est.items) x
      where upper(x->>'currency')<>v_currency)
    then raise exception 'Single valid currency required'; end if;
  if p_existing_lead_id is not null then
    select id into v_lead from public.leads where id=p_existing_lead_id
      and organization_id=v_est.organization_id and lead_type='buyer';
    if v_lead is null then raise exception 'Buyer lead unavailable in organization'; end if;
    v_existing:=true;
  else
    if v_company is null or length(v_company)>200 or (v_phone is null and v_email is null)
      then raise exception 'Company and phone or email are required'; end if;
    if length(coalesce(v_phone,''))>35 or length(coalesce(v_email,''))>254
      then raise exception 'Contact details too long'; end if;
    -- Serialize same-contact creation inside a tenant to prevent double inserts.
    perform pg_advisory_xact_lock(hashtextextended(v_est.organization_id::text||':'||coalesce(v_email,v_phone),0));
    if exists(select 1 from public.leads where organization_id=v_est.organization_id
      and lead_type='buyer' and
      ((v_email is not null and lower(email)=v_email) or (v_phone is not null and phone=v_phone)))
      then raise exception 'Matching buyer exists; select the existing lead'; end if;
    insert into public.leads(organization_id,lead_type,owner_user_id,created_by,company_name,
      contact_name,phone,email,source_type,source_label,products_or_needs)
    values(v_est.organization_id,'buyer',v_user,v_user,v_company,
      nullif(btrim(coalesce(p_contact_name,'')),''),v_phone,v_email,'manual','Quick Quote',left(v_est.label,500))
    returning id into v_lead;
  end if;
  insert into public.quotes(organization_id,lead_id,created_by,status,currency,display_currency,
    source_type,notes_internal,quote_creation_request_key)
    values(v_est.organization_id,v_lead,v_user,'draft',v_currency,v_currency,'manual',
      'Quick Quote draft; each line must be repriced and approved before sending.',
      'quick-quote:'||v_est.id::text)
    returning id into v_quote;
  insert into public.quote_versions(quote_id,version_no,status,pricing_basis,
    display_currency,created_by,total_line_count,internal_notes)
    values(v_quote,1,'draft','ex_factory',v_currency,v_user,jsonb_array_length(v_est.items),
      'Quick Quote handoff. Reconfigure and calculate each line through standard V5 workflow.')
    returning id into v_version;
  update public.quotes set current_version_id=v_version,version_no=1 where id=v_quote;
  -- No unit_price; this is a requirements-only transfer, never a priced customer quote.
  insert into public.quote_line_items(quote_id,quantity,currency,notes,line_type,
    packaging_family_id,packaging_template_id,input_snapshot_json,unit_price)
    select v_quote,(x->>'quantity')::numeric,v_currency,
      left(coalesce(x->>'notes',''),1000),'packaging',
      (x->>'familyId')::uuid,(x->>'templateId')::uuid,
      jsonb_build_object('source','quick_quote_pending_reprice','engine',x->>'engine',
        'input',x->'input','internal_estimate_id',v_est.id),null
    from jsonb_array_elements(v_est.items) x;
  update public.quick_quote_estimates set status='converted',converted_quote_id=v_quote,
    updated_at=now() where id=v_est.id;
  return query select v_lead,v_quote,v_existing;
end;
$$;
revoke all on function public.app_quick_quote_convert_draft(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.app_quick_quote_convert_draft(uuid,uuid,text,text,text,text) to authenticated;
