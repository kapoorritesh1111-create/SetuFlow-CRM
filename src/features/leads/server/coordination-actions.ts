'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/** One checked action for single and bulk coordinator/owner assignment. */
export async function assignLeadCoordination(input: {
 leadIds: string[];
 coordinatorUserId?: string | null;
 ownerUserId?: string | null;
 changeOwner?: boolean;
}): Promise<{ success?: string; error?: string; updated?: number }> {
 const workspace = await requireWorkspace();
 const userId = workspace.user?.id;
 const organizationId = workspace.organization?.id;
 if (!userId || !organizationId) return { error: 'Sign in to an active organization.' };
 const ids = [...new Set(input.leadIds)].filter(id => /^[a-f0-9-]{36}$/i.test(id)).slice(0,200);
 if (!ids.length || ids.length !== new Set(input.leadIds).size) return { error: 'Select valid leads (maximum 200).' };
 const roles = workspace.currentRoles;
 const isAdmin = roles.some(role => ['owner','admin','manager'].includes(role));
 const canCoordinate = isAdmin || roles.some(role => ['sales','sales_coordinator'].includes(role));
 if (!canCoordinate) return { error: 'Not authorized to assign lead coordination.' };
 const db = createAdminSupabaseClient();
 if (!db) return { error: 'Administrative database connection unavailable.' };
 const { data: leads, error: loadError } = await (db as any).from('leads')
  .select('id,owner_user_id,coordinator_user_id,created_by')
  .eq('organization_id', organizationId).in('id', ids);
 if (loadError || !leads || leads.length !== ids.length) return { error: 'Some selected leads are unavailable.' };
 if (!isAdmin && leads.some((lead: { owner_user_id: string | null }) => lead.owner_user_id !== userId))
  return { error: 'Only the lead owner or an administrator can delegate these leads.' };
 if (input.changeOwner && !isAdmin) return { error: 'Only authorized managers can change ownership.' };
 const members = new Set<string>();
 for (const target of [input.coordinatorUserId, input.changeOwner ? input.ownerUserId : null]) {
  if (target) members.add(target);
 }
 if (input.changeOwner && !input.ownerUserId) return { error: 'Select a new owner.' };
 if (members.size) {
  const { data: active } = await (db as any).from('organization_members').select('user_id')
   .eq('organization_id', organizationId).eq('is_active', true).in('user_id', [...members]);
  if (!active || active.length !== members.size) return { error: 'Select active members from this organization.' };
 }
 // A batch should never silently ignore an unsuccessful record.
 let updated = 0;
 for (const lead of leads as Array<{ id: string; owner_user_id: string | null; coordinator_user_id: string | null }>) {
  const nextOwner = input.changeOwner ? input.ownerUserId! : lead.owner_user_id;
  const nextCoordinator = input.coordinatorUserId || null;
  const { error, data: changed } = await (db as any).from('leads').update({
   ...(input.changeOwner ? {owner_user_id: nextOwner} : {}),
   coordinator_user_id: nextCoordinator,
   updated_by: userId,
  }).eq('organization_id', organizationId).eq('id',lead.id).eq('owner_user_id',lead.owner_user_id).select('id');
  if (error || !changed?.length) return { error: `Updated ${updated} of ${ids.length}. Remaining assignments were not applied: ${error?.message ?? 'Lead changed concurrently'}`, updated };
  await (db as any).from('lead_coordination_audit').insert({
   organization_id: organizationId,lead_id:lead.id,actor_user_id:userId,
   old_owner_user_id:lead.owner_user_id,new_owner_user_id:nextOwner,
   old_coordinator_user_id:lead.coordinator_user_id,new_coordinator_user_id:nextCoordinator,
  });
  updated++;
 }
 revalidatePath('/leads');
 revalidatePath('/reports');
 return { success: `Updated ${updated} lead assignments.`,updated };
}
