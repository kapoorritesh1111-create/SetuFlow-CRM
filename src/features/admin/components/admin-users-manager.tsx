'use client';

import { useMemo, useState } from 'react';
import RightDrawer, { DrawerSection } from '@/components/RightDrawer';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserAvatar as SharedUserAvatar } from '@/components/ui/user-avatar';
import { formatDateTime } from '@/lib/utils';
import { ToolbarField, ToolbarSearchInput, ToolbarSelect, ToolbarStat, WorkspaceToolbar } from '@/components/ui/workspace-toolbar';
import {
  deleteMember,
  reactivateMember,
  removeMember,
  resendInvitation,
  revokeInvitation,
  sendMemberPasswordReset,
  updateMemberProfile,
  updateInvitationRole,
  updateMemberRole,
} from '@/features/admin/server/actions';
import type { AdminUserRow, RoleOption, UserDrawerTab } from '@/features/admin/view-model';

const IDENTITY_COPY: Record<AdminUserRow['identityHealth'], string> = {
  complete: 'Identity complete',
  missing_name: 'Name missing',
  missing_email: 'Email missing',
  missing_profile: 'Profile missing',
};

const TAB_LABELS: Record<UserDrawerTab, string> = {
  profile: 'Profile',
  role: 'Role',
  security: 'Security',
  activity: 'Activity',
};

function getStatusTone(status: AdminUserRow['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'invited') return 'warning' as const;
  return 'neutral' as const;
}

function UserAvatar({ row, size = 'md' }: { row: AdminUserRow; size?: 'sm' | 'md' | 'lg' }) {
  return <SharedUserAvatar name={row.name} email={row.email} avatarUrl={row.avatarUrl} initials={row.initials} size={size} />;
}

type StateMessageTone = 'neutral' | 'warning' | 'danger';

function StateMessage({ title, description, tone = 'neutral' }: { title: string; description: string; tone?: StateMessageTone }) {
  const toneClasses: Record<StateMessageTone, string> = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return (
    <div className={`rounded-panel border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}

export function AdminUsersManager({ rows, roles, canManageOwners }: { rows: AdminUserRow[]; roles: RoleOption[]; canManageOwners: boolean }) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminUserRow['status']>('all');
  const [activeTab, setActiveTab] = useState<UserDrawerTab>('profile');

  const identityIssueCount = rows.filter((row) => row.identityHealth !== 'complete').length;
  const pendingInviteCount = rows.filter((row) => row.status === 'invited').length;

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = statusFilter === 'all' ? true : row.status === statusFilter;
      const haystack = [row.name, row.email ?? '', row.roleName ?? '', row.userId ?? ''].join(' ').toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [rows, searchValue, statusFilter]);

  const selected =
    filteredRows.find((row: AdminUserRow) => row.id === selectedRowId) ??
    rows.find((row: AdminUserRow) => row.id === selectedRowId) ??
    null;

  return (
    <div className="space-y-4">
      {identityIssueCount > 0 ? (
        <StateMessage
          title="Profile details need review"
          description={`${identityIssueCount} user record${identityIssueCount === 1 ? '' : 's'} need a completed name, email, or profile. Use the identity drawer to complete missing details.`}
          tone="warning"
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-ctl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">People access</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{rows.filter((row) => row.status === 'active').length}</p>
          <p className="mt-1 text-sm text-slate-500">Active workspace users</p>
        </div>
        <div className="rounded-ctl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Open invitations</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingInviteCount}</p>
          <p className="mt-1 text-sm text-slate-500">Pending onboarding and reactivation links</p>
        </div>
        <div className="rounded-ctl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Identity health</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{identityIssueCount === 0 ? 'Clean' : `${identityIssueCount} gaps`}</p>
          <p className="mt-1 text-sm text-slate-500">Names, emails, and avatar readiness</p>
        </div>
      </div>

      <WorkspaceToolbar
        searchSlot={
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <ToolbarField label="Search users">
              <ToolbarSearchInput
                value={searchValue}
                onChange={(event: any) => setSearchValue(event.target.value)}
                placeholder="Search users, emails, roles, or IDs"
                aria-label="Search users"
              />
            </ToolbarField>
            <ToolbarField label="Status">
              <ToolbarSelect
                value={statusFilter}
                onChange={(event: any) => setStatusFilter(event.target.value as 'all' | AdminUserRow['status'])}
                aria-label="Filter users by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="disabled">Disabled</option>
              </ToolbarSelect>
            </ToolbarField>
          </div>
        }
        metaSlot={
          <div className="flex flex-wrap gap-2">
            <ToolbarStat label={`${filteredRows.length} visible`} />
            {statusFilter !== 'all' ? <ToolbarStat label={`Filtered: ${statusFilter}`} tone="info" /> : null}
          </div>
        }
      />

      {!filteredRows.length ? (
        <StateMessage title="No users match the current filter" description="Adjust the search or status filter to see more records." />
      ) : (
        <div className="overflow-x-auto overscroll-x-contain rounded-ctl border border-slate-200 bg-white shadow-soft">
          <table className="min-w-[860px] divide-y divide-slate-200 xl:min-w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Identity</th>
                <th className="px-5 py-3">Last active</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.map((row: AdminUserRow) => (
                <tr key={row.id} className="align-top hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm text-slate-800">
                    <div className="flex items-center gap-3">
                      <UserAvatar row={row} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{row.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{row.email ?? ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{row.roleName ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.roleName}</span> : '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    <StatusBadge label={row.status} tone={getStatusTone(row.status)} />
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {row.identityHealth === 'complete'
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">✓ Complete</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">⚠ {IDENTITY_COPY[row.identityHealth]}</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {row.lastActiveAt ? formatDateTime(row.lastActiveAt) : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRowId(row.id);
                          setActiveTab('profile');
                        }}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit identity
                      </button>

                      {row.status === 'active' && row.membershipId && row.email ? (
                        <form action={sendMemberPasswordReset}>
                          <input type="hidden" name="membership_id" value={row.membershipId} />
                          <button
                            type="submit"
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Reset password
                          </button>
                        </form>
                      ) : null}

                      {row.status === 'disabled' && row.membershipId ? (
                        <form action={reactivateMember}>
                          <input type="hidden" name="membership_id" value={row.membershipId} />
                          <input type="hidden" name="return_path" value="/admin/users" />
                          <button
                            type="submit"
                            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            Reactivate
                          </button>
                        </form>
                      ) : null}

                      <a
                        href={`/admin/audit?view=access${row.userId ? `&actor=${encodeURIComponent(row.userId)}` : ''}`}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Audit link
                      </a>

                      {row.canResendInvite && row.invitationId ? (
                        <form action={resendInvitation}>
                          <input type="hidden" name="invitation_id" value={row.invitationId} />
                          <input type="hidden" name="return_path" value="/admin/users" />
                          <button
                            type="submit"
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {row.resendInviteLabel}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RightDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedRowId(null)}
        title={selected ? selected.name : 'User details'}
        description="Manage this person’s identity, role, status, and recent access details."
        widthClassName="sm:max-w-xl lg:max-w-2xl"
      >
        {selected ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <UserAvatar row={selected} size="lg" />
              <div className="min-w-0 space-y-2">
                <p className="truncate text-sm text-slate-600">{selected.email ?? 'No email available'}</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={selected.status} tone={getStatusTone(selected.status)} />
                  {selected.roleName ? <StatusBadge label={selected.roleName} tone="info" /> : null}
                  {selected.identityHealth !== 'complete' ? <StatusBadge label={IDENTITY_COPY[selected.identityHealth]} tone="warning" /> : null}
                  {selected.canResendInvite ? <StatusBadge label="resend available" tone="warning" /> : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {selected.tabs.map((tab: UserDrawerTab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={
                    activeTab === tab
                      ? 'rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white'
                      : 'rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                  }
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {activeTab === 'profile' ? (
              <DrawerSection title="Profile" description="Member identity and recent access details.">
                {selected.membershipId && selected.userId ? (
                  <form action={updateMemberProfile} className="space-y-3 rounded-ctl border border-slate-200 bg-slate-50 p-4">
                    <input type="hidden" name="membership_id" value={selected.membershipId} />
                    <input type="hidden" name="return_path" value="/admin/users" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>Full name</span>
                        <input name="full_name" defaultValue={selected.name === selected.email ? '' : selected.name} placeholder="Full name" />
                      </label>
                      <label className="space-y-1 text-sm font-medium text-slate-700">
                        <span>Username</span>
                        <input name="username" defaultValue={selected.username ?? ''} placeholder="Username" />
                      </label>
                    </div>
                    <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save identity</button>
                  </form>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <a href={`/admin/audit?view=access${selected.userId ? `&actor=${encodeURIComponent(selected.userId)}` : ''}`} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open audit trail</a>
                  <a href="/admin/organization" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to organization</a>
                </div>
                <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-slate-900">Name</dt>
                    <dd className="mt-1">{selected.name}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-900">Email</dt>
                    <dd className="mt-1">{selected.email ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-900">User ID</dt>
                    <dd className="mt-1 break-all">{selected.userId ?? 'Invitation only'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-900">Last active</dt>
                    <dd className="mt-1">{selected.lastActiveAt ? formatDateTime(selected.lastActiveAt) : '—'}</dd>
                  </div>
                </dl>
              </DrawerSection>
            ) : null}

            {activeTab === 'role' ? (
              <DrawerSection title="Role" description="Adjust assigned workspace access.">
                {selected.membershipId && selected.canChangeRole ? (
                  <form action={updateMemberRole} className="space-y-3">
                    <input type="hidden" name="membership_id" value={selected.membershipId} />
                    <input type="hidden" name="return_path" value="/admin/users" />
                    <select name="role_id" defaultValue={selected.roleId ?? ''} aria-label={`Role for ${selected.name}`}>
                      <option value="">No role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.organizationId ? '' : ' (global)'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Save role
                    </button>
                  </form>
                ) : selected.invitationId ? (
                  <form action={updateInvitationRole} className="space-y-3">
                    <input type="hidden" name="invitation_id" value={selected.invitationId} />
                    <input type="hidden" name="return_path" value="/admin/users" />
                    <select name="role_id" defaultValue={selected.roleId ?? ''} aria-label={`Invite role for ${selected.name}`}>
                      <option value="">No role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.organizationId ? '' : ' (global)'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Update invite role
                    </button>
                  </form>
                ) : (
                  <StateMessage
                    title="Role changes are not available"
                    description="This record cannot receive role changes from the current screen."
                  />
                )}
              </DrawerSection>
            ) : null}

            {activeTab === 'security' ? (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">Security</h3>

                {selected.membershipId && selected.status === 'active' ? (
                  <div className="space-y-3">
                    <form action={sendMemberPasswordReset} className="space-y-3">
                      <input type="hidden" name="membership_id" value={selected.membershipId} />
                      <StateMessage
                        title="Reset password"
                        description="Send an account recovery email to this user's saved email address."
                      />
                      <button
                        type="submit"
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Send password reset
                      </button>
                    </form>

                    <form action={removeMember} className="space-y-3">
                      <input type="hidden" name="membership_id" value={selected.membershipId} />
                      <input type="hidden" name="return_path" value="/admin/users" />
                      <StateMessage
                        title="Deactivate access"
                        description="Disable workspace access for this member."
                      />
                      <button
                        type="submit"
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Deactivate user
                      </button>
                    </form>
                  </div>
                ) : null}

                {selected.membershipId && selected.status === 'disabled' ? (
                  <form action={reactivateMember} className="space-y-3">
                    <input type="hidden" name="membership_id" value={selected.membershipId} />
                    <input type="hidden" name="return_path" value="/admin/users" />
                    <StateMessage
                      title="Restore access"
                      description="Reactivate this user so they can sign in to the workspace again."
                    />
                    <button
                      type="submit"
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Reactivate user
                    </button>
                  </form>
                ) : null}

                {selected.canResendInvite && selected.invitationId ? (
                  <div className="space-y-3">
                    <StateMessage
                      title="Invitation pending"
                      description={selected.status === 'active' ? 'A fresh access invitation is available to resend.' : 'Resend or revoke this invitation before it is accepted.'}
                    />

                    <form action={resendInvitation}>
                      <input type="hidden" name="invitation_id" value={selected.invitationId} />
                      <input type="hidden" name="return_path" value="/admin/users" />
                      <button
                        type="submit"
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        {selected.resendInviteLabel}
                      </button>
                    </form>

                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitation_id" value={selected.invitationId} />
                      <input type="hidden" name="return_path" value="/admin/users" />
                      <button
                        type="submit"
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Revoke invite
                      </button>
                    </form>
                  </div>
                ) : null}

                {selected.membershipId && selected.canDelete ? (
                  <form action={deleteMember} className="space-y-3 rounded-panel border border-red-200 bg-red-50 p-4">
                    <input type="hidden" name="membership_id" value={selected.membershipId} />
                    <input type="hidden" name="return_path" value="/admin/users" />
                    <StateMessage
                      title="Delete from workspace"
                      description="Remove this workspace membership while preserving historical CRM records."
                      tone="danger"
                    />
                    <button
                      type="submit"
                      className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Delete user
                    </button>
                  </form>
                ) : null}

                {!selected.membershipId && !selected.invitationId ? (
                  <StateMessage
                    title="No security actions available"
                    description="This record does not currently support password or access actions."
                  />
                ) : null}
              </section>
            ) : null}

            {activeTab === 'activity' ? (
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">Activity</h3>
                <dl className="grid gap-3 text-sm text-slate-600">
                  <div>
                    <dt className="font-medium text-slate-900">Current status</dt>
                    <dd className="mt-1 capitalize">{selected.status}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-900">Last active</dt>
                    <dd className="mt-1">{selected.lastActiveAt ? formatDateTime(selected.lastActiveAt) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-900">Invite created</dt>
                    <dd className="mt-1">{selected.invitedAt ? formatDateTime(selected.invitedAt) : '—'}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </div>
        ) : null}
      </RightDrawer>
    </div>
  );
}
