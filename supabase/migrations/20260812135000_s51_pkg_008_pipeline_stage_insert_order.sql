-- S51-PKG-008
-- Allow admins to insert a pipeline stage at an occupied sort order.
-- Existing stages at and after the requested position shift down by one inside
-- the same INSERT transaction, preserving the unique (pipeline_id, sort_order)
-- constraint and rolling back automatically if the INSERT fails.

create or replace function public.shift_pipeline_stage_sort_order_before_insert()
returns trigger
language plpgsql
set search_path = 'public'
as $$
declare
  v_collision boolean := false;
  v_max_sort integer := 0;
  v_min_sort integer := 0;
  v_offset integer := 1000000;
begin
  if new.sort_order is null then
    new.sort_order := 0;
  end if;

  select
    exists (
      select 1
      from public.pipeline_stages ps
      where ps.pipeline_id = new.pipeline_id
        and ps.sort_order = new.sort_order
    ),
    coalesce(max(ps.sort_order), 0),
    coalesce(min(ps.sort_order), 0)
  into v_collision, v_max_sort, v_min_sort
  from public.pipeline_stages ps
  where ps.pipeline_id = new.pipeline_id;

  if not v_collision then
    return new;
  end if;

  v_offset := greatest(abs(v_max_sort), abs(v_min_sort), abs(new.sort_order), 0) + 1000000;

  -- Move the affected range temporarily above every existing sort value so the
  -- unique constraint cannot collide while we resequence it.
  update public.pipeline_stages
  set sort_order = sort_order + v_offset,
      updated_at = now()
  where pipeline_id = new.pipeline_id
    and sort_order >= new.sort_order;

  -- Restore the affected stages one position later, leaving new.sort_order free
  -- for the incoming row.
  update public.pipeline_stages
  set sort_order = sort_order - v_offset + 1,
      updated_at = now()
  where pipeline_id = new.pipeline_id
    and sort_order >= new.sort_order + v_offset
    and sort_order <= v_max_sort + v_offset;

  return new;
end;
$$;

drop trigger if exists pipeline_stages_shift_sort_before_insert on public.pipeline_stages;

create trigger pipeline_stages_shift_sort_before_insert
before insert on public.pipeline_stages
for each row
execute function public.shift_pipeline_stage_sort_order_before_insert();
