import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { ProfileCompactAvatarManager } from '@/features/profile/components/profile-compact-avatar-manager';
import { ProfileVcardContactEditor } from '@/features/profile/components/profile-vcard-contact-editor';
import { updateOwnProfile } from '@/features/profile/server/actions';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { EMPTY_CARD_SETTINGS, toCardSettingsInput } from '@/lib/contact-exchange/my-card-settings-shared';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { requireWorkspace } from '@/lib/workspace/auth';

function Notice({ notice }: { notice?: string | string[] }) {
  const value = Array.isArray(notice) ? notice[0] : notice;
  if (value === 'profile-updated') return <StateMessage title="Profile updated" description="Your profile basics now show across Setu Flow." tone="success" />;
  if (value === 'profile-update-failed') return <StateMessage title="Profile update failed" description="Try again or check whether the username is already taken." tone="danger" />;
  return null;
}

function DetailPill({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value?.trim() || 'Not added yet'}</p>
    </div>
  );
}

export default async function ProfilePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const workspace = await requireWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before editing your profile." tone="warning" />;
  if (!workspace.user) return null;

  const profile = workspace.profile;
  const displayName = profile?.full_name || profile?.username || workspace.user.email || 'Setu Flow user';
  const email = profile?.email || workspace.user.email || '';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  let cardSettings = null;
  let loadWarning: string | null = null;

  try {
    cardSettings = await getMyCardSettingsForUser(workspace.user.id);
  } catch (error) {
    loadWarning = error instanceof Error ? error.message : 'Your vCard summary could not be loaded yet.';
  }

  return (
    <div className="space-y-5">
      <Notice notice={searchParams?.notice} />
      {loadWarning ? <StateMessage title="vCard helper unavailable" description={loadWarning} tone="warning" /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-5">
          <SectionCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Profile basics</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Identity & workspace</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Edit your account identity once. Workspace context is shown beside it so the page does not repeat the same profile information in separate blocks.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{roleLabel}</span>
            </div>

            <form action={updateOwnProfile} className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Full name</span>
                <input name="full_name" defaultValue={profile?.full_name ?? ''} placeholder="Full name" autoComplete="name" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Username</span>
                <input name="username" defaultValue={profile?.username ?? ''} placeholder="Username" autoComplete="username" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
                <span>Email</span>
                <input value={email} readOnly aria-label="Email" />
              </label>
              <div className="grid gap-3 lg:col-span-2 sm:grid-cols-3">
                <DetailPill label="Organization" value={workspace.organization?.name} />
                <DetailPill label="Role" value={roleLabel} />
                <DetailPill label="Profile name" value={displayName} />
              </div>
              <div className="lg:col-span-2">
                <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save profile</button>
              </div>
            </form>
          </SectionCard>

          <ProfileCompactAvatarManager initialAvatarUrl={profile?.avatar_url ?? null} fullName={displayName} email={email || null} />
        </div>

        <SectionCard>
          <ProfileVcardContactEditor
            initialSettings={toCardSettingsInput(cardSettings, EMPTY_CARD_SETTINGS)}
            organizationId={workspace.organization?.id ?? null}
            fullName={displayName}
            email={email || 'hello@setuflow.com'}
          />
        </SectionCard>
      </div>
    </div>
  );
}
