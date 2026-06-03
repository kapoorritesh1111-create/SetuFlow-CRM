import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { ProfileCompactAvatarManager } from '@/features/profile/components/profile-compact-avatar-manager';
import { updateOwnProfile } from '@/features/profile/server/actions';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { requireWorkspace } from '@/lib/workspace/auth';

function Notice({ notice }: { notice?: string | string[] }) {
  const value = Array.isArray(notice) ? notice[0] : notice;
  if (value === 'profile-updated') return <StateMessage title="Profile updated" description="Your full name and username now show across Setu Flow." tone="success" />;
  if (value === 'profile-update-failed') return <StateMessage title="Profile update failed" description="Try again or check whether the username is already taken." tone="danger" />;
  return null;
}

function DetailRow({ label, value, fallback = 'Not added yet' }: { label: string; value?: string | null; fallback?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value?.trim() || fallback}</p>
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

  const vCardFields = [
    cardSettings?.primary_phone,
    cardSettings?.website,
    cardSettings?.address,
    cardSettings?.booking_url,
    cardSettings?.quote_url,
    cardSettings?.linkedin_url,
  ];
  const completedVCardFields = vCardFields.filter((value) => value?.trim()).length;
  const vCardReady = Boolean(cardSettings?.share_slug && cardSettings?.primary_phone?.trim());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile"
        title="Profile Management"
        badge={workspace.organization?.name ?? 'Setu Flow'}
        description="Manage your account identity, avatar, workspace context, and profile completeness. Public sharing tools stay in the dedicated vCard workspace."
        actions={[{ label: 'Manage vCard', href: '/contact-exchange/vcard' }, { label: 'System settings', href: '/admin/organization', type: 'primary' }]}
      />
      <Notice notice={searchParams?.notice} />
      {loadWarning ? <StateMessage title="vCard helper unavailable" description={loadWarning} tone="warning" /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
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
                <input value={email} readOnly aria-label="Email" />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Save profile</button>
              </div>
            </form>
          </SectionCard>

          <ProfileCompactAvatarManager initialAvatarUrl={profile?.avatar_url ?? null} fullName={displayName} email={email || null} />
        </div>

        <div className="space-y-6">
          <SectionCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Account context</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Workspace identity</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">This is how your account is recognized inside the operating shell.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{roleLabel}</span>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailRow label="Organization" value={workspace.organization?.name} />
              <DetailRow label="Role" value={roleLabel} />
              <DetailRow label="Profile name" value={displayName} />
              <DetailRow label="Login email" value={email} />
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">vCard helper</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">Public contact readiness</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Profile and vCard stay separate. This helper only shows whether your public contact card has enough information to share confidently.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${vCardReady ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                {vCardReady ? 'Ready' : 'Needs details'}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <DetailRow label="Primary phone" value={cardSettings?.primary_phone} />
              <DetailRow label="Website" value={cardSettings?.website} />
              <DetailRow label="Address" value={cardSettings?.address} />
              <DetailRow label="Share link" value={cardSettings?.share_slug ? `/card?share=${cardSettings.share_slug}` : null} />
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">{completedVCardFields}/6</span> recommended public-contact fields are complete.</p>
              <p className="mt-1">Add phone, website, address, booking/quote links, and social links in the dedicated vCard workspace.</p>
            </div>
            <a href="/contact-exchange/vcard" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Manage vCard details
            </a>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
