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
    .join(' ') || '—';
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency = 'USD') {
  return `${currency} ${num(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

function terms(exportMode: boolean) {
  return exportMode
    ? [
        'Export documents are subject to buyer, bank, customs, and destination-country requirements.',
        'Incoterm and named place define cost, risk transfer, insurance, and customs responsibility.',
        'Buyer/importer is responsible for import duty and local taxes unless agreed otherwise.',
        'HS/ITC-HS, origin, value, weights, package marks, and shipment details must be confirmed before dispatch.',
      ]
    : [
        'Prices and taxes are subject to final invoice and applicable place-of-supply rules.',
        'Dispatch is subject to payment/credit release, stock, and approved actual order lines.',
        'Shortage or damage claims require written notice with evidence within the agreed claim window.',
        'Goods must be handled and stored as per product label and agreed conditions.',
      ];
}

function annexure(exportMode: boolean) {
  return exportMode
    ? [
        'This document is subject to final seller acceptance, export eligibility, packing approval, payment release, and availability of required export/import documents.',
        'Incoterms rule and named place determine allocation of costs, risks, transport, insurance, export/import formalities, packaging, marking, and related obligations.',
        'Export under LUT/without IGST or export on payment of IGST must be configured per organization and shipment. Buyer remains responsible for import duties, taxes, licenses, clearance, and local compliance unless explicitly agreed otherwise.',
        'Special documents such as certificate of origin, inspection, phytosanitary, fumigation, insurance, bank documents, or chamber certificates apply when required by product, country, buyer, bank, or freight terms.',
      ]
    : [
        'This document is subject to final seller acceptance, stock availability, credit/payment release, and applicable taxes at dispatch.',
        'Taxes are shown using GST/VAT/sales-tax style fields. Actual rates, exemptions, place-of-supply rules, e-invoice, and e-way bill obligations must be configured per organization and jurisdiction.',
        'Goods once dispatched are subject to the agreed return/replacement policy, quality claim window, and documented proof of discrepancy or damage.',
        'Risk transfers according to the agreed delivery term and named place. Title transfer, if different from risk transfer, must be defined by organization terms.',
      ];
}

function quantity(line: AnyRow) {
  return num(line.dispatched_quantity ?? line.approved_quantity ?? line.ordered_quantity ?? line.quoted_quantity);
}

function unitPrice(line: AnyRow) {
  return num(line.unit_price);
}

function lineTotal(line: AnyRow) {
  const stored = num(line.line_total);
  return stored || quantity(line) * unitPrice(line);
}

function FieldTable({ rows }: { rows: Array<[string, any]> }) {
  return <table className="odx-field"><tbody>{rows.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value || '—'}</td></tr>)}</tbody></table>;
}

function ItemsTable({ lines, exportMode, currency }: { lines: AnyRow[]; exportMode: boolean; currency: string }) {
  return <table className="odx-items"><thead><tr><th>#</th><th>SKU</th><th>Description</th><th>{exportMode ? 'HS / ITC-HS' : 'HSN'}</th><th>Origin</th><th>Qty</th><th>UOM</th><th>Unit</th><th>{exportMode ? 'Declared value' : 'Taxable value'}</th><th>{exportMode ? 'Tax / duty note' : 'Tax note'}</th></tr></thead><tbody>{lines.length ? lines.map((line, index) => <tr key={line.id ?? index}><td>{index + 1}</td><td>{line.sku_code || '—'}</td><td>{line.product_name_snapshot || 'Product line'}</td><td>{line.hs_code || line.hsn_code || '—'}</td><td>{line.product_snapshot?.origin_country || 'India'}</td><td>{quantity(line).toLocaleString()}</td><td>{line.unit_of_measure || 'Ctn'}</td><td>{money(unitPrice(line), currency)}</td><td>{money(lineTotal(line), currency)}</td><td>{exportMode ? 'Zero-rated/LUT or IGST as configured; import duty for buyer' : 'GST/VAT/CGST/SGST/IGST by HSN/category'}</td></tr>) : <tr><td colSpan={10}>No order lines found for this tracked document.</td></tr>}</tbody></table>;
}

function SignatureBoxes({ exportMode }: { exportMode: boolean }) {
  const labels = exportMode ? ['Exporter Authorized Signatory', 'Company Stamp / Seal', 'Customs / Chamber Placeholder'] : ['Authorized Signatory', 'Company Stamp', 'Buyer / Receiver Acknowledgement'];
  return <section className="odx-signatures">{labels.map((label) => <div key={label} className="odx-sign"><strong>{label}</strong><span>Signature / stamp / seal</span></div>)}</section>;
}

function Terms({ exportMode }: { exportMode: boolean }) {
  return <section className="odx-terms"><strong>Key terms - compact page 1 only</strong><ul>{terms(exportMode).map((term) => <li key={term}>{term}</li>)}</ul></section>;
}

function Annexure({ title, exportMode }: { title: string; exportMode: boolean }) {
  return <section className="odx-annexure"><h2>Annexure - Terms, declarations, and configuration notes</h2><p>{title} default terms. Final terms must be managed per organization in Admin.</p><ol>{annexure(exportMode).map((term) => <li key={term}>{term}</li>)}</ol><FieldTable rows={[
    ['Future Admin page', 'Admin - Document Templates - Terms & Conditions'],
    ['Template controls', 'Regional/export family, document type, org country, tax profile, declarations, bank details, stamp/signature settings.'],
    ['Compliance controls', 'COO, inspection, phytosanitary, fumigation, insurance, bank docs, destination control text, buyer/bank requirements.'],
  ]} /></section>;
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
  const documentNo = `${exportMode ? 'EXP' : 'REG'}-${order.order_number || String(send.id ?? '').slice(0, 8)}`;
  const subtotal = lines.reduce((sum: number, line: AnyRow) => sum + lineTotal(line), 0);
  const openCountAfterView = Number(send.open_count_after_view ?? send.open_count ?? 0);

  return <main className="odx-page">
    <aside className="odx-toolbar"><div><strong>{title}</strong><span>{documentNo}</span></div><OrderPreviewPrintButton /><small>Uses the approved v3 preview as the source. In the print dialog, choose Save as PDF.</small></aside>
    <section className="odx-document">
      <header className="odx-doc-head"><div><b>SETU Flow - Document Preview</b><span>Token-based tracked preview. No workspace route required.</span></div><em>www.setuflowcrm.com</em></header>
      <h1>{title}</h1>
      <p className="odx-subtitle">Generated from structured order data, accepted quote lineage, line-level tax/customs placeholders, and send/open tracking.</p>
      <div className="odx-banner"><strong>{exportMode ? 'EXPORT DOCUMENT' : 'REGIONAL DOCUMENT'}</strong><strong>{documentNo}</strong><strong>Status: {titleCase(send.status)}</strong></div>

      <section className="odx-parties"><div><h2>{exportMode ? 'Seller / Exporter' : 'Seller / Supplier'}</h2><FieldTable rows={[
        [exportMode ? 'Exporter' : 'Seller', org.name || org.display_name || 'Organization'],
        ['Address', org.address || org.billing_address || org.metadata?.address || 'Address configured in organization profile'],
        [exportMode ? 'GSTIN / IEC / PAN' : 'GSTIN / PAN', org.metadata?.gstin || org.tax_id || 'Configured in Admin'],
        [exportMode ? 'AD Code / LUT ARN' : 'State / Place', exportMode ? (org.metadata?.ad_code || org.metadata?.lut_arn || 'Configured in Admin') : (org.metadata?.state || org.metadata?.country || 'Configured in Admin')],
        ['Bank', org.metadata?.bank_details || 'Bank details configured in Admin'],
      ]} /></div><div><h2>Buyer / Consignee</h2><FieldTable rows={[
        [exportMode ? 'Importer / Buyer' : 'Buyer', lead.company_name || 'Buyer pending'],
        ['Contact', [lead.contact_name, lead.email, lead.whatsapp, lead.phone].filter(Boolean).join(', ') || 'Contact pending'],
        ['Ship To / Consignee', order.destination_place || lead.country || 'Destination pending'],
        ['Notify Party', exportMode ? 'Same as consignee / nominated forwarder' : 'Not applicable'],
        ['Buyer reference', order.buyer_reference || '—'],
      ]} /></div></section>

      <section><h2>{exportMode ? 'Export, tax, and shipment summary' : 'Commercial, tax, and delivery summary'}</h2><FieldTable rows={exportMode ? [
        ['Incoterm / Named place', `${order.incoterm || 'FOB'} ${order.origin_place || 'Named place pending'}`],
        ['Port of Loading', order.origin_place || 'Port pending'],
        ['Port of Discharge', order.destination_port || 'Destination port pending'],
        ['Origin / Destination', `India / ${lead.country || 'Destination country pending'}`],
        ['Currency / FX', `${currency} / FX configured per organization`],
        ['Importer duties/taxes', 'For buyer/importer account unless agreed otherwise'],
      ] : [
        ['Place of Supply', order.destination_place || lead.country || 'Place of supply pending'],
        ['Tax type', 'GST/VAT/Sales tax by line category/HSN as configured'],
        ['E-invoice / IRN', 'Generated if applicable'],
        ['E-way bill', 'Generated when applicable'],
        ['Delivery term', `${order.incoterm || 'DAP'} ${order.destination_place || 'Buyer warehouse'}`],
        ['Payment terms', order.payment_terms || 'Configured on order'],
      ]} /></section>

      <section><h2>{exportMode ? 'Line items - declared customs values' : 'Line items - tax by HSN/category'}</h2><ItemsTable lines={lines} exportMode={exportMode} currency={currency} /><table className="odx-total"><tbody><tr><th>{exportMode ? 'Declared / FOB value' : 'Taxable value'}</th><td>{money(subtotal, currency)}</td></tr><tr><th>{exportMode ? 'Freight / Insurance' : 'Tax total'}</th><td>{exportMode ? 'As per Incoterm / freight invoice' : 'Calculated by org tax profile'}</td></tr><tr><th>Total</th><td>{money(subtotal, currency)}</td></tr></tbody></table></section>

      <SignatureBoxes exportMode={exportMode} />
      <Terms exportMode={exportMode} />
      <footer className="odx-footer"><span>Tracked link: {fmtDate(send.sent_at)} · {send.channel}{send.recipient ? ` · ${send.recipient}` : ''}</span><span>Open count after this view: {openCountAfterView}</span></footer>
    </section>
    <Annexure title={title} exportMode={exportMode} />
    <style>{styles}</style>
  </main>;
}

const styles = `@page{size:A4;margin:10mm}.odx-page{min-height:100vh;background:#eef4f8;padding:24px;color:#123047;font-family:Inter,Arial,sans-serif}.odx-toolbar{max-width:1040px;margin:0 auto 14px;background:#082f49;color:white;border-radius:18px;box-shadow:0 12px 30px #0f172a20;padding:14px 16px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center}.odx-toolbar strong,.odx-toolbar span,.odx-toolbar small{display:block}.odx-toolbar span{color:#bfdbfe;font-size:12px;margin-top:3px}.odx-toolbar small{grid-column:1/-1;color:#dbeafe;font-size:11px}.odx-toolbar button{border:0;border-radius:999px;background:white;color:#082f49;padding:10px 14px;font-size:12px;font-weight:900;cursor:pointer}.odx-document,.odx-annexure{max-width:1040px;margin:0 auto 18px;background:white;border:1px solid #cfe0ea;border-radius:10px;box-shadow:0 12px 30px #0f172a12;padding:22px}.odx-doc-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #dbe7f3;padding-bottom:8px;font-size:11px;color:#64748b}.odx-doc-head b{color:#0b3d5c}.odx-doc-head span{margin-left:8px}.odx-doc-head em{font-style:normal;color:#64748b}.odx-document h1{font-size:30px;letter-spacing:-.04em;margin:22px 0 4px;color:#0b3d5c}.odx-subtitle{font-size:12px;color:#64748b;margin:0 0 12px}.odx-banner{display:grid;grid-template-columns:1fr 1fr 1fr;background:#eaf3fb;border:1px solid #c9dce8;margin:10px 0 18px}.odx-banner strong{padding:8px 10px;font-size:11px;text-transform:uppercase;color:#123047}.odx-parties{display:grid;grid-template-columns:1fr 1fr;gap:22px}.odx-document h2,.odx-annexure h2{font-size:17px;color:#0b3d5c;margin:16px 0 7px}.odx-annexure h3{font-size:14px;color:#0b3d5c;margin:18px 0 7px}.odx-field,.odx-items,.odx-total{width:100%;border-collapse:collapse;font-size:11px}.odx-field th,.odx-field td,.odx-items th,.odx-items td,.odx-total th,.odx-total td{border:1px solid #cfe0ea;padding:6px;vertical-align:top}.odx-field th{width:30%;text-align:left;color:#0b5c8e;background:#f8fbfd}.odx-items th{background:#075f94;color:white;text-align:left;font-size:10px}.odx-items tr:nth-child(even) td{background:#f8fbfd}.odx-total{width:48%;margin:12px 0 0 auto}.odx-total th{text-align:left;background:#f8fbfd}.odx-total tr:last-child th,.odx-total tr:last-child td{background:#eaf3fb;font-weight:800}.odx-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:18px 0}.odx-sign{height:112px;border:1px solid #cfe0ea;display:flex;flex-direction:column;justify-content:space-between;padding:10px;font-size:11px}.odx-sign strong{color:#123047}.odx-sign span{color:#64748b}.odx-terms{border:1px solid #cfe0ea;background:#f8fbfd;margin-top:12px;padding:10px;font-size:11px}.odx-terms strong{color:#123047}.odx-terms ul{margin:7px 0 0;padding-left:18px;line-height:1.55}.odx-annexure{page-break-before:always}.odx-annexure p,.odx-annexure li{font-size:12px;color:#334155;line-height:1.55}.odx-annexure ol{padding-left:18px}.odx-footer{display:flex;justify-content:space-between;border-top:1px solid #dbe7f3;margin-top:16px;padding-top:8px;color:#64748b;font-size:10px}@media print{.odx-toolbar{display:none}.odx-page{background:white;padding:0}.odx-document,.odx-annexure{box-shadow:none;border-radius:0;margin:0 0 8mm;padding:0;border:0}.odx-document h1{font-size:24px}.odx-sign{height:88px}.odx-items,.odx-field,.odx-total{font-size:9px}.odx-doc-head{font-size:9px}.odx-terms{font-size:9px}.odx-footer{font-size:8px}}@media(max-width:760px){.odx-page{padding:12px}.odx-toolbar,.odx-parties,.odx-banner,.odx-signatures{grid-template-columns:1fr}.odx-total{width:100%}}`;
