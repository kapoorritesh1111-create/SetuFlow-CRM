create or replace function public.validate_packaging_proof_quote_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  quote_org_id uuid;
begin
  select q.organization_id
    into quote_org_id
  from public.quote_line_items qli
  join public.quotes q on q.id = qli.quote_id
  where qli.id = new.quote_line_item_id;

  if quote_org_id is null then
    raise exception 'Quote line does not exist for packaging proof';
  end if;

  if quote_org_id <> new.organization_id then
    raise exception 'Packaging proof organization does not match quote organization';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_packaging_proof_quote_org on public.packaging_proofs;
create trigger trg_validate_packaging_proof_quote_org
before insert or update of organization_id, quote_line_item_id
on public.packaging_proofs
for each row
execute function public.validate_packaging_proof_quote_org();
