-- S37-BUG-004
-- Quote version lines must be seeded once. The canonical seed path is moving into
-- app_create_lead_quote_draft_tx, so the legacy deferred DB trigger is removed
-- to prevent duplicate / competing line creation.

drop trigger if exists trg_setuflow_seed_quote_version_lines_from_lead_coverage on public.quote_versions;
drop function if exists public.setuflow_seed_quote_version_lines_from_lead_coverage();

-- Remove duplicate version lines already created by competing seed paths.
-- Keep the oldest row for each same-version / same-product / same-rule / same-position line.
do $s37_bug_004_dedupe$
declare
  v_trigger_was_enabled boolean := false;
begin
  select exists (
    select 1
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
      and cls.relname = 'quote_version_line_items'
      and tg.tgname = 'trg_prevent_locked_quote_version_line_mutation'
      and tg.tgenabled <> 'D'
  ) into v_trigger_was_enabled;

  if v_trigger_was_enabled then
    alter table public.quote_version_line_items disable trigger trg_prevent_locked_quote_version_line_mutation;
  end if;

  with ranked as (
    select id,
           row_number() over (
             partition by
               quote_version_id,
               coalesce(product_id::text, ''),
               coalesce(product_variant_id::text, ''),
               coalesce(catalog_pricing_rule_id::text, ''),
               coalesce(nullif(sku_code, ''), lower(product_name)),
               sort_order
             order by created_at asc, id asc
           ) as rn
    from public.quote_version_line_items
  )
  delete from public.quote_version_line_items qvli
  using ranked r
  where qvli.id = r.id
    and r.rn > 1;

  update public.quote_versions qv
  set total_line_count = counted.line_count,
      updated_at = now()
  from (
    select quote_version_id, count(*)::integer as line_count
    from public.quote_version_line_items
    group by quote_version_id
  ) counted
  where qv.id = counted.quote_version_id
    and coalesce(qv.total_line_count, -1) <> counted.line_count;

  if v_trigger_was_enabled then
    alter table public.quote_version_line_items enable trigger trg_prevent_locked_quote_version_line_mutation;
  end if;
end
$s37_bug_004_dedupe$;
