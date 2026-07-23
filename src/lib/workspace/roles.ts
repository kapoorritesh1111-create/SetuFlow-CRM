export const WORKSPACE_ROLE_NAMES = [
  'owner',
  'admin',
  'manager',
  'sales',
  'design',
  'operations',
  'ordering',
  'sourcing',
  'procurement',
  'contributor',
  'viewer',
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLE_NAMES)[number];

export const WORKSPACE_ROLE_ALIASES: Record<string, WorkspaceRole> = {
  ops: 'operations',
  dispatch: 'operations',
  prepress: 'design',
};

export const WORKSPACE_ROLE_HIERARCHY: readonly WorkspaceRole[] = [
  'owner',
  'admin',
  'manager',
  'sales',
  'design',
  'operations',
  'ordering',
  'sourcing',
  'procurement',
  'contributor',
  'viewer',
] as const;

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole | null {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (!normalized) return null;

  const canonicalRole = WORKSPACE_ROLE_ALIASES[normalized] ?? normalized;
  return WORKSPACE_ROLE_NAMES.includes(canonicalRole as WorkspaceRole)
    ? (canonicalRole as WorkspaceRole)
    : null;
}

export function normalizeWorkspaceRoles(currentRoles: readonly (string | null | undefined)[] | undefined) {
  if (!currentRoles || currentRoles.length === 0) return [] as WorkspaceRole[];

  return Array.from(
    new Set(
      currentRoles
        .map((role) => normalizeWorkspaceRole(role))
        .filter((role): role is WorkspaceRole => Boolean(role)),
    ),
  );
}

export function hasCanonicalWorkspaceRole(
  currentRoles: readonly (string | null | undefined)[] | undefined,
  allowedRoles: readonly WorkspaceRole[],
) {
  const normalizedRoles = normalizeWorkspaceRoles(currentRoles);
  return normalizedRoles.some((role) => allowedRoles.includes(role));
}

export function getPrimaryWorkspaceRole(currentRoles: readonly (string | null | undefined)[] | undefined) {
  const normalizedRoles = normalizeWorkspaceRoles(currentRoles);
  return WORKSPACE_ROLE_HIERARCHY.find((role) => normalizedRoles.includes(role)) ?? null;
}

export function getWorkspaceRoleDisplayName(role: string | null | undefined) {
  const normalized = normalizeWorkspaceRole(role);
  if (!normalized) return 'Member';

  return normalized
    .split(/[_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
