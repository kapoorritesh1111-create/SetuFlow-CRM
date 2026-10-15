'use client';
import type {ReactNode} from 'react';
export type InvoiceLine={description:string;quantity:number;unit_price:number;discount_type:'percent'|'fixed';discount_value:number;gross?:number;discount_amount?:number;total?:number};
export type InvoiceDocumentData={invoice_number?:string;customer:string;recipient:string;sender:string;plan:string;cycle:string;currency:string;start:string;end:string;due:string;issueDate?:string;lines:InvoiceLine[];paymentUrl:string;terms:string;notes:string;status?:string};
const round=(v:number)=>Math.round((v+Number.EPSILON)*100)/100;
export const cleanTerms=(s:string)=>s.replace(/\\n/g,'\n').replace(/\r\n/g,'\n');
export function InvoiceDocument({invoice,children}:{invoice:InvoiceDocumentData;children?:ReactNode}){
 const months=invoice.cycle==='annual'?12:1;
 const fmt=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:invoice.currency}).format(v);
 const rows=invoice.lines.map(line=>{const gross=round(line.gross??(line.quantity*line.unit_price*months));const discount=round(line.discount_amount??(line.discount_type==='percent'?gross*line.discount_value/100:line.discount_value));return {...line,gross,discount,net:round(gross-discount)}});
 const subtotal=round(rows.reduce((s,r)=>s+r.gross,0)),savings=round(rows.reduce((s,r)=>s+r.discount,0)),net=round(subtotal-savings);
 const validLink=(()=>{try{const u=new URL(invoice.paymentUrl);return u.protocol==='https:'&&['wise.com','www.wise.com'].includes(u.hostname)}catch{return false}})();
 return <section className="setu-invoice-paper" id="billing-print-area" aria-label="Subscription invoice document">
 <header className="setu-invoice-top"><div><img src="/logos/setu-flow-logo.svg" alt="SETU Flow" width="170"/><div className="setu-invoice-kicker">SOFTWARE SUBSCRIPTIONS</div></div><div className="setu-invoice-heading"><h2>INVOICE</h2><strong>{invoice.invoice_number||'DRAFT PREVIEW'}</strong><span>{invoice.status==='draft'||!invoice.invoice_number?'NOT ISSUED':invoice.status?.toUpperCase()}</span></div></header>
 <div className="setu-invoice-identity"><div><small>BILL TO</small><h3>{invoice.customer||'Customer not selected'}</h3><p>{invoice.recipient||'Billing recipient not provided'}</p></div><div><small>ISSUED BY</small><h3>SETU Flow</h3><p>{invoice.sender||'Sender not configured'}</p><p className="setu-invoice-muted">Issuer legal/tax details to be confirmed</p></div></div>
 <div className="setu-invoice-facts"><div><small>PLAN</small><b>{invoice.plan}</b></div><div><small>BILLING CYCLE</small><b>{invoice.cycle==='annual'?'Annual · 12 months':'Monthly · 1 month'}</b></div><div><small>SERVICE PERIOD</small><b>{invoice.start} – {invoice.end}</b></div><div><small>PAYMENT DUE</small><b>{invoice.due}</b></div></div>
 <h3 className="setu-invoice-section">Subscription charges</h3>
 <div className="setu-invoice-table-scroll"><table className="setu-invoice-table"><thead><tr><th>Service / license</th><th>Seats</th><th>Rate / month</th><th>Months</th><th>Subtotal</th><th>Discount</th><th>Net</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td><strong>{r.description}</strong></td><td>{r.quantity}</td><td>{fmt(r.unit_price)}</td><td>{months}</td><td>{fmt(r.gross)}</td><td>{r.discount_type==='percent'?r.discount_value+'%':'Fixed'}<small>−{fmt(r.discount)}</small></td><td><b>{fmt(r.net)}</b></td></tr>)}</tbody></table></div>
 <div className="setu-invoice-totals"><div><span>Subtotal</span><b>{fmt(subtotal)}</b></div><div><span>Discount savings</span><b>−{fmt(savings)}</b></div><div className="setu-invoice-grand"><span>AMOUNT DUE</span><b>{fmt(net)}</b></div><small>{invoice.currency} · Tax not charged in this draft; verify applicable taxes before issue</small></div>
 <div className="setu-invoice-payment"><div><h3>Payment instructions</h3><p>Pay by {invoice.due}. Please include invoice reference <strong>{invoice.invoice_number||'provided when issued'}</strong>.</p></div>{validLink?<a href={invoice.paymentUrl} target="_blank" rel="noopener noreferrer" className="setu-invoice-paylink">Pay invoice securely ↗</a>:<span className="setu-invoice-muted">Wise payment link not attached</span>}</div>
 {invoice.notes&&<div className="setu-invoice-notes"><h3>Additional notes</h3><p>{invoice.notes}</p></div>}
 <div className="setu-invoice-terms"><h3>Subscription terms &amp; conditions</h3>{cleanTerms(invoice.terms).split('\n').filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div>
 <footer className="setu-invoice-footer"><span>SETU Flow · Subscription billing</span><span>Questions? {invoice.sender||'Contact your SETU Flow representative'}</span></footer>
 {children}</section>
}
