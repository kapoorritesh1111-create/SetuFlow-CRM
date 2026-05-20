'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { approveActualOrderLinesGateAction, approveFirstDocumentGateAction, prepareFirstDocumentGateAction } from '@/features/orders/server/execution-order-actions';
import { addManualActualOrderLineAction, saveOrderDiscountAction, updateActualOrderLineAction } from '@/features/orders/server/order-line-actions';
import { approveFinalInvoiceGateAction, prepareFinalInvoiceGateAction, previewFinalInvoiceGateAction } from '@/features/orders/server/dispatch-invoice-gate-actions';
import { approveDeliveryNoteAction, approvePackingOverridesAction, closeOrderAction, savePackingOverridesAction, saveProcessingCheckAction } from '@/features/orders/server/stage-gate-actions';
import { sendOrderDocumentLinkAction } from '@/features/orders/server/share-actions';
import { sendOrderDocumentViaWhatsApp } from '@/features/orders/server/order-whatsapp-delivery';

export type CatalogOrderOption8S = { id: string; label: string; productName: string; variantName?: string | null; skuCode?: string | null; hsnCode?: string | null; pricingType?: string | null; basisLabel: string; fobPrice: number | null; exFactoryPrice: number | null; bulkPrice: number | null; currency: string };
export type OrderLineComparison8S = { id: string; productName: string; quotedQuantity: number | null; actualQuantity: number | null; unitOfMeasure: string | null; unitPrice: number | null; currency: string | null; quotedTotal: number | null; lineTotal: number | null; status: 'unchanged' | 'changed' | 'removed' | 'added' | 'needs_actual_lines'; variantName?: string | null; skuCode?: string | null; hsnCode?: string | null; reason?: string | null; isActual: boolean; pricingBasis?: string | null; lineDiscountType?: string | null; lineDiscountValue?: number | null; lineDiscountReason?: string | null };
export type ProductionOrderGate8S = { id: string; stageKey: string | null; gateType: string | null; status: string | null; approvedAt?: string | null; previewedAt?: string | null; completedAt?: string | null; reason?: string | null };
export type ProductionOrderDocumentSend8X = { id: string; channel: string | null; recipient: string | null; status: string | null; shareUrl?: string | null; sentAt?: string | null; openedAt?: string | null; openCount?: number | null; recipientRole?: string | null };
export type ProductionOrderDocument8W = { id: string; documentType: string | null; status: string | null; sends?: ProductionOrderDocumentSend8X[]; sentAt?: string | null; openedAt?: string | null };
export type ProductionOrder8S = { orderId?: string | null; orderNumber?: string | null; quoteId: string; leadId: string; companyName: string; orderType: 'regional' | 'export'; currency: string | null; actualTotal: number | null; quotedTotal: number | null; currentStage?: string | null; executionState: string; productContext?: string | null; country: string | null; defaultEmailRecipient?: string | null; defaultWhatsappRecipient?: string | null; defaultRecipientRole?: string | null; lines: OrderLineComparison8S[]; documents?: ProductionOrderDocument8W[]; gates?: ProductionOrderGate8S[]; blockerCount: number; nextAction: string; contractId: string | null; status: string; blockerReasons: string[]; documentCount: number; orgCountry: string | null; contactName?: string | null; defaultRecipient?: string | null; approvalState?: string | null; sourceQuoteVersionId?: string | null; acceptedVersionId?: string | null; versionLabel?: string | null; gateCount?: number; pricingBasis?: string | null; orderDiscountType?: string | null; orderDiscountValue?: number | null; orderDiscountReason?: string | null; closeout?: Record<string, unknown> | null };

type Filter = 'all' | 'regional' | 'export';
type ServerAction = (formData: FormData) => void | Promise<void>;

const names = ['Actual Lines', 'Proforma / Confirmation', 'Packing / Rates', 'Processing', 'Delivery Note', 'Final Invoice', 'Paid & Closed'];
const flow = ['actual_lines', 'approval', 'packing', 'processing', 'delivery_note', 'final_invoice', 'closed'] as const;

function orderKey(o: ProductionOrder8S) {
  return o.orderId ?? o.quoteId;
}

function idx(o: ProductionOrder8S) {
  const s = String(o.currentStage ?? o.executionState ?? '').toLowerCase();
  if (['quote_approved', 'actual_lines', 'draft'].includes(s)) return 0;
  if (['first_document', 'order_confirmation', 'proforma_invoice', 'internal_review'].includes(s)) return 1;
  if (['packing_sheet', 'packing_list', 'freight_request'].includes(s)) return 2;
  if (['processing', 'trade_requirements'].includes(s)) return 3;
  if (['shipment_booking', 'delivery_note'].includes(s)) return 4;
  if (['dispatch_invoice', 'final_invoice'].includes(s)) return 5;
  if (['completed', 'closed'].includes(s)) return 6;
  return 0;
}

function dtype(o: ProductionOrder8S, n: number) {
  if (n === 1) return o.orderType === 'export' ? 'proforma_invoice' : 'order_confirmation';
  if (n === 2) return o.orderType === 'export' ? 'packing_list' : 'packing_sheet';
  if (n === 4) return 'delivery_note';
  return 'dispatch_invoice';
}

function dlabel(t: string) {
  return ({ proforma_invoice: 'Proforma Invoice', order_confirmation: 'Order Confirmation', packing_sheet: 'Packing Sheet', packing_list: 'Packing List', delivery_note: 'Delivery Note', dispatch_invoice: 'Final / Commercial Invoice' } as Record<string, string>)[t] ?? t;
}

function normUrl(u?: string | null) {
  const v = String(u ?? '').trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, '')}`;
}

function latest(o: ProductionOrder8S, t: string) {
  return normUrl((o.documents ?? []).filter((d) => d.documentType === t).flatMap((d) => d.sends ?? []).find((s) => s.shareUrl)?.shareUrl);
}

function qty(l: OrderLineComparison8S) {
  return Number(l.actualQuantity ?? l.quotedQuantity ?? 0) || 0;
}

function pack(o: ProductionOrder8S) {
  const units = o.lines.reduce((s, l) => s + qty(l), 0);
  const unitsPerCase = 24;
  const cartons = Math.max(1, Math.ceil(units / unitsPerCase));
  const net = +(units * 0.25).toFixed(2);
  const gross = +(net + cartons * 0.75).toFixed(2);
  return { units, unitsPerCase, cartons, net, gross, cbm: +(cartons * 0.035).toFixed(3), pallets: Math.max(1, Math.ceil(cartons / 40)) };
}

function money(v: number | null, c: string | null) {
  return v == null ? '--' : `${c ?? 'USD'} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function initials(s: string) {
  return s.split(/\s+/).filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'SF';
}

function approvedGate(o: ProductionOrder8S, stageKeys: string[], gateTypes?: string[]) {
  return (o.gates ?? []).some((gate) => {
    const status = String(gate.status ?? '').toLowerCase();
    const stageKey = String(gate.stageKey ?? '');
    const gateType = String(gate.gateType ?? '');
    return status === 'approved' && stageKeys.includes(stageKey) && (!gateTypes?.length || gateTypes.includes(gateType));
  });
}

function documentApproved(o: ProductionOrder8S, documentType: string) {
  return (o.documents ?? []).some((doc) => doc.documentType === documentType && doc.status === 'approved')
    || approvedGate(o, [documentType, 'first_document', 'final_invoice'], [documentType, documentType === 'dispatch_invoice' ? 'final_invoice' : documentType]);
}

function stageAllowed(o: ProductionOrder8S, stage: number) {
  if (stage === 0) return true;
  if (String(o.status).toLowerCase() === 'completed') return true;
  if (stage === 1) return approvedGate(o, ['internal_review'], ['actual_lines']);
  if (stage === 2) return approvedGate(o, ['first_document'], ['proforma_invoice', 'order_confirmation']);
  if (stage === 3) return approvedGate(o, ['packing_sheet'], ['packing_sheet']);
  if (stage === 4) return approvedGate(o, ['processing'], ['pick_pack_qc']);
  if (stage === 5) return approvedGate(o, ['delivery_note'], ['delivery_note']);
  if (stage === 6) return approvedGate(o, ['final_invoice', 'dispatch_invoice'], ['dispatch_invoice', 'final_invoice']);
  return false;
}

function stageBlocker(stage: number) {
  if (stage === 1) return 'Approve actual order lines before preparing Proforma or Order Confirmation.';
  if (stage === 2) return 'Approve the Proforma or Order Confirmation before packing and freight work.';
  if (stage === 3) return 'Approve packing overrides before processing checks.';
  if (stage === 4) return 'Complete Pick / Pack / QC checks before Delivery Note.';
  if (stage === 5) return 'Approve Delivery Note before Final Invoice.';
  if (stage === 6) return 'Approve Final Invoice before Paid & Closed.';
  return 'Previous gate approval is required.';
}

function Btn({ children, tone = '', disabled = false }: { children: React.ReactNode; tone?: string; disabled?: boolean }) {
  return <button className={`r3btn ${tone}`} disabled={disabled}>{children}</button>;
}

function Gate({ action, quoteId, children, type, tone = '', disabled = false }: { action: ServerAction; quoteId: string; children: React.ReactNode; type?: string; tone?: string; disabled?: boolean }) {
  return <form action={action}><input type="hidden" name="quote_id" value={quoteId} />{type ? <input type="hidden" name="document_gate_type" value={type} /> : null}<Btn tone={tone} disabled={disabled}>{children}</Btn></form>;
}

function Preview({ o, t, label, disabled = false }: { o: ProductionOrder8S; t: string; label: string; disabled?: boolean }) {
  const href = latest(o, t);
  // If share URL already exists, open directly in new tab
  if (href) return <a className={`r3btn blue ${disabled ? 'disabled' : ''}`} href={disabled ? undefined : href} target="_blank" rel="noreferrer noopener">{label}</a>;
  // No URL yet — submit form to generate share token; page revalidates and next click uses href path
  return (
    <form action={sendOrderDocumentLinkAction}>
      <input type="hidden" name="order_id" value={o.orderId ?? ''} />
      <input type="hidden" name="quote_id" value={o.quoteId} />
      <input type="hidden" name="document_type" value={t} />
      <input type="hidden" name="channel" value="preview" />
      <input type="hidden" name="preview_only" value="true" />
      <Btn tone="blue" disabled={disabled}>{label}</Btn>
    </form>
  );
}

function Send({ o, t, disabled = false }: { o: ProductionOrder8S; t: string; disabled?: boolean }) {
  const [ch, setCh] = useState<'email' | 'whatsapp'>('email');
  const [r, setR] = useState(o.defaultEmailRecipient ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const openWhatsApp = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendOrderDocumentViaWhatsApp({
          orderId: o.orderId ?? null,
          quoteId: o.quoteId,
          documentType: t,
          recipient: r,
        });
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to open WhatsApp delivery.');
      }
    });
  };

  return (
    <form
      action={sendOrderDocumentLinkAction}
      className="send"
      onSubmit={(event) => {
        if (ch === 'whatsapp') {
          event.preventDefault();
          if (!disabled && !pending) openWhatsApp();
        }
      }}
    >
      <input type="hidden" name="order_id" value={o.orderId ?? ''} />
      <input type="hidden" name="quote_id" value={o.quoteId} />
      <input type="hidden" name="document_type" value={t} />
      <select
        name="channel"
        value={ch}
        disabled={disabled || pending}
        onChange={(e) => {
          const n = e.target.value === 'whatsapp' ? 'whatsapp' : 'email';
          setCh(n);
          setR(n === 'email' ? (o.defaultEmailRecipient ?? '') : (o.defaultWhatsappRecipient ?? ''));
          setError(null);
        }}
      >
        <option value="email">📧 Email approved document</option>
        <option value="whatsapp">💬 WhatsApp approved document</option>
      </select>
      <input
        name="recipient"
        value={r}
        disabled={disabled || pending}
        onChange={(e) => setR(e.target.value)}
        placeholder={ch === 'whatsapp' ? '+1 234 567 8900' : 'buyer@company.com'}
      />
      <input name="recipient_role" defaultValue="buyer" disabled={disabled || pending} />
      <Btn tone="green" disabled={disabled || pending}>
        {pending ? 'Opening WhatsApp...' : ch === 'whatsapp' ? '💬 Send tracked WhatsApp link' : '📧 Send approved document'}
      </Btn>
      {error ? <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>{error}</p> : null}
    </form>
  );
}

export function OrdersProductionWorkspace8S({ orders, catalogOptions = [] }: { orders: ProductionOrder8S[]; catalogOptions?: CatalogOrderOption8S[] }) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [id, setId] = useState(orders[0] ? orderKey(orders[0]) : '');
  const [stage, setStage] = useState<number | null>(null);
  const requestedOpenOrderId = searchParams.get('openOrderId');
  const requestedSourceQuoteId = searchParams.get('sourceQuoteId') ?? searchParams.get('quoteId');
  const list = useMemo(() => orders.filter((o) => (filter === 'all' || o.orderType === filter) && `${o.companyName} ${o.orderNumber ?? ''} ${o.productContext ?? ''}`.toLowerCase().includes(q.toLowerCase())), [orders, filter, q]);
  const requested = useMemo(() => list.find((candidate) => (requestedOpenOrderId && candidate.orderId === requestedOpenOrderId) || (requestedSourceQuoteId && candidate.quoteId === requestedSourceQuoteId)), [list, requestedOpenOrderId, requestedSourceQuoteId]);

  useEffect(() => {
    if (requested) {
      setId(orderKey(requested));
      setStage(null);
    }
  }, [requested?.orderId, requested?.quoteId]);

  const o = list.find((x) => orderKey(x) === id) ?? requested ?? list[0] ?? orders[0];
  if (!o) return <main className="r3"><div>No orders</div><style jsx global>{css}</style></main>;

  const n = stage ?? idx(o);
  const t = dtype(o, n);
  const allowed = stageAllowed(o, n);
  const content = !allowed
    ? <LockedStage stage={n} />
    : n === 0
      ? <Lines o={o} catalogOptions={catalogOptions} />
      : n === 1
        ? <FirstDocument o={o} t={t} />
        : n === 2
          ? <Packing o={o} t={t} />
          : n === 3
            ? <Processing o={o} />
            : n === 4
              ? <DeliveryNote o={o} />
              : n === 5
                ? <FinalInvoice o={o} />
                : <PaidCloseout o={o} />;

  return <main className="r3"><header><div><small>Trade Command Center</small><h1>Orders / Execution Workspace</h1><p>Approved quote to actual lines, document gates, packing, delivery, final invoice, and paid closeout.</p></div><nav>{(['all', 'regional', 'export'] as Filter[]).map((f) => <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'on' : ''}>{f}</button>)}</nav></header><section className="kpis">{['Ready', 'Approval', 'Packing', 'Processing', 'Locked', 'Active'].map((x, ix) => <div className="k" key={x}><span>{x}</span><b>{ix === 5 ? orders.length : ix === 4 ? orders.filter((a) => !stageAllowed(a, Math.min(idx(a) + 1, 6))).length : orders.filter((a) => idx(a) === ix).length}</b></div>)}</section><section className="layout"><aside><b>Order Queue</b><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search buyer, order, product" /><button className="clear" onClick={() => { setQ(''); setFilter('all'); }}>Clear filters</button>{list.map((x) => <button className={`row ${orderKey(x) === orderKey(o) ? 'sel' : ''}`} key={orderKey(x)} onClick={() => { setId(orderKey(x)); setStage(null); }}><span className="avatar">{initials(x.companyName)}</span><span><b>{x.companyName}</b><small>{x.orderType} - {x.productContext ?? 'Order products'} - {names[idx(x)]}</small></span><strong>{money(x.actualTotal ?? x.quotedTotal, x.currency)}</strong></button>)}</aside><section className="work"><article className="open"><div><small>Open order</small><h2>{o.companyName}</h2><p>{o.orderNumber ?? 'Order'} - {names[n]}</p></div><strong>{money(o.actualTotal ?? o.quotedTotal, o.currency)}</strong></article><nav className="flow">{flow.map((_, ix) => { const isAllowed = stageAllowed(o, ix); return <button key={ix} disabled={!isAllowed} className={`${ix === n ? 'active' : ix < idx(o) ? 'done' : ''} ${!isAllowed ? 'locked' : ''}`} onClick={() => { if (isAllowed) setStage(ix); }}><b>{names[ix]}</b><span>{isAllowed ? ix < idx(o) ? 'Done' : 'Open' : 'Locked'}</span></button>; })}</nav>{content}</section></section><style jsx global>{css}</style></main>;
}

function LockedStage({ stage }: { stage: number }) {
  return <article className="card lockedcard"><h2>{names[stage]} locked</h2><p>{stageBlocker(stage)}</p></article>;
}

function Lines({ o, catalogOptions }: { o: ProductionOrder8S; catalogOptions: CatalogOrderOption8S[] }) {
  return <article className="card"><h2>Edit actual order before Proforma / Order Confirmation</h2><p>Add catalog items, change quantities, apply line discounts, and save order-level discount before approval.</p>{o.lines.map((l) => <form action={updateActualOrderLineAction} className="lineform" key={l.id}><input type="hidden" name="quote_id" value={o.quoteId} /><input type="hidden" name="order_line_id" value={l.id} /><input value={l.productName} readOnly /><input name="ordered_quantity" defaultValue={qty(l)} disabled={!l.isActual} /><input name="unit_price" defaultValue={l.unitPrice ?? ''} disabled={!l.isActual} /><select name="line_discount_type" defaultValue={l.lineDiscountType ?? 'none'} disabled={!l.isActual}><option value="none">No discount</option><option value="percent">Discount %</option><option value="amount">Discount amount</option></select><input name="line_discount_value" defaultValue={l.lineDiscountValue ?? ''} placeholder="Discount" disabled={!l.isActual} /><input name="line_discount_reason" defaultValue={l.lineDiscountReason ?? l.reason ?? ''} placeholder="Reason" disabled={!l.isActual} /><Btn disabled={!l.isActual}>Save line</Btn></form>)}<form action={addManualActualOrderLineAction} className="grid2"><input type="hidden" name="quote_id" value={o.quoteId} /><select name="catalog_pricing_rule_id"><option value="">Add catalog product...</option>{catalogOptions.slice(0, 30).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select><input name="ordered_quantity" placeholder="Qty" /><input name="unit_price" placeholder="Override price" /><input name="change_reason" placeholder="Why this line was added" /><Btn tone="blue">Add actual line</Btn></form><form action={saveOrderDiscountAction} className="grid2"><input type="hidden" name="quote_id" value={o.quoteId} /><select name="order_discount_type" defaultValue={o.orderDiscountType ?? 'none'}><option value="none">No total discount</option><option value="percent">Total discount %</option><option value="amount">Total discount amount</option></select><input name="order_discount_value" defaultValue={o.orderDiscountValue ?? ''} placeholder="Discount" /><input name="order_discount_reason" defaultValue={o.orderDiscountReason ?? ''} placeholder="Reason" /><Btn>Save total discount</Btn></form><div className="actions"><Gate action={approveActualOrderLinesGateAction} quoteId={o.quoteId} tone="green">Approve actual lines</Gate></div></article>;
}

function FirstDocument({ o, t }: { o: ProductionOrder8S; t: string }) {
  const canSend = documentApproved(o, t);
  return <article className="card"><h2>Preview and approve {dlabel(t)}</h2><div className="actions"><Gate action={prepareFirstDocumentGateAction} quoteId={o.quoteId} type={t}>Prepare draft</Gate><Preview o={o} t={t} label={`Preview ${dlabel(t)}`} /><Gate action={approveFirstDocumentGateAction} quoteId={o.quoteId} type={t} tone="green">Approve {dlabel(t)}</Gate></div><Send o={o} t={t} disabled={!canSend} />{!canSend ? <p className="note">Sending is locked until this document is explicitly approved.</p> : null}<Tray o={o} t={t} /></article>;
}

function Packing({ o, t }: { o: ProductionOrder8S; t: string }) {
  const p = pack(o);
  return <article className="card"><h2>{o.orderType === 'export' ? 'Export packing list + freight request' : 'Regional packing sheet + freight request'}</h2><p>AI assist values are prefilled from ordered quantities. Save overrides before approval.</p><form action={savePackingOverridesAction} className="pack"><input type="hidden" name="quote_id" value={o.quoteId} />{Object.entries({ cartons: p.cartons, pallets: p.pallets, net_weight_kg: p.net, gross_weight_kg: p.gross, cbm: p.cbm, pickup: '', freight_notes: '' }).map(([k, v]) => <label key={k}>{k.replaceAll('_', ' ')}<input name={k} defaultValue={v} /></label>)}<Btn>Save packing overrides</Btn></form><div className="actions"><Preview o={o} t={t} label={`Preview ${dlabel(t)}`} /><Gate action={approvePackingOverridesAction} quoteId={o.quoteId} tone="green">Approve packing</Gate></div><Tray o={o} t={t} /></article>;
}

function Processing({ o }: { o: ProductionOrder8S }) {
  return <article className="card"><h2>Processing / logistics checks</h2><p>Pick, pack, and QC checks must all be confirmed before Delivery Note unlocks.</p><form action={saveProcessingCheckAction} className="checks"><input type="hidden" name="quote_id" value={o.quoteId} /><label><input type="checkbox" name="picked" />Picked</label><label><input type="checkbox" name="packed" />Packed</label><label><input type="checkbox" name="qc_passed" />QC passed</label><input name="processing_note" placeholder="Processing note" /><Btn tone="green">Save / approve processing checks</Btn></form></article>;
}

function DeliveryNote({ o }: { o: ProductionOrder8S }) {
  const t = 'delivery_note';
  const canSend = documentApproved(o, t);
  return <article className="card"><h2>Delivery Note</h2><div className="actions"><Preview o={o} t={t} label="Preview Delivery Note" /><form action={approveDeliveryNoteAction} className="actions-inline"><input type="hidden" name="quote_id" value={o.quoteId} /><input name="delivery_reference" placeholder="Delivery reference" /><Btn tone="green">Approve Delivery Note</Btn></form></div><Send o={o} t={t} disabled={!canSend} />{!canSend ? <p className="note">Sending is locked until Delivery Note is approved.</p> : null}<Tray o={o} t={t} /></article>;
}

function FinalInvoice({ o }: { o: ProductionOrder8S }) {
  const t = 'dispatch_invoice';
  const canSend = documentApproved(o, t);
  return <article className="card"><h2>Final Invoice</h2><div className="actions"><Gate action={prepareFinalInvoiceGateAction} quoteId={o.quoteId}>Prepare final invoice</Gate><Gate action={previewFinalInvoiceGateAction} quoteId={o.quoteId}>Preview gate</Gate><Preview o={o} t={t} label="Preview Final Invoice" /><Gate action={approveFinalInvoiceGateAction} quoteId={o.quoteId} tone="green">Approve Final Invoice</Gate></div><Send o={o} t={t} disabled={!canSend} />{!canSend ? <p className="note">Sending is locked until Final Invoice is approved.</p> : null}<Tray o={o} t={t} /></article>;
}

function PaidCloseout({ o }: { o: ProductionOrder8S }) {
  return <article className="card"><h2>Paid & Closed</h2><p>Complete closeout only after payment, reconciliation, receipt acknowledgement, archive, and audit notes are ready.</p><form action={closeOrderAction} className="closeout"><input type="hidden" name="quote_id" value={o.quoteId} /><label><input type="checkbox" name="payment_received" />Payment received</label><input name="payment_reference" placeholder="Payment reference / receipt number" /><label>Reconciliation<select name="reconciliation_status" defaultValue="pending"><option value="pending">Pending</option><option value="reconciled">Reconciled</option></select></label><input name="outstanding_amount" placeholder="Outstanding amount" defaultValue="0" /><label><input type="checkbox" name="receipt_acknowledged" />Receipt / acknowledgement sent</label><label><input type="checkbox" name="documents_archived" />Documents archived</label><textarea name="activity_note" placeholder="Audit / activity note" /><Btn tone="green">Close order</Btn></form></article>;
}

function Tray({ o, t }: { o: ProductionOrder8S; t: string }) {
  const docs = o.documents?.length ? o.documents : [{ id: 'planned', documentType: t, status: 'planned', sends: [] as ProductionOrderDocumentSend8X[] }];
  return <div className="tray"><b>Document tray</b>{docs.map((d) => <div className="doc" key={d.id}><strong>{dlabel(String(d.documentType ?? t))}</strong><span>{d.status ?? 'planned'}</span><Preview o={o} t={String(d.documentType ?? t)} label={`${o.orderNumber ?? 'Order'} review link`} />{d.sends?.map((s) => { const href = normUrl(s.shareUrl); const isWa = s.channel === 'whatsapp'; return <p key={s.id} style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}}><span style={{fontSize:'10px',background:isWa?'#dcfce7':'#dbeafe',color:isWa?'#166534':'#1d4ed8',borderRadius:'4px',padding:'1px 7px',fontWeight:700}}>{isWa ? '💬 WhatsApp' : '📧 Email'}</span><span style={{fontSize:'11px',color:'#64748b'}}>link</span>{href ? <a href={href} target="_blank" rel="noreferrer noopener" style={{fontSize:'11px',fontWeight:600,color:'#2563eb',textDecoration:'underline'}}>Open ↗</a> : <span style={{fontSize:'11px',color:'#94a3b8'}}>pending</span>}{s.openCount ? <span style={{fontSize:'10px',color:'#10b981',fontWeight:700}}>{s.openCount} open{s.openCount !== 1?'s':''}</span> : null}</p>; })}</div>)}</div>;
}

const css = `.r3{background:#eef4f8;min-height:100vh;padding:22px;font-family:Inter,system-ui;color:#09243b}.r3 header,.card,aside,.open,.k{background:#fff;border:1px solid #d7e5f0;border-radius:22px;box-shadow:0 14px 34px #0f172a10}.r3 header{display:flex;justify-content:space-between;padding:18px;margin-bottom:14px}.r3 h1,.r3 h2{margin:0;color:#082f49}.r3 p,small{color:#64748b}.r3 nav button{border:0;border-radius:999px;padding:8px 12px;background:#f8fafc}.r3 nav .on{background:#082f49;color:white}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px}.k{padding:12px;border-top:4px solid #0c7fff}.k span{text-transform:uppercase;font-size:9px;font-weight:900;color:#7c8da3}.k b{display:block;text-align:right;font-size:24px}.layout{display:grid;grid-template-columns:390px 1fr;gap:14px}aside{padding:14px;overflow:hidden}aside input{width:100%;box-sizing:border-box;border:1px solid #d7e5f0;border-radius:999px;padding:11px;margin:12px 0}.clear{border:1px solid #d7e5f0;border-radius:999px;background:white;padding:8px 10px;margin-bottom:10px}.row{width:100%;display:grid;grid-template-columns:34px 1fr auto;gap:10px;border:0;border-top:1px solid #edf2f7;background:white;text-align:left;padding:12px 0}.row.sel{background:#f7fbff}.avatar{width:34px;height:34px;border-radius:12px;background:#147df5;color:white;display:grid;place-items:center;font-weight:900}.row small{display:block;font-size:10px}.work{display:grid;gap:14px}.open{display:flex;justify-content:space-between;padding:16px 18px}.flow{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;background:white;border:1px solid #d7e5f0;border-radius:20px;padding:12px}.flow button{border:1px solid #d7e5f0;border-radius:13px;background:white;min-height:62px;display:grid;gap:4px;place-items:center}.flow button span{font-size:9px;color:#64748b}.flow .active{background:#eff6ff;border-color:#93c5fd}.flow .done{background:#ecfdf5}.flow .locked{background:#f8fafc;color:#94a3b8;cursor:not-allowed}.card{padding:18px}.lockedcard{border-style:dashed;background:#f8fafc}.lineform{display:grid;grid-template-columns:1.2fr 90px 110px 130px 110px 1fr auto;gap:8px;margin-top:8px}.grid2,.pack,.checks,.closeout{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.closeout textarea{min-height:74px;grid-column:1/-1}.lineform input,.lineform select,.grid2 input,.grid2 select,.pack input,.send input,.send select,.checks input,.checks select,.closeout input,.closeout select,.closeout textarea,.actions-inline input{border:1px solid #d7e5f0;border-radius:10px;padding:9px}.pack label,.checks label,.closeout label{text-transform:uppercase;font-size:10px;font-weight:900;color:#64748b}.pack input{display:block;width:100%;box-sizing:border-box;margin-top:4px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.actions-inline{display:flex;gap:8px;flex-wrap:wrap}.r3btn{border:1px solid #cfe0ea;background:white;border-radius:999px;padding:9px 13px;font-weight:900;color:#1d4ed8;text-decoration:none}.r3btn:disabled,.r3btn.disabled{opacity:.45;cursor:not-allowed}.r3btn.primary{background:#082f49;color:white}.r3btn.green{background:#ecfdf5;color:#047857}.r3btn.blue{background:#eff6ff}.send{display:grid;grid-template-columns:180px 1fr 100px auto;gap:8px;margin-top:12px}.note{font-size:12px}.tray{border:1px solid #d7e5f0;background:#f8fbfd;border-radius:16px;padding:14px;margin-top:14px}.doc{background:white;border:1px solid #d7e5f0;border-radius:14px;padding:10px;margin-top:8px;display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center}@media(max-width:1320px){.layout,.kpis,.flow,.lineform,.grid2,.pack,.send,.checks,.closeout{grid-template-columns:1fr}.doc{grid-template-columns:1fr}}`;