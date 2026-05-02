-- Pass 22 workflow cleanup: remove accidental TestStage safely.
-- Checked against live SETU Flow CRM schema before writing:
-- - TestStage exists in pipeline_stages.
-- - The same pipeline has New Lead.
-- - Some leads may currently point at TestStage.
-- This migration moves those leads and stage-history references back to New Lead, then deletes TestStage.

do $$
declare
  v_test_stage record;
  v_target_stage_id uuid;
  v_moved_count integer := 0;
begin
  for v_test_stage in
    select id, pipeline_id, name
    from public.pipeline_stages
    where lower(name) = lower('TestStage')
  loop
    select id
    into v_target_stage_id
    from public.pipeline_stages
    where pipeline_id = v_test_stage.pipeline_id
      and lower(name) = lower('New Lead')
    order by sort_order asc, created_at asc
    limit 1;

    if v_target_stage_id is null then
      raise exception 'Cannot delete TestStage %. No New Lead fallback stage exists in the same pipeline %.', v_test_stage.id, v_test_stage.pipeline_id;
    end if;

    update public.leads
       set stage_id = v_target_stage_id,
           updated_at = now()
     where stage_id = v_test_stage.id;
    get diagnostics v_moved_count = row_count;

    update public.lead_stage_history
       set from_stage_id = v_target_stage_id
     where from_stage_id = v_test_stage.id;

    update public.lead_stage_history
       set to_stage_id = v_target_stage_id
     where to_stage_id = v_test_stage.id;

    delete from public.pipeline_stages
     where id = v_test_stage.id;

    raise notice 'Deleted TestStage %, moved % lead(s) to New Lead %.', v_test_stage.id, v_moved_count, v_target_stage_id;
  end loop;
end $$;

-- Verification helper: should return zero rows after the DO block.
select id, name, pipeline_id, sort_order
from public.pipeline_stages
where lower(name) = lower('TestStage');
