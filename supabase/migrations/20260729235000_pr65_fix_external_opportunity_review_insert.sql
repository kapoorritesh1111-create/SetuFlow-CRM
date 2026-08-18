-- PR65: keep external research results visible in the governed review queue.
--
-- Root cause:
-- The Packaging enrichment trigger runs for every external opportunity and attempted
-- to coalesce/assign text[] values into jsonb columns. This blocked all Food & Beverage
-- discovery inserts with: COALESCE types jsonb and text[] cannot be matched.
--
-- This replacement is additive and data-preserving:
-- - non-Packaging opportunities bypass Packaging-only enrichment;
-- - jsonb arrays remain jsonb throughout;
-- - provider-stated URLs that were not reconciled to tool citations remain reviewable,
--   but are explicitly marked unverified with visible missing-data and penalty reasons.

create or replace function public.enrich_packaging_external_opportunity()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_evidence jsonb := coalesce(new.source_evidence, '[]'::jsonb);
  v_first jsonb := case
    when jsonb_typeof(v_evidence) = 'array' and jsonb_array_length(v_evidence) > 0 then v_evidence->0
    else '{}'::jsonb
  end;
  v_categories jsonb := coalesce(v_first->'matched_packaging_categories', '[]'::jsonb);
  v_use_cases jsonb := coalesce(v_first->'packaging_use_cases', '[]'::jsonb);
  v_signals jsonb := coalesce(v_first->'buyer_need_signals', '[]'::jsonb);
  v_roles jsonb := coalesce(v_first->'decision_maker_roles', '[]'::jsonb);
  v_score integer := coalesce(new.fit_score, 0);
  v_reasons jsonb := case
    when jsonb_typeof(coalesce(new.fit_reasons, '[]'::jsonb)) = 'array' then coalesce(new.fit_reasons, '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_missing jsonb := case
    when jsonb_typeof(coalesce(new.missing_data, '[]'::jsonb)) = 'array' then coalesce(new.missing_data, '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_penalties jsonb := case
    when jsonb_typeof(coalesce(new.fit_penalties, '[]'::jsonb)) = 'array' then coalesce(new.fit_penalties, '[]'::jsonb)
    else '[]'::jsonb
  end;
  v_vertical text := lower(coalesce(v_first->>'vertical_playbook', ''));
  v_source_state text := lower(coalesce(v_first->>'source_validation_state', ''));
begin
  -- Keep provider-returned companies visible, but do not represent an unreconciled
  -- provider-stated URL as source verified.
  if v_source_state = 'provider_stated_not_tool_cited' then
    new.verification_state := 'unverified';

    if not (v_missing @> jsonb_build_array('Source verification')) then
      v_missing := v_missing || jsonb_build_array('Source verification');
    end if;

    if not (v_penalties @> jsonb_build_array('The returned company URL requires human source verification before approval or CRM conversion.')) then
      v_penalties := v_penalties || jsonb_build_array('The returned company URL requires human source verification before approval or CRM conversion.');
    end if;

    new.missing_data := v_missing;
    new.fit_penalties := v_penalties;
  end if;

  -- Packaging intelligence must not rewrite Food, Apparel, Distribution, or General
  -- Trade opportunities. Those rows retain the campaign runner's score and metadata.
  if v_vertical <> 'packaging' then
    return new;
  end if;

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
    when coalesce(v_first->>'estimated_annual_volume', '') ~ '^[0-9]+([.][0-9]+)?$'
      then (v_first->>'estimated_annual_volume')::numeric
    else new.estimated_annual_volume
  end;

  if jsonb_array_length(v_categories) > 0 then
    v_score := v_score + least(25, jsonb_array_length(v_categories) * 8);
    v_reasons := v_reasons || jsonb_build_array('Packaging category evidence matches the active ICP.');
  end if;
  if jsonb_array_length(v_use_cases) > 0 then
    v_score := v_score + least(15, jsonb_array_length(v_use_cases) * 5);
    v_reasons := v_reasons || jsonb_build_array('Packaging end-use evidence is present.');
  end if;
  if jsonb_array_length(v_signals) > 0 then
    v_score := v_score + least(15, jsonb_array_length(v_signals) * 5);
    v_reasons := v_reasons || jsonb_build_array('Packaging buying or launch signals are source-backed.');
  end if;
  if jsonb_array_length(v_roles) > 0 then
    v_score := v_score + least(10, jsonb_array_length(v_roles) * 4);
    v_reasons := v_reasons || jsonb_build_array('Relevant Packaging decision-maker roles are evidenced.');
  end if;

  if jsonb_array_length(v_categories) = 0
     and not (v_missing @> jsonb_build_array('Packaging category evidence')) then
    v_missing := v_missing || jsonb_build_array('Packaging category evidence');
  end if;

  new.fit_score := greatest(0, least(100, v_score));
  new.fit_reasons := v_reasons;
  new.missing_data := v_missing;
  new.fit_penalties := v_penalties;
  new.fit_version := 's50-packaging-v1';
  new.fit_scored_at := now();
  return new;
end;
$function$;

comment on function public.enrich_packaging_external_opportunity() is
  'Enriches Packaging external opportunities only and preserves unverified provider-returned companies for explicit human review.';
