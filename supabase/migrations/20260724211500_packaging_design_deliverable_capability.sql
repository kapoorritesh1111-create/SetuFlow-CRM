-- Packaging design services are quoted as ordinary product lines, not as
-- line_type='packaging'. Mark the catalog products that create artwork/proof
-- deliverables so the Design Queue can include them without pulling in every
-- product or generic add-on.
update public.products as p
set enabled_capabilities = array(
      select distinct capability
      from unnest(
        coalesce(p.enabled_capabilities, '{}'::text[])
        || array['artwork_approval']::text[]
      ) as capability
      order by capability
    ),
    updated_at = now()
where p.organization_id = (
        select o.id
        from public.organizations as o
        where o.slug = 'packaging'
        limit 1
      )
  and p.sku in ('SP-PREPRESS', 'SP-3D-PACKSHOT', 'SP-MOCKUP');
