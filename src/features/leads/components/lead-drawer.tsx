'use client';

import { useSearchParams } from 'next/navigation';
import { parseWorkspaceMode, workspaceModeToLeadJourney } from '@/features/workspace/mode';
import type { LeadDrawerLead, LeadDrawerProps, LeadDrawerSavePayload } from '@/features/leads/types/workspace';
import { LeadDrawer as LeadDrawerImplementation } from '@/features/leads/components/drawer/lead-drawer-implementation';

export * from '@/features/leads/components/drawer/lead-drawer-implementation';

function buildModeSeedLead(leadType: 'buyer' | 'supplier'): LeadDrawerLead {
  return {
    id: '',
    company_name: '',
    contact_name: null,
    job_title: null,
    email: null,
    phone: null,
    whatsapp_number: null,
    phone_secondary: null,
    lead_type: leadType,
    country: null,
    country_id: null,
    source_type: null,
    source_label: null,
    next_follow_up_at: null,
    created_at: null,
    updated_at: null,
    last_contacted_at: null,
    stage_id: null,
    next_step_id: null,
    owner_user_id: null,
    trade_event_id: null,
    notes: null,
    website: null,
    social_handle: null,
    deal_value: null,
    deal_currency: null,
    pipeline_id: null,
    intro_sent: false,
    phone_country_code: null,
    phone_secondary_country_code: null,
  };
}

export function LeadDrawer(props: LeadDrawerProps) {
  const searchParams = useSearchParams();
  const quickNewLead = (props.mode ?? 'quick') === 'quick' && !props.lead?.id;
  const modeLeadType = workspaceModeToLeadJourney(parseWorkspaceMode(searchParams.get('mode') ?? undefined));
  const modeSeedLead = quickNewLead && modeLeadType ? buildModeSeedLead(modeLeadType) : undefined;

  return (
    <LeadDrawerImplementation
      {...props}
      lead={props.lead ?? modeSeedLead}
      onSaved={(payload: LeadDrawerSavePayload) => {
        if (quickNewLead && payload.resetForNextLead) {
          props.onSaved?.({ ...payload, lead: modeSeedLead });
          return;
        }
        props.onSaved?.(payload);
      }}
    />
  );
}
