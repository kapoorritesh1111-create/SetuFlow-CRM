'use client';

import { useMemo, useState } from 'react';
import { prepareActualOrderLinesRobustAction } from '@/features/orders/server/actual-order-line-seed-actions';
import { approveActualOrderLinesGateAction, approveFirstDocumentGateAction, prepareFirstDocumentGateAction, previewFirstDocumentGateAction } from '@/features/orders/server/execution-order-actions';
import { addManualActualOrderLineAction, removeActualOrderLineAction, updateActualOrderLineAction } from '@/features/orders/server/order-line-actions';
import { sendOrderDocumentLinkAction } from '@/features/orders/server/share-actions';

export type CatalogOrderOption8S = {
  id: string;
  label: string;
  productName: string;
  variantName?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  pricingType?: string | null;
  basisLabel: string;
  fobPrice: number | null;
  exFactoryPrice: number | null;
  bulkPrice: number | null;
  currency: string;
};

export type OrderLineComparison8S = {
  id: string;
  productName: string;
  variantName?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  quotedQuantity: number | null;
  actualQuantity: number | null;
  unitOfMeasure: string | null;
  unitPrice: number | null;
  currency: string | null;
  quotedTotal: number | null;
  lineTotal: number | null;
  status: 'unchanged' | 'changed' | 'removed' | 'added' | 'needs_actual_lines';
  reason?: string | null;
  isActual: boolean;
  pricingBasis?: string | null;
};

export type ProductionOrderDocumentSend8X = {
  id: string;
  channel: string | null;
  recipient: string | null;
  recipientRole?: string | null;
  status: string | null;
  shareUrl?: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  openCount?: number | null;
};

export type ProductionOrderDocument8W = {
  id: string;
  documentType: string | null;
  status: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  sends?: ProductionOrderDocumentSend8X[];
};

export type ProductionOrder8S = {
  orderId?: string | null;
  quoteId: string;
  leadId: string;
  contractId: string | null;
  companyName: string;
  contactName?: string | null;
  defaultRecipient?: string | null;
  defaultRecipientRole?: string | null;
  country: string | null;
  orgCountry: string | null;
  orderType: 'regional' | 'export';
  currency: string | null;
  quotedTotal: number | null;
  actualTotal: number | null;
  status: string;
  executionState: string;
  currentStage?: string | null;
  approvalState?: string | null;
  sourceQuoteVersionId?: string | null;
  acceptedVersionId?: string | null;
  versionLabel?: string | null;
  documentCount: number;
  gateCount?: number;
  blockerCount: number;
  blockerReasons: string[];
  nextAction: string;
  lines: OrderLineComparison8S[];
  pricingBasis?: string | null;
  documents?: ProductionOrderDocument8W[];
};

type Filter = 'all' | 'regional' | 'export';
type UiStage = 'quote' | 'approval' | 'packing' | 'processing' | 'logistics' | 'invoice' | 'closed';

const STAGES: Array<{ key: UiStage; label: string; regional: string; export: string; regionalType: string; exportType: string }> = [
  { key: 'quote', label: 'Quote Approved', regional: 'Actual lines', export: 'Actual proforma lines', regionalType: 'order_confirmation', exportType: 'proforma_invoice' },
  { key: 'approval', label: 'Internal Approval', regional: 'Order Confirmation', export: 'Proforma Invoice', regionalType: 'order_confirmation', exportType: 'proforma_invoice' },
  { key: 'packing', label: 'Packing / Freight', regional: 'Packing Sheet', export: 'Export Packing List', regionalType: 'packing_sheet', exportType: 'packing_list' },
  { key: 'processing', label: 'Processing', regional: 'Pick-Pack-QC', export: 'Packing List', regionalType: 'packing_sheet', exportType: 'packing_list' },
  { key: 'logistics', label: 'Logistics', regional: 'Delivery Note', export: 'Freight Request', regionalType: 'delivery_note', exportType: 'freight_request' },
  { key: 'invoice', label: 'Dispatch / Invoice', regional: 'Final Invoice', export: 'Commercial Invoice', regionalType: 'dispatch_invoice', exportType: 'dispatch_invoice' },
  { key: 'closed', label: 'Paid & Closed', regional: 'Receipt / archive', export: 'Receipt / archive', regionalType: 'dispatch_invoice', exportType: 'dispatch_invoice' },
];

const STAGE_MAP: Record<string, UiStage> = {
  quote_approved: 'quote',
  actual_lines: 'quote',
  order_confirmation: 'approval',
  proforma_invoice: 'approval',
  packing_sheet: 'packing',
  freight_request: 'packing',
  trade_requirements: 'processing',
  shipment_booking: 'logistics',
  dispatch_invoice: 'invoice',
  completed: 'closed',
};

function fmt(value: number | null, currency: string | null) {
  return value == null ? '—' : `${currency ?? 'USD'} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Review';
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SF';
}

function uiStageIndexFor(order: ProductionOrder8S) {
  const mapped = STAGE_MAP[String(order.currentStage ?? order.executionState ?? '').toLowerCase()] ?? 'quote';
  return Math.max(0, STAGES.findIndex((stage) => stage.key === mapped));
}

function documentTypeFor(order: ProductionOrder8S, stage: UiStage) {
  const match = STAGES.find((item) => item.key === stage) ?? STAGES[1];
  return order.orderType === 'export' ? match.exportType : match.regionalType;
}

function docLabel(type: string | null | undefined) {
  const value = String(type ?? 'order_confirmation');
  if (value === 'proforma_invoice') return 'Proforma Invoice';
  if (value === 'dispatch_invoice') return 'Dispatch / Commercial Invoice';
  if (value === 'packing_sheet') return 'Packing Sheet';
  if (value === 'packing_list') return 'Packing List';
  if (value === 'delivery_note') return 'Delivery Note';
  if (value === 'freight_request') return 'Freight Request';
  return titleCase(value);
}

function latestPreviewUrl(order: ProductionOrder8S, type: string) {
  return (order.documents ?? [])
    .filter((doc) => String(doc.documentType ?? '') === type)
    .flatMap((doc) => doc.sends ?? [])
    .find((send) => Boolean(send.shareUrl))?.shareUrl ?? null;
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sf81-pill ${tone}`}>{children}</span>;
}

function Button({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <button type="button" className={`sf81-btn ${tone}`}>{children}</button>;
}

function Submit({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <button className={`sf81-btn ${tone}`}>{children}</button>;
}

function PreviewDocumentGate({ order, documentType, label = 'Preview / PDF' }: { order: ProductionOrder8S; documentType: string; label?: string }) {
  const existingUrl = latestPreviewUrl(order, documentType);
  if (existingUrl) return <a className="sf81-btn blue" href={existingUrl} target="_blank" rel="noreferrer">{label}</a>;
  return <form action={sendOrderDocumentLinkAction}>
    <input type="hidden" name="order_id" value={order.orderId ?? ''} />
    <input type="hidden" name="quote_id" value={order.quoteId} />
    <input type="hidden" name="document_type" value={documentType} />
    <input type="hidden" name="channel" value="preview" />
    <input type="hidden" name="preview_only" value="true" />
    <Submit tone="blue">{label}</Submit>
  </form>;
}

function SendDocumentGate({ order, documentType }: { order: ProductionOrder8S; documentType: string }) {
  const defaultRecipient = order.defaultRecipient ?? '';
  return <form action={sendOrderDocumentLinkAction} className="sf81-send">
    <input type="hidden" name="order_id" value={order.orderId ?? ''} />
    <input type="hidden" name="quote_id" value={order.quoteId} />
    <input type="hidden" name="document_type" value={documentType} />
    <select name="channel" defaultValue="email" aria-label="Send channel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select>
    <input name="recipient" defaultValue={defaultRecipient} placeholder={defaultRecipient ? 'Recipient email / WhatsApp' : 'No lead contact found - add recipient'} />
    <input name="recipient_role" defaultValue={order.defaultRecipientRole ?? (defaultRecipient ? 'buyer' : '')} placeholder="Role: buyer, finance, logistics" />
    <input name="note" placeholder="Optional note / extra recipient context" />
    <Submit tone="green">Create tracked send</Submit>
  </form>;
}

function Gate({ action, quoteId, children, tone = '', extra }: { action: (formData: FormData) => Promise<void>; quoteId: string; children: string; tone?: string; extra?: Record<string, string> }) {
  return <form action={action}><input type="hidden" name="quote_id" value={quoteId} />{extra && Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}<Submit tone={tone}>{children}</Submit></form>;
}

export function OrdersProductionWorkspace8S({ orders, catalogOptions = [] }: { orders: ProductionOrder8S[]; catalogOptions?: CatalogOrderOption8S[] }) {
  const [selectedId, setSelectedId] = useState(orders[0]?.orderId ?? orders[0]?.quoteId ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [stageIndex, setStageIndex] = useState<number | null>(null);
  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.orderType === filter), [orders, filter]);
  const selected = useMemo(() => visible.find((order) => (order.orderId ?? order.quoteId) === selectedId) ?? visible[0] ?? orders[0] ?? null, [visible, selectedId, orders]);
  const activeStageIndex = selected ? (stageIndex ?? uiStageIndexFor(selected)) : 0;
  const activeStage = STAGES[activeStageIndex] ?? STAGES[0];
  const totalLinks = orders.reduce((sum, order) => sum + (order.documents ?? []).reduce((inner, doc) => inner + (doc.sends?.length ?? 0), 0), 0);

  if (!selected) return <main className="sf81"><div className="sf81-empty">No accepted execution orders yet.</div><style jsx global>{styles}</style></main>;

  const documentType = documentTypeFor(selected, activeStage.key);

  return <main className="sf81">
    <header className="sf81-top"><div><small>Sprint 8.1A Orders CTA fix</small><h1>Orders / Execution Workspace</h1><p>Preview opens tracked PDF preview. Send defaults from lead contact and allows another recipient.</p></div><div className="sf81-actions"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div></header>
    <section className="sf81-kpis"><Kpi label="Orders" value={orders.length} mini="Structured orders" tone="blue" /><Kpi label="Tracked links" value={totalLinks} mini="Preview/send history" tone="purple" /><Kpi label="Open order" value={selected.companyName} mini={selected.defaultRecipient ? `Default contact: ${selected.defaultRecipient}` : 'No lead contact'} tone="green" /></section>
    <section className="sf81-layout">
      <aside className="sf81-queue"><div className="sf81-queue-head"><span>Order queue</span><Pill tone="blue">{visible.length}</Pill></div><div className="sf81-list">{visible.map((order) => {
        const key = order.orderId ?? order.quoteId;
        const rowStage = uiStageIndexFor(order);
        const links = (order.documents ?? []).reduce((sum, doc) => sum + (doc.sends?.length ?? 0), 0);
        return <button key={key} className={`sf81-row ${key === (selected.orderId ?? selected.quoteId) ? 'selected' : ''}`} onClick={() => { setSelectedId(key); setStageIndex(null); }}><span className="sf81-avatar">{initials(order.companyName)}</span><span><strong>{order.companyName}</strong><small>{order.orderType} · {STAGES[rowStage]?.label ?? 'Stage'} · {links} links</small><em>{order.defaultRecipient ? `Default contact: ${order.defaultRecipient}` : 'No lead contact found'}</em></span><b>{fmt(order.actualTotal ?? order.quotedTotal, order.currency)}</b></button>;
      })}</div></aside>
      <section className="sf81-workspace">
        <article className="sf81-summary"><div><small>Open order · {selected.orderType}</small><h2>{selected.companyName}</h2><p>{selected.nextAction}. Source: {selected.versionLabel ?? selected.sourceQuoteVersionId ?? 'accepted quote version'}.</p></div><div className="sf81-value"><strong>{fmt(selected.actualTotal ?? selected.quotedTotal, selected.currency)}</strong><span>{selected.defaultRecipient ? `Default send: ${selected.defaultRecipient}` : 'Add recipient before sending'}</span></div></article>
        <nav className="sf81-flow">{STAGES.map((stage, index) => <button key={stage.key} type="button" onClick={() => setStageIndex(index)} className={`${index < activeStageIndex ? 'done' : ''} ${index === activeStageIndex ? 'active' : ''}`}><strong>{stage.label}</strong><span>{selected.orderType === 'export' ? stage.export : stage.regional}</span></button>)}</nav>
        {activeStage.key === 'quote' ? <LinesPanel order={selected} catalogOptions={catalogOptions} /> : <DocumentPanel order={selected} documentType={documentType} stage={activeStage.label} />}
      </section>
    </section><style jsx global>{styles}</style>
  </main>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`sf81-btn ${active ? 'primary' : ''}`}>{children}</button>; }
function Kpi({ label, value, mini, tone }: { label: string; value: string | number; mini: string; tone: string }) { return <div className={`sf81-kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{mini}</small></div>; }

function LinesPanel({ order, catalogOptions }: { order: ProductionOrder8S; catalogOptions: CatalogOrderOption8S[] }) {
  return <article className="sf81-panel"><header><div><small>Quote Approved</small><h2>Confirm actual buyer order lines</h2></div><Pill tone="blue">Quote history untouched</Pill></header><p className="sf81-copy">Quote approval does not mean every quoted item becomes the order. Confirm actual lines before documents.</p><div className="sf81-lines">{order.lines.map((line) => <div className="sf81-line" key={line.id}><span><strong>{line.productName}</strong><small>{line.variantName || line.skuCode || line.hsnCode || 'Line item'}</small></span><span>{line.quotedQuantity ?? '—'}<small>Quoted</small></span><form action={updateActualOrderLineAction} className="sf81-edit"><input type="hidden" name="quote_id" value={order.quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><input name="ordered_quantity" defaultValue={line.actualQuantity ?? line.quotedQuantity ?? 0} /><input name="unit_price" defaultValue={line.unitPrice ?? ''} /><input name="change_reason" defaultValue={line.reason ?? ''} placeholder="Reason" /><Submit tone="blue">Save</Submit></form><span><Pill tone={line.status === 'unchanged' ? 'green' : 'amber'}>{line.status.replace(/_/g, ' ')}</Pill><small>{fmt(line.lineTotal, order.currency)}</small></span>{line.isActual ? <form action={removeActualOrderLineAction}><input type="hidden" name="quote_id" value={order.quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><Submit>Remove</Submit></form> : <small>Prepare first</small>}</div>)}</div><form action={addManualActualOrderLineAction} className="sf81-add"><input type="hidden" name="quote_id" value={order.quoteId} /><input type="hidden" name="pricing_basis" value={order.pricingBasis ?? 'FOB'} /><select name="catalog_pricing_rule_id"><option value="">Select catalog product</option>{catalogOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="ordered_quantity" placeholder="Qty" /><input name="change_reason" placeholder="Reason" /><Submit tone="primary">Add line</Submit></form><div className="sf81-actions"><Gate action={prepareActualOrderLinesRobustAction} quoteId={order.quoteId} tone="primary">Prepare actual lines</Gate><Gate action={approveActualOrderLinesGateAction} quoteId={order.quoteId} tone="green">Approve actual lines</Gate></div></article>;
}

function DocumentPanel({ order, documentType, stage }: { order: ProductionOrder8S; documentType: string; stage: string }) {
  return <article className="sf81-panel"><header><div><small>{stage}</small><h2>{docLabel(documentType)}</h2><p>Preview opens or creates a tracked PDF preview link. Send tracked defaults to lead contact info.</p></div><Pill tone="blue">{order.orderType}</Pill></header><div className="sf81-doc-grid"><section className="sf81-work"><div className="sf81-checks"><h3>Required behavior</h3><p>Completed stages stay clickable. Preview can be opened anytime. Send tracked can be repeated to the buyer or another stakeholder.</p><ul><li>Preview creates a preview-only link if none exists.</li><li>Email/WhatsApp creates a tracked send record.</li><li>No external delivery is claimed until a real transport adapter is added.</li></ul></div><div className="sf81-actions"><Gate action={prepareFirstDocumentGateAction} quoteId={order.quoteId} extra={{ document_gate_type: documentType }}>Prepare</Gate><Gate action={previewFirstDocumentGateAction} quoteId={order.quoteId} tone="blue" extra={{ document_gate_type: documentType }}>Mark previewed</Gate><Gate action={approveFirstDocumentGateAction} quoteId={order.quoteId} tone="green" extra={{ document_gate_type: documentType }}>Approve</Gate><PreviewDocumentGate order={order} documentType={documentType} /></div><div className="sf81-send-box"><strong>Send tracked by email/WhatsApp</strong><p>{order.defaultRecipient ? `Default lead contact: ${order.defaultRecipient}` : 'No email/WhatsApp/phone found on the lead. Add a recipient manually.'}</p><SendDocumentGate order={order} documentType={documentType} /></div></section><DocumentTray order={order} highlightType={documentType} /></div></article>;
}

function DocumentTray({ order, highlightType }: { order: ProductionOrder8S; highlightType: string }) {
  const docs = order.documents?.length ? order.documents : [{ id: 'planned', documentType: highlightType, status: 'planned', sends: [] }];
  return <aside className="sf81-tray"><h3>Document tray</h3><p>Open preview/PDF links and review send/open history.</p>{docs.map((doc) => <div className={`sf81-doc ${doc.documentType === highlightType ? 'active' : ''}`} key={doc.id}><div><strong>{docLabel(doc.documentType)}</strong><small>{titleCase(doc.status)}{doc.sentAt ? ' · Sent' : ''}{doc.openedAt ? ' · Opened' : ''}</small></div><div className="sf81-actions"><PreviewDocumentGate order={order} documentType={String(doc.documentType ?? highlightType)} label="Open PDF" /><Button>History</Button></div>{doc.sends?.length ? <div className="sf81-sends">{doc.sends.slice(0, 6).map((send) => <div className="sf81-send-row" key={send.id}><span>{titleCase(send.status)} · {send.channel ?? 'preview'} → {send.recipient || send.recipientRole || 'internal preview'}</span><em>{send.openCount ? `${send.openCount} opens` : 'not opened'}</em>{send.shareUrl ? <a href={send.shareUrl} target="_blank" rel="noreferrer">Open</a> : null}</div>)}</div> : <div className="sf81-no-send">No preview/send link yet. Click Preview / PDF.</div>}</div>)}</aside>;
}

const styles = `.sf81{background:#eef4f8;min-height:100vh;padding:22px 26px 80px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.sf81-top,.sf81-queue,.sf81-summary,.sf81-panel{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12}.sf81-top{padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin-bottom:14px}.sf81-top small,.sf81-summary small,.sf81-panel small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf81-top h1,.sf81-summary h2,.sf81-panel h2{margin:0;color:#082f49;letter-spacing:-.04em}.sf81-top p,.sf81-summary p,.sf81-panel p,.sf81-copy,.sf81-tray p,.sf81-send-box p{color:#64748b;font-size:12px;line-height:1.5;margin:5px 0 0}.sf81-actions,.sf81-filter{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sf81-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #dbe7f3;background:white;color:#334155;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:850;cursor:pointer}.sf81-btn.primary{background:#082f49;border-color:#082f49;color:white}.sf81-btn.blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf81-btn.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf81-pill{border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:5px 9px;color:#475569;font-size:10px;font-weight:900;white-space:nowrap}.sf81-pill.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf81-pill.blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf81-pill.amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf81-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}.sf81-kpi{background:white;border:1px solid #dbe7f3;border-radius:18px;border-top:4px solid #cbd5e1;padding:12px;min-height:78px}.sf81-kpi.blue{border-top-color:#0c7fff}.sf81-kpi.green{border-top-color:#059669}.sf81-kpi.purple{border-top-color:#7c3aed}.sf81-kpi span{font-size:9px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.13em}.sf81-kpi strong{display:block;font-size:20px;margin-top:7px;color:#082f49;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sf81-kpi small{display:block;color:#64748b;font-size:10px;margin-top:5px}.sf81-layout{display:grid;grid-template-columns:390px 1fr;gap:14px;align-items:start}.sf81-queue{overflow:hidden;position:sticky;top:14px}.sf81-queue-head{padding:15px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px}.sf81-queue-head span{font-size:10px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.14em}.sf81-list{display:grid;max-height:calc(100vh - 230px);overflow:auto}.sf81-row{display:grid;grid-template-columns:34px 1fr auto;gap:10px;border:0;border-bottom:1px solid #edf2f7;background:white;text-align:left;padding:12px 14px;cursor:pointer;align-items:start}.sf81-row:hover,.sf81-row.selected{background:#f8fbff}.sf81-row.selected{box-shadow:inset 3px 0 0 #0c7fff}.sf81-avatar{width:34px;height:34px;border-radius:12px;background:#0c7fff;color:white;display:grid;place-items:center;font-weight:950}.sf81-row strong{display:block;color:#082f49;font-size:14px}.sf81-row small,.sf81-row em{display:block;color:#64748b;font-size:10px;margin-top:3px;font-style:normal}.sf81-row b{text-align:right;color:#082f49;font-size:12px}.sf81-workspace{display:grid;gap:14px}.sf81-summary{padding:16px 18px;display:grid;grid-template-columns:1fr auto;gap:14px}.sf81-value{text-align:right;color:#082f49}.sf81-value strong{display:block;font-size:20px}.sf81-value span{display:block;color:#94a3b8;font-size:10px}.sf81-flow{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12;padding:12px 18px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.sf81-flow button{border:1px solid #e2e8f0;background:white;border-radius:13px;padding:8px;min-height:62px;cursor:pointer}.sf81-flow button.done{background:#ecfdf5;border-color:#a7f3d0}.sf81-flow button.active{background:#eff6ff;border-color:#93c5fd;box-shadow:0 0 0 3px #0c7fff14}.sf81-flow strong{font-size:10px;color:#082f49;display:block}.sf81-flow span{font-size:9px;color:#64748b;display:block;margin-top:4px}.sf81-panel{overflow:hidden;padding:18px}.sf81-panel header{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:14px}.sf81-doc-grid{display:grid;grid-template-columns:1fr 410px;gap:14px;align-items:start}.sf81-checks,.sf81-tray,.sf81-send-box{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:14px}.sf81-checks h3,.sf81-tray h3{margin:0 0 8px;color:#082f49}.sf81-checks ul{margin:10px 0 0;padding-left:18px;color:#475569;font-size:12px;line-height:1.7}.sf81-send{display:grid;grid-template-columns:100px 1fr 1fr 1fr auto;gap:8px;margin-top:10px}.sf81-send input,.sf81-send select,.sf81-edit input,.sf81-add input,.sf81-add select{border:1px solid #dbe7f3;border-radius:10px;background:white;font-size:11px;font-weight:750;padding:8px;min-width:0}.sf81-lines{display:grid;gap:8px}.sf81-line{display:grid;grid-template-columns:1fr .35fr 1.25fr .5fr .35fr;gap:8px;align-items:center;border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px}.sf81-line strong{color:#082f49;font-size:12px}.sf81-line small{display:block;color:#64748b;font-size:10px;margin-top:2px}.sf81-edit{display:grid;grid-template-columns:65px 80px 1fr auto;gap:6px}.sf81-add{display:grid;grid-template-columns:1fr 70px 1fr auto;gap:8px;margin-top:10px}.sf81-doc{border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px;display:grid;gap:8px;margin-top:8px}.sf81-doc.active{box-shadow:inset 3px 0 0 #0c7fff}.sf81-doc strong{color:#082f49;font-size:12px}.sf81-doc small{display:block;color:#64748b;font-size:10px;margin-top:3px}.sf81-sends{display:grid;gap:6px;margin-top:6px}.sf81-send-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px;font-size:11px}.sf81-send-row span{color:#334155;font-weight:800}.sf81-send-row em{color:#64748b;font-style:normal}.sf81-send-row a{color:#1d4ed8;font-weight:900;text-decoration:none}.sf81-no-send{margin-top:6px;color:#92400e;background:#fffbeb;border:1px dashed #fde68a;border-radius:10px;padding:8px;font-size:11px;font-weight:800}.sf81-empty{background:white;border:1px dashed #dbe7f3;border-radius:24px;padding:60px 40px;text-align:center;color:#64748b}@media(max-width:1320px){.sf81-layout,.sf81-doc-grid{grid-template-columns:1fr}.sf81-queue{position:static}.sf81-flow{grid-template-columns:repeat(4,1fr)}.sf81-line,.sf81-add,.sf81-send{grid-template-columns:1fr}.sf81-edit{grid-template-columns:1fr 1fr}.sf81-edit .sf81-btn{grid-column:1/3}}@media(max-width:760px){.sf81{padding:14px}.sf81-top,.sf81-summary,.sf81-kpis,.sf81-flow{grid-template-columns:1fr}.sf81-value{text-align:left}.sf81-row{grid-template-columns:34px 1fr}.sf81-row b{grid-column:2;text-align:left}.sf81-send-row{grid-template-columns:1fr}}`;
