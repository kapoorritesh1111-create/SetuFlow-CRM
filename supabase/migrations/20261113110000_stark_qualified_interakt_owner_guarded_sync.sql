-- Qualified leads that have no manual ownership evidence may follow
-- Interakt, but only if CRM and staging still agree on the previous owner.
CREATE OR REPLACE FUNCTION public.sync_stark_interakt_owner_on_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_choice record;
  v_linked_owner uuid;
BEGIN
  IF NEW.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     OR lower(coalesce(NEW.source_provider,'')) <> 'interakt'
     OR (NEW.setu_assignment_origin IS NOT NULL AND NEW.setu_assignment_origin NOT IN ('interakt','setu_auto'))
     OR OLD.setu_assignment_origin = 'manual'
  THEN RETURN NEW; END IF;

  -- Audit protects legacy manual overrides that were accidentally labeled interakt.
  IF EXISTS (
    SELECT 1 FROM public.audit_logs a
    WHERE a.organization_id = NEW.organization_id AND a.entity_id = NEW.id
      AND a.action = 'inbound_lead_reassigned'
  ) THEN RETURN NEW; END IF;

  -- A qualified CRM lead can only follow the provider when it still has
  -- the same owner as staging and has no explicit CRM reassignment history.
  IF NEW.qualified_lead_id IS NOT NULL THEN
    IF NEW.qualified_lead_id IS DISTINCT FROM OLD.qualified_lead_id THEN RETURN NEW; END IF;
    SELECT l.owner_user_id INTO v_linked_owner FROM public.leads l
      WHERE l.id=NEW.qualified_lead_id AND l.organization_id=NEW.organization_id;
    IF NOT FOUND OR v_linked_owner IS DISTINCT FROM OLD.setu_assigned_user_id
      OR EXISTS(SELECT 1 FROM public.lead_assignment_history h WHERE h.lead_id=NEW.qualified_lead_id)
      OR EXISTS(SELECT 1 FROM public.audit_logs a
                WHERE a.organization_id=NEW.organization_id AND a.entity_id=NEW.qualified_lead_id
                  AND a.action ILIKE '%assign%')
    THEN RETURN NEW; END IF;
  END IF;

  v_name := lower(regexp_replace(btrim(coalesce(NEW.interakt_assignee_name,'')),
                                 '[[:space:]]+', ' ', 'g'));
  IF v_name = '' THEN RETURN NEW; END IF;

  SELECT om.user_id, lower(p.email) AS email,
         coalesce(nullif(p.full_name,''),p.email) AS display_name
  INTO v_choice
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.user_id
  JOIN public.user_roles ur ON ur.organization_member_id = om.id
  JOIN public.roles r ON r.id = ur.role_id
  WHERE om.organization_id = NEW.organization_id AND om.is_active
    AND om.is_internal_support IS NOT TRUE
    AND lower(r.name) IN ('sales','field_sales')
    AND lower(p.email) NOT LIKE 'support@%'
    AND (
      v_name = lower(regexp_replace(btrim(coalesce(p.full_name,'')), '[[:space:]]+', ' ', 'g'))
      OR v_name = lower(p.email)
      OR (v_name = 'simran simran' AND lower(p.email) = 'cse@starkpackmate.com')
    )
  ORDER BY p.full_name LIMIT 1;

  IF v_choice.user_id IS NULL OR v_choice.user_id = NEW.setu_assigned_user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_logs (organization_id,entity_type,entity_id,action,payload)
  VALUES (NEW.organization_id,'lead_intake_staging',NEW.id,'interakt_owner_synced',
          jsonb_build_object('previous_user_id',NEW.setu_assigned_user_id,
                             'next_user_id',v_choice.user_id,
                             'provider_assignee',NEW.interakt_assignee_name,
                             'source','stark_p0_20261113',
                             'previous_origin',NEW.setu_assignment_origin));

  IF NEW.qualified_lead_id IS NOT NULL THEN
    UPDATE public.leads l SET owner_user_id=v_choice.user_id,updated_at=now()
    WHERE l.id=NEW.qualified_lead_id AND l.organization_id=NEW.organization_id
      AND l.owner_user_id=OLD.setu_assigned_user_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    INSERT INTO public.audit_logs(organization_id,entity_type,entity_id,action,payload)
    VALUES (NEW.organization_id,'leads',NEW.qualified_lead_id,
            'interakt_owner_synced_qualified',
            jsonb_build_object('from_user_id',OLD.setu_assigned_user_id,
                               'to_user_id',v_choice.user_id,'staging_id',NEW.id,
                               'provider_assignee',NEW.interakt_assignee_name,
                               'source','stark_p0_20261113'));
  END IF;

  NEW.setu_assigned_user_id := v_choice.user_id;
  NEW.setu_assigned_invitation_id := NULL;
  NEW.setu_assigned_email := v_choice.email;
  NEW.setu_assigned_name := v_choice.display_name;
  NEW.setu_assigned_at := now();
  NEW.setu_assignment_origin := 'interakt';
  RETURN NEW;
END;
$function$;



UPDATE public.lead_intake_staging s SET updated_at=s.updated_at
WHERE s.organization_id='b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
 AND lower(s.source_provider)='interakt'
 AND s.qualified_lead_id IS NOT NULL
 AND (s.setu_assignment_origin IS NULL OR s.setu_assignment_origin IN('interakt','setu_auto'))
 AND NOT EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.organization_id=s.organization_id
                AND a.entity_id=s.id AND a.action='inbound_lead_reassigned')
 AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=s.qualified_lead_id
            AND l.organization_id=s.organization_id AND l.owner_user_id=s.setu_assigned_user_id
            AND NOT EXISTS(SELECT 1 FROM public.lead_assignment_history h WHERE h.lead_id=l.id)
            AND NOT EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.organization_id=s.organization_id
                           AND a.entity_id=l.id AND a.action ILIKE '%assign%'))
 AND EXISTS(SELECT 1 FROM public.organization_members om
            JOIN public.profiles p ON p.id=om.user_id
            WHERE om.organization_id=s.organization_id AND om.is_active AND NOT om.is_internal_support
            AND EXISTS(SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id
                       WHERE ur.organization_member_id=om.id AND lower(r.name) IN('sales','field_sales'))
            AND s.setu_assigned_user_id IS DISTINCT FROM om.user_id
            AND (lower(btrim(s.interakt_assignee_name))=lower(btrim(p.full_name))
                 OR lower(btrim(s.interakt_assignee_name))=lower(p.email)
                 OR (lower(btrim(s.interakt_assignee_name))='simran simran' AND lower(p.email)='cse@starkpackmate.com')));
