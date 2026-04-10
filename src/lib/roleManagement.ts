/*
 * Role management utilities.
 *
 * This module provides helper functions for determining which roles a
 * given actor can manage, what roles can be assigned by a user and
 * translating internal role identifiers into human‑friendly labels. These
 * utilities operate purely at the application layer and do not perform
 * any database mutations themselves. For server side role changes
 * refer to the server actions in `src/features/admin/server`.
 */

import { WORKSPACE_ROLE_HIERARCHY, getWorkspaceRoleDisplayName } from './workspace/roles';
import type { WorkspaceRole } from './workspace/roles';

export type Role = WorkspaceRole;

// Ordered list representing a simple role hierarchy. Roles earlier in the
// list have more authority. This hierarchy is not persisted in the
// database; it exists solely to drive client-side UI decisions.
const ROLE_HIERARCHY: Role[] = [...WORKSPACE_ROLE_HIERARCHY];

/**
 * Determine if an actor can manage (assign/unassign) the target role. The
 * actor must occupy a role that is higher in the hierarchy than the target
 * role. Owners and admins can manage any role. For equal or lower
 * privilege levels the function returns false.
 *
 * @param actorRole The role of the acting user.
 * @param targetRole The role being modified.
 */
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  const actorIndex = ROLE_HIERARCHY.indexOf(actorRole);
  const targetIndex = ROLE_HIERARCHY.indexOf(targetRole);
  return actorIndex >= 0 && targetIndex >= 0 && actorIndex < targetIndex;
}

/**
 * Get a list of roles that the actor is allowed to assign. Roles higher
 * than the actor’s own role are omitted. For example, an admin may
 * assign manager, sales, operations, sourcing, procurement and viewer
 * roles but cannot assign owner.
 *
 * @param actorRole The role of the acting user.
 */
export function getAssignableRoles(actorRole: Role): Role[] {
  const actorIndex = ROLE_HIERARCHY.indexOf(actorRole);
  return ROLE_HIERARCHY.slice(actorIndex + 1);
}

/**
 * Convert an internal role identifier into a human friendly label. This
 * utility capitalizes the first letter of each role and handles hyphenated
 * names gracefully. For more complex naming rules consider a map of
 * explicit display names.
 *
 * @param role The internal role identifier.
 */
export function getRoleDisplayName(role: Role): string {
  return getWorkspaceRoleDisplayName(role);
}
