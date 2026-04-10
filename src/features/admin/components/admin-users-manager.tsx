'use client';

import { useMemo, useState } from 'react';
import RightDrawer, { DrawerSection } from '@/components/RightDrawer';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/utils';
import { ToolbarField, ToolbarSearchInput, ToolbarSelect, ToolbarStat, WorkspaceToolbar } from '@/components/ui/workspace-toolbar';
import {
  reactivateMember,
  removeMember,
  resendInvitation,
  revokeInvitation,
  sendMemberPasswordReset,
  updateInvitationRole,
  updateMemberRole,
} from '@/features/admin/server/actions';
import type { AdminUserRow, RoleOption, UserDrawerTab } from '@/features/admin/view-model';

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

export function AdminUsersManager({ rows, roles, canManageOwners }: { rows: AdminUserRow[]; roles: RoleOption[]; canManageOwners: boolean }) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminUserRow['status']>('all');
  const [activeTab, setActiveTab] = useState<UserDrawerTab>('profile');

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
    filteredRows.find((row) => row.id === selectedRowId) ??
    rows.find((row) => row.id === selectedRowId) ??
    null;

  return (
    <div className="space-y-4">
      {!canManageOwners ? (
        <StateMessage
          title="Admin-view state"
          description="You can review members, invitations, and security posture here, but owner-protected role changes remain intentionally contained. Use audit links to verify action history before escalating owner-only work."
          tone="warning"
        />
      ) : null}

      <WorkspaceToolbar
        searchSlot={
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <ToolbarField label="Search users">
              <ToolbarSearchInput
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search users, emails, roles, or IDs"
                aria-label="Search users"
              />
            </ToolbarField>
            <ToolbarField label="Status">
              <ToolbarSelect
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | AdminUserRow['status'])}
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
        <div className="overflow-x-auto overscroll-x-contain rounded-3xl border border-slate-200 bg-white shadow-soft">
          <table className="min-w-[860px] divide-y divide-slate-200 xl:min-w-full">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last active</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id} className="align-top hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm text-slate-800">
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      {row.detailNote ? <p className="mt-1 text-xs text-slate-500">{row.detailNote}</p> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{row.email ?? '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{row.roleName ?? '—'}</td>
                  <td className="px-5 py-4 text-sm">
                    <StatusBadge label={row.status} tone={getStatusTone(row.status)} />
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
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
                        Edit
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

                      {row.status === 'invited' && row.invitationId ? (
                        <form action={resendInvitation}>
                          <input type="hidden" name="invitation_id" value={row.invitationId} />
                          <input type="hidden" name="return_path" value="/admin/users" />
                          <button
                            type="submit"
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Resend invite
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
        description="Review membership, role, and invitation state in a shared drawer layout that preserves the current admin flow."
        widthClassName="sm:max-w-xl lg:max-w-2xl"
      >
        {selected ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">{selected.email ?? 'No email available'}</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={selected.status} tone={getStatusTone(selected.status)} />
                {selected.roleName ? <StatusBadge label={selected.roleName} tone="info" /> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {selected.tabs.map((tab) => (
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
                <StateMessage
                  title="Audit visibility"
                  description="Use the audit link below to verify role changes, password resets, invitation actions, and recoverable admin failures for this record."
                />
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
              <DrawerSection title="Role" description="Adjust assigned access without leaving the members table.">

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
                        description="This sends the standard account recovery email to the user's saved email address."
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
                        description="This disables workspace access and clears current role assignments for the selected member."
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
                      description="You can resend the invite or revoke it before the user accepts."
                    />

                    <form action={resendInvitation}>
                      <input type="hidden" name="invitation_id" value={selected.invitationId} />
                      <input type="hidden" name="return_path" value="/admin/users" />
                      <button
                        type="submit"
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Resend invite
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