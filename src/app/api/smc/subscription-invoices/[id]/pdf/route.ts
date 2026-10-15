import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {createServiceRoleClient} from '@/lib/supabase/service-role';
import {INTERNAL_ORG_ID} from '@/lib/config/internal';
import {deflateSync} from 'node:zlib';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const W=595,H=842;
function ascii(t:unknown){return String(t??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,c=>c==='–'||c==='—' ? '-' : c==='−' ? '-' : '?');}
function lit(s:unknown){return '('+ascii(s).replace(/[\\()]/g,'\\$&')+')';}
function money(n:unknown,c:string){return new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(Number(n)||0)}
function urlSafe(s:string){try{const u=new URL(s);return u.protocol==='https:'&&['wise.com','www.wise.com'].includes(u.hostname)?u.toString():''}catch{return ''}}
function wrap(str:string,max:number){const words=ascii(str).split(/\s+/);const out:string[]=[];let current='';for(const word of words){if(!word)continue;if((current+' '+word).trim().length>max&&current){out.push(current);current=word}else current=(current+' '+word).trim()}if(current)out.push(current);return out}
type PdfPage={draw:string[];links:{url:string;rect:number[]}[]};
export function buildInvoicePdf(invoice:any,orgName:string){
 const pages:PdfPage[]=[{draw:[],links:[]}];let p=pages[0];let y=H-54;
 const text=(x:number,top:number,s:unknown,size=10,bold=false,color=[0.09,0.2,0.34])=>{p.draw.push(`${color.join(' ')} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${top} Tm ${lit(s)} Tj ET`)};
 const rect=(x:number,top:number,w:number,h:number,r=.94,g=.96,b=.98)=>p.draw.push(`${r} ${g} ${b} rg ${x} ${top} ${w} ${h} re f`);
 const line=(x:number,top:number,x2:number,top2:number)=>p.draw.push(`0.81 0.87 0.91 RG 0.6 w ${x} ${top} m ${x2} ${top2} l S`);
 const right=(x:number,top:number,s:unknown,size=10,bold=false)=>text(x-ascii(s).length*size*(bold?.56:.49),top,s,size,bold);
 const nextPage=()=>{p={draw:[],links:[]};pages.push(p);y=H-55};
 const heading=()=>{text(43,H-50,'SETU',25,true,[.11,.29,.49]);text(116,H-50,'FLOW',25,true,[.13,.55,.52]);right(W-43,H-47,'INVOICE',27,true);text(44,H-69,'SOFTWARE SUBSCRIPTIONS',8,true);right(W-43,H-69,invoice.invoice_number,11,true);p.draw.push(`0.13 0.58 0.56 RG 2 w 43 ${H-86} m ${W-43} ${H-86} l S`)};
 heading();
 text(43,724,'BILL TO',9,true);text(308,724,'ISSUED BY',9,true);
 text(43,703,orgName,14,true);text(308,703,'SETU Groups LLC',14,true);
 text(43,685,invoice.recipient_email||'',9);text(308,685,'SETU Flow - SaaS platform',9);
 text(308,669,'EIN: 41-4901927',9);text(308,653,invoice.sender_email||'billing@setugroups.com',9);
 rect(43,569,509,51);
 const fact=[['PLAN',invoice.plan_name],['BILLING',invoice.billing_cycle==='annual'?'Annual / 12 months':'Monthly'],['SERVICE PERIOD',invoice.period_start+' to '+invoice.period_end],['DUE DATE',invoice.due_date]];
 fact.forEach((f,i)=>{let x=53+i*128;text(x,601,f[0],8,true);text(x,580,f[1],i===2?8:9,true)});
 text(43,547,'SUBSCRIPTION CHARGES',12,true);
 rect(43,514,509,23,.10,.25,.40);
 const cols=[49,263,312,370,427,501];
 ['SERVICE / LICENSE','SEATS','RATE/MO','MONTHS','DISCOUNT','NET'].forEach((t,i)=>text(cols[i],522,t,7,true,[1,1,1]));
 y=503;
 for(const l of invoice.line_items||[]){
  const desc=wrap(String(l.description||''),30);
  if(y-25-desc.length*10<238){nextPage();heading();y=H-125}
  text(49,y,desc[0]||'',9,true);desc.slice(1).forEach((s,i)=>text(49,y-(i+1)*11,s,9));
  text(263,y,l.quantity,9);text(312,y,money(l.unit_price,invoice.currency),9);
  text(373,y,l.months||(invoice.billing_cycle==='annual'?12:1),9);
  text(429,y,l.discount_type==='percent'?String(l.discount_value)+'%':money(l.discount_amount,invoice.currency),9);
  right(549,y,money(l.total,invoice.currency),9,true);
  const step=Math.max(30,desc.length*10+12);line(43,y-step+9,552,y-step+9);y-=step;
 }
 if(y<260){nextPage();heading();y=H-135}
 const totalX=338;
 right(549,y-4,'Subtotal  '+money(invoice.subtotal,invoice.currency),10);
 right(549,y-21,'Discounts  -'+money(invoice.discount_total,invoice.currency),10);
 line(totalX,y-30,551,y-30);
 right(549,y-49,'AMOUNT DUE  '+money(invoice.total,invoice.currency),15,true);
 y-=74;
 rect(43,y-51,509,62,.88,.95,.94);
 text(54,y-5,'PAYMENT INSTRUCTIONS',11,true);
 text(54,y-23,'Payment due '+invoice.due_date+'; reference '+invoice.invoice_number,9);
 const wise=urlSafe(invoice.wise_payment_url||'');
 if(wise){text(54,y-39,'CLICK HERE TO PAY USING WISE',10,true,[.08,.33,.49]);p.links.push({url:wise,rect:[52,y-44,270,y-26]})}
 else text(54,y-39,'Contact billing for payment instructions.',9);
 y-=77;
 const terms=String(invoice.terms_and_conditions||'').replace(/\\n/g,'\n').split(/\r?\n/).filter(Boolean);
 if(terms.length){if(y<115){nextPage();heading();y=H-110}text(43,y,'SUBSCRIPTION TERMS & CONDITIONS',10,true);y-=16;
  for(const t of terms){const parts=wrap(t,115);if(y-parts.length*10<57){nextPage();heading();y=H-112}parts.forEach(s=>{text(43,y,s,7.5);y-=10});y-=3}
 }
 if(invoice.notes){const parts=wrap('Notes: '+invoice.notes,100);if(y-parts.length*12<70){nextPage();heading();y=H-125}parts.forEach(s=>{text(43,y,s,8);y-=12})}
 pages.forEach((pg,i)=>{pg.draw.push(`0.52 0.58 0.64 rg BT /F1 8 Tf 1 0 0 1 43 34 Tm ${lit('SETU Groups LLC | SETU Flow | EIN 41-4901927')} Tj ET`);pg.draw.push(`0.52 0.58 0.64 rg BT /F1 8 Tf 1 0 0 1 493 34 Tm ${lit('Page '+(i+1)+' of '+pages.length)} Tj ET`)});
 const objs:Buffer[]=[];const add=(s:string|Buffer)=>{objs.push(Buffer.isBuffer(s)?s:Buffer.from(s,'latin1'));return objs.length};
 const catalog=add('');const pageTree=add('');const font1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');const font2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const refs:number[]=[];
 for(const pg of pages){const compressed=deflateSync(Buffer.from(pg.draw.join('\n'),'latin1'));const stream=add(Buffer.concat([Buffer.from('<< /Length '+compressed.length+' /Filter /FlateDecode >>\nstream\n'),compressed,Buffer.from('\nendstream')]));
 const annotations=pg.links.map(link=>add(`<< /Type /Annot /Subtype /Link /Rect [${link.rect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI ${lit(link.url)} >> >>`));
 const page=add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${stream} 0 R /Annots [${annotations.map(a=>a+' 0 R').join(' ')}] >>`);refs.push(page);
 }
 objs[catalog-1]=Buffer.from(`<< /Type /Catalog /Pages ${pageTree} 0 R >>`);
 objs[pageTree-1]=Buffer.from(`<< /Type /Pages /Kids [${refs.map(r=>r+' 0 R').join(' ')}] /Count ${refs.length} >>`);
 const parts:Buffer[]=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')];const offsets=[0];let size=parts[0].length;
 objs.forEach((obj,i)=>{offsets.push(size);const item=Buffer.concat([Buffer.from((i+1)+' 0 obj\n'),obj,Buffer.from('\nendobj\n')]);parts.push(item);size+=item.length});
 const xref=size;let trailer='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
 offsets.slice(1).forEach(off=>trailer+=String(off).padStart(10,'0')+' 00000 n \n');
 trailer+='trailer\n<< /Size '+(objs.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 parts.push(Buffer.from(trailer));return Buffer.concat(parts);
}
export async function GET(_req:Request,{params}:{params:{id:string}}){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {data:member}=await (sb as any).from('organization_members').select('id').eq('organization_id',INTERNAL_ORG_ID).eq('user_id',user.id).eq('is_active',true).maybeSingle();
 if(!member)return NextResponse.json({error:'Forbidden'},{status:403});
 const db=createServiceRoleClient();if(!db)return NextResponse.json({error:'Billing unavailable'},{status:503});
 const {data:invoice,error}=await db.from('smc_subscription_invoices').select('*').eq('id',params.id).maybeSingle();
 if(error||!invoice)return NextResponse.json({error:'Invoice not found'},{status:404});
 const {data:org}=await db.from('organizations').select('name').eq('id',invoice.organization_id).maybeSingle();
 try{const pdf=buildInvoicePdf(invoice,org?.name||'Customer');return new NextResponse(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="'+invoice.invoice_number+'.pdf"','Cache-Control':'private, no-store'}})}
 catch(e){console.error('Invoice PDF serialization failed',e);return NextResponse.json({error:'Invoice PDF generation failed'},{status:500})}
}
