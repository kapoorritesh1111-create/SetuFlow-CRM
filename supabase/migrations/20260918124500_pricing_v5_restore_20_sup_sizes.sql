-- Owner clarification 2026-09-18: the SUP Sizes worksheet is authoritative.
-- Keep the 20 approved Sizes-sheet rows and their pricing_bucket assignments.

begin;

delete from public.packaging_size_profiles_v5
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and size_key='160x230_bg50_50';

update public.packaging_size_profiles_v5
set sort_order=sort_order-1, updated_at=now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and sort_order>11;

update public.packaging_pricing_templates
set quote_config_json=jsonb_set(coalesce(quote_config_json,'{}'::jsonb),'{size_count}','20'::jsonb,true),
    updated_at=now()
where id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a';

commit;
