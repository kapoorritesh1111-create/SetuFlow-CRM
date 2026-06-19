-- Sprint 31 / S31-TS-002
-- Backfill and nudge the existing Trade Show Trial internal lead sync trigger.
-- The trigger/function are created by the Sprint 25 trial signup migration.

create unique index if not exists leads_trade_show_trial_org_unique_idx
  on public.leads (trial_org_id)
  where trial_org_id is not null;

do $$
begin
  if to_regclass('public.trade_show_trial_workspaces') is null then
    return;
  end if;

  update public.trade_show_trial_workspaces
  set signup_metadata = coalesce(signup_metadata, '{}'::jsonb) || jsonb_build_object(
    's31_internal_lead_backfill_at', timezone('utc', now())
  ),
  updated_at = now()
  where organization_id is not null;
end $$;
