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
  return error ? bad(error.message,500) : NextResponse.json({ invoices: data });
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
    const gross=money(qty*rate);
    if (item.discount_type==='percent' && discount>100) return bad('Discount exceeds 100%');
    const discounted=money(item.discount_type==='percent'?gross*discount/100:discount);
    if (discounted>gross) return bad('Discount exceeds line amount');
    lines.push({description:String(item.description).slice(0,200),quantity:qty,unit_price:rate,discount_type:item.discount_type,discount_value:discount,gross,discount_amount:discounted,total:money(gross-discounted)});
  }
  const subtotal=money(lines.reduce((s,l)=>s+l.gross,0));
  const discount_total=money(lines.reduce((s,l)=>s+l.discount_amount,0));
  const tax_total=0;
  const { data: seq, error: seqError } = await db.rpc('smc_next_invoice_number');
  if (seqError || !seq) return bad('Could not allocate invoice number',500);
  const {data,error}=await db.from('smc_subscription_invoices').insert({organization_id:x.organization_id,invoice_number:seq,billing_cycle:x.billing_cycle,plan_name:x.plan_name.trim(),currency:x.currency,period_start:x.period_start,period_end:x.period_end,due_date:x.due_date,wise_payment_url:url||null,line_items:lines,subtotal,discount_total,tax_total,total:money(subtotal-discount_total),notes:String(x.notes||'').slice(0,2000),created_by:user.id,status:'draft'}).select('*').single();
  return error?bad(error.message,500):NextResponse.json({invoice:data},{status:201});
}
export async function PATCH(request:NextRequest) {
  if (!await access()) return bad('Unauthorized',403);
  const db=createServiceRoleClient(); if(!db) return bad('Backend unavailable',503);
  let x:any; try{x=await request.json();}catch{return bad('Invalid JSON');}
  if(!['sent','partially_paid','paid','overdue','void'].includes(x.status)) return bad('Invalid status');
  const {data,error}=await db.from('smc_subscription_invoices').update({status:x.status,issued_at:x.status==='sent'?new Date().toISOString():undefined,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();
  return error?bad(error.message,500):NextResponse.json({invoice:data});
}
