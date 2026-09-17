-- Paid-client hardening: these are internal application mutations and must not
-- be reachable through the anonymous Data API role. Authenticated application
-- users and service-role automation keep their existing execution path.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as identity
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'app_move_lead_stage_tx',
        'app_batch_move_leads_stage_tx',
        'app_create_rfq_with_line_items_and_fanout_tx',
        'app_update_rfq_with_line_items_and_fanout_tx',
        'app_update_rfq_with_line_items_tx',
        'app_update_document_workflow_tx',
        'app_update_compliance_workflow_tx',
        'app_upsert_invitation_tx',
        'app_update_invitation_role_tx',
        'app_save_catalog_price_tx',
        'app_delete_catalog_price_tx',
        'app_save_product_with_catalog_pricing_tx',
        'app_deactivate_product_tx'
      ])
  loop
    execute format('revoke execute on function %s from public, anon', fn.identity);
    execute format('grant execute on function %s to authenticated, service_role', fn.identity);
  end loop;
end
$$;
