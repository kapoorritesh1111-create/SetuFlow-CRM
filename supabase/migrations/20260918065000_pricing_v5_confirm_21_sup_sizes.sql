update public.packaging_pricing_templates
set quote_config_json = jsonb_set(coalesce(quote_config_json,'{}'::jsonb), '{size_count}', '21'::jsonb, true)
where id='5635e709-213d-4fb6-a9f8-2467021a4c64'
  and organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a';
