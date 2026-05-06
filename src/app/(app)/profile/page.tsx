import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { ProfileAvatarManager } from '@/features/profile/components/profile-avatar-manager';
import { updateOwnProfile } from '@/features/profile/server/actions';
import { requireWorkspace } from '@/lib/workspace/auth';

function Notice({ notice }: { notice?: string | string[] }) {
  const value = Array.isArray(notice) ? notice[0] : notice;
  if (value === 'profile-updated') return <StateMessage title="Profile updated" description="Your full name and username now show across Setu Flow." tone="success" />;
  if (value === 'profile-update-failed') return <StateMessage title="Profile update failed" description="Try again or check whether the username is already taken." tone="danger" />;
  return null;
}

export default async function ProfilePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const workspace = await requireWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before editing your profile." tone="warning" />;
  if (!workspace.user) return null;

  const profile = workspace.profile;
  const displayName = profile?.full_name || profile?.username || workspace.user.email || 'Setu Flow user';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="Profile Management"
        badge={workspace.organization?.name ?? 'Setu Flow'}
        description="Manage your personal identity, avatar, and vCard entry point. System-level settings stay in Admin & Settings."
        actions={[{ label: 'My vCard', href: '/contact-exchange/vcard' }, { label: 'System settings', href: '/admin/organization', type: 'primary' }]}
      />
      <Notice notice={searchParams?.notice} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <SectionCard>
          <h2 className="text-lg font-semibold text-slate-900">Personal details</h2>
          <p className="mt-1 text-sm text-slate-600">Your full name is preferred everywhere a named user should appear; initials are only used as a visual fallback.</p>
          <form action={updateOwnProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Full name</span>
              <input name="full_name" defaultValue={profile?.full_name ?? ''} placeholder="Full name" autoComplete="name" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Username</span>
              <input name="username" defaultValue={profile?.username ?? ''} placeholder="Username" autoComplete="username" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              <span>Email</span>
              <input value={profile?.email ?? workspace.user.email ?? ''} readOnly aria-label="Email" />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save profile</button>
            </div>
          </form>
        </SectionCard>
        <ProfileAvatarManager initialAvatarUrl={profile?.avatar_url ?? null} fullName={displayName} email={profile?.email ?? workspace.user.email ?? null} />
      </div>
    </div>
  );
}
