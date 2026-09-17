-- Paying-client workflow hardening: customer-supplied artwork still requires
-- final customer approval of the latest design/proof before production.
create or replace function public.packaging_line_has_final_design(
  p_organization_id uuid,
  p_quote_line_item_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((
    select pp.status = 'approved'
    from public.packaging_proofs pp
    where pp.organization_id = p_organization_id
      and pp.quote_line_item_id = p_quote_line_item_id
    order by pp.version desc, pp.uploaded_at desc, pp.created_at desc
    limit 1
  ), false);
$$;

comment on function public.packaging_line_has_final_design(uuid, uuid) is
  'Returns true only when the latest customer-provided or Design Team proof has final customer approval.';

revoke all on function public.packaging_line_has_final_design(uuid, uuid) from public;
grant execute on function public.packaging_line_has_final_design(uuid, uuid) to authenticated, service_role;
