import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import {INTERNAL_ORG_ID} from '@/lib/config/internal';
export const runtime='nodejs';export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
export async function POST(req:NextRequest){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return fail('Unauthorized',401);
 const db=createServiceRoleClient();if(!db)return fail('Billing backend unavailable',503);
 let body:any;try{body=await req.json()}catch{return fail('Invalid body',400)}
 const id=String(body?.invoice_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return fail('Invalid invoice',400);
 const {data:i}=await db.from('smc_subscription_invoices').select('id,organization_id,invoice_number,status,total,currency').eq('id',id).maybeSingle();
 if(!i||!['partially_paid','overdue','sent'].includes(i.status))return fail('Invoice not payable',409);
 const {data:member}=await (sb as any).from('organization_members').select('id').eq('organization_id',i.organization_id).eq('user_id',user.id).eq('is_active',true).maybeSingle();
 const {data:staff}=await (sb as any).from('organization_members').select('id').eq('organization_id',INTERNAL_ORG_ID).eq('user_id',user.id).eq('is_active',true).maybeSingle();
 if(!member&&!staff)return fail('Forbidden',403);
 if(!staff){const {data:roles}=await db.from('user_roles').select('roles(name)').eq('organization_member_id',member.id);if(!roles?.some((r:any)=>['owner','admin'].includes(String(r.roles?.name||'').toLowerCase())))return fail('Billing admin required',403)}
 const secret=process.env.STRIPE_SECRET_KEY;if(!secret?.startsWith('sk_'))return fail('Stripe unavailable',503);
 const currency=String(i.currency).toUpperCase();if(!['USD','EUR','GBP','INR'].includes(currency))return fail('Unsupported currency',400);
 const {data:p,error:pe}=await db.from('smc_invoice_payments').select('amount_minor,currency,status').eq('invoice_id',id);if(pe)return fail('Payment ledger unavailable',503);
 const total=Math.round(Number(i.total)*100),paid=(p||[]).filter((x:any)=>x.currency===currency&&x.status==='succeeded').reduce((s:number,x:any)=>s+Number(x.amount_minor),0);
 const amount=total-paid;if(!Number.isSafeInteger(amount)||amount<=0)return fail('No balance due',409);
 const {data:mapping}=await db.from('smc_stripe_customers').select('stripe_customer_id').eq('organization_id',i.organization_id).maybeSingle();
 const base=process.env.NEXT_PUBLIC_APP_URL||'https://www.setuflowcrm.com';
 const form=new URLSearchParams({mode:'payment',client_reference_id:id,success_url:base+'/billing?status=returned',cancel_url:base+'/billing?status=cancelled'});
 form.set('line_items[0][price_data][currency]',currency.toLowerCase());form.set('line_items[0][price_data][unit_amount]',String(amount));form.set('line_items[0][price_data][product_data][name]','SETU Flow invoice '+i.invoice_number);form.set('line_items[0][quantity]','1');
 form.set('metadata[smc_invoice_id]',id);form.set('metadata[organization_id]',i.organization_id);form.set('payment_intent_data[metadata][smc_invoice_id]',id);
 if(mapping?.stripe_customer_id)form.set('customer',mapping.stripe_customer_id);
 const out=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'smc-'+id+'-'+amount},body:form,cache:'no-store'});
 const session=await out.json();if(!out.ok||!session.url)return fail('Stripe checkout could not be created',502);
 return NextResponse.json({url:session.url,amount_minor:amount,currency,invoice_number:i.invoice_number},{headers:{'Cache-Control':'private,no-store'}});
}