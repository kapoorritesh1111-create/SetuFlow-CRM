alter table public.contracts
  add column if not exists execution_state text not null default 'draft',
  add column if not exists execution_blockers jsonb not null default '[]'::jsonb,
  add column if not exists execution_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists ready_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists contracts_execution_state_idx on public.contracts(execution_state);

update public.contracts
set execution_state = case
  when completed_at is not null then 'completed'
  when dispatched_at is not null then 'dispatched'
  when released_at is not null then 'released'
  when signed_at is not null and commercial_lock_state = 'accepted_locked' then 'ready'
  else coalesce(nullif(execution_state, ''), 'draft')
end
where true;

update public.contracts
set execution_snapshot = jsonb_strip_nulls(
  jsonb_build_object(
    'state', execution_state,
    'state_label', case execution_state
      when 'ready' then 'Ready for release'
      when 'released' then 'Released to operations'
      when 'dispatched' then 'Dispatched'
      when 'completed' then 'Completed'
      else 'Draft execution'
    end,
    'blockers', coalesce(execution_blockers, '[]'::jsonb),
    'computed_at', now()
  )
)
where execution_snapshot = '{}'::jsonb or execution_snapshot is null;
