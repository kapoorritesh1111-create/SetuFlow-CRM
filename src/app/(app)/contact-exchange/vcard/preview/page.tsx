import { PremiumVCardPreview } from '@/components/contact-exchange/premium-vcard-preview';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { requireWorkspace } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

export default async function DigitalVCardPreviewPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Global contact exchange" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded. Restore workspace access before opening the digital card preview." primaryActionHref={PRODUCT_ROUTES.app.dashboard} primaryActionLabel="Go to dashboard" />;
  }

  const fullName = workspace.profile?.full_name?.trim() || workspace.user?.email?.split('@')[0] || 'SETU Flow user';
  const email = workspace.profile?.email || workspace.user?.email || 'email-not-available@setu.flow';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="Global contact exchange · outbound preview" title="Digital vCard preview" description="Leadership/demo-ready preview for the final Apple-level share surface. Batch 12 removes the last dashboard energy, keeps save-contact dominant, and turns the vCard into a calm premium identity page while broader public rollout remains intentionally staged." badge="vCard ROI batch 12 preview" actions={[{ label: 'Back to My Digital vCard', href: '/contact-exchange/vcard', type: 'primary' }]} />

      <PremiumVCardPreview fullName={fullName} roleLabel={roleLabel} organizationName={workspace.organization.name} avatarUrl={workspace.profile?.avatar_url} logoUrl={workspace.organization.logo_url} email={email} primaryPhone="Add phone 1 in profile settings" secondaryPhone="Add phone 2 in profile settings" website="Add website in company settings" mode="preview" verificationLabel="Verified via SETU Exchange" sourceContext={`Shared via ${workspace.organization.name}`} memoryLine="Best saved immediately so the next touchpoint feels familiar, direct, and effortless." socialProofLabel={`${workspace.organization.name} leadership-ready identity page`} />

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4"><p className="text-sm font-semibold text-slate-900">What leaders should notice</p><p className="mt-2 text-sm leading-6 text-slate-600">The surface now behaves like a finished identity product: calm, minimal, and obviously save-first while still keeping the person, trust context, and next action clear.</p></article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4"><p className="text-sm font-semibold text-slate-900">What operators should feel</p><p className="mt-2 text-sm leading-6 text-slate-600">Open one calm premium page, let the identity establish trust first, then move naturally into save, share, QR, call, or email without scanning through utility-heavy UI.</p></article>
          <article className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4"><p className="text-sm font-semibold text-slate-900">What stays intentionally staged</p><p className="mt-2 text-sm leading-6 text-slate-600">Broader public publishing, analytics, and branded alias rollout still stay staged so the baseline remains rollback-safe while the destination quality and leadership-demo polish get stronger now.</p></article>
        </div>
      </SectionCard>
    </div>
  );
}
