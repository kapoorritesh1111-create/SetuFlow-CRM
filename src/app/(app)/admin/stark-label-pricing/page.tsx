import {requireAdminWorkspace} from '@/lib/workspace/auth';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import StarkLabelOwnerRates from '@/features/packaging/components/stark-label-owner-rates';
export const dynamic='force-dynamic';
export default async function StarkLabelPricingAdmin(){
 const workspace=await requireAdminWorkspace();
 if(workspace?.organization?.id!=='b97913cb-3b95-4247-8ced-ffdc0d392d2a')return <p>Labels Pricing V5 is available only to Stark Packmate administrators.</p>;
 const service:any=createServiceRoleClient();
 const {data,error}=await service.from('stark_label_rate_overrides').select('rates').eq('organization_id',workspace.organization.id).maybeSingle();
 if(error)return <p>Label pricing data could not be loaded: {error.message}</p>;
 return <main className="mx-auto max-w-5xl space-y-5 p-6"><a className="text-sm font-bold text-blue-700" href="/admin/packaging-pricing-v5">← Pricing V5 Admin</a><StarkLabelOwnerRates initialOverrides={data?.rates??{}}/></main>;
}
