import type { WorkspaceRole } from '@/lib/workspace/roles';
import { normalizeWorkspaceRoles } from '@/lib/workspace/roles';

export { normalizeWorkspaceRoles } from '@/lib/workspace/roles';

export type WorkspaceCapability =
  | 'catalog.manage'
  | 'settings.manage'
  | 'lead.manage'
  | 'quote.send'
  | 'compliance.review'
  | 'reporting.view'
  | 'packaging.design'
  | 'packaging.production'
  | 'packaging.order_entry';

const CAPABILITY_ROLES: Record<WorkspaceCapability, readonly WorkspaceRole[]> = {
  'catalog.manage': ['owner', 'admin', 'manager'],
  'settings.manage': ['owner', 'admin', 'manager'],
  'lead.manage': ['owner', 'admin', 'manager', 'sales', 'operations', 'sourcing', 'procurement', 'contributor', 'ordering'],
  'quote.send': ['owner', 'admin', 'manager', 'sales'],
  'compliance.review': ['owner', 'admin', 'manager', 'operations'],
  'reporting.view': ['owner', 'admin', 'manager', 'sales', 'operations', 'contributor', 'viewer'],
  // S27-STARK-A2: packaging-vertical role scoping for a multi-team org
  // (Design = artwork/proof work, Operations = dispatch/production floor,
  // Ordering = order entry and reorders without send/approve authority).
  'packaging.design': ['owner', 'admin', 'manager', 'design'],
  'packaging.production': ['owner', 'admin', 'manager', 'operations'],
  'packaging.order_entry': ['owner', 'admin', 'manager', 'sales', 'ordering'],
};

const CAPABILITY_LABELS: Record<WorkspaceCapability, string> = {
  'catalog.manage': 'manage catalog products and pricing',
  'settings.manage': 'manage reference data and workspace settings lists',
  'lead.manage': 'create leads, run quick edits, and update the lead queue',
  'quote.send': 'send quotes and finalize commercial actions',
  'compliance.review': 'review compliance and document blockers',
  'reporting.view': 'view reporting and audit history',
  'packaging.design': 'manage artwork, proofs, and pre-press work',
  'packaging.production': 'update production stage and cylinder/plate records',
  'packaging.order_entry': 'create and reorder quotes without sending or approving them',
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
