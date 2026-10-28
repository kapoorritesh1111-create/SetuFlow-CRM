import {requireAdminWorkspace} from '@/lib/workspace/auth';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import StarkDiscountPolicyEditor from '@/features/packaging/components/stark-discount-policy-editor';
export const dynamic='force-dynamic';
export default async function Page(){
 const workspace=await requireAdminWorkspace();
 if(workspace?.organization?.id!=='b97913cb-3b95-4247-8ced-ffdc0d392d2a')return <p>This configuration is only available to Stark Packmate administrators.</p>;
 const service:any=createServiceRoleClient();
 const {data,error}=await service.from('stark_pricing_discount_policy').select('approval_threshold_percent').eq('organization_id',workspace.organization.id).maybeSingle();
 if(error)throw new Error(error.message);
 return <main className="mx-auto max-w-4xl p-6 space-y-4"><a href="/admin/packaging-pricing-v5" className="text-sm font-bold text-blue-700">← Pricing V5 Admin</a><StarkDiscountPolicyEditor initialThreshold={Number(data?.approval_threshold_percent??15)}/></main>;
}
