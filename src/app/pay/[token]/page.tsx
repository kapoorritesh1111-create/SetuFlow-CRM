import {createServiceRoleClient} from '@/lib/supabase/service-role';
export const dynamic='force-dynamic';
export default async function PaymentPage({params}:{params:{token:string}}){
 const db=createServiceRoleClient();
 let message='This payment link is unavailable.';
 let info:null|{number:string;customer:string;currency:string;due:number;status:string}=null;
 if(db&&/^[a-f0-9]{48}$/.test(params.token)){
  const {data:link}=await db.from('smc_stripe_payment_links').select('invoice_id,expires_at').eq('token',params.token).maybeSingle();
  if(link){
   const {data:invoice}=await db.from('smc_subscription_invoices').select('id,invoice_number,organization_id,currency,total,status').eq('id',link.invoice_id).maybeSingle();
   if(invoice){
    const {data:org}=await db.from('organizations').select('name').eq('id',invoice.organization_id).maybeSingle();
    const {data:payments}=await db.from('smc_invoice_payments').select('amount_minor,currency').eq('invoice_id',invoice.id).eq('status','succeeded');
    const paid=(payments||[]).filter(p=>p.currency===invoice.currency).reduce((s,p)=>s+Number(p.amount_minor),0);
    const due=Math.max(0,Math.round(Number(invoice.total)*100)-paid);
    info={number:invoice.invoice_number,customer:org?.name||'Customer',currency:invoice.currency,due,status:invoice.status};
    if(invoice.status==='paid'||due===0)message='This invoice has already been paid.';
    else if(Date.parse(link.expires_at)<=Date.now())message='This payment link has expired. Please request a new link.';
    else if(!['sent','partially_paid','overdue'].includes(invoice.status))message='This invoice is not available for payment.';
    else message='';
   }
  }
 }
 const fmt=(value:number,currency:string)=>new Intl.NumberFormat('en-US',{style:'currency',currency}).format(value/100);
 return <main style={{minHeight:'100vh',background:'#f2f6fa',padding:'45px 20px',color:'#16304a',display:'grid',placeItems:'center'}}><section style={{maxWidth:560,width:'100%',background:'white',borderRadius:22,padding:'38px',boxShadow:'0 12px 45px rgba(12,42,75,.10)'}}><div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:'#0f766e'}}>SETU FLOW</div><h1 style={{fontSize:29,fontWeight:800,marginTop:18}}>Secure invoice payment</h1>{info&&<div style={{borderTop:'1px solid #e2e8f0',marginTop:25,paddingTop:22}}><p style={{color:'#64748b',fontSize:13}}>INVOICE</p><p style={{fontWeight:700,marginTop:4}}>{info.number}</p><p style={{color:'#64748b',marginTop:20,fontSize:13}}>BILLED TO</p><p style={{fontWeight:700,marginTop:4}}>{info.customer}</p><p style={{color:'#64748b',marginTop:24,fontSize:13}}>AMOUNT DUE</p><p style={{fontSize:35,fontWeight:800,marginTop:5}}>{fmt(info.due,info.currency)}</p></div>}{message?<p style={{marginTop:24,padding:14,background:'#f1f5f9',borderRadius:9}}>{message}</p>:<a href={'/pay/'+params.token+'/checkout'} style={{display:'block',marginTop:26,textAlign:'center',padding:16,borderRadius:12,background:'#1f487c',color:'white',fontWeight:800,textDecoration:'none'}}>Pay securely with Stripe</a>}<p style={{fontSize:12,color:'#64748b',lineHeight:1.7,marginTop:18}}>Payments are processed securely by Stripe. SETU Flow does not store your card details.</p></section></main>;
}
