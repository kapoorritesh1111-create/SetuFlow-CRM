-- Pricing v5 SUP quantity-review policy reconciled 2026-09-18.
-- The Sizes worksheet remains authoritative for the 20 approved SUP sizes and PG01-PG05 assignments.
-- Sep 18 owner review expands the review ladder to 1K-50K.
-- The older Stark quantity reference is used only where it explicitly marks a quantity unavailable.
-- Historical/sample prices are never imported into the v5 engine.

update public.packaging_size_profiles_v5
set metadata = (coalesce(metadata,'{}'::jsonb)
  - 'allowed_quantities'
  - 'blocked_quantities'
  - 'moq_reference_source'
  - 'moq_reference_status'
  - 'moq_reference_verified_at')
  || jsonb_build_object(
    'quantity_review_ladder', '[1000,2000,3000,5000,10000,20000,30000,50000]'::jsonb,
    'quantity_rule_source', 'Sep 18 owner review + legacy SUP quantity reference',
    'quantity_rule_verified_at', '2026-09-18'
  ),
  updated_at = now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64';

-- 2,000 pcs is explicitly N/A in the older reference for these six approved sizes.
update public.packaging_size_profiles_v5
set metadata = coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
    'blocked_quantities', '[2000]'::jsonb,
    'blocked_quantity_source', 'legacy SUP quantity reference: 2K explicitly N/A'
  ),
  updated_at = now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and size_key in (
    '80x130_bg25_25',
    '98x150_bg30_30',
    '110x170_bg30_30',
    '120x210_bg40_40',
    '130x210_bg40_40',
    '140x210_bg40_40'
  );
