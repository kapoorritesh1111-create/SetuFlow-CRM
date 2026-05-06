import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { inviteMember, resendInvitation, revokeInvitation } from '@/features/admin/server/actions';
import { getInvitationEmailEnvironmentSummary } from '@/features/admin/server/invitation-email';
import { hasSupabaseEnv } from '@/lib/env';
import { listInvitations, type Invitation } from '@/lib/invitations';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

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
  };
  const item = copy[notice];
  return item ? <StateMessage title={item.title} description={item.description} tone={item.tone ?? 'neutral'} /> : null;
}

export default async function AdminInvitationsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using invitation management." tone="warning" />;

  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using invitation management." tone="warning" />;
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const [{ data: roles }, { data: members }, invitationRows] = await Promise.all([
    supabase.from('roles').select('id, name, organization_id').or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name'),
    supabase.from('organization_members').select('id, is_active').eq('organization_id', organization.id),
    listInvitations(organization.id),
  ]);
  const invitations: Invitation[] = invitationRows;
  const emailEnv = getInvitationEmailEnvironmentSummary();
  const openInvitations = invitations.filter((invite) => ['draft', 'pending', 'sent'].includes(invite.status)).length;
  const sentCount = invitations.filter((invite) => invite.status === 'sent').length;
  const acceptedCount = invitations.filter((invite) => invite.status === 'accepted').length;
  const notice = typeof searchParams?.notice === 'string' ? searchParams.notice : '';
  const activeUsers = (members ?? []).filter((item: any) => item.is_active).length;

  return (
    <AdminSettingsShell active="invitations" organizationName={organization.name} missingCount={0} sectionTitle="Invitations" navCounts={{ users: activeUsers + openInvitations, invitations: openInvitations }}>
      <AdminPageHero title="Invitations" description="Create and email a secure workspace invite in one step. Resend and revoke actions stay visible for recovery." badge={organization.name} stats={[{ label: 'Open invites', value: openInvitations, tone: openInvitations ? 'warning' : 'success' }, { label: 'Sent', value: sentCount, tone: 'info' }, { label: 'Accepted', value: acceptedCount, tone: 'success' }]} />
      {notice ? <Notice notice={notice} /> : null}
      {!currentRoles.includes('owner') ? <StateMessage title="Admin-view state" description="Owner-only access escalation remains protected. You can still review and resend invitations." tone="warning" /> : null}

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email provider</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Invitation emails send immediately</h2>
            <p className="mt-2 text-sm text-slate-600">Provider: {emailEnv.provider}. From: {emailEnv.from}. If Mailtrap does not show a message, check MAILTRAP_API_KEY, MAILTRAP_USE_SANDBOX, and MAILTRAP_SANDBOX_ID.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={emailEnv.hasMailtrap || emailEnv.hasResend ? 'email configured' : 'email env missing'} tone={emailEnv.hasMailtrap || emailEnv.hasResend ? 'success' : 'warning'} dot={false} />
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h2 className="text-lg font-semibold text-slate-900">Invite user</h2>
        <p className="mt-1 text-sm text-slate-600">Enter name, email, role, and expiry. The system creates the invite and sends the email in one submit.</p>
        <form action={inviteMember} className="mt-4 grid gap-3 xl:grid-cols-[1fr_1.2fr_0.9fr_0.9fr_auto]">
          <input type="hidden" name="return_path" value="/admin/invitations" />
          <input name="full_name" placeholder="Full name" aria-label="Invitee full name" />
          <input type="email" name="email" required placeholder="new-user@example.com" aria-label="Invitee email" />
          <select name="role_id" aria-label="Invitee role">
            <option value="">No role yet</option>
            {(roles ?? []).map((role: any) => <option key={role.id} value={role.id}>{role.name}{role.organization_id ? '' : ' (global)'}</option>)}
          </select>
          <select name="expires_in_days" defaultValue="7" aria-label="Invitation expiry">
            <option value="3">Expires in 3 days</option>
            <option value="7">Expires in 7 days</option>
            <option value="14">Expires in 14 days</option>
            <option value="30">Expires in 30 days</option>
          </select>
          <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create & send</button>
        </form>
      </SectionCard>

      {!invitations.length ? <EmptyState title="No invitations found" description="Create and send an invitation to start onboarding a new workspace user." /> : (
        <SectionCard className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Invitation queue</h2>
            <p className="mt-1 text-sm text-slate-600">Delivery state, secure links, resend, and revoke actions stay in one place.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Invitee</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Timeline</th><th className="px-5 py-3">Delivery</th><th className="px-5 py-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {invitations.map((invite) => (
                  <tr key={invite.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-800"><p className="font-semibold text-slate-900">{invite.fullName || invite.email || '—'}</p><p className="mt-1 text-xs text-slate-500">{invite.email}</p><p className="mt-1 text-xs text-slate-400">ID: {invite.id}</p></td>
                    <td className="px-5 py-4 text-sm text-slate-600">{invite.invitedRole || '—'}</td>
                    <td className="px-5 py-4 text-sm"><StatusBadge label={invite.status} tone={getInvitationTone(invite.status)} /></td>
                    <td className="px-5 py-4 text-sm text-slate-600"><p><span className="font-medium text-slate-900">Sent:</span> {invite.sentAt ? formatDateTime(invite.sentAt) : '—'}</p><p><span className="font-medium text-slate-900">Expires:</span> {invite.expiresAt ? formatDateTime(invite.expiresAt) : '—'}</p></td>
                    <td className="px-5 py-4 text-sm text-slate-600"><div className="space-y-2"><div className="flex flex-wrap gap-2"><StatusBadge label={invite.emailStatus || 'link'} tone={invite.emailStatus === 'sent' ? 'success' : invite.emailStatus === 'failed' ? 'danger' : 'neutral'} dot={false} />{invite.emailProvider ? <StatusBadge label={invite.emailProvider} tone="info" dot={false} /> : null}</div>{invite.emailError ? <p className="max-w-sm text-xs text-rose-600">{invite.emailError}</p> : null}{invite.acceptUrl ? <div className="flex flex-wrap gap-2"><a href={invite.acceptUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open link</a><a href={`mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(`You're invited to ${organization.name}`)}&body=${encodeURIComponent(`Use this secure invitation link to join ${organization.name}: ${invite.acceptUrl}`)}`} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Email link</a></div> : null}</div></td>
                    <td className="px-5 py-4 text-sm"><div className="flex flex-wrap gap-2">{invite.status === 'sent' || invite.status === 'pending' || invite.status === 'draft' ? <form action={resendInvitation}><input type="hidden" name="invitation_id" value={invite.id} /><input type="hidden" name="return_path" value="/admin/invitations" /><button type="submit" className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Resend email</button></form> : null}{invite.status === 'draft' || invite.status === 'sent' || invite.status === 'pending' ? <form action={revokeInvitation}><input type="hidden" name="invitation_id" value={invite.id} /><input type="hidden" name="return_path" value="/admin/invitations" /><button type="submit" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Revoke</button></form> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </AdminSettingsShell>
  );
}
