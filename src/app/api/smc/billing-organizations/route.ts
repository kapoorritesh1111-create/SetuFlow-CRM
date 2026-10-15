import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import {INTERNAL_ORG_ID} from '@/lib/config/internal';
export const dynamic='force-dynamic';
export async function GET(){const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:403});const {data:member}=await (sb as any).from('organization_members').select('id').eq('organization_id',INTERNAL_ORG_ID).eq('user_id',user.id).eq('is_active',true).maybeSingle();if(!member)return NextResponse.json({error:'Forbidden'},{status:403});const db=createServiceRoleClient();if(!db)return NextResponse.json({error:'Unavailable'},{status:503});const {data,error}=await db.from('organizations').select('id,name').neq('id',INTERNAL_ORG_ID).order('name');return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({organizations:data})}
