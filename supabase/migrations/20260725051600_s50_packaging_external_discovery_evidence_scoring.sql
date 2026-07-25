create or replace function public.enrich_packaging_external_opportunity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_evidence jsonb := coalesce(new.source_evidence, '[]'::jsonb);
  v_first jsonb := case when jsonb_typeof(v_evidence) = 'array' and jsonb_array_length(v_evidence) > 0 then v_evidence->0 else '{}'::jsonb end;
  v_categories jsonb := coalesce(v_first->'matched_packaging_categories', '[]'::jsonb);
  v_use_cases jsonb := coalesce(v_first->'packaging_use_cases', '[]'::jsonb);
  v_signals jsonb := coalesce(v_first->'buyer_need_signals', '[]'::jsonb);
  v_roles jsonb := coalesce(v_first->'decision_maker_roles', '[]'::jsonb);
  v_score integer := coalesce(new.fit_score, 0);
  v_reasons jsonb := coalesce(to_jsonb(new.fit_reasons), '[]'::jsonb);
begin
  if jsonb_typeof(v_categories) <> 'array' then v_categories := '[]'::jsonb; end if;
  if jsonb_typeof(v_use_cases) <> 'array' then v_use_cases := '[]'::jsonb; end if;
  if jsonb_typeof(v_signals) <> 'array' then v_signals := '[]'::jsonb; end if;
  if jsonb_typeof(v_roles) <> 'array' then v_roles := '[]'::jsonb; end if;

  new.matched_packaging_categories := v_categories;
  new.packaging_use_cases := v_use_cases;
  new.buyer_need_signals := v_signals;
  new.decision_maker_roles := v_roles;
  new.current_packaging_format := nullif(btrim(v_first->>'current_packaging_format'), '');
  new.incumbent_supplier_pain := nullif(btrim(v_first->>'incumbent_supplier_pain'), '');
  new.estimated_annual_volume := case
    when coalesce(v_first->>'estimated_annual_volume','') ~ '^[0-9]+([.][0-9]+)?$' then (v_first->>'estimated_annual_volume')::numeric
    else new.estimated_annual_volume
  end;

  if jsonb_array_length(v_categories) > 0 then
    v_score := v_score + least(25, jsonb_array_length(v_categories) * 8);
    v_reasons := v_reasons || to_jsonb('Packaging category evidence matches the active ICP.'::text);
  end if;
  if jsonb_array_length(v_use_cases) > 0 then
    v_score := v_score + least(15, jsonb_array_length(v_use_cases) * 5);
    v_reasons := v_reasons || to_jsonb('Packaging end-use evidence is present.'::text);
  end if;
  if jsonb_array_length(v_signals) > 0 then
    v_score := v_score + least(15, jsonb_array_length(v_signals) * 5);
    v_reasons := v_reasons || to_jsonb('Packaging buying or launch signals are source-backed.'::text);
  end if;
  if jsonb_array_length(v_roles) > 0 then
    v_score := v_score + least(10, jsonb_array_length(v_roles) * 4);
    v_reasons := v_reasons || to_jsonb('Relevant Packaging decision-maker roles are evidenced.'::text);
  end if;

  if jsonb_array_length(v_categories) = 0 then
    new.missing_data := array(
      select distinct value
      from unnest(coalesce(new.missing_data, array[]::text[]) || array['Packaging category evidence']) value
    );
  end if;

  new.fit_score := greatest(0, least(100, v_score));
  new.fit_reasons := array(select distinct value from jsonb_array_elements_text(v_reasons) value);
  new.fit_version := 's50-packaging-v1';
  new.fit_scored_at := now();
  return new;
end;
$$;

revoke all on function public.enrich_packaging_external_opportunity() from public;

drop trigger if exists trg_enrich_packaging_external_opportunity on public.external_opportunities;
create trigger trg_enrich_packaging_external_opportunity
before insert or update of source_evidence, fit_score, fit_reasons
on public.external_opportunities
for each row execute function public.enrich_packaging_external_opportunity();

update public.external_opportunities
set source_evidence = source_evidence
where org_id in (select id from public.organizations where slug='packaging');
