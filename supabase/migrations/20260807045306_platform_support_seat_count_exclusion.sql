create or replace function public.get_trial_capability(p_organization_id uuid)
returns table(organization_id uuid, is_trial boolean, billing_status text, trial_ends_at timestamp with time zone, trial_template_key text, max_leads integer, max_quotes integer, max_orders integer, max_users integer, lead_count integer, quote_count integer, order_count integer, active_user_count integer, remaining_leads integer, remaining_quotes integer, remaining_orders integer, remaining_users integer, allow_exports boolean, allow_invites boolean, allow_settings_edit boolean, allow_dispatch boolean, guided_mode_enabled boolean, overage_policy text)
language sql
stable security definer
set search_path to 'public'
as $$
  with entitlement as (
    select cep.organization_id, cep.billing_status, cep.trial_ends_at::timestamptz as trial_ends_at,
      cep.billing_status = 'trial' and (cep.trial_ends_at is null or cep.trial_ends_at >= current_date) as is_trial,
      cep.guided_mode_enabled, cep.trial_template_key, nullif(cep.max_leads,0) as max_leads,
      nullif(cep.max_quotes,0) as max_quotes, nullif(cep.max_orders,0) as max_orders,
      nullif(cep.max_users,0) as max_users, cep.allow_exports, cep.allow_invites,
      cep.allow_settings_edit, cep.allow_dispatch, cep.overage_policy
    from public.client_entitlement_profiles cep where cep.organization_id = p_organization_id
  ), usage as (
    select p_organization_id as organization_id,
      (select count(*)::integer from public.leads l where l.organization_id=p_organization_id) as lead_count,
      (select count(*)::integer from public.quotes q where q.organization_id=p_organization_id) as quote_count,
      (select count(*)::integer from public.orders o where o.organization_id=p_organization_id) as order_count,
      (select count(*)::integer from public.organization_members om where om.organization_id=p_organization_id and om.is_active is true and om.is_internal_support is false) as active_user_count
  )
  select e.organization_id,e.is_trial,e.billing_status,e.trial_ends_at,e.trial_template_key,e.max_leads,e.max_quotes,e.max_orders,e.max_users,
    u.lead_count,u.quote_count,u.order_count,u.active_user_count,
    case when e.max_leads is null then null else greatest(e.max_leads-u.lead_count,0) end,
    case when e.max_quotes is null then null else greatest(e.max_quotes-u.quote_count,0) end,
    case when e.max_orders is null then null else greatest(e.max_orders-u.order_count,0) end,
    case when e.max_users is null then null else greatest(e.max_users-u.active_user_count,0) end,
    e.allow_exports,e.allow_invites,e.allow_settings_edit,e.allow_dispatch,e.guided_mode_enabled,e.overage_policy
  from entitlement e cross join usage u;
$$;

grant select on public.platform_support_users to authenticated, service_role;
