import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspace, getWorkspaceRoleNames } from '@/lib/workspace/auth';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';
import { buildVCard, getVCardFilename } from '@/lib/contact-exchange/vcard';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';

type VCardContextSettings = {
  trade_show_name?: string | null;
  booth_number?: string | null;
};

export async function GET(request: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.membership || !workspace.organization) return NextResponse.json({ error: 'Active workspace membership required.' }, { status: 403 });

  const currentRoles = await getWorkspaceRoleNames(workspace.membership.id);
  const primaryRole = getPrimaryWorkspaceRole(currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  const fullName = workspace.profile?.full_name?.trim() || workspace.user.email?.split('@')[0] || 'SETU Flow user';
  const email = workspace.profile?.email || workspace.user.email || 'email-not-available@setu.flow';
  const username = workspace.profile?.username || null;
  const settings = await getMyCardSettingsForUser(workspace.user.id);
  const contextSettings = settings as (typeof settings & VCardContextSettings);

  const origin = request.nextUrl.origin;
  const avatarUrl = workspace.profile?.avatar_url?.startsWith('/') ? `${origin}${workspace.profile.avatar_url}` : workspace.profile?.avatar_url ?? null;
  const vcard = buildVCard({
    fullName,
    email,
    organizationName: workspace.organization.name,
    roleLabel,
    username,
    previewPath: null,
    avatarUrl,
    primaryPhone: settings?.primary_phone ?? null,
    secondaryPhone: settings?.secondary_phone ?? null,
    website: settings?.website ?? null,
    address: settings?.address ?? null,
    tradeShowName: contextSettings?.trade_show_name ?? null,
    boothNumber: contextSettings?.booth_number ?? null,
  });

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      'Content-Type': 'text/x-vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${getVCardFilename({ fullName })}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
