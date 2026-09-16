'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspaceRole, requireWorkspace } from '@/lib/workspace/auth';
import { isPackagingOrganization } from '@/lib/verticals/capability';

const ASSIGN_ROLES = ['owner', 'admin', 'manager'] as const;

async function context() {
  const workspace = await requireWorkspace();
  if (!workspace?.organization || !workspace?.user) throw new Error('Not authenticated.');
  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  if (!(await isPackagingOrganization(organizationId, supabase))) throw new Error('Packaging is not enabled for this workspace.');
  return { workspace, supabase, organizationId, userId: workspace.user.id, currentRoles: workspace.currentRoles ?? [] };
}

export type DesignAssignee = { userId: string; name: string; email: string | null };

export async function getPackagingDesignAssignees(): Promise<{ ok: boolean; assignees: DesignAssignee[]; error?: string }> {
  try {
    const { supabase, organizationId } = await context();
    const { data: designRoles, error: roleError } = await supabase.from('roles').select('id').eq('organization_id', organizationId).eq('name', 'design');
    if (roleError) throw new Error(roleError.message);
    const roleIds = (designRoles ?? []).map((row: any) => row.id).filter(Boolean);
    if (!roleIds.length) return { ok: true, assignees: [] };

    const { data: memberships, error: memberError } = await supabase.from('organization_members').select('id,user_id,display_name').eq('organization_id', organizationId).eq('is_active', true);
    if (memberError) throw new Error(memberError.message);
    const memberIds = (memberships ?? []).map((row: any) => row.id).filter(Boolean);
    if (!memberIds.length) return { ok: true, assignees: [] };

    const { data: userRoles, error: userRoleError } = await supabase.from('user_roles').select('organization_member_id,role_id').in('organization_member_id', memberIds).in('role_id', roleIds);
    if (userRoleError) throw new Error(userRoleError.message);
    const eligibleMemberIds = new Set((userRoles ?? []).map((row: any) => row.organization_member_id));
    const eligible = (memberships ?? []).filter((row: any) => eligibleMemberIds.has(row.id));
    const userIds = eligible.map((row: any) => row.user_id).filter(Boolean);
    const { data: profiles, error: profileError } = userIds.length ? await supabase.from('profiles').select('id,full_name,email').in('id', userIds) : { data: [], error: null };
    if (profileError) throw new Error(profileError.message);
    const profileById = new Map((profiles ?? []).map((row: any) => [row.id, row]));
    return {
      ok: true,
      assignees: eligible.map((row: any) => {
        const profile: any = profileById.get(row.user_id);
        return { userId: row.user_id, name: row.display_name || profile?.full_name || profile?.email || 'Designer', email: profile?.email ?? null };
      }).sort((a: DesignAssignee, b: DesignAssignee) => a.name.localeCompare(b.name)),
    };
  } catch (error) {
    return { ok: false, assignees: [], error: error instanceof Error ? error.message : 'Could not load designers.' };
  }
}

export async function assignPackagingDesign(input: { quoteLineItemId: string; assigneeUserId: string | null }) {
  try {
    const { supabase, organizationId, userId, currentRoles } = await context();
    const canManage = hasWorkspaceRole(currentRoles, ASSIGN_ROLES);
    const isDesigner = hasWorkspaceRole(currentRoles, ['design']);
    if (!canManage && !(isDesigner && input.assigneeUserId === userId)) return { ok: false, error: 'You do not have permission to assign this design job.' };

    const { data: line, error: lineError } = await supabase.from('quote_line_items').select('id,quote_id,input_snapshot_json').eq('id', input.quoteLineItemId).maybeSingle();
    if (lineError) throw new Error(lineError.message);
    if (!line?.id) return { ok: false, error: 'Design job was not found.' };
    const { data: quote, error: quoteError } = await supabase.from('quotes').select('id').eq('id', line.quote_id).eq('organization_id', organizationId).maybeSingle();
    if (quoteError) throw new Error(quoteError.message);
    if (!quote?.id) return { ok: false, error: 'Design job is outside this workspace.' };

    if (input.assigneeUserId) {
      const candidates = await getPackagingDesignAssignees();
      if (!candidates.ok) return { ok: false, error: candidates.error ?? 'Could not validate designer.' };
      if (!candidates.assignees.some((item) => item.userId === input.assigneeUserId)) return { ok: false, error: 'Only an active Design-role user can be assigned.' };
    }

    const snapshot = line.input_snapshot_json ?? {};
    const existing = snapshot.design_request ?? {};
    const designRequest = {
      ...existing,
      assigned_to: input.assigneeUserId || null,
      assigned_at: input.assigneeUserId ? new Date().toISOString() : null,
      assigned_by: input.assigneeUserId ? userId : null,
    };
    const { error: updateError } = await supabase.from('quote_line_items').update({ input_snapshot_json: { ...snapshot, design_request: designRequest } }).eq('id', line.id).eq('quote_id', line.quote_id);
    if (updateError) throw new Error(updateError.message);
    revalidatePath('/design-queue');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not assign this design job.' };
  }
}
