-- Final live enablement for Pricing v5 Center Seal + 3SS after frame-family quote flow reached production.
-- All 48 seeded constructions in each form have complete layer stacks and all required material/process rates.
begin;

update public.packaging_service_families
set is_quoteable=true, updated_at=now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and slug in ('center-seal-pouches','three-side-seal-pouches');

update public.packaging_constructions_v5 c
set is_quoteable=true,
    metadata=coalesce(c.metadata,'{}'::jsonb)||jsonb_build_object(
      'quoteable_enabled_source','pricing_v5_frame_family_live_enable',
      'owner_bucket_review_pending',true
    ),
    updated_at=now()
from public.packaging_pricing_templates t
where c.organization_id=t.organization_id
  and c.template_id=t.id
  and c.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and c.is_active=true
  and t.calculation_version=5
  and t.calculation_engine_key='frame_formula_v5'
  and t.status='published'
  and t.is_active=true
  and t.slug in (
    'stark-center-seal-roll-v5-review',
    'stark-center-seal-pouch-v5-review',
    'stark-3ss-roll-v5-review',
    'stark-3ss-pouch-v5-review'
  )
  and (
    select count(*)
    from public.packaging_construction_layers_v5 l
    where l.organization_id=c.organization_id
      and l.template_id=c.template_id
      and l.construction_id=c.id
  )=c.layer_count
  and not exists (
    select 1
    from public.packaging_construction_layers_v5 l
    left join public.packaging_pricing_cost_rates_v5 r
      on r.organization_id=l.organization_id
      and r.template_id=l.template_id
      and r.cost_master_item_id=l.cost_master_item_id
    where l.organization_id=c.organization_id
      and l.template_id=c.template_id
      and l.construction_id=c.id
      and r.current_rate is null
  );

commit;
