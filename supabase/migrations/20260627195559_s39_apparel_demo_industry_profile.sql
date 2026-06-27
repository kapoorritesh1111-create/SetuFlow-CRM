insert into public.organization_industry_profiles (
  organization_id,
  industry_key,
  apparel_subtypes,
  sales_channels,
  enabled_capabilities,
  demo_mode,
  provisioning_pack,
  setup_completed_at
)
select
  id,
  'apparel_textiles',
  array['activewear_athleisure','fashion_lifestyle','kidswear','denim','uniform_workwear','innerwear_essentials','accessories'],
  array['domestic_retailers','export_distributors','international_buyers','bulk_orders','institutional_buyers','corporate_buyers','trade_shows','d2c_online','marketplaces_resellers'],
  array['sample_management','bulk_personalization','private_label','tech_packs','artwork_approval','compliance_tracking','distributor_pricing','retailer_price_lists','replenishment_tracking','export_documentation','size_set_management'],
  true,
  'apparel_industry_pack',
  now()
from public.organizations
where slug='apparel-demo'
on conflict (organization_id, industry_key) do update set
  apparel_subtypes = excluded.apparel_subtypes,
  sales_channels = excluded.sales_channels,
  enabled_capabilities = excluded.enabled_capabilities,
  demo_mode = excluded.demo_mode,
  provisioning_pack = excluded.provisioning_pack,
  setup_completed_at = excluded.setup_completed_at,
  updated_at = now();

update public.organizations o
set industry_profile_id = p.id,
    provisioning_status = 'profile_created',
    demo_mode = true,
    updated_at = now()
from public.organization_industry_profiles p
where o.slug='apparel-demo'
  and p.organization_id = o.id
  and p.industry_key = 'apparel_textiles';
