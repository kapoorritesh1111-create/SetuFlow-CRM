import Link from 'next/link';

import { WorkspaceState } from '@/components/ui/workspace-state';
import { StarkLeadImportClient } from '@/features/leads/components/stark-lead-import-client';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const ALLOWED_ROLES = new Set(['owner', 'manager', 'admin', 'field_sales']);

type ImportAssignee = {
  userId: string;
  name: string;
  email: string;
  roles: string[];
};

export default async function StarkLeadImportPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.organization || !workspace.membership || !workspace.user) {
    return <WorkspaceState eyebrow="Capture · Import Leads" title="Workspace membership needed" description="Sign in to an active organization to import leads." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  if (workspace.organization.id !== STARK_PACKMATE_ORG_ID) {
    return <WorkspaceState eyebrow="Capture · Import Leads" title="Import not enabled for this workspace" description="The external and Field Sales lead importer is currently enabled for Stark Packmate." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const roles = workspace.currentRoles.map((role) => String(role).trim().toLowerCase());
  const isFieldSales = roles.includes('field_sales');
  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    return <WorkspaceState eyebrow="Capture · Import Leads" title="Import access restricted" description="Owner, Manager, Admin or Field Sales permission is required to import external leads." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, is_active, profiles(email, full_name), user_roles(roles(name))')
    .eq('organization_id', workspace.organization.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  const assignees: ImportAssignee[] = (members ?? []).map((member: any): ImportAssignee => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    return {
      userId: String(member.user_id),
      name: String(profile?.full_name ?? '').trim(),
      email: String(profile?.email ?? '').trim(),
      roles: (member.user_roles ?? []).map((item: any) => String(item?.roles?.name ?? '').trim().toLowerCase()).filter(Boolean),
    };
  }).filter((member: ImportAssignee) => member.userId && (member.roles.some((role: string) => ['field_sales', 'sales'].includes(role)) || member.userId === workspace.user!.id));

  return <div className="space-y-4 pb-10">
    <div className="flex items-center justify-between gap-3">
      <Link href="/leads" className="text-xs font-bold text-blue-700 hover:underline">← Back to Leads</Link>
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Stark Packmate</span>
    </div>
    <StarkLeadImportClient assignees={assignees} isFieldSales={isFieldSales} currentUserId={workspace.user.id} />
  </div>;
}
