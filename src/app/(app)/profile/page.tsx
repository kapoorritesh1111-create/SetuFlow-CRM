import { MyCardWorkspace } from '@/components/contact-exchange/my-card-workspace';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { updateOwnProfile } from '@/features/profile/server/actions';
import { requireWorkspace } from '@/lib/workspace/auth';

function Notice({ notice }: { notice?: string | string[] }) {
  const value = Array.isArray(notice) ? notice[0] : notice;
  if (value === 'profile-updated') return <StateMessage title="Profile updated" description="Your identity and vCard entry point now show across Setu Flow." tone="success" />;
  if (value === 'profile-update-failed') return <StateMessage title="Profile update failed" description="Try again or check whether the username is already taken." tone="danger" />;
  return null;
}

export default async function ProfilePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const workspace = await requireWorkspace();
  if (workspace.missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure Supabase before editing your profile." tone="warning" />;
  if (!workspace.user) return null;

  const profile = workspace.profile;
  const displayName = profile?.full_name || profile?.username || workspace.user.email || 'Setu Flow user';
  const email = profile?.email || workspace.user.email || 'email-not-available@setu.flow';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  let initialSettings = null;
  let loadWarning: string | null = null;

  try {
    initialSettings = await getMyCardSettingsForUser(workspace.user.id);
  } catch (error) {
    loadWarning = error instanceof Error ? error.message : 'vCard details could not be loaded yet. You can still save them again from this page.';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="Profile Management"
        badge={workspace.organization?.name ?? 'Setu Flow'}
        description="Manage the identity, contact details, avatar, and public vCard information prospects use to reach you. System-level settings stay in Admin & Settings."
        actions={[{ label: 'Preview vCard', href: '/contact-exchange/vcard' }, { label: 'System settings', href: '/admin/organization', type: 'primary' }]}
      />
      <Notice notice={searchParams?.notice} />
      {loadWarning ? (
        <StateMessage
          title="vCard details loaded in recovery mode"
          description={loadWarning}
          tone="warning"
        />
      ) : null}
      <SectionCard>
        <h2 className="text-lg font-semibold text-slate-900">Core identity</h2>
        <p className="mt-1 text-sm text-slate-600">Your full name and username power the shell avatar, ownership labels, and vCard identity. Contact fields below complete the shareable card.</p>
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
            <input value={email} readOnly aria-label="Email" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save identity</button>
          </div>
        </form>
      </SectionCard>
      <MyCardWorkspace
        identity={{
          fullName: displayName,
          email,
          roleLabel,
          organizationName: workspace.organization?.name ?? 'Setu Flow',
          avatarUrl: profile?.avatar_url,
          logoUrl: workspace.organization?.logo_url,
          primaryPhone: initialSettings?.primary_phone?.trim() || '',
          secondaryPhone: initialSettings?.secondary_phone?.trim() || null,
          website: initialSettings?.website?.trim() || workspace.organization?.website || null,
          address: initialSettings?.address?.trim() || workspace.organization?.registered_address || null,
          bookingUrl: initialSettings?.booking_url?.trim() || null,
          quoteUrl: initialSettings?.quote_url?.trim() || null,
          organizationId: workspace.organization?.id ?? null,
          socials: {
            linkedin: initialSettings?.linkedin_url?.trim() || null,
            instagram: initialSettings?.instagram_url?.trim() || null,
            facebook: initialSettings?.facebook_url?.trim() || null,
            tiktok: initialSettings?.tiktok_url?.trim() || null,
          },
        }}
        organizationId={workspace.organization?.id ?? null}
        initialSettings={initialSettings}
        insights={{ quoteRequestCount: 0, appointmentCount: 0, recentLeads: [] }}
      />
    </div>
  );
}
