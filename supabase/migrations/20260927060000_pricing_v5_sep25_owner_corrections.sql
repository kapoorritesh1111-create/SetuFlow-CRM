-- Pricing v5 owner corrections from the 2026-09-25 Stark Packmate review.
-- Data-only correction: PE compatibility and 98x150 production route. No pricing formula changes.
begin;

with owner_rules(size_key, pe_options, route_mode, registration_mode, profile_key, owner_note) as (
  values
    ('80x130_bg25_25',array[60,75]::int[],null::text,null::text,null::text,null::text),
    ('98x150_bg30_30',array[60,75]::int[],'integrated','not_applicable','sup_integrated','Akshay 2026-09-25: 98x150 is integrated, not conditional.'),
    ('110x170_bg30_30',array[60,75]::int[],'conditional','optional','sup_110x170_conditional','Akshay 2026-09-25: 110x170 retains the conditional registered/unregistered bottom workflow.'),
    ('150x150_bg40_40',array[60,75]::int[],null,null,null,null),
    ('120x210_bg40_40',array[75]::int[],null,null,null,null),
    ('125x210_bg40_40',array[75]::int[],null,null,null,null),
    ('130x210_bg40_40',array[75]::int[],null,null,null,null),
    ('140x210_bg40_40',array[75]::int[],null,null,null,null),
    ('145x210_bg40_40',array[75]::int[],null,null,null,null),
    ('150x220_bg50_50',array[75,95]::int[],null,null,null,null),
    ('160x240_bg50_50',array[75,95]::int[],null,null,null,null),
    ('170x250_bg50_50',array[75,95]::int[],null,null,null,null),
    ('185x270_bg50_50',array[75,95]::int[],null,null,null,null),
    ('200x300_bg55_55',array[95,120]::int[],null,null,null,null),
    ('210x300_bg55_55',array[95,120]::int[],null,null,null,null),
    ('220x300_bg55_55',array[95,120]::int[],null,null,null,null),
    ('230x310_bg55_55',array[95,120]::int[],null,null,null,null),
    ('245x320_bg55_55',array[95,120]::int[],null,null,null,null),
    ('260x340_bg60_60',array[95,120]::int[],null,null,null,null),
    ('280x360_bg60_60',array[95,120]::int[],null,null,null,null)
)
update public.packaging_size_profiles_v5 s
set metadata=coalesce(s.metadata,'{}'::jsonb)
      || jsonb_build_object(
        'allowed_pe_microns',to_jsonb(r.pe_options),
        'owner_review_source','2026-09-25 transcript + approved PE options sheet'
      )
      || case when r.owner_note is null then '{}'::jsonb else jsonb_build_object('owner_review_note',r.owner_note) end,
    gusset_production_mode=coalesce(r.route_mode,s.gusset_production_mode),
    bottom_registration_mode=coalesce(r.registration_mode,s.bottom_registration_mode),
    production_profile_key=coalesce(r.profile_key,s.production_profile_key),
    updated_at=now()
from owner_rules r
join public.packaging_pricing_templates t on t.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and t.calculation_version=5 and t.calculation_engine_key='sup_formula_v5'
where s.organization_id=t.organization_id
  and s.template_id=t.id
  and s.size_key=r.size_key;

commit;
