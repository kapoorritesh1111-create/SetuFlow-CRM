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

function Field({ label, name, type = 'text', placeholder, required = false }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium text-slate-800">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} autoComplete={name} />
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
    .select('id, organization_id, email, status, expires_at, accepted_at, revoked_at, metadata, roles(name), organizations(name)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!invite) return notFound();

  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  const signedInEmail = normalizeEmail(user?.email);
  const inviteEmail = normalizeEmail(invite.email);
  const emailMatches = Boolean(signedInEmail && inviteEmail && signedInEmail === inviteEmail);
  const inviteBlocked = invite.status === 'accepted' || Boolean(invite.accepted_at) || invite.status === 'revoked' || Boolean(invite.revoked_at) || isExpired;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[2rem] bg-gradient-to-br from-navy-900 via-navy-800 to-brand-600 p-6 text-white shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">SETU Flow Invitation</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Join {invite.organizations?.name ?? 'workspace'}</h1>
          <p className="mt-3 text-sm leading-6 text-white/85">This page keeps sign-in, account creation, and invitation acceptance in one place so users do not have to jump between multiple screens.</p>

          <div className="mt-6 space-y-3 rounded-[1.75rem] bg-white/10 p-5 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/65">Invited email</p>
              <p className="mt-1 text-lg font-semibold">{invite.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/65">Role on accept</p>
              <p className="mt-1 text-lg font-semibold">{invite.roles?.name ?? 'No default role assigned'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/65">Expires</p>
              <p className="mt-1 text-lg font-semibold">{expiresAt ? expiresAt.toLocaleString() : 'No expiry set'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Invitation status</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Complete your workspace access</h2>
          <p className="mt-2 text-sm text-slate-600">Use the invited account to accept this membership and enter the workspace with the correct role.</p>

          <div className="mt-5 space-y-3">
            {invite.status === 'accepted' || invite.accepted_at ? (
              <StateMessage title="This invitation has already been accepted" description="Ask your workspace admin to resend the invitation only if you still cannot access the workspace." tone="success" />
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
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                Sign in with the invited account to accept this invitation, or create a new account for the invited email below.
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                  Sign in to accept
                </Link>
              </div>

              {!inviteBlocked ? (
                <form action={registerAndAcceptInvitation} className="space-y-4 rounded-[1.75rem] border border-slate-200 p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">New here? Create your invited account</h3>
                    <p className="mt-1 text-sm text-slate-600">Create the invited user first, then accept the workspace invitation in the same flow.</p>
                  </div>
                  <input type="hidden" name="token" value={token} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" name="full_name" placeholder="Full name" />
                    <Field label="Username" name="username" placeholder="Choose a username" required />
                  </div>
                  <Field label="Password" name="password" type="password" placeholder="Create a password" required />
                  <button type="submit" className="inline-flex min-h-11 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                    Create account and accept
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {user && !emailMatches && !inviteBlocked ? (
            <div className="mt-6 space-y-4">
              <StateMessage title="You are signed in with a different email" description={`You are signed in as ${user.email}, but this invitation is for ${invite.email}. Sign in with the invited email to continue.`} tone="warning" />
              <Link href="/login" className="inline-flex min-h-11 items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Switch account
              </Link>
            </div>
          ) : null}

          {user && emailMatches && !inviteBlocked ? (
            <form action={acceptInvitationByToken} className="mt-6 space-y-4">
              <StateMessage title="Ready to accept" description="You are signed in as the invited user. Accepting this invitation will activate your membership in the target workspace and apply the invited role." tone="neutral" />
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Accept invitation
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
