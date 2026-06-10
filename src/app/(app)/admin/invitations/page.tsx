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
    'trial-invite-blocked': { title: 'Guided trial invite limit', description: 'This guided trial workspace cannot invite more users. Raise Max users in Client Management or convert the workspace to an active plan.', tone: 'warning' },
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

      <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <span className="text-lg flex-shrink-0">📧</span>
        <div>Provider: <strong>{emailEnv.provider || 'Mailtrap'}</strong>. From: {emailEnv.from || 'noreply@setuflowcrm.com'}. Invitations send immediately on creation.</div>
        <div className="ml-auto flex-shrink-0">
          <StatusBadge label={emailEnv.hasMailtrap || emailEnv.hasResend ? 'EMAIL CONFIGURED' : 'email env missing'} tone={emailEnv.hasMailtrap || emailEnv.hasResend ? 'success' : 'warning'} dot={false} />
        </div>
      </div>

      <SectionCard title="Active invitations" eyebrow="Organisation" actions={
        <button type="submit" form="invite-form" className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">+ Send invitation</button>
      }>
        <form id="invite-form" action={inviteMember} className="grid gap-3 sm:grid-cols-[1fr_1.2fr_0.8fr_0.8fr_auto] items-end mb-4 p-4 rounded-2xl border border-slate-200 bg-slate-50">
          <input type="hidden" name="return_path" value="/admin/invitations" />
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Full name<input name="full_name" placeholder="Full name" aria-label="Invitee full name" className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400" /></label>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Email<input type="email" name="email" required placeholder="new-user@example.com" aria-label="Invitee email" className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400" /></label>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Role<select name="role_id" aria-label="Invitee role" className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"><option value="">No role yet</option>{(roles ?? []).map((role: any) => <option key={role.id} value={role.id}>{role.name}{role.organization_id ? '' : ' (global)'}</option>)}</select></label>
          <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Expiry<select name="expires_in_days" defaultValue="7" aria-label="Invitation expiry" className="mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
          <button type="submit" className="min-h-10 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition">Create &amp; send</button>
        </form>

        {!invitations.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
            <p className="text-sm text-slate-500">No invitations yet. Create and send an invitation above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody>
                {invitations.map((invite) => (
                  <tr key={invite.id} className="border-t border-slate-100 align-middle hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{invite.fullName || invite.email || '—'}</p>
                      <p className="text-xs text-slate-500">{invite.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{invite.invitedRole ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{invite.invitedRole}</span> : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge label={invite.status} tone={getInvitationTone(invite.status)} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{invite.sentAt ? new Date(invite.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-amber-700">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {invite.acceptUrl && <a href={invite.acceptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">Link</a>}
                        {invite.acceptUrl && <a href={`mailto:${encodeURIComponent(invite.email)}`} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">Manual link</a>}
                        {(invite.status === 'sent' || invite.status === 'pending' || invite.status === 'draft') && (
                          <form action={resendInvitation}><input type="hidden" name="invitation_id" value={invite.id} /><input type="hidden" name="return_path" value="/admin/invitations" /><button type="submit" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">Resend</button></form>
                        )}
                        {(invite.status === 'draft' || invite.status === 'sent' || invite.status === 'pending') && (
                          <form action={revokeInvitation}><input type="hidden" name="invitation_id" value={invite.id} /><input type="hidden" name="return_path" value="/admin/invitations" /><button type="submit" className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition">Revoke</button></form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </AdminSettingsShell>
  );
}
