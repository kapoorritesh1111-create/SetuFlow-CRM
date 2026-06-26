'use client';

import { useMemo, useState } from 'react';
import {
  approveActualOrderLinesGateAction,
  approveFirstDocumentGateAction,
  prepareFirstDocumentGateAction,
  previewFirstDocumentGateAction,
} from '@/features/orders/server/execution-order-actions';
import { prepareActualOrderLinesRobustAction } from '@/features/orders/server/actual-order-line-seed-actions';
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

export type ProductionOrderDocument8W = {
  id: string;
  documentType: string | null;
  status: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
};

export type ProductionOrder8S = {
  orderId?: string | null;
  quoteId: string;
  leadId: string;
  contractId: string | null;
  companyName: string;
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

const UI_STAGES: Array<{ key: UiStage; label: string; regionalDoc: string; exportDoc: string }> = [
  { key: 'quote', label: 'Quote Approved', regionalDoc: 'Actual Lines', exportDoc: 'Proforma Lines' },
  { key: 'approval', label: 'Internal Approval', regionalDoc: 'Order Confirmation', exportDoc: 'Proforma Invoice' },
  { key: 'packing', label: 'Packing / Freight', regionalDoc: 'Packing Sheet / Rates', exportDoc: 'Container Sheet / Freight' },
  { key: 'processing', label: 'Processing', regionalDoc: 'Pick-Pack-QC', exportDoc: 'Packing List' },
  { key: 'logistics', label: 'Logistics', regionalDoc: 'Delivery Note', exportDoc: 'Shipping Docs' },
  { key: 'invoice', label: 'Dispatch / Invoice', regionalDoc: 'Final Invoice', exportDoc: 'Commercial Invoice' },
  { key: 'closed', label: 'Paid & Closed', regionalDoc: 'Receipt', exportDoc: 'Receipt + Archive' },
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

function docTypeFor(order: ProductionOrder8S) {
  return order.orderType === 'export' ? 'proforma_invoice' : 'order_confirmation';
}

function uiStageIndexFor(order: ProductionOrder8S) {
  const mapped = STAGE_MAP[String(order.currentStage ?? order.executionState ?? '').toLowerCase()] ?? 'quote';
  return UI_STAGES.findIndex((stage) => stage.key === mapped);
}

function docLabel(documentType: string | null | undefined) {
  const value = String(documentType ?? '').toLowerCase();
  if (value === 'proforma_invoice') return 'Proforma Invoice';
  if (value === 'dispatch_invoice') return 'Dispatch Invoice';
  if (value === 'packing_sheet') return 'Packing Sheet';
  if (value === 'freight_request') return 'Freight Request';
  if (value === 'receipt') return 'Receipt';
  return value ? titleCase(value) : 'Order Confirmation';
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sf8-pill ${tone}`}>{children}</span>;
}

function ActionButton({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <button type="button" className={`sf8-btn ${tone}`}>{children}</button>;
}

function Gate({ action, quoteId, children, tone = '', extra }: { action: (formData: FormData) => Promise<void>; quoteId: string; children: string; tone?: string; extra?: Record<string, string> }) {
  return <form action={action}><input type="hidden" name="quote_id" value={quoteId} />{extra && Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}<button className={`sf8-btn ${tone}`}>{children}</button></form>;
}

function SendDocumentGate({ order, documentType, compact = false }: { order: ProductionOrder8S; documentType: string; compact?: boolean }) {
  return <form action={sendOrderDocumentLinkAction} className={compact ? 'sf8-send compact' : 'sf8-send'}>
    <input type="hidden" name="order_id" value={order.orderId ?? ''} />
    <input type="hidden" name="quote_id" value={order.quoteId} />
    <input type="hidden" name="document_type" value={documentType} />
    <select name="channel" defaultValue="email" aria-label="Send channel"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select>
    <input name="recipient" placeholder="Recipient email / WhatsApp" />
    <input name="note" placeholder="Optional note" />
    <button className="sf8-btn green">Send tracked</button>
  </form>;
}

function Kpi({ label, value, mini, tone }: { label: string; value: string | number; mini: string; tone: string }) {
  return <div className={`sf8-kpi ${tone}`}><span>{label}</span><strong>{value}</strong><small>{mini}</small></div>;
}

export function OrdersProductionWorkspace8S({ orders, catalogOptions = [] }: { orders: ProductionOrder8S[]; catalogOptions?: CatalogOrderOption8S[] }) {
  const [selectedId, setSelectedId] = useState(orders[0]?.orderId ?? orders[0]?.quoteId ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const [stageIndex, setStageIndex] = useState<number | null>(null);
  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.orderType === filter), [orders, filter]);
  const selected = useMemo(() => visible.find((order) => (order.orderId ?? order.quoteId) === selectedId) ?? visible[0] ?? orders[0] ?? null, [visible, selectedId, orders]);
  const activeStage = selected ? (stageIndex ?? uiStageIndexFor(selected)) : 0;
  const ready = orders.filter((order) => order.blockerCount === 0 && order.lines.length > 0).length;
  const blocked = orders.filter((order) => order.blockerCount > 0).length;
  const activeValue = orders.reduce((sum, order) => sum + Number(order.actualTotal ?? order.quotedTotal ?? 0), 0);

  if (!selected) {
    return <main className="sf8"><Top filter={filter} setFilter={setFilter} /><div className="sf8-empty">No accepted execution orders yet.</div><style jsx global>{styles}</style></main>;
  }

  return <main className="sf8">
    <Top filter={filter} setFilter={(next) => { setFilter(next); setStageIndex(null); const first = (next === 'all' ? orders : orders.filter((order) => order.orderType === next))[0]; if (first) setSelectedId(first.orderId ?? first.quoteId); }} />
    <section className="sf8-kpis">
      <Kpi tone="blue" label="Ready from quote" value={orders.length} mini="Accepted source versions" />
      <Kpi tone="amber" label="Need action" value={orders.length - ready} mini="Line/gate/doc blockers" />
      <Kpi tone="purple" label="Documents" value={orders.reduce((sum, order) => sum + (order.documents?.length ?? order.documentCount ?? 0), 0)} mini="Preview or resend" />
      <Kpi tone="green" label="Healthy" value={ready} mini="No current blocker" />
      <Kpi tone="red" label="Blocked" value={blocked} mini="Needs review" />
      <Kpi tone="slate" label="Active value" value={fmt(activeValue, selected.currency)} mini="Actual or quoted total" />
    </section>

    <section className="sf8-layout">
      <aside className="sf8-queue">
        <div className="sf8-queue-head"><div><span>Order queue</span><p>Click any row. Only one selected order opens.</p></div><Pill tone="blue">{visible.length} shown</Pill></div>
        <input className="sf8-search" placeholder="Search buyer, order, product, country, doc" />
        <div className="sf8-filter"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div>
        <div className="sf8-list">{visible.map((order) => {
          const key = order.orderId ?? order.quoteId;
          const rowStage = uiStageIndexFor(order);
          return <button key={key} className={`sf8-row ${key === (selected.orderId ?? selected.quoteId) ? 'selected' : ''}`} onClick={() => { setSelectedId(key); setStageIndex(null); }}>
            <div className="sf8-row-top"><span className="sf8-avatar">{initials(order.companyName)}</span><span><strong>{order.companyName}</strong><small>{order.orderType} · {UI_STAGES[rowStage]?.label ?? titleCase(order.currentStage)} · {order.versionLabel ?? 'accepted version'}</small></span><span className="sf8-money">{fmt(order.actualTotal ?? order.quotedTotal, order.currency)}<small>{order.approvalState ?? order.status}</small></span></div>
            <div className="sf8-dots">{UI_STAGES.map((stage, index) => <i key={stage.key} className={index < rowStage ? 'done' : index === rowStage ? 'active' : ''} />)}<small>{order.blockerReasons[0] ?? order.nextAction}</small></div>
            <div className="sf8-row-actions"><span>Open</span><span>Preview docs</span></div>
          </button>;
        })}</div>
      </aside>

      <section className="sf8-workspace">
        <article className="sf8-summary">
          <div><small>Open order · {selected.orderType}</small><h2>{selected.companyName}</h2><p>{selected.nextAction}. Source: {selected.versionLabel ?? selected.sourceQuoteVersionId ?? 'accepted quote version'}.</p></div>
          <div className="sf8-value"><strong>{fmt(selected.actualTotal ?? selected.quotedTotal, selected.currency)}</strong><span>Draft / actual order total</span></div>
        </article>

        <nav className="sf8-flow">{UI_STAGES.map((stage, index) => <button type="button" key={stage.key} onClick={() => setStageIndex(index)} className={`${index < activeStage ? 'done' : ''} ${index === activeStage ? 'active' : ''}`}><strong>{stage.label}</strong><span>{selected.orderType === 'export' ? stage.exportDoc : stage.regionalDoc}</span></button>)}</nav>

        <StagePanel order={selected} stage={UI_STAGES[activeStage] ?? UI_STAGES[0]} stageNumber={activeStage + 1} catalogOptions={catalogOptions} />
      </section>
    </section>
    <style jsx global>{styles}</style>
  </main>;
}

function Top({ filter, setFilter }: { filter: Filter; setFilter: (filter: Filter) => void }) {
  return <header className="sf8-top"><div><small>Sprint 8W clean workflow</small><h1>Orders / Execution Workspace</h1><p>Queue on the left, one open order on the right. Preview, approve, and resend documents from any cleared stage.</p></div><div className="sf8-actions"><FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton><FilterButton active={filter === 'regional'} onClick={() => setFilter('regional')}>Regional</FilterButton><FilterButton active={filter === 'export'} onClick={() => setFilter('export')}>Export</FilterButton></div></header>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`sf8-btn ${active ? 'primary' : ''}`}>{children}</button>;
}

function StagePanel({ order, stage, stageNumber, catalogOptions }: { order: ProductionOrder8S; stage: { key: UiStage; label: string; regionalDoc: string; exportDoc: string }; stageNumber: number; catalogOptions: CatalogOrderOption8S[] }) {
  const currentDoc = order.orderType === 'export' ? stage.exportDoc : stage.regionalDoc;
  return <article className="sf8-stage"><header><div><small>Stage {stageNumber} · {stage.label}</small><h2>{stageTitle(stage.key, order.orderType)}</h2></div><Pill tone="blue">{currentDoc}</Pill></header><div className="sf8-stage-body">{stage.key === 'quote' ? <LinesStage order={order} catalogOptions={catalogOptions} /> : stage.key === 'approval' ? <DocumentGateStage order={order} documentType={docTypeFor(order)} /> : stage.key === 'packing' ? <PackingStage order={order} /> : stage.key === 'processing' ? <ProcessingStage order={order} /> : stage.key === 'logistics' ? <LogisticsStage order={order} /> : stage.key === 'invoice' ? <InvoiceStage order={order} /> : <CloseStage order={order} />}</div></article>;
}

function stageTitle(stage: UiStage, orderType: 'regional' | 'export') {
  if (stage === 'quote') return orderType === 'export' ? 'Confirm actual Proforma lines' : 'Confirm actual buyer order lines';
  if (stage === 'approval') return orderType === 'export' ? 'Preview and approve Proforma Invoice' : 'Preview and approve Order Confirmation';
  if (stage === 'packing') return orderType === 'export' ? 'Preview container packing sheet and request freight rate' : 'Preview packing sheet and request delivery rate';
  if (stage === 'processing') return orderType === 'export' ? 'Preview packing list and confirm packed before loading' : 'Confirm goods picked, packed, and QC checked';
  if (stage === 'logistics') return orderType === 'export' ? 'Book export logistics and create shipping docs' : 'Book delivery and create delivery note';
  if (stage === 'invoice') return orderType === 'export' ? 'Preview and send final commercial invoice' : 'Preview and send final invoice';
  return 'Collect payment and close order';
}

function LinesStage({ order, catalogOptions }: { order: ProductionOrder8S; catalogOptions: CatalogOrderOption8S[] }) {
  return <div className="sf8-two"><div><p className="sf8-copy"><strong>Simple meaning:</strong> quote approval does not mean every quoted item becomes the order. Confirm what the buyer will actually buy before creating documents.</p><div className="sf8-box"><h3>Actual order lines</h3><div className="sf8-line-table">{order.lines.map((line) => <Line key={line.id} quoteId={order.quoteId} line={line} currency={order.currency} />)}</div><form action={addManualActualOrderLineAction} className="sf8-add"><input type="hidden" name="quote_id" value={order.quoteId} /><input type="hidden" name="pricing_basis" value={order.pricingBasis ?? 'FOB'} /><select name="catalog_pricing_rule_id"><option value="">Select catalog product</option>{catalogOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="ordered_quantity" placeholder="Qty" /><input name="change_reason" placeholder="Reason" /><button className="sf8-btn primary">Add line</button></form></div><div className="sf8-action-bar"><Gate action={prepareActualOrderLinesRobustAction} quoteId={order.quoteId} tone="primary">Prepare actual lines</Gate><Gate action={approveActualOrderLinesGateAction} quoteId={order.quoteId} tone="green">Approve actual lines</Gate></div></div><aside><InfoCard title="AI assist" items={['Highlights removed or added items', 'Shows quantity changes from quote', 'Warns if price or margin changed', 'Does not mutate accepted quote history']} /></aside></div>;
}

function Line({ quoteId, line, currency }: { quoteId: string; line: OrderLineComparison8S; currency: string | null }) {
  return <div className="sf8-line"><span><strong>{line.productName}</strong><small>{line.variantName || line.skuCode || line.hsnCode || 'Line item'}</small></span><span>{line.quotedQuantity ?? '—'}<small>Quoted</small></span><form action={updateActualOrderLineAction} className="sf8-edit"><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><input name="ordered_quantity" defaultValue={line.actualQuantity ?? line.quotedQuantity ?? 0} /><input name="unit_price" defaultValue={line.unitPrice ?? ''} /><input name="change_reason" defaultValue={line.reason ?? ''} placeholder="Reason" /><button className="sf8-btn blue">Save</button></form><span><Pill tone={line.status === 'unchanged' ? 'green' : 'amber'}>{line.status.replace(/_/g, ' ')}</Pill><small>{fmt(line.lineTotal, currency)}</small></span>{line.isActual ? <form action={removeActualOrderLineAction}><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="order_line_id" value={line.id} /><button className="sf8-btn">Remove</button></form> : <small>Prepare first</small>}</div>;
}

function DocumentGateStage({ order, documentType }: { order: ProductionOrder8S; documentType: string }) {
  return <div className="sf8-two"><div><p className="sf8-copy"><strong>Simple meaning:</strong> preview and approve before the buyer sees the document. If already approved or sent, you can still preview and send again.</p><Checklist items={['Actual lines confirmed against accepted quote version', 'Payment terms, incoterm, tax, and margin reviewed', order.orderType === 'export' ? 'Export destination and HS/HSN requirements reviewed' : 'Regional delivery and invoice details reviewed', 'Human approval required before send']} /><div className="sf8-action-bar"><Gate action={prepareFirstDocumentGateAction} quoteId={order.quoteId} extra={{ document_gate_type: documentType }}>Prepare document</Gate><Gate action={previewFirstDocumentGateAction} quoteId={order.quoteId} tone="blue" extra={{ document_gate_type: documentType }}>Preview</Gate><Gate action={approveFirstDocumentGateAction} quoteId={order.quoteId} tone="green" extra={{ document_gate_type: documentType }}>Approve</Gate></div><div className="sf8-send-box"><strong>Send approved document again</strong><p>Use this to send to buyer, finance, or another stakeholder. Every send records a stage event.</p><SendDocumentGate order={order} documentType={documentType} /></div></div><aside><DocumentTray order={order} highlightType={documentType} /></aside></div>;
}

function PackingStage({ order }: { order: ProductionOrder8S }) {
  return <div className="sf8-two"><div><p className="sf8-copy"><strong>Simple meaning:</strong> create a packing sheet so logistics can quote correctly. Freight request should use approved packing data.</p><div className="sf8-box"><h3>Packing / rate request checklist</h3><div className="sf8-grid2"><Metric label="Template" value={order.orderType === 'export' ? '20ft / 40ft / Custom' : 'Regional truck / Custom'} /><Metric label="Freight" value="Request / Selected quote" /><Metric label="Weights" value="Net / Gross / CBM" /><Metric label="Gate" value="Preview → Approve → Send" /></div></div><div className="sf8-action-bar"><ActionButton tone="primary">Preview packing sheet</ActionButton><ActionButton tone="blue">Approve packing sheet</ActionButton><ActionButton>Send rate request again</ActionButton></div></div><aside><DocumentTray order={order} highlightType="packing_sheet" /></aside></div>;
}

function ProcessingStage({ order }: { order: ProductionOrder8S }) {
  return <div className="sf8-two"><div><p className="sf8-copy"><strong>Simple meaning:</strong> goods are picked and packed. Before loading, preview picklist/packing list and confirm goods are physically ready.</p><Checklist items={['Products reserved and batch/lot recorded', 'Actual packed quantity confirmed', 'QC documents attached where required', 'Human confirms packed for loading']} /><div className="sf8-action-bar"><ActionButton tone="primary">Preview picklist / packing list</ActionButton><ActionButton tone="blue">Confirm packed for loading</ActionButton><ActionButton>Send picklist again</ActionButton></div></div><aside><DocumentTray order={order} highlightType="packing_list" /></aside></div>;
}

function LogisticsStage({ order }: { order: ProductionOrder8S }) {
  return <div className="sf8-two"><div><p className="sf8-copy"><strong>Simple meaning:</strong> book movement. Regional orders use delivery docs; export orders use shipping/customs docs.</p><Checklist items={['Packing sheet shared with logistics', 'Shipment or delivery booking confirmed', order.orderType === 'export' ? 'BOL/AWB, COO, insurance, inspection checklist reviewed' : 'Delivery note / POD template prepared', 'Quantity, weight, and address mismatch checked']} /><div className="sf8-action-bar"><ActionButton tone="primary">Preview {order.orderType === 'export' ? 'shipping docs' : 'delivery note'}</ActionButton><ActionButton tone="blue">Approve logistics docs</ActionButton><ActionButton>Send docs again</ActionButton></div></div><aside><DocumentTray order={order} highlightType={order.orderType === 'export' ? 'shipping_documents' : 'delivery_note'} /></aside></div>;
}

function InvoiceStage({ order }: { order: ProductionOrder8S }) {
  const documentType = 'dispatch_invoice';
  return <div className="sf8-two"><div><p className="sf8-copy"><strong>Simple meaning:</strong> invoice reflects the actual dispatched goods, not the old quote. Preview and approve before sending.</p><Checklist items={['Actual/shipped quantity reviewed', 'Pricing and freight terms reviewed', 'Trade requirements resolved or intentionally handled', 'Human approval before buyer receives invoice']} /><div className="sf8-action-bar"><ActionButton tone="primary">Preview final invoice</ActionButton><ActionButton tone="blue">Approve invoice</ActionButton></div><div className="sf8-send-box"><strong>Send final invoice again</strong><SendDocumentGate order={order} documentType={documentType} /></div></div><aside><DocumentTray order={order} highlightType={documentType} /></aside></div>;
}

function CloseStage({ order }: { order: ProductionOrder8S }) {
  return <div><p className="sf8-copy"><strong>Simple meaning:</strong> payment is received, receipt is generated, and the order is closed with full document history archived.</p><div className="sf8-grid4"><Metric label="Total billed" value={fmt(order.actualTotal, order.currency)} /><Metric label="Payment" value="Pending / paid" /><Metric label="Docs" value={`${order.documents?.length ?? order.documentCount} records`} /><Metric label="Source" value={order.versionLabel ?? 'Accepted version'} /></div><div className="sf8-action-bar"><ActionButton tone="primary">Generate receipt + close</ActionButton><ActionButton tone="blue">Download archive</ActionButton><ActionButton tone="green">Create reorder reminder</ActionButton></div></div>;
}

function DocumentTray({ order, highlightType }: { order: ProductionOrder8S; highlightType: string }) {
  const docs = order.documents?.length ? order.documents : [{ id: 'planned', documentType: highlightType, status: 'planned' }];
  return <div className="sf8-doc-tray"><h3>Document tray</h3><p>Preview any created document anytime. Approved/sent documents can be sent again to different users.</p>{docs.map((doc) => <div key={doc.id} className={`sf8-doc ${doc.documentType === highlightType ? 'active' : ''}`}><div><strong>{docLabel(doc.documentType)}</strong><small>{titleCase(doc.status)}{doc.sentAt ? ` · Sent` : ''}{doc.openedAt ? ` · Opened` : ''}</small></div><div className="sf8-doc-actions"><ActionButton tone="blue">Preview</ActionButton><ActionButton>History</ActionButton></div></div>)}<div className="sf8-doc-note">Repeat sends should eventually move to a child send-history table so one document can be sent to many recipients.</div></div>;
}

function Checklist({ items }: { items: string[] }) {
  return <div className="sf8-box"><h3>Checklist</h3>{items.map((item) => <div className="sf8-check" key={item}><i>✓</i><span>{item}</span></div>)}</div>;
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return <div className="sf8-info"><strong>{title}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="sf8-metric"><span>{label}</span><strong>{value}</strong></div>;
}

const styles = `.sf8{background:#eef4f8;min-height:100vh;padding:22px 26px 80px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.sf8-top,.sf8-queue,.sf8-summary,.sf8-stage{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12}.sf8-top{padding:18px 20px;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin-bottom:14px}.sf8-top small,.sf8-summary small,.sf8-stage small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf8-top h1,.sf8-summary h2,.sf8-stage h2{margin:0;color:#082f49;letter-spacing:-.04em}.sf8-top p,.sf8-summary p,.sf8-queue p,.sf8-copy,.sf8-doc-tray p,.sf8-send-box p{color:#64748b;font-size:12px;line-height:1.5;margin:5px 0 0}.sf8-actions,.sf8-filter,.sf8-action-bar,.sf8-doc-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sf8-btn{border:1px solid #dbe7f3;background:white;color:#334155;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:850;cursor:pointer}.sf8-btn.primary{background:#082f49;border-color:#082f49;color:white}.sf8-btn.blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf8-btn.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8-btn.amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf8-pill{border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:5px 9px;color:#475569;font-size:10px;font-weight:900;white-space:nowrap}.sf8-pill.green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8-pill.blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf8-pill.amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf8-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px}.sf8-kpi{background:white;border:1px solid #dbe7f3;border-radius:18px;border-top:4px solid #cbd5e1;padding:12px;min-height:78px}.sf8-kpi.blue{border-top-color:#0c7fff}.sf8-kpi.green{border-top-color:#059669}.sf8-kpi.amber{border-top-color:#d97706}.sf8-kpi.red{border-top-color:#dc2626}.sf8-kpi.purple{border-top-color:#7c3aed}.sf8-kpi span,.sf8-metric span{font-size:9px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.13em}.sf8-kpi strong{display:block;font-size:22px;margin-top:7px;color:#082f49}.sf8-kpi small{display:block;color:#64748b;font-size:10px;margin-top:5px}.sf8-layout{display:grid;grid-template-columns:390px 1fr;gap:14px;align-items:start}.sf8-queue{overflow:hidden;position:sticky;top:14px}.sf8-queue-head{padding:15px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px}.sf8-queue-head span{font-size:10px;color:#94a3b8;font-weight:900;text-transform:uppercase;letter-spacing:.14em}.sf8-search{width:calc(100% - 28px);height:38px;border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:0 14px;margin:12px 14px 8px;font-size:12px}.sf8-filter{padding:0 14px 12px}.sf8-list{display:grid;max-height:calc(100vh - 310px);overflow:auto}.sf8-row{display:grid;gap:8px;border:0;border-bottom:1px solid #edf2f7;background:white;text-align:left;padding:12px 14px;cursor:pointer}.sf8-row:hover,.sf8-row.selected{background:#f8fbff}.sf8-row.selected{box-shadow:inset 3px 0 0 #0c7fff}.sf8-row-top{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:start}.sf8-avatar{width:34px;height:34px;border-radius:12px;background:#0c7fff;color:white;display:grid;place-items:center;font-weight:950}.sf8-row strong{display:block;color:#082f49;font-size:14px}.sf8-row small,.sf8-money small{display:block;color:#64748b;font-size:10px;margin-top:3px}.sf8-money{text-align:right;color:#082f49;font-weight:950;font-size:13px}.sf8-dots{display:flex;align-items:center;gap:5px}.sf8-dots i{width:8px;height:8px;border-radius:999px;background:#cbd5e1}.sf8-dots i.done{background:#059669}.sf8-dots i.active{background:#0c7fff}.sf8-dots small{margin-left:4px;color:#64748b}.sf8-row-actions{display:flex;gap:6px}.sf8-row-actions span{border:1px solid #dbe7f3;border-radius:999px;padding:5px 8px;color:#1d4ed8;background:#eff6ff;font-size:10px;font-weight:850}.sf8-workspace{display:grid;gap:14px}.sf8-summary{padding:16px 18px;display:grid;grid-template-columns:1fr auto;gap:14px}.sf8-summary h2{font-size:20px}.sf8-value{text-align:right;color:#082f49}.sf8-value strong{display:block;font-size:20px}.sf8-value span{display:block;color:#94a3b8;font-size:10px}.sf8-flow{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12;padding:12px 18px;display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.sf8-flow button{border:1px solid #e2e8f0;background:white;border-radius:13px;padding:8px;min-height:62px;cursor:pointer}.sf8-flow button.done{background:#ecfdf5;border-color:#a7f3d0}.sf8-flow button.active{background:#eff6ff;border-color:#93c5fd;box-shadow:0 0 0 3px #0c7fff14}.sf8-flow strong{font-size:10px;color:#082f49;display:block}.sf8-flow span{font-size:9px;color:#64748b;display:block;margin-top:4px}.sf8-stage{overflow:hidden}.sf8-stage header{padding:16px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px}.sf8-stage h2{font-size:22px}.sf8-stage-body{padding:18px}.sf8-two{display:grid;grid-template-columns:1fr 410px;gap:14px;align-items:start}.sf8-box,.sf8-doc-tray,.sf8-info,.sf8-send-box{border:1px solid #e2e8f0;background:#f8fafc;border-radius:18px;padding:14px}.sf8-box h3,.sf8-doc-tray h3{margin:0 0 10px;color:#082f49;font-size:15px}.sf8-check{display:flex;gap:9px;align-items:flex-start;color:#334155;font-size:13px;margin-top:9px}.sf8-check i{width:20px;height:20px;border-radius:999px;background:#ecfdf5;color:#047857;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:950;flex:none}.sf8-line-table{display:grid;gap:8px}.sf8-line{display:grid;grid-template-columns:1fr .35fr 1.25fr .5fr .35fr;gap:8px;align-items:center;border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px}.sf8-line strong{color:#082f49;font-size:12px}.sf8-line small{display:block;color:#64748b;font-size:10px;margin-top:2px}.sf8-edit{display:grid;grid-template-columns:65px 80px 1fr auto;gap:6px}.sf8-edit input,.sf8-add input,.sf8-add select,.sf8-send input,.sf8-send select{border:1px solid #dbe7f3;border-radius:10px;background:white;font-size:11px;font-weight:750;padding:8px;min-width:0}.sf8-add{display:grid;grid-template-columns:1fr 70px 1fr auto;gap:8px;margin-top:10px}.sf8-send{display:grid;grid-template-columns:110px 1fr 1fr auto;gap:8px;margin-top:10px}.sf8-send.compact{grid-template-columns:1fr auto}.sf8-doc{border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:8px}.sf8-doc.active{box-shadow:inset 3px 0 0 #0c7fff}.sf8-doc strong{color:#082f49;font-size:12px}.sf8-doc small{display:block;color:#64748b;font-size:10px;margin-top:3px}.sf8-doc-note{margin-top:10px;color:#92400e;background:#fffbeb;border:1px dashed #fde68a;border-radius:12px;padding:10px;font-size:11px;font-weight:800}.sf8-info strong{color:#5b21b6}.sf8-info{background:#f5f3ff;border-color:#ddd6fe}.sf8-info ul{margin:9px 0 0;padding-left:18px;color:#475569;font-size:12px;line-height:1.65}.sf8-grid2,.sf8-grid4{display:grid;gap:10px}.sf8-grid2{grid-template-columns:repeat(2,1fr)}.sf8-grid4{grid-template-columns:repeat(4,1fr);margin-top:14px}.sf8-metric{border:1px solid #e2e8f0;border-radius:16px;padding:12px;background:#f8fafc}.sf8-metric strong{display:block;margin-top:5px;color:#082f49;font-size:16px}.sf8-action-bar{margin-top:14px}.sf8-empty{background:white;border:1px dashed #dbe7f3;border-radius:24px;padding:60px 40px;text-align:center;color:#64748b}@media(max-width:1320px){.sf8-layout,.sf8-two{grid-template-columns:1fr}.sf8-queue{position:static}.sf8-kpis{grid-template-columns:repeat(3,1fr)}.sf8-flow{grid-template-columns:repeat(4,1fr)}.sf8-line,.sf8-add,.sf8-send{grid-template-columns:1fr}.sf8-edit{grid-template-columns:1fr 1fr}.sf8-edit .sf8-btn{grid-column:1/3}}@media(max-width:760px){.sf8{padding:14px}.sf8-top,.sf8-summary,.sf8-kpis,.sf8-flow,.sf8-grid2,.sf8-grid4{grid-template-columns:1fr}.sf8-value,.sf8-money{text-align:left}.sf8-row-top{grid-template-columns:34px 1fr}.sf8-money{grid-column:2}}`;
