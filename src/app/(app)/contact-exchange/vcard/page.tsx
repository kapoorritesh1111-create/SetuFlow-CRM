import { MyCardWorkspace } from '@/components/contact-exchange/my-card-workspace';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { requireWorkspace } from '@/lib/workspace/auth';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const setupNotes = [
  'My Card is a signed-in user capability driven by profile identity plus lightweight share settings.',
  'Social media, website, booking, quote, and address details are editable so the card looks polished enough to share outside the CRM.',
  'Every QR or public-card response can feed back into CRM lead capture with buyer/supplier context and document-assisted AI prefill.',
];

export default async function DigitalVCardPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Global contact exchange" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded. Restore workspace access before reviewing personal contact exchange surfaces." primaryActionHref={PRODUCT_ROUTES.app.dashboard} primaryActionLabel="Go to dashboard" />;
  }

  const fullName = workspace.profile?.full_name?.trim() || workspace.user?.email?.split('@')[0] || 'SETU Flow user';
  const email = workspace.profile?.email || workspace.user?.email || 'email-not-available@setu.flow';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Global contact exchange · outbound" title="My Digital vCard" description="Professional digital vCard, QR share, request-quote, and appointment entry point for any signed-in user. The public share page is designed to feel premium while feeding captured buyer or supplier details back into the CRM." badge="Sprint 8 active" actions={[{ label: 'Open workspace mirror', href: '/workspace/my-card' }, { label: 'Go to leads', href: PRODUCT_ROUTES.app.leads, type: 'primary' }]} />

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          {setupNotes.map((note, index) => (
            <article key={note} className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <p className="text-sm font-semibold text-slate-900">{index === 0 ? 'Identity' : index === 1 ? 'Professional finish' : 'CRM follow-through'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <MyCardWorkspace
        identity={{
          fullName,
          email,
          roleLabel,
          organizationName: workspace.organization.name,
          avatarUrl: workspace.profile?.avatar_url,
          logoUrl: workspace.organization.logo_url,
          primaryPhone: 'Add phone in card settings',
          organizationId: workspace.organization.id,
        }}
        organizationId={workspace.organization.id}
      />
    </div>
  );
}
