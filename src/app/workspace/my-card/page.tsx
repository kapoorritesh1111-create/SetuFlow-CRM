export const dynamic = 'force-dynamic';

import { WorkspaceShell } from '@/components/previews/workspace-shell';
import { PreviewPanel } from '@/components/previews/ui';
import { MyCardWorkspace } from '@/components/contact-exchange/my-card-workspace';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { mergeIdentityWithCardSettings } from '@/lib/contact-exchange/my-card-settings-shared';
import { requireWorkspace } from '@/lib/workspace/auth';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';

export default async function WorkspaceMyCardPage() {
  const workspace = await requireWorkspace();
  const fullName = workspace.profile?.full_name?.trim() || workspace.user?.email?.split('@')[0] || 'SETU Flow user';
  const email = workspace.profile?.email || workspace.user?.email || 'hello@setuflow.com';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  const organizationName = workspace.organization?.name || 'SETU Flow';
  const settings = workspace.user?.id ? await getMyCardSettingsForUser(workspace.user.id) : null;

  const identity = mergeIdentityWithCardSettings(
    {
      fullName,
      email,
      roleLabel,
      organizationName,
      avatarUrl: workspace.profile?.avatar_url,
      logoUrl: workspace.organization?.logo_url,
      primaryPhone: 'Add phone in card settings',
      organizationId: workspace.organization?.id,
    },
    settings,
  );

  return (
    <WorkspaceShell
      eyebrow="Product view · my card"
      title="My Card is now a premium digital vCard and QR share lane"
      description="Any signed-in user can publish a polished digital card from their profile identity, add booking/request-quote destinations, social links, and share a QR or public page that routes inbound contacts back into the CRM."
    >
      <PreviewPanel title="Sprint 8 closed baseline" subtitle="Professional digital vCard + capture flow." badge="Outbound identity + inbound CRM capture">
        <MyCardWorkspace
          identity={identity}
          organizationId={workspace.organization?.id ?? null}
          initialSettings={settings}
        />
      </PreviewPanel>
    </WorkspaceShell>
  );
}
