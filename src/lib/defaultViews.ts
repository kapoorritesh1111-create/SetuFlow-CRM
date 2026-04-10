/*
 * Role‑based default view assignments.
 *
 * The CRM supports numerous operational roles (sales, operations,
 * sourcing/procurement, managers and executives). Each role often
 * begins their workflow from a slightly different perspective. To
 * streamline adoption we allow a default saved view to be associated
 * with a role for each entity type. These defaults are best‑effort
 * hints; users may override them with their own preferences. When
 * customizing defaults in the future consider persisting role
 * mappings per organisation; this static mapping provides sensible
 * starting points without introducing new schema requirements.
 */

import type { EntityType } from './savedViews';
import type { WorkspaceRole } from './workspace/roles';

export type Role = WorkspaceRole;

/**
 * Mapping of default saved view IDs per role and entity type. When
 * retrieving defaults for a role/entity pair that has not been
 * explicitly defined the caller should fall back to their own saved
 * preferences or sensible built‑in options. These identifiers
 * correspond to the built‑in saved view names on each screen (e.g.
 * `mine`, `overdue`) rather than arbitrary IDs. Consumers may
 * override these values by persisting their own mappings via
 * application settings or user preferences.
 */
export const ROLE_DEFAULT_VIEWS: Partial<Record<Role, Partial<Record<EntityType, string>>>> = {
  sales: {
    leads: 'overdue',
    pipeline: 'active',
    rfqs: 'awaiting-outreach',
    quotes: 'approval-required',
  },
  operations: {
    leads: 'today',
    pipeline: 'active',
    rfqs: 'awaiting-outreach',
    quotes: 'pending',
  },
  sourcing: {
    rfqs: 'awaiting-outreach',
    quotes: 'pending',
  },
  procurement: {
    rfqs: 'awaiting-outreach',
    quotes: 'pending',
  },
  manager: {
    leads: 'all',
    pipeline: 'active',
    rfqs: 'all',
    quotes: 'all',
  },
};

/**
 * Look up the default view identifier for a given role and entity type. If
 * no mapping exists a null value is returned. Note that returned values
 * are identifiers (e.g. `overdue`) rather than full view definitions.
 *
 * @param role The role name.
 * @param entityType The entity type.
 */
export function getRoleDefaultView(role: Role, entityType: EntityType): string | null {
  const mapping = ROLE_DEFAULT_VIEWS[role];
  return mapping ? mapping[entityType] ?? null : null;
}

/**
 * Determine whether a role has an explicit default view for an entity.
 *
 * @param role The role name.
 * @param entityType The entity type.
 */
export function hasRoleDefaultView(role: Role, entityType: EntityType): boolean {
  return Boolean(getRoleDefaultView(role, entityType));
}