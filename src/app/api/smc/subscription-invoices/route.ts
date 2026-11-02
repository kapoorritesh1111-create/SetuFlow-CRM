import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';
async function access() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: membership } = await (sb as any).from('organization_members').select('id,is_active').eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).eq('is_active', true).maybeSingle();
  if (!membership) return null;
  return user;
}
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
export async function GET(request: NextRequest) {
  if (!await access()) return bad('Unauthorized',403);
  const db = createServiceRoleClient();
  if (!db) return bad('Billing backend unavailable',503);
  const org = request.nextUrl.searchParams.get('organization_id');
  let q = db.from('smc_subscription_invoices').select('*').order('created_at',{ascending:false}).limit(100);
  if (org) q = q.eq('organization_id',org);
  const {data,error} = await q;
  if(error)return bad(error.message,500);
  const ids=(data||[]).map(i=>i.id);
  if(!ids.length)return NextResponse.json({invoices:[]});
  const [paymentResult,linkResult]=await Promise.all([
    db.from('smc_invoice_payments').select('invoice_id,amount_minor,currency,status').in('invoice_id',ids).eq('status','succeeded'),
    db.from('smc_stripe_payment_links').select('invoice_id,token,expires_at,created_at').in('invoice_id',ids).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false})
  ]);
  if(paymentResult.error||linkResult.error)return bad('Billing reconciliation unavailable',503);
  const invoices=(data||[]).map(i=>{
    const paid_minor=(paymentResult.data||[]).filter(p=>p.invoice_id===i.id&&p.currency===i.currency).reduce((s,p)=>s+Number(p.amount_minor),0);
    const total_minor=Math.round(Number(i.total)*100);
    const link=(linkResult.data||[]).find(l=>l.invoice_id===i.id);
    return {...i,paid_minor,balance_minor:Math.max(0,total_minor-paid_minor),stripe_payment_url:link&&!['paid','void'].includes(i.status)?'https://www.setuflowcrm.com/pay/'+link.token:null};
  });
  return NextResponse.json({invoices},{headers:{'Cache-Control':'private,no-store'}});
}
export async function POST(request: NextRequest) {
  const user = await access();
  if (!user) return bad('Unauthorized',403);
  const db = createServiceRoleClient();
  if (!db) return bad('Billing backend unavailable',503);
  let x:any; try { x = await request.json(); } catch { return bad('Invalid JSON'); }
  const allowedCycles = ['monthly','annual'], currencies = ['USD','EUR','GBP','INR'];
  if (!allowedCycles.includes(x.billing_cycle) || !currencies.includes(x.currency)) return bad('Invalid billing cycle or currency');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.period_start||'') || !/^\d{4}-\d{2}-\d{2}$/.test(x.period_end||'') || !/^\d{4}-\d{2}-\d{2}$/.test(x.due_date||'') || x.period_end < x.period_start) return bad('Invalid billing dates');
  if (typeof x.plan_name !== 'string' || !x.plan_name.trim() || x.plan_name.length > 150) return bad('Plan required');
  const url = String(x.wise_payment_url||'').trim();
  if (url) { try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || !['wise.com','www.wise.com'].includes(parsed.hostname)) return bad('Provide an HTTPS Wise payment link'); } catch { return bad('Invalid payment URL'); } }
  const {data:org} = await db.from('organizations').select('id').eq('id',x.organization_id).maybeSingle();
  if (!org) return bad('Organization not found');
  const input = x.line_items;
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) return bad('Between 1 and 20 line items required');
  const lines:any[]=[];
  for (const item of input) {
    const qty=Number(item.quantity),rate=Number(item.unit_price),discount=Number(item.discount_value||0);
    if (!String(item.description||'').trim() || !Number.isFinite(qty) || !Number.isFinite(rate) || !Number.isFinite(discount) || qty<0 || qty>100000 || rate<0 || rate>100000000 || discount<0 || !['percent','fixed'].includes(item.discount_type)) return bad('Invalid line item');
    const months = x.billing_cycle === 'annual' ? 12 : 1;
    const gross=money(qty*rate*months);
    if (item.discount_type==='percent' && discount>100) return bad('Discount exceeds 100%');
    const discounted=money(item.discount_type==='percent'?gross*discount/100:discount);
    if (discounted>gross) return bad('Discount exceeds line amount');
    lines.push({description:String(item.description).slice(0,200),quantity:qty,unit_price:rate,months,discount_type:item.discount_type,discount_value:discount,gross,discount_amount:discounted,total:money(gross-discounted)});
  }
  const subtotal=money(lines.reduce((s,l)=>s+l.gross,0));
  const discount_total=money(lines.reduce((s,l)=>s+l.discount_amount,0));
  const tax_total=0;
  const { data: seq, error: seqError } = await db.rpc('smc_next_invoice_number');
  if (seqError || !seq) return bad('Could not allocate invoice number',500);
  const {data,error}=await db.from('smc_subscription_invoices').insert({organization_id:x.organization_id,invoice_number:seq,billing_cycle:x.billing_cycle,plan_name:x.plan_name.trim(),currency:x.currency,period_start:x.period_start,period_end:x.period_end,due_date:x.due_date,wise_payment_url:url||null,line_items:lines,subtotal,discount_total,tax_total,total:money(subtotal-discount_total),notes:String(x.notes||'').slice(0,2000),terms_and_conditions:String(x.terms_and_conditions||'').slice(0,12000),recipient_email:String(x.recipient_email||'').slice(0,254),sender_email:String(x.sender_email||'').slice(0,254),created_by:user.id,status:'draft'}).select('*').single();
  return error?bad(error.message,500):NextResponse.json({invoice:data},{status:201});
}
export async function PATCH(request:NextRequest) {
 if(!await access())return bad('Unauthorized',403);
 const db=createServiceRoleClient();if(!db)return bad('Backend unavailable',503);
 let x:any;try{x=await request.json()}catch{return bad('Invalid JSON')}
 const {data:invoice}=await db.from('smc_subscription_invoices').select('*').eq('id',x.id).maybeSingle();
 if(!invoice)return bad('Invoice not found',404);
 if(x.action==='edit'){
   if(!['draft','partially_paid','overdue'].includes(invoice.status))return bad('Paid or void invoices are locked',409);
   const changes:any={updated_at:new Date().toISOString()};
   for(const key of ['notes','terms_and_conditions','recipient_email','sender_email']){
     if(x[key]!==undefined){if(typeof x[key]!=='string')return bad('Invalid '+key);changes[key]=x[key].slice(0,key==='terms_and_conditions'?12000:key==='notes'?2000:254)}
   }
   if(x.due_date!==undefined){if(!/^\d{4}-\d{2}-\d{2}$/.test(x.due_date))return bad('Invalid due date');changes.due_date=x.due_date}
   if(invoice.status==='draft'){
     if(x.plan_name!==undefined){if(typeof x.plan_name!=='string'||!x.plan_name.trim())return bad('Plan required');changes.plan_name=x.plan_name.trim().slice(0,150)}
     if(x.period_start!==undefined||x.period_end!==undefined){const a=x.period_start??invoice.period_start,b=x.period_end??invoice.period_end;if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(b)||b<a)return bad('Invalid period');changes.period_start=a;changes.period_end=b}
   }else if(['plan_name','period_start','period_end','line_items','total','currency','billing_cycle'].some(k=>x[k]!==undefined))return bad('Financial fields are locked after issuing',409);
   const {data,error}=await db.from('smc_subscription_invoices').update(changes).eq('id',invoice.id).eq('status',invoice.status).select('*').single();
   return error?bad(error.message,500):NextResponse.json({invoice:data});
 }
 if(x.action==='issue') {if(invoice.status!=='draft')return bad('Only draft invoices can be issued',409);if(Number(invoice.total)<=0||!invoice.recipient_email)return bad('Positive amount and recipient email required',400);const {data,error}=await db.from('smc_subscription_invoices').update({status:'sent',issued_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',invoice.id).eq('status','draft').select('*').single();return error?bad(error.message,500):NextResponse.json({invoice:data});}
 if(!['partially_paid','paid','overdue','void'].includes(x.status))return bad('Invalid status');
 if(invoice.status==='void'||invoice.status==='paid')return bad('Paid or void invoices are locked',409);
 const {data,error}=await db.from('smc_subscription_invoices').update({status:x.status,updated_at:new Date().toISOString()}).eq('id',invoice.id).eq('status',invoice.status).select('*').single();
 return error?bad(error.message,500):NextResponse.json({invoice:data});
}
