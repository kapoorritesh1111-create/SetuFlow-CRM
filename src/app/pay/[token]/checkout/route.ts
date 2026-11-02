import {NextRequest,NextResponse} from 'next/server';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(_req:NextRequest,{params}:{params:{token:string}}){
 const token=params.token;
 if(!/^[a-f0-9]{48}$/.test(token))return new NextResponse('Payment link not found',{status:404});
 const db=createServiceRoleClient();if(!db)return new NextResponse('Payment service unavailable',{status:503});
 const {data:link,error}=await db.from('smc_stripe_payment_links').select('stripe_checkout_url,expires_at,invoice_id').eq('token',token).maybeSingle();
 if(error||!link)return new NextResponse('Payment link not found',{status:404});
 if(Date.parse(link.expires_at)<=Date.now())return new NextResponse('This payment link has expired. Request a new payment link from SETU Flow.',{status:410});
 const {data:invoice}=await db.from('smc_subscription_invoices').select('status').eq('id',link.invoice_id).maybeSingle();
 if(!invoice||!['sent','partially_paid','overdue'].includes(invoice.status))return new NextResponse('This invoice is no longer payable.',{status:410});
 const url=new URL(link.stripe_checkout_url);
 if(url.protocol!=='https:'||!(url.hostname==='checkout.stripe.com'||url.hostname.endsWith('.checkout.stripe.com')))return new NextResponse('Invalid checkout destination',{status:500});
 return NextResponse.redirect(url.toString(),{status:303,headers:{'Referrer-Policy':'no-referrer','Cache-Control':'no-store'}});
}
