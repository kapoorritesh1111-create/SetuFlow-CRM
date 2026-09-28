-- Stark Packmate production hotfix:
-- 1) add buyer stages Meeting Scheduled and Meeting Done
-- 2) disambiguate supplier Sampling in the combined Leads stage filter
-- Applied to production first under this exact migration version.

do $$
declare
  v_buyer uuid := '128c037a-a669-473b-a884-ea668752e93c';
  v_supplier uuid := '31e0f3d2-0c47-4fe3-92a6-be953458a5a1';
begin
  -- Move existing positions out of the constrained range before resequencing.
  update public.pipeline_stages
  set sort_order = sort_order + 100,
      updated_at = now()
  where pipeline_id = v_buyer;

  update public.pipeline_stages
  set sort_order = case lower(trim(name))
    when 'new packaging inquiry' then 1
    when 'quote sent' then 4
    when 'artwork review' then 5
    when 'sampling' then 6
    when 'won' then 7
    when 'lost' then 8
    when 'meeting scheduled' then 2
    when 'meeting done' then 3
    else sort_order - 100
  end,
  updated_at = now()
  where pipeline_id = v_buyer;

  if not exists (
    select 1
    from public.pipeline_stages
    where pipeline_id = v_buyer
      and lower(trim(name)) = 'meeting scheduled'
  ) then
    insert into public.pipeline_stages (
      pipeline_id, name, sort_order, is_closed, is_won, is_lost
    )
    values (
      v_buyer, 'Meeting Scheduled', 2, false, false, false
    );
  end if;

  if not exists (
    select 1
    from public.pipeline_stages
    where pipeline_id = v_buyer
      and lower(trim(name)) = 'meeting done'
  ) then
    insert into public.pipeline_stages (
      pipeline_id, name, sort_order, is_closed, is_won, is_lost
    )
    values (
      v_buyer, 'Meeting Done', 3, false, false, false
    );
  end if;

  update public.pipeline_stages
  set name = 'Supplier Sampling',
      updated_at = now()
  where pipeline_id = v_supplier
    and lower(trim(name)) = 'sampling';
end $$;
