/*
 * Permission guard helpers.
 *
 * These helpers centralise simple access control logic for the admin
 * section. They do not perform Supabase checks; rather they operate on
 * arrays of role names fetched from the database via `user_roles` and
 * provide convenience predicates for common permission checks. Keeping
 * permission logic in one place makes it easier to audit and update
 * application rules.
 */

/** Return true if the user holds at least one of the specified roles. */
export function hasRole(currentRoles: string[] | undefined, allowed: string[]): boolean {
  if (!currentRoles || currentRoles.length === 0) return false;
  return currentRoles.some((role) => allowed.includes(role));
}

/**
 * Determine if the user can invite new members. Only owners and admins
 * may invite. Other roles must submit requests through an administrator.
 */
export function canInvite(currentRoles: string[] | undefined): boolean {
  return hasRole(currentRoles, ['owner', 'admin']);
}

/**
 * Determine if the user can modify another user’s role. Only owners and
 * admins may change roles. If the target is also an owner, only an
 * owner may demote them.
 */
export function canChangeRoles(currentRoles: string[] | undefined): boolean {
  return hasRole(currentRoles, ['owner', 'admin']);
}

/**
 * Determine if the user can view audit logs. Owners and admins always can.
 * Managers may be granted read‑only access in the future. For now only
 * owners and admins are authorised.
 */
export function canViewAuditLogs(currentRoles: string[] | undefined): boolean {
  return hasRole(currentRoles, ['owner', 'admin']);
}