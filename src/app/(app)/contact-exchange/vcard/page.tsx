import { PremiumVCardPreview } from '@/components/contact-exchange/premium-vcard-preview';
import { VCardShareActions } from '@/components/contact-exchange/vcard-share-actions';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { requireWorkspace } from '@/lib/workspace/auth';

const setupNotes = [
  'Setup stays profile- and admin-driven so sharing never becomes a heavy standalone workflow.',
  'The visible card now uses an Apple-level layout system: one calm identity hero, one dominant save-contact moment, and only two immediate action tiles.',
  'Trust, source context, and recall now stay present without clutter so the recipient can trust, save, and act in one glance.',
];

export default async function DigitalVCardPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Global contact exchange" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded. Restore workspace access before reviewing personal contact exchange surfaces." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const fullName = workspace.profile?.full_name?.trim() || workspace.user?.email?.split('@')[0] || 'SETU Flow user';
  const email = workspace.profile?.email || workspace.user?.email || 'email-not-available@setu.flow';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  const organizationName = workspace.organization.name;
  const avatarUrl = workspace.profile?.avatar_url;
  const logoUrl = workspace.organization.logo_url;
  const primaryPhone = 'Add phone 1 in profile settings';
  const secondaryPhone = 'Add phone 2 in profile settings';
  const website = 'Add website in company settings';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Global contact exchange · outbound" title="My Digital vCard" description="The locked engine stays untouched. Batch 12 applies the final Apple-level layout system: calm identity-first composition, dominant save-contact conversion, lighter supporting context, and a cleaner share layer without reopening workflow or backend scope." badge="vCard ROI batch 12" actions={[{ label: 'Open share preview', href: '/contact-exchange/vcard/preview' }, { label: 'Go to leads', href: '/leads', type: 'primary' }]} />

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          {setupNotes.map((note, index) => (
            <article key={note} className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <p className="text-sm font-semibold text-slate-900">{index === 0 ? 'Setup' : index === 1 ? 'Action hierarchy' : 'Follow-through'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <PremiumVCardPreview fullName={fullName} roleLabel={roleLabel} organizationName={organizationName} avatarUrl={avatarUrl} logoUrl={logoUrl} email={email} primaryPhone={primaryPhone} secondaryPhone={secondaryPhone} website={website} mode="workspace" verificationLabel="Verified via SETU Exchange" sourceContext={`Shared via ${organizationName}`} memoryLine="Spoke recently and worth keeping one tap away for the next follow-up." socialProofLabel={`${organizationName} professional identity`} />

      <SectionCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Share actions</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Save-first share flow without reopening the engine</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This stays lightweight and profile-driven. The engine remains locked while the outward-facing share system now feels calmer and more premium: preview first, share second, and only the minimum supporting context needed to reinforce trust.</p>
          </div>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Apple layout + save-first hierarchy + calmer share flow</div>
        </div>
        <div className="mt-5">
          <VCardShareActions previewPath="/contact-exchange/vcard/preview" downloadPath="/api/contact-exchange/vcard" fullName={fullName} organizationName={organizationName} roleLabel={roleLabel} email={email} primaryPhone={primaryPhone} />
        </div>
      </SectionCard>
    </div>
  );
}
