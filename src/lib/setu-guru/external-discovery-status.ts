export type DiscoveryProviderOutcome =
  | 'completed_with_results'
  | 'completed_no_matches'
  | 'partial'
  | 'provider_not_configured'
  | 'scope_confirmation_required'
  | 'failed';

export type DiscoveryCampaignJobSnapshot = {
  id?: string;
  status?: string | null;
  provider_key?: string | null;
  provider_request?: Record<string, unknown> | null;
  provider_response?: Record<string, unknown> | null;
  last_error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DiscoveryCampaignStatusInput = {
  status?: string | null;
  scope_status?: string | null;
  search_config?: Record<string, unknown> | null;
  icp_snapshot?: Record<string, unknown> | null;
  latest_job?: DiscoveryCampaignJobSnapshot | null;
  result_count?: number;
};

export type CampaignDisplayStateKey =
  | 'draft'
  | 'needs_information'
  | 'ready'
  | 'researching'
  | 'completed_with_results'
  | 'completed_no_matches'
  | 'partial'
  | 'provider_not_configured'
  | 'scope_confirmation_required'
  | 'failed';

export type CampaignDisplayState = {
  key: CampaignDisplayStateKey;
  label: string;
  description: string;
  nextAction:
    | 'complete_scope'
    | 'review_scope'
    | 'start_research'
    | 'view_results'
    | 'review_rejected_rows'
    | 'correct_and_retry'
    | 'open_crm_matches'
    | 'configure_provider';
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
};

export function discoveryObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function discoveryList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

export function discoveryText(value: unknown): string {
  return String(value ?? '').trim();
}

export function isLegacyDiscoveryCampaign(campaign: DiscoveryCampaignStatusInput) {
  return Object.keys(discoveryObject(campaign.search_config)).length === 0;
}

export function legacyCampaignHasMixedDirections(campaign: DiscoveryCampaignStatusInput) {
  if (!isLegacyDiscoveryCampaign(campaign)) return false;
  const snapshot = discoveryObject(campaign.icp_snapshot);
  return discoveryList(snapshot.buyer_types).length > 0 && discoveryList(snapshot.supplier_types).length > 0;
}

export function campaignSourceStrategy(campaign: DiscoveryCampaignStatusInput) {
  return discoveryText(discoveryObject(campaign.search_config).source_strategy) || 'external_only';
}

export function campaignProviderOutcome(campaign: DiscoveryCampaignStatusInput): DiscoveryProviderOutcome | null {
  const outcome = discoveryText(discoveryObject(campaign.latest_job?.provider_response).outcome);
  return [
    'completed_with_results',
    'completed_no_matches',
    'partial',
    'provider_not_configured',
    'scope_confirmation_required',
    'failed',
  ].includes(outcome) ? outcome as DiscoveryProviderOutcome : null;
}

const STATES: Record<CampaignDisplayStateKey, Omit<CampaignDisplayState, 'key'>> = {
  draft: {
    label: 'Draft',
    description: 'The research scope has not been confirmed.',
    nextAction: 'complete_scope',
    tone: 'neutral',
  },
  needs_information: {
    label: 'Needs information',
    description: 'Add the missing market, product, direction, or company type before research.',
    nextAction: 'complete_scope',
    tone: 'warning',
  },
  ready: {
    label: 'Ready to research',
    description: 'The confirmed scope is ready for an explicit research run.',
    nextAction: 'start_research',
    tone: 'info',
  },
  researching: {
    label: 'Researching',
    description: 'The configured provider is researching the confirmed scope now.',
    nextAction: 'review_scope',
    tone: 'info',
  },
  completed_with_results: {
    label: 'Completed with results',
    description: 'Qualified external prospects were found and remain outside CRM until approved.',
    nextAction: 'view_results',
    tone: 'success',
  },
  completed_no_matches: {
    label: 'Completed — no qualified matches',
    description: 'Research completed, but no returned company passed the confirmed scope and fit controls.',
    nextAction: 'review_rejected_rows',
    tone: 'warning',
  },
  partial: {
    label: 'Partially completed',
    description: 'Some research tasks succeeded while other tasks failed. Review the partial failures before retrying.',
    nextAction: 'review_rejected_rows',
    tone: 'warning',
  },
  provider_not_configured: {
    label: 'Provider not configured',
    description: 'No external provider ran. This does not mean the market has no opportunities.',
    nextAction: 'configure_provider',
    tone: 'warning',
  },
  scope_confirmation_required: {
    label: 'Scope confirmation required',
    description: 'Choose one research direction and confirm the market, product, and target company types.',
    nextAction: 'review_scope',
    tone: 'warning',
  },
  failed: {
    label: 'Research failed',
    description: 'The provider run failed. Correct the issue and retry the confirmed scope.',
    nextAction: 'correct_and_retry',
    tone: 'danger',
  },
};

function state(key: CampaignDisplayStateKey): CampaignDisplayState {
  return { key, ...STATES[key] };
}

export function resolveCampaignDisplayState(campaign: DiscoveryCampaignStatusInput): CampaignDisplayState {
  if (legacyCampaignHasMixedDirections(campaign)) return state('scope_confirmation_required');

  const scopeStatus = discoveryText(campaign.scope_status);
  if (scopeStatus === 'draft') return state('draft');
  if (scopeStatus === 'needs_input') return state('needs_information');
  if (scopeStatus === 'researching' || discoveryText(campaign.latest_job?.status) === 'running') return state('researching');

  const providerOutcome = campaignProviderOutcome(campaign);
  if (providerOutcome) return state(providerOutcome === 'scope_confirmation_required' ? 'scope_confirmation_required' : providerOutcome);

  if (scopeStatus === 'ready') {
    if (campaignSourceStrategy(campaign) === 'crm_only') {
      return {
        ...state('ready'),
        description: 'This confirmed scope uses existing Setu Flow records only.',
        nextAction: 'open_crm_matches',
      };
    }
    return state('ready');
  }

  if (scopeStatus === 'completed') {
    return state((campaign.result_count ?? 0) > 0 ? 'completed_with_results' : 'completed_no_matches');
  }

  const fallback = discoveryText(campaign.status);
  if (fallback === 'failed') return state('failed');
  if (fallback === 'running' || fallback === 'researching') return state('researching');
  if (fallback === 'completed') return state((campaign.result_count ?? 0) > 0 ? 'completed_with_results' : 'completed_no_matches');
  // A legacy campaign.status of "partial" is intentionally not displayed as Partially completed.
  // That label is reserved for provider_response.outcome = partial.
  if (fallback === 'partial') return state('failed');
  return isLegacyDiscoveryCampaign(campaign) ? state('scope_confirmation_required') : state('draft');
}
