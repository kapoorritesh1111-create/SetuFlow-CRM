import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { listInvitations } from '@/lib/invitations';
import { inviteMember, sendInvitation, resendInvitation, revokeInvitation } from '@/features/admin/server/actions';
import { formatDateTime } from '@/lib/utils';

function getInvitationTone(status: string) {
  if (status === 'accepted') return 'success' as const;
  if (status === 'sent') return 'info' as const;
  if (status === 'pending' || status === 'expired') return 'warning' as const;
  if (status === 'revoked' || status === 'failed') return 'danger' as const;
  return 'neutral' as const;
}


export default async function AdminInvitationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!hasSupabaseEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using invitation management." tone="warning" />;
  }

  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv) {
    return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using invitation management." tone="warning" />;
  }
  if (!membership || !organization) return null;

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, organization_id')
    .or(`organization_id.eq.${organization.id},organization_id.is.null`)
    .order('name');

  const invitations = await listInvitations(organization.id);
  const sentCount = invitations.filter((invite) => invite.status === 'sent').length;
  const pendingCount = invitations.filter((invite) => invite.status === 'pending').length;
  const acceptedCount = invitations.filter((invite) => invite.status === 'accepted').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Invitations"
        badge={organization.name}
        description="Keep creation, resend, revoke, and manual delivery in one screen so workspace onboarding takes fewer steps."
        actions={[
          { label: 'Organization', href: '/admin/organization' },
          { label: 'Users', href: '/admin/users', type: 'primary' },
        ]}
      />

      <StateMessage
        title="What to do next in Invitations"
        description="Create the invite, send or resend the secure link, then verify the status change here before treating onboarding as complete. Accepted invites should be checked in Users."
        tone="neutral"
      />

      {!currentRoles.includes('owner') ? (
        <StateMessage
          title="Admin-view state"
          description="Invitation creation and queue review remain available here, but owner-only access escalation stays contained. Use the audit log to verify resend or revoke history before changing role-sensitive onboarding."
          tone="warning"
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Active sends</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{sentCount}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Drafts and pending</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{pendingCount + invitations.filter((invite) => invite.status === 'draft').length}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-sm text-slate-500">Accepted</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{acceptedCount}</p>
        </SectionCard>
      </div>

      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit links</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Recoverable admin actions stay traceable</h2>
            <p className="mt-2 text-sm text-slate-600">Use the audit log to confirm whether a create, send, resend, or revoke action actually completed before retrying the invitation workflow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/audit?view=access" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Open access audit</a>
            <a href="/admin/users" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Open users</a>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="max-w-5xl">
          <h2 className="text-lg font-semibold text-slate-900">Create invitation</h2>
          <p className="mt-1 text-sm text-slate-600">This preserves the current schema-driven flow while making role selection and expiry easier to scan.</p>
          <form action={inviteMember} className="mt-4 grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
            <input type="hidden" name="return_path" value="/admin/invitations" />
            <input type="email" name="email" required placeholder="new-user@example.com" aria-label="Invitee email" />
            <select name="role_id" aria-label="Invitee role">
              <option value="">No role yet</option>
              {(roles ?? []).map((role: any) => (
                <option key={role.id} value={role.id}>{role.name}{role.organization_id ? '' : ' (global)'}</option>
              ))}
            </select>
            <select name="expires_in_days" defaultValue="7" aria-label="Invitation expiry">
              <option value="3">Expires in 3 days</option>
              <option value="7">Expires in 7 days</option>
              <option value="14">Expires in 14 days</option>
              <option value="30">Expires in 30 days</option>
            </select>
            <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create invite</button>
          </form>
        </div>
      </SectionCard>

      {!invitations || invitations.length === 0 ? (
        <EmptyState title="No invitations found" description="Create an invitation to start the onboarding flow for a new workspace user." />
      ) : (
        <SectionCard className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Invitation queue</h2>
            <p className="mt-1 text-sm text-slate-600">Delivery links stay visible alongside resend and revoke actions so admins do not have to jump between screens.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Invitee</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Timeline</th>
                  <th className="px-5 py-3">Delivery</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {invitations.map((invite) => (
                  <tr key={invite.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm text-slate-800">
                      <div>
                        <p className="font-semibold text-slate-900">{invite.email || '—'}</p>
                        <p className="mt-1 text-xs text-slate-500">ID: {invite.id}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{invite.invitedRole || '—'}</td>
                    <td className="px-5 py-4 text-sm"><StatusBadge label={invite.status} tone={getInvitationTone(invite.status)} /></td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        <p><span className="font-medium text-slate-900">Sent:</span> {invite.sentAt ? formatDateTime(invite.sentAt) : '—'}</p>
                        <p><span className="font-medium text-slate-900">Expires:</span> {invite.expiresAt ? formatDateTime(invite.expiresAt) : '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {invite.acceptUrl ? (
                        <div className="flex flex-wrap gap-2">
                          <a href={invite.acceptUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Open link
                          </a>
                          <a href={`mailto:${encodeURIComponent(invite.email)}?subject=${encodeURIComponent(`You're invited to ${organization.name}`)}&body=${encodeURIComponent(`Use this secure invitation link to join ${organization.name}: ${invite.acceptUrl}`)}`} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Email link
                          </a>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {invite.status === 'draft' ? (
                          <form action={sendInvitation}>
                            <input type="hidden" name="invitation_id" value={invite.id} />
                            <input type="hidden" name="return_path" value="/admin/invitations" />
                            <button type="submit" className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Send</button>
                          </form>
                        ) : null}
                        {invite.status === 'sent' || invite.status === 'pending' ? (
                          <form action={resendInvitation}>
                            <input type="hidden" name="invitation_id" value={invite.id} />
                            <input type="hidden" name="return_path" value="/admin/invitations" />
                            <button type="submit" className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Resend</button>
                          </form>
                        ) : null}
                        {invite.status === 'draft' || invite.status === 'sent' || invite.status === 'pending' ? (
                          <form action={revokeInvitation}>
                            <input type="hidden" name="invitation_id" value={invite.id} />
                            <input type="hidden" name="return_path" value="/admin/invitations" />
                            <button type="submit" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100">Revoke</button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
