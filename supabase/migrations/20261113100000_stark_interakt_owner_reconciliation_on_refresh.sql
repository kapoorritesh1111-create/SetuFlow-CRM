-- Stark Packmate P0: reconcile Interakt ownership on every contact refresh, not
-- just changes to the provider assignee field. Never override manual/qualified leads.
CREATE OR REPLACE FUNCTION public.sync_stark_interakt_owner_on_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_choice record;
BEGIN
  IF NEW.organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
     OR lower(coalesce(NEW.source_provider,'')) <> 'interakt'
     OR NEW.qualified_lead_id IS NOT NULL
     OR OLD.qualified_lead_id IS NOT NULL
     OR NEW.setu_assignment_origin NOT IN ('interakt','setu_auto')
     OR OLD.setu_assignment_origin = 'manual'
  THEN RETURN NEW; END IF;

  -- Audit protects legacy manual overrides that were accidentally labeled interakt.
  IF EXISTS (
    SELECT 1 FROM public.audit_logs a
    WHERE a.organization_id = NEW.organization_id AND a.entity_id = NEW.id
      AND a.action = 'inbound_lead_reassigned'
  ) THEN RETURN NEW; END IF;

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

  NEW.setu_assigned_user_id := v_choice.user_id;
  NEW.setu_assigned_invitation_id := NULL;
  NEW.setu_assigned_email := v_choice.email;
  NEW.setu_assigned_name := v_choice.display_name;
  NEW.setu_assigned_at := now();
  NEW.setu_assignment_origin := 'interakt';
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_stark_interakt_owner_on_change ON public.lead_intake_staging;
CREATE TRIGGER trg_sync_stark_interakt_owner_on_change
BEFORE UPDATE ON public.lead_intake_staging
FOR EACH ROW
EXECUTE FUNCTION public.sync_stark_interakt_owner_on_change();

-- Backfill only non-qualified, non-manually assigned, active-resolvable
-- explicit Interakt/auto-origin mismatches. The trigger emits per-row audit.
UPDATE public.lead_intake_staging s SET updated_at = s.updated_at
WHERE s.organization_id = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid
  AND lower(s.source_provider) = 'interakt'
  AND s.qualified_lead_id IS NULL
  AND s.setu_assignment_origin IN ('interakt','setu_auto')
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_logs a
    WHERE a.organization_id=s.organization_id AND a.entity_id=s.id
      AND a.action='inbound_lead_reassigned'
  )
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.profiles p ON p.id=om.user_id
    JOIN public.user_roles ur ON ur.organization_member_id=om.id
    JOIN public.roles r ON r.id=ur.role_id
    WHERE om.organization_id=s.organization_id
      AND om.is_active AND om.is_internal_support IS NOT TRUE
      AND lower(r.name) IN ('sales','field_sales')
      AND lower(p.email) NOT LIKE 'support@%'
      AND (
        lower(regexp_replace(btrim(coalesce(s.interakt_assignee_name,'')),'[[:space:]]+',' ','g'))
           = lower(regexp_replace(btrim(coalesce(p.full_name,'')),'[[:space:]]+',' ','g'))
        OR lower(btrim(coalesce(s.interakt_assignee_name,'')))=lower(p.email)
        OR (lower(btrim(coalesce(s.interakt_assignee_name,'')))='simran simran'
            AND lower(p.email)='cse@starkpackmate.com')
      )
      AND s.setu_assigned_user_id IS DISTINCT FROM om.user_id
  );