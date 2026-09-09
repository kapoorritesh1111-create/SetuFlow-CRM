import Link from 'next/link';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StarkLeadImportClient } from '@/features/leads/components/stark-lead-import-client';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type ImportAssignee = { userId: string; name: string; email: string; roles: string[] };

export default async function LeadImportPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.organization || !workspace.membership || !workspace.user) return <WorkspaceState eyebrow="Capture · Import Leads" title="Workspace membership needed" description="Sign in to an active organization to import leads." primaryActionHref="/contact-exchange/scan" primaryActionLabel="Back to Capture" />;

  const roles = workspace.currentRoles.map((role) => String(role).trim().toLowerCase());
  const isFieldSales = roles.includes('field_sales');
  const canImport = workspace.canAccessAdmin || roles.some((role) => ['owner','manager','admin','sales','field_sales'].includes(role));
  if (!canImport) return <WorkspaceState eyebrow="Capture · Import Leads" title="Import access restricted" description="Your workspace role does not allow lead capture/import." primaryActionHref="/contact-exchange/scan" primaryActionLabel="Back to Capture" />;

  const supabase = await createClient();
  const { data: members } = await supabase.from('organization_members').select('user_id, is_active, profiles(email, full_name), user_roles(roles(name))').eq('organization_id', workspace.organization.id).eq('is_active', true).order('created_at', { ascending: true });
  const assignees: ImportAssignee[] = (members ?? []).map((member: any) => { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; return { userId: String(member.user_id), name: String(profile?.full_name ?? '').trim(), email: String(profile?.email ?? '').trim(), roles: (member.user_roles ?? []).map((item: any) => String(item?.roles?.name ?? '').trim().toLowerCase()).filter(Boolean) }; }).filter((member: ImportAssignee) => member.userId);

  return <div className="space-y-4 pb-10"><div className="flex items-center justify-between gap-3"><Link href="/contact-exchange/scan" className="text-xs font-bold text-blue-700 hover:underline">← Back to Capture</Link><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{workspace.organization.name}</span></div><StarkLeadImportClient assignees={assignees} isFieldSales={isFieldSales} currentUserId={workspace.user.id} /></div>;
}
