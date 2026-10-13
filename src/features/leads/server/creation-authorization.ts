'use server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export async function authorizeCoordinator(ownerId: string, coordinatorId: string) {
 const ctx = await requireWorkspace();
 if (!ctx.user || !ctx.organization) return { error: 'Sign in required' };
 if (!ctx.currentRoles.some(role => ['owner','admin','manager'].includes(role))) return { error: 'Manager permission required' };
 if (ownerId === coordinatorId) return { error: 'Select two different users' };
 const db = createAdminSupabaseClient();
 if (!db) return { error: 'Database unavailable' };
 const org = ctx.organization.id;
 const { data } = await (db as any).from('organization_members').select('user_id').eq('organization_id', org).eq('is_active', true).in('user_id', [ownerId,coordinatorId]);
 if (data?.length !== 2) return { error: 'Both users must be active members' };
 const { error } = await (db as any).from('sales_coordinator_authorizations').upsert({ organization_id: org, owner_user_id: ownerId, coordinator_user_id: coordinatorId, granted_by: ctx.user.id }, { onConflict: 'organization_id,owner_user_id,coordinator_user_id' });
 return error ? { error: 'Authorization failed' } : { success: 'Authorized' };
}
