export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StateMessage } from '@/components/ui/state-message';
import { acceptInvitationByToken, registerAndAcceptInvitation } from '@/features/admin/server/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { hashInvitationToken } from '@/lib/invitationTokens';

function normalizeEmail(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function deriveUsername(email: string) {
  return email.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || '';
}

function titleCasePack(value?: string | null) {
  const text = String(value ?? '').replace(/_/g, ' ').trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Workspace Pack';
}

function Field({ label, name, type = 'text', placeholder, required = false, defaultValue, readOnly = false }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string; readOnly?: boolean }) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium text-slate-800">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} autoComplete={name} defaultValue={defaultValue} readOnly={readOnly} className={readOnly ? 'bg-slate-100 text-slate-800' : undefined} />
    </label>
  );
}

export default async function InviteTokenPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token ?? '');
  if (!token) return notFound();

  const admin = createAdminSupabaseClient();
  if (!admin) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Invitation links are not configured</h1>
          <p className="mt-2 text-sm text-slate-600">A service role key is required to validate invitation links securely.</p>
        </div>
      </div>
    );
  }

  const tokenHash = hashInvitationToken(token);
  const { data: invite } = await (admin as any)
    .from('organization_invitations')
    .select('id, organization_id, email, status, expires_at, accepted_at, revoked_at, metadata, roles(name), organizations(name, slug, logo_url, website)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invite) return notFound();

  const inviteEmail = normalizeEmail(invite.email);
  const { data: profileRows } = await (admin as any)
    .from('profiles')
    .select('full_name, username, email')
    .ilike('email', inviteEmail)
    .limit(1);
  const existingProfile = Array.isArray(profileRows) ? profileRows[0] : null;

  const { data: industryProfile } = await (admin as any)
    .from('organization_industry_profiles')
    .select('industry_key, provisioning_pack')
    .eq('organization_id', invite.organization_id)
    .maybeSingle();

  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  const signedInEmail = normalizeEmail(user?.email);
  const emailMatches = Boolean(signedInEmail && inviteEmail && signedInEmail === inviteEmail);
  const inviteBlocked = invite.status === 'accepted' || Boolean(invite.accepted_at) || invite.status === 'revoked' || Boolean(invite.revoked_at) || isExpired;
  const inviteMetadata = invite.metadata && typeof invite.metadata === 'object' && !Array.isArray(invite.metadata) ? invite.metadata as Record<string, any> : {};
  const invitedFullName = typeof inviteMetadata.invitee?.full_name === 'string' ? inviteMetadata.invitee.full_name : '';
  const invitedUsername = typeof inviteMetadata.invitee?.username === 'string' ? inviteMetadata.invitee.username : '';
  const organization = Array.isArray(invite.organizations) ? invite.organizations[0] : invite.organizations;
  const organizationName = organization?.name ?? 'your workspace';
  const organizationSlug = organization?.slug ?? 'workspace';
  const roleName = Array.isArray(invite.roles) ? invite.roles[0]?.name : invite.roles?.name;
  const fullNameDefault = invitedFullName || existingProfile?.full_name || '';
  const usernameDefault = invitedUsername || existingProfile?.username || deriveUsername(inviteEmail);
  const packLabel = industryProfile?.provisioning_pack === 'apparel_industry_pack' ? 'Apparel Industry Pack' : titleCasePack(industryProfile?.provisioning_pack);
  const industryLabel = industryProfile?.industry_key === 'apparel_textiles' ? 'Apparel & Textiles' : titleCasePack(industryProfile?.industry_key);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/30 bg-slate-950 p-6 text-white shadow-soft sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.34),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.22),transparent_28%),linear-gradient(135deg,#061421_0%,#082236_48%,#053f46_100%)]" />
          <div className="absolute inset-0 bg-slate-950/35" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              {organization?.logo_url ? <img src={organization.logo_url} alt="" className="h-12 w-12 rounded-2xl border border-white/20 bg-white object-contain p-1.5 shadow-lg" /> : null}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">SETU Flow CRM Invitation</p>
                <p className="text-sm font-medium text-white">{organizationSlug}.setuflowcrm.com</p>
              </div>
            </div>
            <h1 className="mt-7 text-3xl font-bold tracking-tight text-white">Join {organizationName}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-100">Create your password and accept owner access for this workspace. Your invited email and organization context are already attached to this secure link.</p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.14em]">
              <span className="rounded-full border border-cyan-200 bg-cyan-300 px-3 py-1.5 text-slate-950 shadow-sm">{industryLabel}</span>
              <span className="rounded-full border border-white/35 bg-white px-3 py-1.5 text-slate-950 shadow-sm">{packLabel}</span>
            </div>

            <div className="mt-6 space-y-4 rounded-[1.75rem] border border-white/20 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Invited email</p>
                <p className="mt-1 text-lg font-bold text-white">{invite.email}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Invited name</p>
                <p className="mt-1 text-lg font-bold text-white">{fullNameDefault || 'Complete on setup'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Role on accept</p>
                <p className="mt-1 text-lg font-bold text-white">{roleName ?? 'No default role assigned'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Expires</p>
                <p className="mt-1 text-lg font-bold text-white">{expiresAt ? expiresAt.toLocaleString() : 'No expiry set'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">{organizationName} access setup</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create password and accept invitation</h2>
          <p className="mt-2 text-sm text-slate-600">This link is tied to {invite.email}. Complete the missing account details below, then enter the {organizationName} workspace as {roleName || 'owner'}.</p>

          <div className="mt-5 space-y-3">
            {invite.status === 'accepted' || invite.accepted_at ? (
              <StateMessage title="This invitation has already been accepted" description="Sign in to the workspace with the invited email, or ask your workspace admin to resend the invitation if access is still missing." tone="success" />
            ) : null}
            {invite.status === 'revoked' || invite.revoked_at ? (
              <StateMessage title="This invitation has been revoked" description="Ask your workspace admin to create a new invitation link." tone="danger" />
            ) : null}
            {isExpired ? (
              <StateMessage title="This invitation has expired" description="Ask your admin to resend it so you can join with a fresh secure link." tone="warning" />
            ) : null}
          </div>

          {!user ? (
            <div className="mt-6 space-y-5">
              {!inviteBlocked ? (
                <form action={registerAndAcceptInvitation} className="space-y-4 rounded-[1.75rem] border border-brand-100 bg-brand-50/40 p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">First admin account setup</h3>
                    <p className="mt-1 text-sm text-slate-600">Email is locked to the invite. Review the name and username, create a password, and accept owner access.</p>
                  </div>
                  <input type="hidden" name="token" value={token} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Invited email" name="email_display" defaultValue={invite.email} readOnly />
                    <Field label="Full name" name="full_name" defaultValue={fullNameDefault} placeholder="Full name" required />
                    <Field label="Username" name="username" defaultValue={usernameDefault} placeholder="Choose a username" required />
                    <Field label="Password" name="password" type="password" placeholder="Create a password" required />
                  </div>
                  <button type="submit" className="inline-flex min-h-11 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                    Create password and enter workspace
                  </button>
                </form>
              ) : null}

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Already created this account?{' '}
                <Link href={`/client-login?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(inviteEmail)}&workspace=${encodeURIComponent(organizationSlug)}`} className="font-semibold text-brand-700 hover:text-brand-800">
                  Sign in to accept the {organizationName} invitation.
                </Link>
              </div>
            </div>
          ) : null}

          {user && !emailMatches && !inviteBlocked ? (
            <div className="mt-6 space-y-4">
              <StateMessage title="You are signed in with a different email" description={`You are signed in as ${user.email}, but this ${organizationName} invitation is for ${invite.email}. Sign in with the invited email to continue.`} tone="warning" />
              <Link href={`/client-login?next=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(inviteEmail)}&workspace=${encodeURIComponent(organizationSlug)}`} className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Switch account
              </Link>
            </div>
          ) : null}

          {user && emailMatches && !inviteBlocked ? (
            <form action={acceptInvitationByToken} className="mt-6 space-y-4">
              <StateMessage title={`Ready to accept ${organizationName}`} description="You are signed in as the invited user. Accepting this invitation will activate your membership in this workspace and apply the invited role." tone="neutral" />
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Accept invitation and enter workspace
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
