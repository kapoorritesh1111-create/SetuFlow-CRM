import {NextRequest,NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
export const runtime='nodejs';export const dynamic='force-dynamic';
function verified(payload:string,header:string,secret:string){
 const parts=Object.fromEntries(header.split(',').map(v=>v.split('=')));
 const ts=Number(parts.t);if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return false;
 const expected=createHmac('sha256',secret).update(ts+'.'+payload).digest('hex');
 const signatures=header.split(',').filter(v=>v.startsWith('v1=')).map(v=>v.slice(3));
 return signatures.some(v=>/^[0-9a-f]{64}$/.test(v)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(v,'hex')));
}
export async function POST(req:NextRequest){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;const apiKey=process.env.STRIPE_SECRET_KEY;
 if(!secret||!apiKey)return NextResponse.json({error:'Unavailable'},{status:503});
 const raw=await req.text();if(!verified(raw,req.headers.get('stripe-signature')||'',secret))return NextResponse.json({error:'Bad signature'},{status:400});
 let event:any;try{event=JSON.parse(raw)}catch{return NextResponse.json({error:'Bad event'},{status:400})}
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return NextResponse.json({received:true});
 const session=event.data?.object;
 if(session?.payment_status!=='paid'||!session?.payment_intent||!session?.id)return NextResponse.json({received:true});
 // Resolve the intent directly from Stripe. Ignore any untrusted session amount or metadata without cross-checking.
 const sr=await fetch('https://api.stripe.com/v1/payment_intents/'+encodeURIComponent(session.payment_intent),{headers:{Authorization:'Bearer '+apiKey},cache:'no-store'});
 if(!sr.ok)return NextResponse.json({error:'Stripe verification unavailable'},{status:503});
 const pi=await sr.json();
 if(pi.status!=='succeeded'||pi.id!==session.payment_intent)return NextResponse.json({received:true});
 const invoiceId=String(session.metadata?.smc_invoice_id||'');const orgId=String(session.metadata?.organization_id||'');
 if(!/^[a-f0-9-]{36}$/i.test(invoiceId)||!/^[a-f0-9-]{36}$/i.test(orgId))return NextResponse.json({received:true});
 const db=createServiceRoleClient();if(!db)return NextResponse.json({error:'Unavailable'},{status:503});
 const {data:invoice}=await db.from('smc_subscription_invoices').select('id,organization_id,currency,total,status').eq('id',invoiceId).eq('organization_id',orgId).maybeSingle();
 if(!invoice||invoice.status==='void'||String(invoice.currency).toLowerCase()!==pi.currency)return NextResponse.json({error:'Invoice mismatch'},{status:409});
 const amount=Number(pi.amount_received);
 if(!Number.isSafeInteger(amount)||amount<=0||amount!==Number(session.amount_total))return NextResponse.json({error:'Amount mismatch'},{status:409});
 const {error:writeError}=await db.from('smc_invoice_payments').upsert({organization_id:orgId,invoice_id:invoiceId,stripe_payment_intent_id:pi.id,stripe_checkout_session_id:session.id,provider:'stripe',amount_minor:amount,currency:pi.currency.toUpperCase(),status:'succeeded',verified_at:new Date().toISOString()},{onConflict:'stripe_payment_intent_id',ignoreDuplicates:true});
 if(writeError)return NextResponse.json({error:'Ledger write failed'},{status:503});
 const {data:payments,error:readError}=await db.from('smc_invoice_payments').select('amount_minor,currency').eq('invoice_id',invoiceId).eq('status','succeeded');
 if(readError)return NextResponse.json({error:'Reconciliation failed'},{status:503});
 const paid=(payments||[]).filter((p:any)=>p.currency===pi.currency.toUpperCase()).reduce((s:number,p:any)=>s+Number(p.amount_minor),0);
 const total=Math.round(Number(invoice.total)*100);
 const status=paid>=total?'paid':'partially_paid';
 if(invoice.status!=='void'){const {error:updateError}=await db.from('smc_subscription_invoices').update({status,updated_at:new Date().toISOString()}).eq('id',invoiceId).neq('status','void');if(updateError)return NextResponse.json({error:'Invoice update failed'},{status:503})}
 return NextResponse.json({received:true});
}