-- Stark Packmate Field Sales role and hard RLS boundary.
-- Field Sales can work only CRM leads owned/explicitly assigned to them and must never
-- gain access to the Stark Interakt inbound queue. Restrictive policies are required
-- because the existing organization-member policies are permissive and combine with OR.

insert into public.roles (organization_id, name, description)
select
  'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid,
  'field_sales',
  'Field sales lead capture and follow-up. Access is limited to CRM leads created by or explicitly assigned to this user; Interakt inbound inquiries are excluded.'
where not exists (
  select 1
  from public.roles
  where organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and lower(name) = 'field_sales'
);

create or replace function public.is_stark_field_sales_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and exists (
      select 1
      from public.organization_members om
      join public.user_roles ur on ur.organization_member_id = om.id
      join public.roles r on r.id = ur.role_id
      where om.organization_id = p_organization_id
        and om.user_id = (select auth.uid())
        and om.is_active = true
        and lower(r.name) = 'field_sales'
    );
$$;

revoke all on function public.is_stark_field_sales_member(uuid) from public;
grant execute on function public.is_stark_field_sales_member(uuid) to authenticated;

-- Replace earlier permissive Field Sales policies. A permissive policy cannot narrow
-- leads_select_member, so the Field Sales boundary must be RESTRICTIVE.
drop policy if exists stark_field_sales_leads_select_scope on public.leads;
drop policy if exists stark_field_sales_leads_insert_scope on public.leads;
drop policy if exists stark_field_sales_leads_update_scope on public.leads;
drop policy if exists stark_field_sales_leads_select_restrict on public.leads;
drop policy if exists stark_field_sales_leads_insert_restrict on public.leads;
drop policy if exists stark_field_sales_leads_update_restrict on public.leads;

create policy stark_field_sales_leads_select_restrict
on public.leads
as restrictive
for select
to authenticated
using (
  not public.is_stark_field_sales_member(leads.organization_id)
  or (
    leads.owner_user_id = (select auth.uid())
    and coalesce(lower(leads.source_type), '') <> 'interakt'
  )
);

create policy stark_field_sales_leads_insert_restrict
on public.leads
as restrictive
for insert
to authenticated
with check (
  not public.is_stark_field_sales_member(leads.organization_id)
  or (
    leads.owner_user_id = (select auth.uid())
    and coalesce(lower(leads.source_type), '') <> 'interakt'
  )
);

create policy stark_field_sales_leads_update_restrict
on public.leads
as restrictive
for update
to authenticated
using (
  not public.is_stark_field_sales_member(leads.organization_id)
  or (
    leads.owner_user_id = (select auth.uid())
    and coalesce(lower(leads.source_type), '') <> 'interakt'
  )
)
with check (
  not public.is_stark_field_sales_member(leads.organization_id)
  or (
    leads.owner_user_id = (select auth.uid())
    and coalesce(lower(leads.source_type), '') <> 'interakt'
  )
);

-- Defense in depth: even if an Interakt staging row were manually assigned to a
-- Field Sales user, RLS still prevents that user from reading or updating it.
drop policy if exists stark_field_sales_inbound_select_restrict on public.lead_intake_staging;
drop policy if exists stark_field_sales_inbound_update_restrict on public.lead_intake_staging;

create policy stark_field_sales_inbound_select_restrict
on public.lead_intake_staging
as restrictive
for select
to authenticated
using (
  not (
    lead_intake_staging.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and lower(coalesce(lead_intake_staging.source_provider, '')) = 'interakt'
    and public.is_stark_field_sales_member(lead_intake_staging.organization_id)
  )
);

create policy stark_field_sales_inbound_update_restrict
on public.lead_intake_staging
as restrictive
for update
to authenticated
using (
  not (
    lead_intake_staging.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and lower(coalesce(lead_intake_staging.source_provider, '')) = 'interakt'
    and public.is_stark_field_sales_member(lead_intake_staging.organization_id)
  )
)
with check (
  not (
    lead_intake_staging.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
    and lower(coalesce(lead_intake_staging.source_provider, '')) = 'interakt'
    and public.is_stark_field_sales_member(lead_intake_staging.organization_id)
  )
);
