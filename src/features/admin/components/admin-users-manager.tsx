'use client';

import { useEffect, useMemo, useState } from 'react';
import RightDrawer, { DrawerSection } from '@/components/RightDrawer';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { formatDateTime } from '@/lib/utils';
import {
  deleteMember,
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
  profile: 'Workspace profile',
  role: 'Role',
  security: 'Security',
  activity: 'Activity',
};

function tone(status: AdminUserRow['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'invited') return 'warning' as const;
  return 'neutral' as const;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-slate-700">
      <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function AdminUsersManager({ rows, roles, canManageOwners }: { rows: AdminUserRow[]; roles: RoleOption[]; canManageOwners: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<UserDrawerTab>('profile');
  const [query, setQuery] = useState('');
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/users/workspace-profile', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const next: Record<string, string> = {};
        for (const row of payload?.memberships ?? []) {
          if (row?.id && row?.display_name) next[String(row.id)] = String(row.display_name);
        }
        setDisplayNames(next);
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [displayNames[row.membershipId ?? ''] ?? row.name, row.email ?? '', row.roleName ?? '', row.username ?? ''].join(' ').toLowerCase().includes(needle));
  }, [rows, query, displayNames]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const selectedName = selected ? (displayNames[selected.membershipId ?? ''] || selected.name) : '';

  function open(row: AdminUserRow) {
    setSelectedId(row.id);
    setTab('profile');
    setDraftDisplayName(displayNames[row.membershipId ?? ''] || row.name || '');
    setTemporaryPassword('');
    setMessage(null);
    setError(null);
  }

  async function saveWorkspaceName() {
    if (!selected?.membershipId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users/workspace-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_id: selected.membershipId, display_name: draftDisplayName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? 'Could not update workspace profile.');
      setDisplayNames((current) => ({ ...current, [selected.membershipId as string]: payload.display_name ?? draftDisplayName }));
      setMessage('Workspace name updated only for this organization.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update workspace profile.');
    } finally {
      setBusy(false);
    }
  }

  async function setTempPassword() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/users/temporary-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membership_id: selected.membershipId,
          invitation_id: selected.membershipId ? null : selected.invitationId,
          temporary_password: temporaryPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? 'Could not set temporary password.');
      setTemporaryPassword('');
      setMessage('Temporary password set. The user must replace it on first login.');
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set temporary password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Workspace users</p>
            <p className="mt-1 text-sm text-slate-600">{rows.filter((row) => row.status === 'active').length} active · {rows.filter((row) => row.status === 'invited').length} invited</p>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, role…" className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-brand-400 md:max-w-sm" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-[760px] w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last activity</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => {
              const name = displayNames[row.membershipId ?? ''] || row.name;
              return (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><UserAvatar name={name} email={row.email} avatarUrl={row.avatarUrl} size="sm" /><div><p className="font-bold text-slate-900">{name}</p><p className="text-xs text-slate-500">{row.email ?? 'Invitation pending'}</p></div></div></td>
                  <td className="px-4 py-3 text-slate-600">{row.roleName ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge label={row.status} tone={tone(row.status)} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.lastActiveAt ? formatDateTime(row.lastActiveAt) : '—'}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => open(row)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Manage</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RightDrawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selectedName || 'User'}
        description={selected?.email ?? 'Pending invitation'}
        widthClassName="sm:max-w-lg lg:max-w-xl"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={selectedName} email={selected.email} avatarUrl={selected.avatarUrl} size="lg" />
                <div className="min-w-0"><p className="truncate font-black text-slate-900">{selectedName}</p><p className="truncate text-sm text-slate-500">{selected.email ?? 'Invitation pending'}</p><div className="mt-2 flex gap-2"><StatusBadge label={selected.status} tone={tone(selected.status)} />{selected.roleName ? <StatusBadge label={selected.roleName} tone="info" /> : null}</div></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {selected.tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? 'rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white' : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600'}>{TAB_LABELS[item]}</button>)}
            </div>

            {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div> : null}
            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div> : null}

            {tab === 'profile' ? (
              <DrawerSection title="Workspace identity" description="This name belongs only to the current organization. Login email and username remain account-level so edits here do not leak into other organizations.">
                {selected.membershipId ? <div className="space-y-4"><Field label="Display name in this organization"><input value={draftDisplayName} onChange={(event) => setDraftDisplayName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Login email"><input value={selected.email ?? ''} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-slate-500" /></Field><Field label="Account username"><input value={selected.username ?? ''} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-slate-500" /></Field></div><button type="button" disabled={busy} onClick={saveWorkspaceName} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save workspace name</button></div> : <p className="text-sm text-slate-600">This invitation becomes editable after the account is activated.</p>}
              </DrawerSection>
            ) : null}

            {tab === 'role' ? (
              <DrawerSection title="Workspace role" description="Role changes apply only to this organization.">
                {selected.membershipId && selected.canChangeRole ? <form action={updateMemberRole} className="space-y-3"><input type="hidden" name="membership_id" value={selected.membershipId} /><input type="hidden" name="return_path" value="/admin/users" /><select name="role_id" defaultValue={selected.roleId ?? ''} className="h-11 w-full rounded-xl border border-slate-200 px-3">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.organizationId ? '' : ' (global)'}</option>)}</select><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Save role</button></form> : selected.invitationId ? <form action={updateInvitationRole} className="space-y-3"><input type="hidden" name="invitation_id" value={selected.invitationId} /><input type="hidden" name="return_path" value="/admin/users" /><select name="role_id" defaultValue={selected.roleId ?? ''} className="h-11 w-full rounded-xl border border-slate-200 px-3">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}{role.organizationId ? '' : ' (global)'}</option>)}</select><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Save invite role</button></form> : null}
              </DrawerSection>
            ) : null}

            {tab === 'security' ? (
              <div className="space-y-4">
                {canManageOwners ? <DrawerSection title="Temporary password" description="Set a one-time temporary password. The user can sign in immediately but SETU Flow blocks workspace access until they choose a new password. The temporary password is never stored in CRM data or audit logs."><div className="space-y-3"><Field label="Temporary password"><input type="password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} minLength={12} autoComplete="new-password" placeholder="Minimum 12 characters" className="h-11 w-full rounded-xl border border-slate-200 px-3" /></Field><button type="button" disabled={busy || temporaryPassword.length < 12} onClick={setTempPassword} className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{selected.status === 'invited' ? 'Activate with temporary password' : 'Set temporary password'}</button></div></DrawerSection> : null}

                {selected.membershipId && selected.status === 'active' ? <DrawerSection title="Recovery & access"><div className="flex flex-wrap gap-2"><form action={sendMemberPasswordReset}><input type="hidden" name="membership_id" value={selected.membershipId} /><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Email password reset</button></form><form action={removeMember}><input type="hidden" name="membership_id" value={selected.membershipId} /><input type="hidden" name="return_path" value="/admin/users" /><button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">Deactivate</button></form></div></DrawerSection> : null}
                {selected.membershipId && selected.status === 'disabled' ? <form action={reactivateMember}><input type="hidden" name="membership_id" value={selected.membershipId} /><input type="hidden" name="return_path" value="/admin/users" /><button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Reactivate user</button></form> : null}
                {selected.invitationId && selected.status === 'invited' ? <DrawerSection title="Invitation"><div className="flex flex-wrap gap-2"><form action={resendInvitation}><input type="hidden" name="invitation_id" value={selected.invitationId} /><input type="hidden" name="return_path" value="/admin/users" /><button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Resend invite</button></form><form action={revokeInvitation}><input type="hidden" name="invitation_id" value={selected.invitationId} /><input type="hidden" name="return_path" value="/admin/users" /><button className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">Revoke invite</button></form></div></DrawerSection> : null}
                {selected.membershipId && selected.canDelete ? <form action={deleteMember}><input type="hidden" name="membership_id" value={selected.membershipId} /><input type="hidden" name="return_path" value="/admin/users" /><button className="text-xs font-bold text-rose-600 hover:underline">Delete membership from this workspace</button></form> : null}
              </div>
            ) : null}

            {tab === 'activity' ? <DrawerSection title="Access details"><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-900">Status</dt><dd className="mt-1 capitalize text-slate-600">{selected.status}</dd></div><div><dt className="font-bold text-slate-900">Last activity</dt><dd className="mt-1 text-slate-600">{selected.lastActiveAt ? formatDateTime(selected.lastActiveAt) : '—'}</dd></div><div><dt className="font-bold text-slate-900">User ID</dt><dd className="mt-1 break-all text-xs text-slate-500">{selected.userId ?? 'Invitation pending'}</dd></div><div><dt className="font-bold text-slate-900">Membership ID</dt><dd className="mt-1 break-all text-xs text-slate-500">{selected.membershipId ?? '—'}</dd></div></dl></DrawerSection> : null}
          </div>
        ) : null}
      </RightDrawer>
    </div>
  );
}
