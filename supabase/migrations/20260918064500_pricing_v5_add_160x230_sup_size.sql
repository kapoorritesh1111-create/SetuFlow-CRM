-- Pricing v5: retain both 160x230 and 160x240 SUP sizes after Akshay owner review.
do $$
declare
  v_org uuid := 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
  v_template uuid := '5635e709-213d-4fb6-a9f8-2467021a4c64';
  v_family uuid := 'f078991a-f806-4e93-a960-f4f70bb1d488';
begin
  if not exists (
    select 1
    from public.packaging_size_profiles_v5
    where organization_id=v_org
      and template_id=v_template
      and size_key='160x230_bg50_50'
  ) then
    update public.packaging_size_profiles_v5
      set sort_order=sort_order+1, updated_at=now()
    where organization_id=v_org
      and template_id=v_template
      and sort_order>=11;

    insert into public.packaging_size_profiles_v5 (
      organization_id,template_id,family_id,size_key,name,width_mm,height_mm,bottom_gusset_each_mm,
      pricing_bucket,production_profile_key,gusset_production_mode,bottom_registration_mode,
      is_active,is_quoteable,sort_order,metadata
    ) values (
      v_org,v_template,v_family,'160x230_bg50_50','160mm x 230mm (50mm + 50mm bg)',
      160,230,50,3,'sup_integrated','integrated','not_applicable',
      true,true,11,
      jsonb_build_object(
        'source','Akshay Pricing v5 review',
        'source_worksheet','160x230 + 100 mm',
        'confirmed_at','2026-09-18'
      )
    );
  end if;
end $$;
