import { notFound } from 'next/navigation';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { OrderPreviewPrintButton } from '@/features/orders/components/OrderPreviewPrintButton';

export const dynamic = 'force-dynamic';

type AnyRow = Record<string, any>;

function titleCase(value: string | null | undefined) {
  return String(value ?? '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${num(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function docTitle(type: string, orderType?: string) {
  const exportMode = String(orderType ?? '').toLowerCase() === 'export' || ['proforma_invoice', 'packing_list', 'freight_request'].includes(type);
  if (type === 'proforma_invoice') return 'Export Proforma Invoice';
  if (type === 'order_confirmation') return exportMode ? 'Export Order Confirmation' : 'Regional Order Confirmation';
  if (type === 'packing_sheet') return exportMode ? 'Export Packing Sheet' : 'Regional Packing / Picklist / QC Sheet';
  if (type === 'packing_list') return 'Export Packing List';
  if (type === 'delivery_note') return 'Regional Delivery Note';
  if (type === 'freight_request') return 'Freight Rate Request / Shipment Instruction';
  if (type === 'dispatch_invoice') return exportMode ? 'Export Commercial / Dispatch Invoice' : 'Regional Tax / Dispatch Invoice';
  return titleCase(type);
}

function isExportDoc(type: string, order: AnyRow) {
  return String(order?.order_type ?? '').toLowerCase() === 'export' || ['proforma_invoice', 'packing_list', 'freight_request'].includes(type);
}

function compactTerms(exportMode: boolean) {
  return exportMode
    ? [
      'Export documents are subject to buyer, bank, customs, freight, and destination-country requirements.',
      'Incoterm and named place define cost, risk transfer, insurance, and customs responsibility.',
      'Buyer/importer remains responsible for import duty and local taxes unless explicitly agreed otherwise.',
      'Origin, value, weights, package marks, and shipment details must be confirmed before dispatch.',
    ]
    : [
      'Prices and taxes are subject to final invoice and applicable place-of-supply rules.',
      'Dispatch is subject to payment/credit release, stock, and approved actual order lines.',
      'Shortage or damage claims require written notice with evidence within the agreed claim window.',
      'Goods must be handled and stored as per product label and agreed conditions.',
    ];
}

function documentQuantity(line: AnyRow, documentType: string) {
  if (['proforma_invoice', 'order_confirmation'].includes(documentType)) return num(line.ordered_quantity ?? line.quoted_quantity);
  if (['packing_sheet', 'packing_list'].includes(documentType)) return num(line.packed_quantity ?? line.ordered_quantity ?? line.quoted_quantity);
  if (documentType === 'delivery_note' || documentType === 'dispatch_invoice') return num(line.dispatched_quantity ?? line.loaded_quantity ?? line.packed_quantity ?? line.ordered_quantity ?? line.quoted_quantity);
  return num(line.ordered_quantity ?? line.quoted_quantity);
}

function unitPrice(line: AnyRow) {
  return num(line.unit_price);
}

function lineTotal(line: AnyRow, documentType: string) {
  const stored = num(line.line_total);
  return stored || documentQuantity(line, documentType) * unitPrice(line);
}

function FieldGrid({ rows }: { rows: Array<[string, any]> }) {
  return <div className="odx-field-grid">{rows.map(([label, value]) => <div key={label} className="odx-field"><span>{label}</span><strong>{value || '-'}</strong></div>)}</div>;
}

function ItemsTable({ lines, exportMode, currency, documentType }: { lines: AnyRow[]; exportMode: boolean; currency: string; documentType: string }) {
  return <table className="odx-items"><thead><tr><th>#</th><th>Product</th><th>{exportMode ? 'HS / ITC-HS' : 'HSN'}</th><th>Qty</th><th>UOM</th><th>Unit</th><th>{exportMode ? 'Declared value' : 'Taxable value'}</th></tr></thead><tbody>{lines.length ? lines.map((line, index) => <tr key={line.id ?? index}><td>{index + 1}</td><td><strong>{line.product_name_snapshot || 'Product line'}</strong><span>{line.sku_code || 'SKU pending'}</span></td><td>{line.hs_code || line.hsn_code || '-'}</td><td>{documentQuantity(line, documentType).toLocaleString('en-US')}</td><td>{line.unit_of_measure || 'Ctn'}</td><td>{money(unitPrice(line), currency)}</td><td>{money(lineTotal(line, documentType), currency)}</td></tr>) : <tr><td colSpan={7}>No order lines found for this tracked document.</td></tr>}</tbody></table>;
}

function SignatureBoxes({ exportMode }: { exportMode: boolean }) {
  const labels = exportMode ? ['Exporter Authorized Signatory', 'Company Stamp / Seal', 'Buyer / Consignee Acknowledgement'] : ['Authorized Signatory', 'Company Stamp', 'Buyer / Receiver Acknowledgement'];
  return <section className="odx-signatures">{labels.map((label) => <div key={label} className="odx-sign"><strong>{label}</strong><span>Signature / stamp / seal</span></div>)}</section>;
}

export default async function OrderDocumentPreviewPage({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  if (!hasSupabaseEnv) notFound();
  const resolvedParams = await params;
  const token = String(resolvedParams.token ?? '').trim();
  if (!token) notFound();

  const db = (await createClient()) as any;
  const { data: preview, error: previewError } = await db.rpc('get_order_document_preview_by_token', { p_share_token: token });
  if (previewError || !preview?.send) notFound();

  const send = preview.send ?? {};
  const org = preview.organization ?? {};
  const order = preview.order ?? {};
  const lead = preview.lead ?? {};
  const lines = Array.isArray(preview.lines) ? preview.lines : [];
  const documentType = String(send.document_type ?? 'order_confirmation').toLowerCase();
  const exportMode = isExportDoc(documentType, order);
  const title = docTitle(documentType, order.order_type);
  const currency = order.currency || (exportMode ? 'USD' : 'INR');
  const documentNo = `${exportMode ? 'EXP' : 'ORD'}-${order.order_number || String(send.id ?? '').slice(0, 8)}`;
  const subtotal = lines.reduce((sum: number, line: AnyRow) => sum + lineTotal(line, documentType), 0);
  const openCountAfterView = Number(send.open_count_after_view ?? send.open_count ?? 0);

  return <main className="odx-page">
    <aside className="odx-toolbar">
      <div>
        <span className="odx-kicker">SETU FLOW DOCUMENT</span>
        <strong>{title}</strong>
        <small>{documentNo} · tracked preview · {send.channel || 'manual link'}</small>
      </div>
      <div className="odx-toolbar-actions">
        <OrderPreviewPrintButton />
        <span>Browser print fallback remains available. Server PDF uses the free Puppeteer + Chromium path when generated from Orders.</span>
      </div>
    </aside>

    <section className="odx-sheet">
      <header className="odx-header">
        <div className="odx-brand">
          <div className="odx-logo">SF</div>
          <div>
            <strong>{org.name || org.display_name || 'SETU Flow CRM'}</strong>
            <span>{org.website || 'www.setuflowcrm.com'}</span>
          </div>
        </div>
        <div className="odx-doc-meta">
          <span>Document no.</span>
          <strong>{documentNo}</strong>
          <em>{titleCase(send.status)}</em>
        </div>
      </header>

      <section className="odx-hero">
        <div>
          <span>{exportMode ? 'Export document' : 'Regional document'}</span>
          <h1>{title}</h1>
          <p>Generated from the approved order execution workflow, tracked send history, and current order line snapshot.</p>
        </div>
        <div className="odx-total-card">
          <span>Total</span>
          <strong>{money(subtotal, currency)}</strong>
          <small>{currency} · live order snapshot</small>
        </div>
      </section>

      <section className="odx-party-grid">
        <article>
          <h2>{exportMode ? 'Seller / Exporter' : 'Seller / Supplier'}</h2>
          <FieldGrid rows={[
            [exportMode ? 'Exporter' : 'Seller', org.name || org.display_name || 'Organization'],
            ['Address', org.address || org.billing_address || org.metadata?.address || 'Configured in organization profile'],
            [exportMode ? 'GSTIN / IEC / PAN' : 'GSTIN / PAN', org.metadata?.gstin || org.tax_id || 'Configured in Admin'],
            ['Bank', org.metadata?.bank_details || 'Configured in Admin'],
          ]} />
        </article>
        <article>
          <h2>Buyer / Consignee</h2>
          <FieldGrid rows={[
            [exportMode ? 'Importer / Buyer' : 'Buyer', lead.company_name || 'Buyer pending'],
            ['Contact', [lead.contact_name, lead.email, lead.whatsapp, lead.phone].filter(Boolean).join(', ') || 'Contact pending'],
            ['Ship To', order.destination_place || lead.country || 'Destination pending'],
            ['Reference', order.buyer_reference || '-'],
          ]} />
        </article>
      </section>

      <section className="odx-summary">
        <h2>{exportMode ? 'Export and shipment summary' : 'Commercial and delivery summary'}</h2>
        <FieldGrid rows={exportMode ? [
          ['Incoterm / Named place', `${order.incoterm || 'FOB'} ${order.origin_place || 'Named place pending'}`],
          ['Port of Loading', order.origin_place || 'Port pending'],
          ['Port of Discharge', order.destination_port || 'Destination port pending'],
          ['Origin / Destination', `India / ${lead.country || 'Destination country pending'}`],
        ] : [
          ['Place of Supply', order.destination_place || lead.country || 'Place of supply pending'],
          ['Tax type', 'GST/VAT/Sales tax by line category/HSN as configured'],
          ['Delivery term', `${order.incoterm || 'DAP'} ${order.destination_place || 'Buyer warehouse'}`],
          ['Payment terms', order.payment_terms || 'Configured on order'],
        ]} />
      </section>

      <section>
        <h2>{exportMode ? 'Line items - declared customs values' : 'Line items - tax by HSN/category'}</h2>
        <ItemsTable lines={lines} exportMode={exportMode} currency={currency} documentType={documentType} />
        <div className="odx-totals">
          <div><span>{exportMode ? 'Declared / FOB value' : 'Taxable value'}</span><strong>{money(subtotal, currency)}</strong></div>
          <div><span>{exportMode ? 'Freight / Insurance' : 'Tax total'}</span><strong>{exportMode ? 'As per Incoterm' : 'By org tax profile'}</strong></div>
          <div><span>Total</span><strong>{money(subtotal, currency)}</strong></div>
        </div>
      </section>

      <SignatureBoxes exportMode={exportMode} />

      <section className="odx-terms">
        <h2>Key terms</h2>
        <ul>{compactTerms(exportMode).map((term) => <li key={term}>{term}</li>)}</ul>
      </section>

      <footer className="odx-footer">
        <span>Tracked link: {fmtDate(send.sent_at)} · {send.recipient || 'recipient pending'}</span>
        <span>Open count after this view: {openCountAfterView}</span>
      </footer>
    </section>
    <style>{styles}</style>
  </main>;
}

const styles = `@page{size:A4;margin:10mm}.odx-page{min-height:100vh;background:#eef4f8;padding:24px;color:#123047;font-family:Inter,Arial,sans-serif}.odx-toolbar{max-width:1040px;margin:0 auto 16px;background:#082f49;color:white;border-radius:24px;box-shadow:0 18px 42px #0f172a22;padding:16px 18px;display:flex;justify-content:space-between;gap:18px;align-items:center}.odx-kicker{display:block;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#7dd3fc}.odx-toolbar strong{display:block;margin-top:4px;font-size:20px}.odx-toolbar small{display:block;margin-top:3px;color:#cbd5e1}.odx-toolbar-actions{display:flex;flex-direction:column;align-items:flex-end;gap:6px;text-align:right}.odx-toolbar button{border:0;border-radius:999px;background:white;color:#082f49;padding:10px 16px;font-size:12px;font-weight:900;cursor:pointer}.odx-toolbar-actions span{max-width:340px;color:#dbeafe;font-size:11px}.odx-sheet{max-width:1040px;margin:0 auto 18px;background:white;border:1px solid #cfe0ea;border-radius:26px;box-shadow:0 18px 42px #0f172a14;padding:30px}.odx-header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:18px}.odx-brand{display:flex;align-items:center;gap:12px}.odx-logo{width:44px;height:44px;border-radius:16px;background:#082f49;color:white;display:grid;place-items:center;font-weight:900}.odx-brand strong{display:block;font-size:17px;color:#0f172a}.odx-brand span{display:block;margin-top:2px;font-size:12px;color:#64748b}.odx-doc-meta{text-align:right}.odx-doc-meta span,.odx-doc-meta em{display:block;font-size:11px;color:#64748b;font-style:normal}.odx-doc-meta strong{display:block;margin:3px 0;font-size:18px;color:#0f172a}.odx-doc-meta em{display:inline-block;border:1px solid #bbf7d0;background:#ecfdf5;color:#047857;border-radius:999px;padding:4px 9px;font-weight:800}.odx-hero{display:grid;grid-template-columns:1fr 260px;gap:24px;margin:24px 0}.odx-hero span{font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#0c7fff}.odx-hero h1{font-size:36px;line-height:1.02;letter-spacing:-.05em;color:#0f172a;margin:8px 0}.odx-hero p{margin:0;color:#64748b;max-width:620px}.odx-total-card{border-radius:22px;background:linear-gradient(135deg,#0c7fff,#082f49);color:white;padding:20px;box-shadow:0 18px 34px #0c7fff26}.odx-total-card span,.odx-total-card small{display:block;color:#dbeafe;font-size:12px}.odx-total-card strong{display:block;margin:8px 0;font-size:26px}.odx-party-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.odx-party-grid article,.odx-summary,.odx-terms{border:1px solid #e2e8f0;border-radius:22px;background:#f8fbfd;padding:18px}.odx-sheet h2{font-size:16px;color:#0f172a;margin:0 0 12px}.odx-field-grid{display:grid;gap:8px}.odx-field{border:1px solid #e2e8f0;background:white;border-radius:14px;padding:10px}.odx-field span{display:block;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8}.odx-field strong{display:block;margin-top:4px;font-size:12px;color:#334155}.odx-summary{margin:16px 0}.odx-summary .odx-field-grid{grid-template-columns:repeat(2,1fr)}.odx-items{width:100%;border-collapse:separate;border-spacing:0;margin-top:8px;overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;font-size:12px}.odx-items th{background:#082f49;color:white;text-align:left;padding:11px;font-size:10px;letter-spacing:.08em;text-transform:uppercase}.odx-items td{border-top:1px solid #e2e8f0;padding:11px;vertical-align:top}.odx-items td strong,.odx-items td span{display:block}.odx-items td span{margin-top:2px;color:#94a3b8;font-size:11px}.odx-items tr:nth-child(even) td{background:#f8fbfd}.odx-totals{width:min(420px,100%);margin:16px 0 0 auto;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden}.odx-totals div{display:flex;justify-content:space-between;gap:16px;padding:11px 14px;border-top:1px solid #e2e8f0}.odx-totals div:first-child{border-top:0}.odx-totals div:last-child{background:#eaf3fb;font-size:15px}.odx-totals span{font-weight:800;color:#64748b}.odx-totals strong{color:#0f172a}.odx-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:22px 0}.odx-sign{height:112px;border:1px dashed #cbd5e1;border-radius:18px;background:#f8fafc;display:flex;flex-direction:column;justify-content:space-between;padding:12px;font-size:12px}.odx-sign strong{color:#0f172a}.odx-sign span{color:#94a3b8}.odx-terms{margin-top:12px}.odx-terms ul{margin:0;padding-left:18px;color:#475569;font-size:12px;line-height:1.6}.odx-footer{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #e2e8f0;margin-top:18px;padding-top:12px;color:#64748b;font-size:11px}@media print{.odx-toolbar{display:none}.odx-page{background:white;padding:0}.odx-sheet{box-shadow:none;border-radius:0;margin:0;padding:0;border:0}.odx-hero{margin:12px 0}.odx-hero h1{font-size:25px}.odx-sign{height:82px}.odx-items,.odx-field strong,.odx-terms ul{font-size:9px}.odx-field{padding:6px}.odx-footer{font-size:8px}.odx-page *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@media(max-width:780px){.odx-page{padding:12px}.odx-toolbar,.odx-header{display:block}.odx-toolbar-actions{align-items:flex-start;text-align:left;margin-top:12px}.odx-hero,.odx-party-grid,.odx-summary .odx-field-grid,.odx-signatures{grid-template-columns:1fr}.odx-sheet{padding:18px}.odx-doc-meta{text-align:left;margin-top:12px}}`;
