
update public.packaging_size_profiles_v5
set metadata = coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
      'trim_allowance_mm',10,
      'owner_review_note','Akshay 2026-09-18: 98x150 uses 10 mm trim so registered artwork route fits 2-up across the 740 mm frame.'
    ),
    production_profile_key='sup_98x150_conditional',
    gusset_production_mode='conditional',
    bottom_registration_mode='optional',
    updated_at=now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and size_key='98x150_bg30_30';

update public.packaging_size_profiles_v5
set metadata = coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
      'trim_allowance_mm',20,
      'owner_review_note','Akshay 2026-09-18: 110x170 retains the two-model registered/unregistered bottom workflow; trim remains standard unless final KLD says otherwise.'
    ),
    updated_at=now()
where organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'
  and template_id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and size_key='110x170_bg30_30';
