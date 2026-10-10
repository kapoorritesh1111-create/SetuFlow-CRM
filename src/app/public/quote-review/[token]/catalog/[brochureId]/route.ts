import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, {params}:{params:{token:string;brochureId:string}}){
  const token=String(params.token??'').trim();
  const brochureId=String(params.brochureId??'').trim();
  if(token.length<32||!brochureId) return NextResponse.json({error:'Brochure unavailable'},{status:404});
  const admin=createAdminSupabaseClient() as any;
  if(!admin) return NextResponse.json({error:'Brochure unavailable'},{status:404});
  const {data:quotes,error:quoteError}=await admin.from('quotes')
    .select('id,organization_id').contains('industry_metadata',{customer_review_token:token}).limit(1);
  const quote=quotes?.[0];
  if(quoteError||!quote) return NextResponse.json({error:'Brochure unavailable'},{status:404});
  const {data:brochure,error}=await admin.from('catalog_brochures')
    .select('storage_bucket,storage_path,is_active').eq('id',brochureId)
    .eq('organization_id',quote.organization_id).eq('is_active',true).maybeSingle();
  if(error||!brochure?.storage_bucket||!brochure?.storage_path) return NextResponse.json({error:'Brochure unavailable'},{status:404});
  const {data:signed,error:signError}=await admin.storage.from(brochure.storage_bucket)
    .createSignedUrl(brochure.storage_path,60*10);
  if(signError||!signed?.signedUrl) return NextResponse.json({error:'Brochure unavailable'},{status:404});
  return NextResponse.redirect(signed.signedUrl,{status:302,headers:{'Cache-Control':'private, no-store'}});
}
