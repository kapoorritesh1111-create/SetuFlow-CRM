-- Source: Stark Packmate SUP quote model / "MOQ refrence" worksheet reviewed 2026-09-18.
-- Sample prices in the worksheet are intentionally NOT imported. Only valid/blocked quantity rules are persisted.

with rules(size_key, allowed_quantities, blocked_quantities) as (
  values
    ('80x130_bg25_25', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('98x150_bg30_30', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('110x170_bg30_30', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('120x210_bg40_40', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('130x210_bg40_40', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('140x210_bg40_40', '[3000,5000,10000,20000,30000,50000]'::jsonb, '[1000,2000]'::jsonb),
    ('150x220_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('160x230_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('170x250_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('185x270_bg50_50', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('210x300_bg55_55', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('220x300_bg55_55', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('245x320_bg55_55', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('260x340_bg60_60', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb),
    ('280x360_bg60_60', '[2000,3000,5000,10000,20000,30000,50000]'::jsonb, '[1000]'::jsonb)
)
update public.packaging_size_profiles_v5 s
set metadata = coalesce(s.metadata,'{}'::jsonb) || jsonb_build_object(
  'allowed_quantities', rules.allowed_quantities,
  'blocked_quantities', rules.blocked_quantities,
  'moq_reference_status', 'confirmed',
  'moq_reference_source', 'MOQ refrence',
  'moq_reference_verified_at', '2026-09-18'
), updated_at = now()
from rules
where s.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and s.template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and s.size_key=rules.size_key;

update public.packaging_size_profiles_v5
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'moq_reference_status', 'not_listed_in_reference_sheet',
  'moq_reference_source', 'MOQ refrence',
  'moq_reference_verified_at', '2026-09-18'
), updated_at = now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and size_key in (
    '150x150_bg40_40','125x210_bg40_40','145x210_bg40_40',
    '160x240_bg50_50','200x300_bg55_55','230x310_bg55_55'
  );
