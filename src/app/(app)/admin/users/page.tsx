import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { KitTabs } from '@/features/admin/components/admin-kit-tabs';
import { KitNextStep, KitSectionCard, KitTag } from '@/features/admin/components/admin-ui-kit';
import { EmptyState } from '@/components/ui/empty-state';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminUsersManager } from '@/features/admin/components/admin-users-manager';
import { inviteMember, resendInvitation, revokeInvitation } from '@/features/admin/server/actions';
import { getInvitationEmailEnvironmentSummary } from '@/features/admin/server/invitation-email';
import { buildAdminUsersViewModel } from '@/features/admin/view-model';
import { hasSupabaseEnv } from '@/lib/env';
import { listInvitations, type Invitation } from '@/lib/invitations';
import { isSetuInternalOrganization, requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * S24-ADMUX-23 — Members & Roles rebuilt as one tabbed page per the Admin UX V2
 * design contract: Members, Invitations, and Roles & permissions live together.
 * All existing functions are preserved: AdminUsersManager (role/status/recovery
 * controls), inviteMember / resendInvitation / revokeInvitation server actions.
 */

function getInvitationTone(status: string) {
  if (status === 'accepted') return 'success' as const;
  if (status === 'sent') return 'info' as const;
  if (status === 'pending' || status === 'expired') return 'warning' as const;
  if (status === 'revoked' || status === 'failed') return 'danger' as const;
  return 'neutral' as const;
}

function Notice({ notice }: { notice: string }) {
  const copy: Record<string, { title: string; description: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    'invite-created-and-sent': { title: 'Invitation created and emailed', description: 'The invite link was generated and sent through the configured email provider.', tone: 'success' },
    'invite-email-failed': { title: 'Invitation saved, but email failed', description: 'The secure link was created. Use Email link or Resend after checking Mailtrap/Resend environment settings.', tone: 'warning' },
    'invite-resent': { title: 'Invitation resent', description: 'A fresh secure invite link was generated and emailed.', tone: 'success' },
    'invite-revoked': { title: 'Invitation revoked', description: 'The invitation was revoked and can no longer be accepted.', tone: 'success' },
    'role-invalid': { title: 'Role invalid', description: 'Choose a role available to this organization.', tone: 'danger' },
    'owner-role-requires-owner': { title: 'Owner role blocked', description: 'Only an owner can invite another owner.', tone: 'danger' },
    'trial-invite-blocked': { title: 'Guided trial invite limit', description: 'This guided trial workspace cannot invite more users. Raise Max users in Client Management or convert the workspace to an active plan.', tone: 'warning' },
  };
  const item = copy[notice];
  return item ? <StateMessage title={item.title} description={item.description} tone={item.tone ?? 'neutral'} /> : null;
}

const inviteInputClass =
  'mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!hasSupabaseEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using workspace administration."
        tone="warning"
      />
    );
  }

  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using workspace administration."
        tone="warning"
      />
    );
  }
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const { data: myRolesData, error: myRolesError } = await supabase
    .from('user_roles')
    .select('roles(id, name)')
    .eq('organization_member_id', membership.id);
  if (myRolesError) return notFound();

  const myRoleNames = (myRolesData ?? []).map((item: any) => item.roles?.name).filter(Boolean);
  if (!myRoleNames.includes('owner') && !myRoleNames.includes('admin')) return notFound();

  const [membersResult, rolesResult, invitationsResult, fullRolesResult, invitationRows] = await Promise.all([
    supabase
      .from('organization_members')
      .select(
        'id, user_id, is_active, created_at, updated_at, profiles(id, full_name, username, email, avatar_url), user_roles(id, role_id, roles(id, name))',
      )
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('roles')
      .select('id, name, organization_id')
      .or(`organization_id.eq.${organization.id},organization_id.is.null`)
      .order('name'),
    supabase
      .from('organization_invitations')
      .select('id, email, status, created_at, updated_at, expires_at, last_sent_at, accepted_at, role_id, metadata, roles(id, name)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('roles')
      .select('id, name, description, organization_id, role_permissions(permission), user_roles(id)')
      .or(`organization_id.eq.${organization.id},organization_id.is.null`)
      .order('name', { ascending: true }),
    listInvitations(organization.id),
  ]);

  if (membersResult.error) return <StateMessage title="Failed to load members" description={membersResult.error.message} tone="danger" />;
  if (rolesResult.error) return <StateMessage title="Failed to load roles" description={rolesResult.error.message} tone="danger" />;
  if (invitationsResult.error) return <StateMessage title="Failed to load invitations" description={invitationsResult.error.message} tone="danger" />;

  const { rows, roles, summary } = buildAdminUsersViewModel({
    members: (membersResult.data ?? []) as any[],
    roles: (rolesResult.data ?? []) as any[],
    invitations: (invitationsResult.data ?? []) as any[],
  });

  const invitations: Invitation[] = invitationRows;
  const fullRoles = (fullRolesResult.data ?? []) as any[];
  const emailEnv = getInvitationEmailEnvironmentSummary();
  const openInvitations = invitations.filter((invite) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const canManageOwners = myRoleNames.includes('owner');
  const notice = typeof searchParams?.notice === 'string' ? searchParams.notice : '';
  const requestedTab = typeof searchParams?.tab === 'string' ? searchParams.tab : undefined;
  const internalTools = isSetuInternalOrganization(organization);

  const membersPanel = (
    <div className="px-4 py-3.5">
      {!rows.length ? (
        <EmptyState title="No users found" description="Add members or send invitations to start managing workspace access." />
      ) : (
        <AdminUsersManager rows={rows} roles={roles} canManageOwners={canManageOwners} />
      )}
    </div>
  );

  const invitesPanel = (
    <div className="px-4 py-3.5">
      <div className="mb-3 flex items-center gap-2.5 rounded-ctl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <span aria-hidden="true" className="shrink-0 text-sm">📧</span>
        <p className="min-w-0">
          Provider: <strong>{emailEnv.provider || 'Mailtrap'}</strong>. From: {emailEnv.from || 'noreply@setuflowcrm.com'}. Invitations send immediately on creation.
        </p>
        <span className="ml-auto shrink-0">
          <StatusBadge label={emailEnv.hasMailtrap || emailEnv.hasResend ? 'Email configured' : 'Email env missing'} tone={emailEnv.hasMailtrap || emailEnv.hasResend ? 'success' : 'warning'} dot={false} />
        </span>
      </div>
      {!currentRoles.includes('owner') ? (
        <div className="mb-3">
          <StateMessage title="Admin-view state" description="Owner-only access escalation remains protected. You can still review and resend invitations." tone="warning" />
        </div>
      ) : null}

      <form id="invite-form" action={inviteMember} className="mb-3 grid items-end gap-2.5 rounded-ctl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1.2fr_0.8fr_0.8fr_auto]">
        <input type="hidden" name="return_path" value="/admin/users?tab=invites" />
        <label className="block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Full name<input name="full_name" placeholder="Full name" aria-label="Invitee full name" className={inviteInputClass} /></label>
        <label className="block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Email<input type="email" name="email" required placeholder="new-user@example.com" aria-label="Invitee email" className={inviteInputClass} /></label>
        <label className="block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Role<select name="role_id" aria-label="Invitee role" className={inviteInputClass}><option value="">No role yet</option>{(rolesResult.data ?? []).map((role: any) => <option key={role.id} value={role.id}>{role.name}{role.organization_id ? '' : ' (global)'}</option>)}</select></label>
        <label className="block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">Expiry<select name="expires_in_days" defaultValue="7" aria-label="Invitation expiry" className={inviteInputClass}><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
        <button type="submit" className="inline-flex min-h-9 items-center justify-center rounded-ctl bg-brand-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800">Create &amp; send</button>
      </form>

      {!invitations.length ? (
        <div className="rounded-ctl border border-dashed border-slate-300 bg-slate-50 py-6 text-center">
          <p className="text-xs text-slate-500">No invitations yet. Create and send an invitation above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-ctl border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {['Invitee', 'Role', 'Status', 'Sent', 'Expires', 'Actions'].map((heading) => (
                  <th key={heading} className="border-b border-slate-100 bg-slate-50 px-2.5 py-1.5 text-left text-[8px] font-bold uppercase tracking-[0.13em] text-slate-400">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invitations.map((invite) => (
                <tr key={invite.id} className={`align-middle hover:bg-slate-50 ${invite.status === 'sent' ? 'bg-amber-50/50' : ''}`}>
                  <td className="border-b border-slate-50 px-2.5 py-2">
                    <p className="text-xs font-bold text-slate-900">{invite.fullName || invite.email || '—'}</p>
                    <p className="text-[9.5px] text-slate-400">{invite.email}</p>
                  </td>
                  <td className="border-b border-slate-50 px-2.5 py-2 text-slate-600">{invite.invitedRole ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">{invite.invitedRole}</span> : '—'}</td>
                  <td className="border-b border-slate-50 px-2.5 py-2"><StatusBadge label={invite.status} tone={getInvitationTone(invite.status)} /></td>
                  <td className="border-b border-slate-50 px-2.5 py-2 text-[9.5px] text-slate-400">{invite.sentAt ? new Date(invite.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="border-b border-slate-50 px-2.5 py-2 text-[9.5px] font-semibold text-amber-700">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="border-b border-slate-50 px-2.5 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {invite.acceptUrl ? <a href={invite.acceptUrl} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-slate-500 transition hover:text-teal-600">Link ›</a> : null}
                      {(invite.status === 'sent' || invite.status === 'pending' || invite.status === 'draft') && (
                        <form action={resendInvitation} className="inline"><input type="hidden" name="invitation_id" value={invite.id} /><input type="hidden" name="return_path" value="/admin/users?tab=invites" /><button type="submit" className="text-[10px] font-semibold text-slate-500 transition hover:text-teal-600">Resend</button></form>
                      )}
                      {(invite.status === 'draft' || invite.status === 'sent' || invite.status === 'pending') && (
                        <form action={revokeInvitation} className="inline"><input type="hidden" name="invitation_id" value={invite.id} /><input type="hidden" name="return_path" value="/admin/users?tab=invites" /><button type="submit" className="text-[10px] font-semibold text-rose-500 transition hover:text-rose-700">Revoke</button></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const rolesPanel = (
    <div className="px-4 py-3.5">
      <div className="space-y-2">
        {fullRoles.map((role) => {
          const permissions = ((role.role_permissions ?? []) as Array<{ permission: string }>).map((item) => item.permission);
          const assigned = ((role.user_roles ?? []) as Array<{ id: string }>).length;
          return (
            <div key={role.id} className="rounded-ctl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold capitalize text-slate-900">{role.name}</p>
                <KitTag tone={role.organization_id ? 'info' : 'neutral'}>{role.organization_id ? 'Org role' : 'Global'}</KitTag>
                <span className="ml-auto text-[9.5px] font-semibold text-slate-400">{assigned} member{assigned === 1 ? '' : 's'}</span>
              </div>
              {role.description ? <p className="mt-1 text-[10.5px] leading-[1.45] text-slate-500">{role.description}</p> : null}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {permissions.length ? (
                  permissions.slice(0, 14).map((permission) => (
                    <span key={permission} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[8.5px] font-semibold text-slate-600">{permission}</span>
                  ))
                ) : (
                  <span className="text-[9.5px] italic text-slate-400">No explicit permissions recorded</span>
                )}
                {permissions.length > 14 ? <span className="text-[8.5px] font-semibold text-slate-400">+{permissions.length - 14} more</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10.5px] text-slate-500">
        Full role permission management and the approval threshold live in{' '}
        <Link href="/admin/security" className="font-bold text-blue-800 hover:underline">Security &amp; Roles →</Link>
      </p>
    </div>
  );

  return (
    <AdminSettingsShell
      active="users"
      organizationName={organization.name}
      internalTools={internalTools}
      missingCount={0}
      sectionTitle="Team & Access"
      navCounts={{ users: summary.totalUsers, invitations: openInvitations }}
    >
      {notice ? <Notice notice={notice} /> : null}
      <KitSectionCard
        eyebrow="Members, Invitations & Roles — one page"
        title="Team"
        tag={`${summary.totalUsers} total`}
        tagTone="info"
        flush
      >
        <KitTabs
          initialTab={requestedTab}
          items={[
            { key: 'members', label: `Members (${summary.activeUsers})`, content: membersPanel },
            { key: 'invites', label: 'Invitations', badge: openInvitations, content: invitesPanel },
            { key: 'roles', label: 'Roles & permissions', content: rolesPanel },
          ]}
        />
      </KitSectionCard>
      <KitNextStep icon="💰" label="Team configured — review commerce rules next" description="Ensure approval threshold and pricing defaults are set" href="/admin/pricing" />
    </AdminSettingsShell>
  );
}
