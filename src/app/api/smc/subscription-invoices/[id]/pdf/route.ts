import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import {INTERNAL_ORG_ID} from '@/lib/config/internal';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const m=(n:number,c:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(n);
const n=(v:unknown)=>Number(v)||0;
const safeLink=(v:string)=>{try{const u=new URL(v);return u.protocol==='https:'&&['wise.com','www.wise.com'].includes(u.hostname)?u.toString():''}catch{return ''}};
export async function GET(req:NextRequest,{params}:{params:{id:string}}){
 const sb=await createClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data:member}=await (sb as any).from('organization_members').select('id').eq('organization_id',INTERNAL_ORG_ID).eq('user_id',user.id).eq('is_active',true).maybeSingle();
 if(!member)return NextResponse.json({error:'Forbidden'},{status:403});
 const db=createServiceRoleClient();if(!db)return NextResponse.json({error:'Billing unavailable'},{status:503});
 const {data:invoice,error}=await db.from('smc_subscription_invoices').select('*').eq('id',params.id).maybeSingle();
 if(error||!invoice)return NextResponse.json({error:'Invoice not found'},{status:404});
 const {data:org}=await db.from('organizations').select('name').eq('id',invoice.organization_id).maybeSingle();
 const lines=Array.isArray(invoice.line_items)?invoice.line_items:[];
 const rows=lines.map((l:any)=>'<tr><td><b>'+esc(l.description)+'</b></td><td>'+esc(l.quantity)+'</td><td>'+m(n(l.unit_price),invoice.currency)+'</td><td>'+esc(l.months|| (invoice.billing_cycle==='annual'?12:1))+'</td><td>'+m(n(l.gross),invoice.currency)+'</td><td>'+esc(l.discount_type==='percent'?l.discount_value+'%':'Fixed')+'<br><small>−'+m(n(l.discount_amount),invoice.currency)+'</small></td><td><b>'+m(n(l.total),invoice.currency)+'</b></td></tr>').join('');
 const terms=String(invoice.terms_and_conditions||'').replace(/\\n/g,'\n').split(/\r?\n/).filter(Boolean).map(t=>'<p>'+esc(t)+'</p>').join('');
 const wise=safeLink(String(invoice.wise_payment_url||''));
 let logo='';try{const bytes=await readFile(join(process.cwd(),'public','logos','setu-flow-logo.png'));logo='<img src="data:image/png;base64,'+bytes.toString('base64')+'" alt="SETU Flow" class="logo"/>'}catch{logo='<h3>SETU Flow</h3>'}
 const html=`<!doctype html><html><head><meta charset="utf-8"><style>
 @page{size:A4;margin:15mm 13mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#17304c;font-size:10px;margin:0;line-height:1.5}header{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #279491;padding-bottom:18px}.logo{max-height:65px;max-width:180px;object-fit:contain}h1{font-size:29px;letter-spacing:2px;margin:0}h2{font-size:15px}h3{font-size:12px;margin:0 0 6px}.muted,small{color:#6b7d8c}small{font-size:9px}.label{font-size:9px;color:#698198;letter-spacing:1px;font-weight:bold}.parties{display:flex;justify-content:space-between;gap:20px;padding:22px 0}.parties>div{width:48%}.parties p{margin:3px 0}.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:14px;background:#f2f7fa;border-radius:5px}.facts b{display:block;margin-top:5px}table{width:100%;border-collapse:collapse;margin-top:12px}thead{background:#173e63;color:white}th,td{text-align:right;padding:10px 7px}th:first-child,td:first-child{text-align:left}th{font-size:8px;text-transform:uppercase}td{border-bottom:1px solid #dfe8ef;vertical-align:top}tbody tr{break-inside:avoid}.totals{margin:22px 0 25px auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:6px 0}.totals .grand{border-top:2px solid #173e63;padding-top:13px;margin-top:6px;font-size:15px;color:#173e63}.payment{padding:15px;border-left:4px solid #279491;background:#eaf5f4;break-inside:avoid}.payment p{margin:4px 0}.pay{color:#173e63;font-weight:bold;text-decoration:underline}.terms{margin-top:23px;padding-top:12px;border-top:1px solid #d9e5ee}.terms p{font-size:9px;color:#536579;margin:0 0 8px;break-inside:avoid}.footer{margin-top:25px;border-top:1px solid #d9e5ee;padding-top:11px;display:flex;justify-content:space-between;color:#6b7d8c;font-size:9px}.page-heading{font-size:12px;font-weight:bold;text-align:right}
 </style></head><body><header><div>${logo}<div class="label">SOFTWARE SUBSCRIPTIONS</div></div><div style="text-align:right"><h1>INVOICE</h1><div class="page-heading">${esc(invoice.invoice_number)}</div></div></header>
 <div class="parties"><div><div class="label">BILL TO</div><h2>${esc(org?.name||'Customer')}</h2><p>${esc(invoice.recipient_email)}</p></div><div><div class="label">ISSUED BY</div><h2>SETU Groups LLC</h2><p>SETU Flow — SaaS platform</p><p>EIN: 41-4901927</p><p>${esc(invoice.sender_email||'billing@setugroups.com')}</p></div></div>
 <div class="facts"><div><div class="label">PLAN</div><b>${esc(invoice.plan_name)}</b></div><div><div class="label">CYCLE</div><b>${invoice.billing_cycle==='annual'?'Annual · 12 months':'Monthly'}</b></div><div><div class="label">SERVICE PERIOD</div><b>${esc(invoice.period_start)} – ${esc(invoice.period_end)}</b></div><div><div class="label">PAYMENT DUE</div><b>${esc(invoice.due_date)}</b></div></div>
 <h2 style="margin-top:26px">Subscription charges</h2><table><thead><tr><th>Service / license</th><th>Seats</th><th>Rate / month</th><th>Months</th><th>Subtotal</th><th>Discount</th><th>Net</th></tr></thead><tbody>${rows}</tbody></table>
 <div class="totals"><div><span>Subtotal</span><b>${m(n(invoice.subtotal),invoice.currency)}</b></div><div><span>Discount savings</span><b>−${m(n(invoice.discount_total),invoice.currency)}</b></div><div class="grand"><span>AMOUNT DUE</span><b>${m(n(invoice.total),invoice.currency)}</b></div></div>
 <div class="payment"><h3>Payment instructions</h3><p>Please pay by ${esc(invoice.due_date)} and include reference <b>${esc(invoice.invoice_number)}</b>.</p>${wise?'<p><a class="pay" href="'+esc(wise)+'">Pay invoice securely using Wise ↗</a></p>':'<p>Contact the billing team for payment instructions.</p>'}</div>
 ${invoice.notes?'<div style="margin-top:18px"><h3>Additional notes</h3><p>'+esc(invoice.notes)+'</p></div>':''}
 ${terms?'<section class="terms"><h3>Subscription terms &amp; conditions</h3>'+terms+'</section>':''}
 <footer class="footer"><span>SETU Groups LLC · SETU Flow · EIN 41-4901927</span><span>Billing questions: ${esc(invoice.sender_email||'billing@setugroups.com')}</span></footer></body></html>`;
 let browser;try{
 browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 const page=await browser.newPage();await page.setContent(html,{waitUntil:'load'});const pdf=await page.pdf({format:'A4',printBackground:true,displayHeaderFooter:false,preferCSSPageSize:true});
 return new NextResponse(Buffer.from(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+invoice.invoice_number+'.pdf"','Cache-Control':'private, no-store'}});
 }catch(e){console.error('Invoice PDF generation failed',e);return NextResponse.json({error:'Unable to generate invoice PDF'},{status:500})}finally{await browser?.close()}
}
