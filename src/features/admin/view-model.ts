export type RoleOption = { id: string; name: string; organizationId: string | null };
export type UserDrawerTab = 'profile' | 'role' | 'security' | 'activity';

export type AdminUserRow = {
  id: string;
  membershipId: string | null;
  invitationId: string | null;
  userId: string | null;
  name: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  initials: string;
  roleId: string | null;
  roleName: string | null;
  status: 'active' | 'disabled' | 'invited';
  lastActiveAt: string | null;
  invitedAt: string | null;
  detailNote: string | null;
  canChangeRole: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
  canResendInvite: boolean;
  resendInviteLabel: string;
  identityHealth: 'complete' | 'missing_name' | 'missing_email' | 'missing_profile';
  tabs: UserDrawerTab[];
};

export type AdminUsersSummary = { totalUsers: number; activeUsers: number; invitedUsers: number; disabledUsers: number };

type MemberRecord = { id?: unknown; user_id?: unknown; is_active?: unknown; created_at?: unknown; updated_at?: unknown; profiles?: unknown; user_roles?: unknown };
type InvitationRecord = { id?: unknown; email?: unknown; status?: unknown; created_at?: unknown; updated_at?: unknown; expires_at?: unknown; last_sent_at?: unknown; accepted_at?: unknown; roles?: unknown; role_id?: unknown; metadata?: unknown };
type RoleRecord = { id?: unknown; name?: unknown; organization_id?: unknown };

const OPEN_INVITE_STATUSES = new Set(['draft', 'pending', 'sent']);

const asOptionalString = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);
const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);
const asRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const firstRelation = (value: unknown): Record<string, unknown> | null => asRecord(value) ?? asRecord(asArray(value)[0]);
const normalizeEmail = (value: unknown) => asOptionalString(value)?.toLowerCase() ?? null;

function initialsFor(name: string, email?: string | null) {
  const source = name && name !== email ? name : email ?? name;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase() || 'SF';
}

function getInviteMetadata(invitation: InvitationRecord) {
  return asRecord(invitation.metadata) ?? {};
}

function isReactivationInvite(invitation: InvitationRecord) {
  const metadata = getInviteMetadata(invitation);
  return metadata.access_flow === 'reactivation' || metadata.reactivation_resend_allowed === true;
}

function inviteeFullName(invitation: InvitationRecord) {
  const invitee = asRecord(getInviteMetadata(invitation).invitee);
  return asOptionalString(invitee?.full_name);
}

function normalizeRole(record: RoleRecord): RoleOption | null {
  const id = asOptionalString(record.id);
  const name = asOptionalString(record.name);
  if (!id || !name) return null;
  return { id, name, organizationId: asOptionalString(record.organization_id) };
}

function memberIdentityHealth(fullName: string | null, email: string | null, userId: string | null) {
  if (!userId) return 'missing_profile' as const;
  if (!email) return 'missing_email' as const;
  if (!fullName) return 'missing_name' as const;
  return 'complete' as const;
}

function buildMemberRow(member: MemberRecord, reactivationInvite?: InvitationRecord | null): AdminUserRow | null {
  const membershipId = asOptionalString(member.id);
  if (!membershipId) return null;
  const profile = firstRelation(member.profiles);
  const roleWrapper = firstRelation(member.user_roles);
  const role = firstRelation(roleWrapper?.roles);
  const fullName = asOptionalString(profile?.full_name);
  const username = asOptionalString(profile?.username);
  const email = asOptionalString(profile?.email);
  const avatarUrl = asOptionalString(profile?.avatar_url);
  const isActive = asBoolean(member.is_active, true);
  const invitationId = isActive && reactivationInvite ? asOptionalString(reactivationInvite.id) : null;
  const name = fullName ?? username ?? email ?? 'Unnamed user';

  return {
    id: `member-${membershipId}`,
    membershipId,
    invitationId,
    userId: asOptionalString(member.user_id),
    name,
    username,
    email,
    avatarUrl,
    initials: initialsFor(name, email),
    roleId: asOptionalString(role?.id) ?? asOptionalString(roleWrapper?.role_id),
    roleName: asOptionalString(role?.name),
    status: isActive ? 'active' : 'disabled',
    lastActiveAt: asOptionalString(member.updated_at) ?? asOptionalString(member.created_at),
    invitedAt: invitationId ? asOptionalString(reactivationInvite?.last_sent_at) ?? asOptionalString(reactivationInvite?.created_at) : null,
    detailNote: invitationId ? 'Reactivated: invite resend available' : username ? `Username: ${username}` : null,
    canChangeRole: true,
    canDeactivate: isActive,
    canDelete: true,
    canResendInvite: Boolean(invitationId),
    resendInviteLabel: invitationId ? 'Resend reactivation invite' : 'Resend invite',
    identityHealth: memberIdentityHealth(fullName, email, asOptionalString(member.user_id)),
    tabs: ['profile', 'role', 'security', 'activity'],
  };
}

function buildInvitationRow(invitation: InvitationRecord): AdminUserRow | null {
  const invitationId = asOptionalString(invitation.id);
  if (!invitationId) return null;
  const status = asOptionalString(invitation.status);
  if (!status || !OPEN_INVITE_STATUSES.has(status)) return null;
  const role = firstRelation(invitation.roles);
  const email = asOptionalString(invitation.email);
  const name = inviteeFullName(invitation) ?? email ?? 'Pending invitation';
  const invitedAt = asOptionalString(invitation.last_sent_at) ?? asOptionalString(invitation.created_at);

  return {
    id: `invite-${invitationId}`,
    membershipId: null,
    invitationId,
    userId: null,
    name,
    username: null,
    email,
    avatarUrl: null,
    initials: initialsFor(name, email),
    roleId: asOptionalString(invitation.role_id) ?? asOptionalString(role?.id),
    roleName: asOptionalString(role?.name),
    status: 'invited',
    lastActiveAt: asOptionalString(invitation.accepted_at) ?? invitedAt,
    invitedAt,
    detailNote: asOptionalString(invitation.expires_at) ? `Expires ${asOptionalString(invitation.expires_at)}` : null,
    canChangeRole: false,
    canDeactivate: false,
    canDelete: false,
    canResendInvite: true,
    resendInviteLabel: 'Resend invite',
    identityHealth: email ? 'missing_name' : 'missing_email',
    tabs: ['profile', 'security', 'activity'],
  };
}

export function buildAdminUsersViewModel(data: { members: MemberRecord[]; invitations: InvitationRecord[]; roles: RoleRecord[] }): { rows: AdminUserRow[]; roles: RoleOption[]; summary: AdminUsersSummary } {
  const roles = data.roles
    .map(normalizeRole)
    .filter((i): i is RoleOption => i !== null)
    .sort((a, b) => {
      if (a.organizationId && !b.organizationId) return -1;
      if (!a.organizationId && b.organizationId) return 1;
      return a.name.localeCompare(b.name);
    });

  const openInvitations = data.invitations.filter((invite) => OPEN_INVITE_STATUSES.has(asOptionalString(invite.status) ?? ''));
  const activeMemberEmails = new Set(data.members.filter((member) => asBoolean(member.is_active, true)).map((member) => normalizeEmail(firstRelation(member.profiles)?.email)).filter((email): email is string => Boolean(email)));
  const disabledMemberEmails = new Set(data.members.filter((member) => !asBoolean(member.is_active, true)).map((member) => normalizeEmail(firstRelation(member.profiles)?.email)).filter((email): email is string => Boolean(email)));
  const reactivationInviteByEmail = new Map<string, InvitationRecord>();

  for (const invite of openInvitations) {
    const email = normalizeEmail(invite.email);
    if (email && isReactivationInvite(invite)) reactivationInviteByEmail.set(email, invite);
  }

  const memberRows = data.members
    .map((member) => {
      const email = normalizeEmail(firstRelation(member.profiles)?.email);
      const invite = email ? reactivationInviteByEmail.get(email) : null;
      return buildMemberRow(member, invite);
    })
    .filter((i): i is AdminUserRow => i !== null);

  const invitationRows = openInvitations
    .filter((invite) => {
      const email = normalizeEmail(invite.email);
      if (!email) return true;
      if (disabledMemberEmails.has(email)) return false;
      if (activeMemberEmails.has(email)) return false;
      return true;
    })
    .map(buildInvitationRow)
    .filter((i): i is AdminUserRow => i !== null);

  const rows = [...memberRows, ...invitationRows].sort((a, b) => {
    const at = Date.parse(a.lastActiveAt ?? a.invitedAt ?? '') || 0;
    const bt = Date.parse(b.lastActiveAt ?? b.invitedAt ?? '') || 0;
    return bt - at || a.name.localeCompare(b.name);
  });

  return {
    rows,
    roles,
    summary: {
      totalUsers: rows.length,
      activeUsers: memberRows.filter((r) => r.status === 'active').length,
      invitedUsers: invitationRows.length,
      disabledUsers: memberRows.filter((r) => r.status === 'disabled').length,
    },
  };
}
