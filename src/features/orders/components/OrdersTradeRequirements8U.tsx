'use client';

import { confirmTradeRequirementSourceAction, searchAndAttachTradeRequirementsAction } from '@/features/orders/server/trade-requirement-actions';

export type TradeRequirement8U = {
  id: string;
  orderId: string;
  quoteId: string;
  companyName: string;
  currentStage?: string | null;
  orderType?: string | null;
  requirementType: string | null;
  requirementCode: string | null;
  title: string | null;
  description: string | null;
  documentType: string | null;
  severity: string | null;
  status: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  sourceCheckedAt?: string | null;
  confirmedAt?: string | null;
  stageKey?: string | null;
};

export type TradeRequirementOrder8U = {
  orderId: string;
  quoteId: string;
  companyName: string;
  currentStage?: string | null;
  orderType?: string | null;
  country?: string | null;
  incoterm?: string | null;
  destinationPort?: string | null;
  shipmentMode?: string | null;
  lineSummary?: string | null;
  requirements: TradeRequirement8U[];
};

function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Unknown';
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function severityTone(value: string | null | undefined) {
  const severity = String(value ?? '').toLowerCase();
  if (severity === 'blocking') return 'red';
  if (severity.includes('required')) return 'amber';
  return 'blue';
}

function statusTone(value: string | null | undefined) {
  const status = String(value ?? '').toLowerCase();
  if (['confirmed', 'cleared', 'approved', 'satisfied'].includes(status)) return 'green';
  if (['waived', 'rejected', 'expired', 'blocked'].includes(status)) return 'red';
  return 'amber';
}

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`sf8u-pill sf8u-${tone}`}>{children}</span>;
}

function SearchAttachForm({ order }: { order: TradeRequirementOrder8U }) {
  const placeholder = `${order.orderType ?? 'order'} ${order.country ?? ''} ${order.shipmentMode ?? ''} ${order.incoterm ?? ''}`.trim();
  return <form action={searchAndAttachTradeRequirementsAction} className="sf8u-search">
    <input type="hidden" name="quote_id" value={order.quoteId} />
    <input name="search_query" placeholder={`Search context: ${placeholder || 'country product HS/HSN shipment buyer bank'}`} />
    <input name="source_name" placeholder="Source name / authority" />
    <input name="source_title" placeholder="Source title / note" />
    <input name="source_url" placeholder="Optional official/source URL" />
    <button className="sf8u-btn sf8u-navy">Attach requirements</button>
  </form>;
}

function RequirementCard({ requirement }: { requirement: TradeRequirement8U }) {
  return <article className="sf8u-req">
    <header><div><small>{requirement.requirementCode ?? requirement.documentType ?? 'Requirement'}</small><h4>{requirement.title ?? 'Trade requirement'}</h4></div><div className="sf8u-req-pills"><Pill tone={severityTone(requirement.severity)}>{titleCase(requirement.severity)}</Pill><Pill tone={statusTone(requirement.status)}>{titleCase(requirement.status)}</Pill></div></header>
    <p>{requirement.description ?? 'Review and confirm this order-stage requirement before the relevant execution gate advances.'}</p>
    <dl>
      <div><dt>Stage</dt><dd>{titleCase(requirement.stageKey)}</dd></div>
      <div><dt>Type</dt><dd>{titleCase(requirement.requirementType)}</dd></div>
      <div><dt>Document</dt><dd>{titleCase(requirement.documentType)}</dd></div>
      <div><dt>Source</dt><dd>{requirement.sourceTitle ?? 'Human review snapshot'}</dd></div>
      <div><dt>Checked</dt><dd>{fmtDate(requirement.sourceCheckedAt)}</dd></div>
      <div><dt>Confirmed</dt><dd>{fmtDate(requirement.confirmedAt)}</dd></div>
    </dl>
    {requirement.sourceUrl ? <p className="sf8u-source">Source URL recorded in snapshot.</p> : null}
    {String(requirement.status ?? '').toLowerCase() !== 'confirmed' ? <form action={confirmTradeRequirementSourceAction} className="sf8u-confirm">
      <input type="hidden" name="quote_id" value={requirement.quoteId} />
      <input type="hidden" name="requirement_id" value={requirement.id} />
      <input name="review_notes" placeholder="Human review note" />
      <button className="sf8u-btn sf8u-green">Confirm source</button>
    </form> : null}
  </article>;
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <div className="sf8u-kpi"><span>{label}</span><strong>{value}</strong></div>;
}

export function OrdersTradeRequirements8U({ orders }: { orders: TradeRequirementOrder8U[] }) {
  const total = orders.reduce((sum, order) => sum + order.requirements.length, 0);
  const confirmed = orders.reduce((sum, order) => sum + order.requirements.filter((req) => String(req.status ?? '').toLowerCase() === 'confirmed').length, 0);
  const required = orders.reduce((sum, order) => sum + order.requirements.filter((req) => String(req.severity ?? '').includes('required') || String(req.severity ?? '') === 'blocking').length, 0);
  const blocking = orders.reduce((sum, order) => sum + order.requirements.filter((req) => String(req.severity ?? '').toLowerCase() === 'blocking').length, 0);

  return <section className="sf8u-wrap">
    <header className="sf8u-top"><div><small>Sprint 8U trade requirements</small><h2>Industry-neutral order-stage requirements</h2><p>Attach and confirm requirements by order type, country, product/category, HS/HSN, shipment mode, Incoterm, buyer, and bank context. Lead compliance stays separate.</p></div><div className="sf8u-kpis"><Kpi label="Attached" value={total} /><Kpi label="Required" value={required} /><Kpi label="Blocking" value={blocking} /><Kpi label="Confirmed" value={`${confirmed}/${total || 0}`} /></div></header>
    <div className="sf8u-grid">{orders.map((order) => {
      const open = order.requirements.filter((req) => String(req.status ?? '').toLowerCase() !== 'confirmed');
      return <article key={order.orderId} className="sf8u-order"><header className="sf8u-order-head"><div><small>{titleCase(order.currentStage)} · {titleCase(order.orderType)}</small><h3>{order.companyName}</h3><p>{order.country ?? 'Country pending'} · {order.shipmentMode ?? 'Shipment mode pending'} · {order.incoterm ?? 'Incoterm pending'} · {order.destinationPort ?? 'Destination pending'}</p><p>{order.lineSummary ?? 'Product/HS summary pending'}</p></div><Pill tone={open.length ? 'amber' : 'green'}>{open.length ? `${open.length} open` : 'Confirmed'}</Pill></header>
        <SearchAttachForm order={order} />
        {order.requirements.length ? <div className="sf8u-reqs">{order.requirements.map((req) => <RequirementCard key={req.id} requirement={req} />)}</div> : <div className="sf8u-empty"><b>No order-stage requirements attached yet.</b><span>Use Attach requirements to create a human-confirmable snapshot for this specific order and stage.</span></div>}
      </article>;
    })}</div>
    <style jsx global>{styles}</style>
  </section>;
}

const styles = `.sf8u-wrap{background:#eef4f8;padding:0 26px 28px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.sf8u-top,.sf8u-order{background:white;border:1px solid #dbe7f3;border-radius:24px;box-shadow:0 14px 34px #0f172a12}.sf8u-top{padding:18px 20px;margin-bottom:14px;display:grid;grid-template-columns:1fr auto;gap:16px}.sf8u-top small,.sf8u-order small,.sf8u-req small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.sf8u-top h2,.sf8u-order h3,.sf8u-req h4{margin:2px 0 0;color:#082f49}.sf8u-top p,.sf8u-order p,.sf8u-req p{color:#64748b;font-size:12px;margin:5px 0 0}.sf8u-kpis{display:grid;grid-template-columns:repeat(4,112px);gap:8px}.sf8u-kpi{border:1px solid #dbe7f3;border-radius:16px;background:#f8fafc;padding:10px}.sf8u-kpi span{display:block;font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase}.sf8u-kpi strong{display:block;margin-top:5px;color:#082f49;font-size:18px}.sf8u-grid{display:grid;gap:14px}.sf8u-order{padding:16px}.sf8u-order-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.sf8u-search{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr auto;gap:8px;margin:14px 0}.sf8u-search input,.sf8u-confirm input{border:1px solid #dbe7f3;border-radius:12px;background:#f8fafc;font-size:11px;font-weight:750;padding:10px}.sf8u-btn{border:1px solid #dbe7f3;background:white;color:#334155;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:850;cursor:pointer}.sf8u-navy{background:#082f49!important;border-color:#082f49!important;color:white!important}.sf8u-green{background:#ecfdf5!important;border-color:#a7f3d0!important;color:#047857!important}.sf8u-pill{border:1px solid #dbe7f3;background:#f8fafc;border-radius:999px;padding:5px 9px;color:#475569;font-size:10px;font-weight:900;white-space:nowrap}.sf8u-pill.sf8u-green{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.sf8u-pill.sf8u-amber{background:#fffbeb;border-color:#fde68a;color:#92400e}.sf8u-pill.sf8u-red{background:#fff1f2;border-color:#fecaca;color:#be123c}.sf8u-pill.sf8u-blue{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}.sf8u-reqs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sf8u-req{border:1px solid #dbe7f3;background:#f8fafc;border-radius:18px;padding:14px}.sf8u-req header{display:flex;justify-content:space-between;gap:10px}.sf8u-req-pills{display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end}.sf8u-req dl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0 0}.sf8u-req dt{font-size:9px;color:#94a3b8;font-weight:900;text-transform:uppercase}.sf8u-req dd{margin:3px 0 0;color:#334155;font-size:11px;font-weight:800}.sf8u-source{color:#0c7fff!important;font-weight:800}.sf8u-confirm{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.sf8u-empty{border:1px dashed #dbe7f3;background:#f8fafc;border-radius:18px;padding:18px;display:grid;gap:4px;color:#64748b;font-size:12px}.sf8u-empty b{color:#082f49}@media(max-width:1280px){.sf8u-top,.sf8u-search{grid-template-columns:1fr}.sf8u-kpis{grid-template-columns:repeat(2,112px)}.sf8u-reqs{grid-template-columns:1fr}.sf8u-confirm{grid-template-columns:1fr}}@media(max-width:760px){.sf8u-wrap{padding:0 14px 20px}.sf8u-kpis,.sf8u-req dl{grid-template-columns:1fr}.sf8u-order-head{display:grid}}`;
