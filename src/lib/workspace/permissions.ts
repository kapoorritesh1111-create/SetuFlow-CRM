import type { WorkspaceRole } from '@/lib/workspace/roles';
import { normalizeWorkspaceRoles } from '@/lib/workspace/roles';

export { normalizeWorkspaceRoles } from '@/lib/workspace/roles';

export type WorkspaceCapability =
  | 'catalog.manage'
  | 'settings.manage'
  | 'lead.manage'
  | 'quote.send'
  | 'compliance.review'
  | 'reporting.view';

const CAPABILITY_ROLES: Record<WorkspaceCapability, readonly WorkspaceRole[]> = {
  'catalog.manage': ['owner', 'admin', 'manager'],
  'settings.manage': ['owner', 'admin', 'manager'],
  'lead.manage': ['owner', 'admin', 'manager', 'sales', 'operations', 'sourcing', 'procurement', 'contributor'],
  'quote.send': ['owner', 'admin', 'manager', 'sales'],
  'compliance.review': ['owner', 'admin', 'manager', 'operations'],
  'reporting.view': ['owner', 'admin', 'manager', 'sales', 'operations', 'contributor', 'viewer'],
};

const CAPABILITY_LABELS: Record<WorkspaceCapability, string> = {
  'catalog.manage': 'manage catalog products and pricing',
  'settings.manage': 'manage reference data and workspace settings lists',
  'lead.manage': 'create leads, run quick edits, and update the lead queue',
  'quote.send': 'send quotes and finalize commercial actions',
  'compliance.review': 'review compliance and document blockers',
  'reporting.view': 'view reporting and audit history',
};

export function hasWorkspaceCapability(currentRoles: string[] | undefined, capability: WorkspaceCapability) {
  const normalizedRoles = normalizeWorkspaceRoles(currentRoles);
  if (normalizedRoles.length === 0) return false;
  const allowedRoles = CAPABILITY_ROLES[capability];
  return normalizedRoles.some((role) => allowedRoles.includes(role));
}

export function getWorkspaceCapabilityLabel(capability: WorkspaceCapability) {
  return CAPABILITY_LABELS[capability];
}

export function getReadOnlyWorkspaceMessage(currentRoles: string[] | undefined, capability: WorkspaceCapability) {
  if (hasWorkspaceCapability(currentRoles, capability)) return null;
  return `Your current role can view this workspace but cannot ${getWorkspaceCapabilityLabel(capability)}.`;
}
