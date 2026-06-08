import { getTrialCapability, hasReachedTrialLimit, type TrialCapability, type TrialCapabilityClient } from '@/lib/trial/capability';

export type TrialActionKind =
  | 'create_lead'
  | 'create_quote'
  | 'create_order'
  | 'invite_user'
  | 'export_data'
  | 'edit_settings'
  | 'dispatch_order';

export type TrialEnforcementDecision = {
  allowed: boolean;
  reason: string | null;
  capability: TrialCapability | null;
};

const DEFAULT_BLOCK_REASON = 'This guided trial action is not available on the current trial plan.';

function isTrialExpired(capability: TrialCapability) {
  if (!capability.trial_ends_at) return false;
  const expiresAt = new Date(capability.trial_ends_at).getTime();
  return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

function block(reason: string, capability: TrialCapability | null): TrialEnforcementDecision {
  return { allowed: false, reason, capability };
}

function allow(capability: TrialCapability | null): TrialEnforcementDecision {
  return { allowed: true, reason: null, capability };
}

export function evaluateTrialAction(
  capability: TrialCapability | null,
  action: TrialActionKind,
): TrialEnforcementDecision {
  if (!capability?.is_trial) return allow(capability ?? null);

  if (isTrialExpired(capability)) {
    return block('This guided trial has expired. Convert the workspace to an active plan before continuing.', capability);
  }

  switch (action) {
    case 'create_lead':
      return hasReachedTrialLimit(capability.lead_count, capability.max_leads)
        ? block(`Guided trial lead limit reached (${capability.max_leads}). Convert the workspace before adding more leads.`, capability)
        : allow(capability);
    case 'create_quote':
      return hasReachedTrialLimit(capability.quote_count, capability.max_quotes)
        ? block(`Guided trial quote limit reached (${capability.max_quotes}). Convert the workspace before creating more quotes.`, capability)
        : allow(capability);
    case 'create_order':
      return hasReachedTrialLimit(capability.order_count, capability.max_orders)
        ? block(`Guided trial order limit reached (${capability.max_orders}). Convert the workspace before creating more orders.`, capability)
        : allow(capability);
    case 'invite_user':
      if (!capability.allow_invites) return block('Guided trial workspaces cannot invite additional users. Convert the workspace before inviting users.', capability);
      return hasReachedTrialLimit(capability.active_user_count, capability.max_users)
        ? block(`Guided trial user limit reached (${capability.max_users}). Convert the workspace before inviting users.`, capability)
        : allow(capability);
    case 'export_data':
      return capability.allow_exports ? allow(capability) : block('Exports are disabled during guided trials.', capability);
    case 'edit_settings':
      return capability.allow_settings_edit ? allow(capability) : block('Workspace settings edits are disabled during guided trials.', capability);
    case 'dispatch_order':
      return capability.allow_dispatch ? allow(capability) : block(DEFAULT_BLOCK_REASON, capability);
    default:
      return block(DEFAULT_BLOCK_REASON, capability);
  }
}

export async function enforceTrialAction(input: {
  organizationId: string;
  action: TrialActionKind;
  client?: TrialCapabilityClient;
}): Promise<TrialEnforcementDecision> {
  const { capability, error } = await getTrialCapability(input.organizationId, input.client);
  if (error) {
    return block(`Could not verify guided trial limits: ${error}`, null);
  }

  return evaluateTrialAction(capability, input.action);
}

export function toTrialActionError(decision: TrialEnforcementDecision) {
  return decision.allowed ? null : decision.reason ?? DEFAULT_BLOCK_REASON;
}
