import { redirect } from 'next/navigation';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { ProductAccessManager } from '@/features/admin/components/product-access-manager';

export const dynamic = 'force-dynamic';

export default async function ProductAccessPage() {
  const { organization } = await requireAdminWorkspace();
  if (!organization) redirect('/dashboard');
  const admin = createAdminSupabaseClient();
  if (!admin) return null;
  const { data: members } = await admin.from('organization_members').select('id,user_id,display_name,is_active,profiles(full_name,email)').eq('organization_id', organization.id).eq('is_active', true).order('created_at');
  const userIds = (members ?? []).map((m:any)=>m.user_id).filter(Boolean);
  const { data: access } = userIds.length ? await admin.from('organization_member_product_access').select('user_id,crm_enabled,mail_enabled').eq('organization_id', organization.id).in('user_id',userIds) : { data: [] as any[] };
  const accessMap = new Map((access ?? []).map((a:any)=>[a.user_id,a]));
  const rows = (members ?? []).map((m:any)=>{ const p=Array.isArray(m.profiles)?m.profiles[0]:m.profiles; const a:any=accessMap.get(m.user_id); return { membershipId:m.id,userId:m.user_id,name:m.display_name||p?.full_name||p?.email||'Team member',email:p?.email||'',crmEnabled:a?.crm_enabled ?? true,mailEnabled:a?.mail_enabled ?? false }; });
  return <ProductAccessManager organizationName={organization.name} rows={rows} />;
}
