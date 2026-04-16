import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace/auth';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { buildPublicCardSearchParams } from '@/lib/contact-exchange/public-card';

export default async function DigitalVCardPreviewPage() {
  const workspace = await requireWorkspace();
  const fullName = workspace.profile?.full_name?.trim() || workspace.user?.email?.split('@')[0] || 'SETU Flow user';
  const email = workspace.profile?.email || workspace.user?.email || 'hello@setuflow.com';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  const params = buildPublicCardSearchParams({
    fullName,
    email,
    roleLabel,
    organizationName: workspace.organization?.name || 'SETU Flow',
    avatarUrl: workspace.profile?.avatar_url,
    logoUrl: workspace.organization?.logo_url,
    primaryPhone: '',
    organizationId: workspace.organization?.id,
  });
  redirect(`/card?${params.toString()}`);
}
