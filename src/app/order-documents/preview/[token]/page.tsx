import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';

function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || '—';
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency = 'USD') {
  const amount = num(value);
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(value: unknown) {
  const amount = num(value);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function isExportOrder(order: any, documentType: string) {
  const explicit = String(order?.order_type ?? '').toLowerCase();
  return explicit === 'export' || ['proforma_invoice', 'commercial_invoice', 'export_commercial_invoice'].includes(documentType);
}

function normalizeProfileDocType(documentType: string, exportMode: boolean) {
  if (documentType === 'order_confirmation') return 'order_confirmation';
  if (documentType === 'proforma_invoice') return 'proforma_invoice';
  if (documentType === 'dispatch_invoice') return exportMode ? 'dispatch_invoice' : 'dispatch_invoice';
  if (documentType === 'packing_sheet') return exportMode ? 'packing_list' : 'packing_picklist_qc';
  if (documentType === 'packing_list') return 'packing_list';
  if (documentType === 'delivery_note') return 'delivery_note';
  if (documentType === 'freight_request') return 'freight_request';
  return documentType || (exportMode ? 'proforma_invoice' : 'order_confirmation');
}

function documentTitle(documentType: string, exportMode: boolean) {
  if (!exportMode && documentType === 'order_confirmation') return 'Regional Order Confirmation';
  if (!exportMode && documentType === 'packing_sheet') return 'Regional Packing / Picklist / QC Sheet';
  if (!exportMode && documentType === 'delivery_note') return 'Regional Delivery Note';
  if (!exportMode && documentType === 'dispatch_invoice') return 'Regional Tax / Dispatch Invoice';
  if (exportMode && documentType === 'proforma_invoice') return 'Export Proforma Invoice';
  if (exportMode && (documentType === 'packing_sheet' || documentType === 'packing_list')) return 'Export Packing List';
  if (exportMode && documentType === 'freight_request') return 'Freight Rate Request / Shipment Instruction';
  if (exportMode && documentType === 'dispatch_invoice') return 'Export Commercial / Dispatch Invoice';
  return titleCase(documentType);
}

function templateCode(documentType: string, exportMode: boolean, orderNumber: string) {
  const suffix = orderNumber || 'ORDER';
  if (!exportMode && documentType === 'order_confirmation') return ['REGIONAL / DOMESTIC', `OC-${suffix}`];
  if (!exportMode && documentType === 'packing_sheet') return ['REGIONAL WAREHOUSE', `PK-QC-${suffix}`];
  if (!exportMode && documentType === 'delivery_note') return ['REGIONAL DELIVERY', `DN-${suffix}`];
  if (!exportMode && documentType === 'dispatch_invoice') return ['REGIONAL TAX INVOICE', `INV-${suffix}`];
  if (exportMode && documentType === 'proforma_invoice') return ['EXPORT PROFORMA', `PI-${suffix}`];
  if (exportMode && (documentType === 'packing_sheet' || documentType === 'packing_list')) return ['EXPORT PACKING LIST', `PL-${suffix}`];
  if (exportMode && documentType === 'freight_request') return ['FREIGHT REQUEST', `FRR-${suffix}`];
  if (exportMode && documentType === 'dispatch_invoice') return ['EXPORT COMMERCIAL INVOICE', `CI-${suffix}`];
  return [exportMode ? 'EXPORT DOCUMENT' : 'REGIONAL DOCUMENT', suffix];
}

function defaultPageOneTerms(exportMode: boolean) {
  return exportMode ? [
    'Export documents subject to buyer/importer, bank, customs, and country-specific requirements.',
    'Incoterm and named place define costs, risk transfer, insurance, and customs responsibility.',
    'Buyer/importer responsible for import duty/taxes unless expressly agreed otherwise.',
    'Final shipping data, weights, marks, and HS/ITC-HS details must be confirmed before dispatch.',
  ] : [
    'Prices and taxes subject to final invoice and applicable place-of-supply rules.',
    'Dispatch subject to payment/credit release, stock, and approved actual order lines.',
    'Shortage/damage claims require written notice with evidence within agreed claim window.',
    'Goods to be handled and stored as per product label and agreed conditions.',
  ];
}

function defaultAnnexure(exportMode: boolean) {
  return exportMode ? [
    'This document is subject to final seller acceptance, export eligibility, packing approval, payment/release conditions, and availability of required export/import documents.',
    'Incoterms rule and named place determine allocation of costs, risks, transport, insurance, export/import formalities, packaging, marking, and related obligations.',
    'Export under LUT/without IGST or export on payment of IGST must be configured per organization and shipment. Buyer remains responsible for import customs duties, taxes, licenses, clearance, and local compliance unless explicitly agreed otherwise.',
    'HS/ITC-HS, origin, description, declared value, weights, and package details must be checked before shipment. Customs authorities or importing-country rules may require additional data, copies, language, or certifications.',
    'Special documents such as certificate of origin, inspection certificate, phytosanitary/fumigation/health certificate, insurance certificate, or bank documents apply only when required by product, country, buyer, bank, or freight terms.',
    'Any changes after document approval require document revision and may affect quote/order version lineage, customs values, freight rates, delivery schedule, or payment release.',
  ] : [
    'This document is subject to final seller acceptance, stock availability, credit/payment release, and applicable taxes at the time of dispatch.',
    'Taxes are shown using GST/VAT style fields. Actual rates, exemptions, place-of-supply rules, and e-invoice/e-way bill obligations must be configured per organization and jurisdiction.',
    'Goods once dispatched are subject to the agreed return/replacement policy, quality claim window, and documented proof of discrepancy or damage.',
    'Risk transfers according to the agreed delivery term and named place. Title transfer, if different from risk transfer, must be defined by organization terms.',
    'Any changes to product, quantity, price, tax treatment, delivery address, or delivery date require written confirmation and may require document revision.',
    'Buyer is responsible for unloading, storage, local permits, resale compliance, and downstream taxes unless expressly agreed otherwise.',
  ];
}

function getLineQty(line: any, documentType: string) {
  if (['packing_sheet', 'packing_list'].includes(documentType)) return num(line.packed_quantity || line.approved_quantity || line.ordered_quantity || line.quoted_quantity);
  if (documentType === 'delivery_note') return num(line.loaded_quantity || line.dispatched_quantity || line.packed_quantity || line.ordered_quantity || line.quoted_quantity);
  if (documentType === 'dispatch_invoice') return num(line.dispatched_quantity || line.approved_quantity || line.ordered_quantity || line.quoted_quantity);
  return num(line.ordered_quantity || line.approved_quantity || line.quoted_quantity);
}

function taxRateFor(line: any, exportMode: boolean) {
  if (exportMode) return 0;
  const snapshotRate = line?.pricing_snapshot?.tax_rate ?? line?.product_snapshot?.tax_rate;
  return Number.isFinite(Number(snapshotRate)) ? Number(snapshotRate) : 12;
}

function signatureLabels(documentType: string, exportMode: boolean) {
  if (!exportMode && documentType === 'packing_sheet') return ['Picked By', 'QC Checked By', 'Warehouse Release Stamp'];
  if (!exportMode && documentType === 'delivery_note') return ['Seller Dispatch Stamp', 'Transporter Acknowledgement', 'Buyer Receiver Stamp'];
  if (!exportMode && documentType === 'dispatch_invoice') return ['Authorized Signatory', 'Company Stamp', 'Buyer / Accounts Acknowledgement'];
  if (exportMode && (documentType === 'packing_sheet' || documentType === 'packing_list')) return ['Packing Supervisor', 'QC / Weight Check', 'Exporter Stamp'];
  if (exportMode && documentType === 'dispatch_invoice') return ['Exporter Authorized Signatory', 'Company Stamp / Seal', 'Customs / Chamber Stamp Placeholder'];
  if (exportMode) return ['Exporter Signatory', 'Company Stamp', 'Buyer Acceptance / Bank Review'];
  return ['Seller Authorized Signatory', 'Company Stamp', 'Buyer Acceptance'];
}

function maybeArray(value: any, fallback: string[]) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function FieldTable({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <table className="odx-field"><tbody>{rows.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value || '—'}</td></tr>)}</tbody></table>;
}

function SignatureBoxes({ labels }: { labels: string[] }) {
  return <section className="odx-signatures">{labels.map((label) => <div key={label} className="odx-sign"><strong>{label}</strong><span>Signature / stamp / seal</span></div>)}</section>;
}

function TermsBlock({ terms }: { terms: string[] }) {
  return <section className="odx-terms"><strong>Key terms - compact page 1 only</strong><ul>{terms.map((term) => <li key={term}>{term}</li>)}</ul></section>;
}

function Annexure({ title, terms, profile }: { title: string; terms: string[]; profile: any }) {
  return <section className="odx-annexure">
    <h2>Annexure - Draft Terms, Declarations and Configuration Notes</h2>
    <p>{title} - default clauses. Final terms must be managed per organization in Admin.</p>
    <ol>{terms.map((term) => <li key={term}>{term}</li>)}</ol>
    <h3>Admin-managed fields to support later</h3>
    <FieldTable rows={[
      ['Document terms profile', 'Regional/export, document type, buyer category, product/category, country pair, incoterm, payment terms.'],
      ['Tax profile', JSON.stringify(profile?.tax_profile ?? { note: 'GST/VAT/sales tax, zero-rated export/LUT, IGST paid/refund, duty/import-tax notes, category/HSN rates.' })],
      ['Identity fields', JSON.stringify(profile?.identity_fields ?? { note: 'GSTIN/VAT/TRN, IEC, PAN, AD code, LUT ARN, bank details, company stamp, signature image.' })],
      ['Compliance fields', 'COO, inspection, phytosanitary, fumigation, insurance, bank docs, destination control text, buyer/bank requirements.'],
      ['Rendering rules', 'Long item continuation pages, carried-forward totals, annexure terms, stamp/signature zones.'],
    ]} />
    <SignatureBoxes labels={['Authorized Signatory', 'Company Seal', 'Buyer / Receiver Acknowledgement']} />
  </section>;
}

function ItemsTable({ lines, exportMode, documentType, currency }: { lines: any[]; exportMode: boolean; documentType: string; currency: string }) {
  if (documentType === 'packing_sheet' || documentType === 'packing_list') {
    return <table className="odx-items"><thead><tr><th>#</th><th>Package / SKU</th><th>Description</th><th>Cartons</th><th>Units</th><th>Net kg</th><th>Gross kg</th><th>CBM</th><th>Marks / QC</th></tr></thead><tbody>{lines.map((line, index) => {
      const qty = getLineQty(line, documentType);
      return <tr key={line.id ?? index}><td>{index + 1}</td><td>{line.sku_code || line.product_name_snapshot || `Pallet ${index + 1}`}</td><td>{line.product_name_snapshot || 'Product line'}</td><td>{qty.toLocaleString()} {line.unit_of_measure || ''}</td><td>{(qty * 24).toLocaleString()} pcs</td><td>{(qty * 1.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{(qty * 1.75).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{(qty * 0.008).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{line.product_snapshot?.marks || line.line_status || 'Warehouse stamp'}</td></tr>;
    })}</tbody></table>;
  }

  if (documentType === 'delivery_note') {
    return <table className="odx-items"><thead><tr><th>#</th><th>SKU</th><th>Description</th><th>HSN</th><th>Qty</th><th>UOM</th><th>Packages</th><th>Net Wt kg</th><th>Gross Wt kg</th><th>Condition</th></tr></thead><tbody>{lines.map((line, index) => {
      const qty = getLineQty(line, documentType);
      return <tr key={line.id ?? index}><td>{index + 1}</td><td>{line.sku_code || '—'}</td><td>{line.product_name_snapshot || 'Product line'}</td><td>{line.hsn_code || line.hs_code || '—'}</td><td>{qty.toLocaleString()}</td><td>{line.unit_of_measure || 'Ctn'}</td><td>{Math.max(1, Math.ceil(qty / 100))} pallets</td><td>{(qty * 1.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{(qty * 1.75).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td><td>{line.line_status || 'Good'}</td></tr>;
    })}</tbody></table>;
  }

  return <table className="odx-items"><thead><tr><th>#</th><th>SKU</th><th>Description</th><th>{exportMode ? 'HS / ITC-HS' : 'HSN'}</th><th>Origin</th><th>Qty</th><th>UOM</th><th>Unit</th><th>{exportMode ? 'Declared Value' : 'Taxable Value'}</th><th>{exportMode ? 'GST/IGST' : 'Tax'}</th><th>{exportMode ? 'Duty/Import Taxes' : 'Line Total'}</th></tr></thead><tbody>{lines.map((line, index) => {
    const qty = getLineQty(line, documentType);
    const unit = num(line.unit_price);
    const taxable = num(line.line_total) || qty * unit;
    const rate = taxRateFor(line, exportMode);
    const tax = taxable * rate / 100;
    return <tr key={line.id ?? index}><td>{index + 1}</td><td>{line.sku_code || '—'}</td><td>{line.product_name_snapshot || 'Product line'}</td><td>{line.hs_code || line.hsn_code || '—'}</td><td>{line.product_snapshot?.origin_country || 'India'}</td><td>{qty.toLocaleString()}</td><td>{line.unit_of_measure || 'Ctn'}</td><td>{money(unit, currency)}</td><td>{money(taxable, currency)}</td><td>{exportMode ? 'Zero-rated / LUT' : `${pct(rate)} / ${money(tax, currency)}`}</td><td>{exportMode ? 'Buyer import duty' : money(taxable + tax, currency)}</td></tr>;
  })}</tbody></table>;
}

function Totals({ lines, exportMode, documentType, currency }: { lines: any[]; exportMode: boolean; documentType: string; currency: string }) {
  const taxable = lines.reduce((sum, line) => sum + (num(line.line_total) || getLineQty(line, documentType) * num(line.unit_price)), 0);
  const tax = exportMode ? 0 : lines.reduce((sum, line) => sum + ((num(line.line_total) || getLineQty(line, documentType) * num(line.unit_price)) * taxRateFor(line, exportMode) / 100), 0);
  if (documentType === 'packing_sheet' || documentType === 'packing_list' || documentType === 'delivery_note') return null;
  return <table className="odx-total"><tbody>{exportMode ? <>
    <tr><th>FOB / declared value</th><td>{money(taxable, currency)}</td></tr>
    <tr><th>Freight</th><td>As per freight invoice / terms</td></tr>
    <tr><th>Insurance</th><td>As per Incoterm / buyer instruction</td></tr>
    <tr><th>Total for customs</th><td>{money(taxable, currency)} plus applicable charges</td></tr>
    <tr><th>INR equivalent sample</th><td>Configured per organization FX profile</td></tr>
  </> : <>
    <tr><th>Taxable value</th><td>{money(taxable, currency)}</td></tr>
    <tr><th>CGST / SGST / IGST sample total</th><td>{money(tax, currency)}</td></tr>
    <tr><th>Round off</th><td>{money(0, currency)}</td></tr>
    <tr><th>Grand total</th><td>{money(taxable + tax, currency)}</td></tr>
  </>}</tbody></table>;
}

export default async function OrderDocumentPreviewPage({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  if (!hasSupabaseEnv) notFound();
  const resolvedParams = await params;
  const token = String(resolvedParams.token ?? '').trim();
  if (!token) notFound();

  const db = (await createClient()) as any;
  const { data: send } = await db
    .from('order_document_sends')
    .select('id, organization_id, order_id, order_document_id, document_type, channel, recipient, recipient_role, note, status, share_url, sent_at, opened_at, open_count, metadata, order_documents(id, version_no, status, approved_at, source_snapshot), orders(id, order_number, order_type, current_stage, source_quote_id, source_quote_version_id, currency, total_order_value, incoterm, payment_terms, origin_place, destination_place, destination_port, buyer_reference, customer_notes, leads(company_name, contact_name, country, email, phone))')
    .eq('share_token', token)
    .maybeSingle();

  if (!send?.id) notFound();

  const [orgResult, linesResult] = await Promise.all([
    db.from('organizations').select('*').eq('id', send.organization_id).maybeSingle(),
    db.from('order_lines').select('*').eq('organization_id', send.organization_id).eq('order_id', send.order_id).order('created_at', { ascending: true }),
  ]);

  const org = orgResult.data ?? {};
  const lines = Array.isArray(linesResult.data) ? linesResult.data : [];
  const order = send.orders ?? {};
  const lead = order.leads ?? {};
  const documentType = String(send.document_type ?? 'order_confirmation').toLowerCase();
  const exportMode = isExportOrder(order, documentType);
  const profileDocType = normalizeProfileDocType(documentType, exportMode);
  const { data: profile } = await db
    .from('organization_document_terms_profiles')
    .select('*')
    .eq('organization_id', send.organization_id)
    .eq('region_type', exportMode ? 'export' : 'regional')
    .eq('document_type', profileDocType)
    .eq('is_default', true)
    .maybeSingle();

  const now = new Date().toISOString();
  await db.from('order_document_sends').update({ opened_at: send.opened_at ?? now, open_count: Number(send.open_count ?? 0) + 1, updated_at: now }).eq('id', send.id).then(() => null);
  await db.from('order_documents').update({ opened_at: send.order_documents?.opened_at ?? now, updated_at: now }).eq('id', send.order_document_id).then(() => null);

  const title = documentTitle(documentType, exportMode);
  const [label, docNo] = templateCode(documentType, exportMode, order.order_number || send.id.slice(0, 8));
  const currency = order.currency || (exportMode ? 'USD' : 'INR');
  const pageTerms = maybeArray(profile?.page_one_terms, defaultPageOneTerms(exportMode));
  const annexureTerms = maybeArray(profile?.annexure_terms, defaultAnnexure(exportMode));
  const signatureBoxes = (profile?.stamp_settings?.boxes && Array.isArray(profile.stamp_settings.boxes)) ? profile.stamp_settings.boxes : signatureLabels(documentType, exportMode);

  return <main className="odx-page">
    <section className="odx-document">
      <header className="odx-doc-head"><div><b>SETU Flow - Document Preview</b><span>Final templates, declarations, taxes, stamps, and legal terms are organization-configurable. Admin T&C page marked for future build.</span></div><em>www.setuflowcrm.com</em></header>
      <h1>{title}</h1>
      <p className="odx-subtitle">Generated from structured order data, accepted quote lineage, line-level tax/customs placeholders, terms profile, and send tracking.</p>
      <div className="odx-banner"><strong>{label}</strong><strong>{docNo}</strong><strong>Status: {titleCase(send.status)}</strong></div>

      <section className="odx-parties">
        <div><h2>{exportMode ? 'Seller / Exporter' : 'Seller / Supplier'}</h2><FieldTable rows={[
          [exportMode ? 'Exporter' : 'Seller', org.name || org.display_name || 'Organization'],
          ['Address', org.address || org.billing_address || org.metadata?.address || 'Address configured in organization profile'],
          [exportMode ? 'GSTIN / IEC / PAN' : 'GSTIN / PAN', org.metadata?.gstin || org.tax_id || 'Configured in Admin'],
          [exportMode ? 'AD Code / LUT ARN' : 'State / Place', exportMode ? (org.metadata?.ad_code || org.metadata?.lut_arn || 'Configured in Admin') : (org.metadata?.state || org.metadata?.country || 'Configured in Admin')],
          ['Bank', org.metadata?.bank_details || 'Bank details configured in Admin'],
        ]} /></div>
        <div><h2>Buyer / Consignee</h2><FieldTable rows={[
          [exportMode ? 'Importer / Buyer' : 'Buyer', lead.company_name || 'Buyer pending'],
          ['Buyer Tax ID', lead.metadata?.tax_id || 'Configured per buyer'],
          ['Contact', [lead.contact_name, lead.email, lead.phone].filter(Boolean).join(', ') || 'Contact pending'],
          ['Ship To / Consignee', order.destination_place || lead.country || 'Destination pending'],
          ['Notify Party', exportMode ? 'Same as consignee / nominated forwarder' : 'Not applicable'],
        ]} /></div>
      </section>

      <section>
        <h2>{exportMode ? 'Export, Tax and Shipment Summary' : 'Commercial, Tax and Delivery Summary'}</h2>
        <FieldTable rows={exportMode ? [
          ['Incoterm / Named place', `${order.incoterm || 'FOB'} ${order.origin_place || 'Named place pending'}`],
          ['Port of Loading', order.origin_place || 'Port pending'],
          ['Port of Discharge', order.destination_port || 'Destination port pending'],
          ['Country of Origin / Destination', `India / ${lead.country || 'Destination country pending'}`],
          ['Currency / FX', `${currency} / FX configured per organization`],
          ['Export tax declaration', profile?.tax_profile?.export_tax_fields ? 'Configured from organization export tax profile' : 'Supply meant for export under LUT / IGST profile - sample default'],
          ['Importer duties/taxes', 'For account of buyer/importer unless agreed otherwise'],
        ] : [
          ['Place of Supply', order.destination_place || lead.country || 'Place of supply pending'],
          ['Tax type', 'GST/VAT/Sales tax fields by line category/HSN as configured'],
          ['E-invoice / IRN', 'Generated if applicable'],
          ['E-way bill', 'Generated when applicable'],
          ['Delivery term', `${order.incoterm || 'DAP'} ${order.destination_place || 'Buyer warehouse'}`],
          ['Tax category basis', 'Product category / HSN rate per line'],
          ['Payment terms', order.payment_terms || 'Configured on order'],
        ]} />
      </section>

      <section>
        <h2>{exportMode ? (documentType === 'dispatch_invoice' ? 'Commercial Invoice Items - Customs Values' : 'Proforma Items - Declared Export Values') : (documentType === 'dispatch_invoice' ? 'Invoice Items - GST/VAT by HSN/Category' : 'Confirmed Items - Tax by Category/HSN')}</h2>
        <ItemsTable lines={lines} exportMode={exportMode} documentType={documentType} currency={currency} />
        <Totals lines={lines} exportMode={exportMode} documentType={documentType} currency={currency} />
      </section>

      <SignatureBoxes labels={signatureBoxes} />
      <TermsBlock terms={pageTerms} />
      <footer className="odx-footer"><span>Tracked send: {fmtDate(send.sent_at)} · {send.channel}{send.recipient ? ` · ${send.recipient}` : ''}</span><span>Open count after this view: {Number(send.open_count ?? 0) + 1}</span></footer>
    </section>
    <Annexure title={title} terms={annexureTerms} profile={profile} />
    <style>{styles}</style>
  </main>;
}

const styles = `@page{size:A4;margin:10mm}.odx-page{min-height:100vh;background:#eef4f8;padding:24px;color:#123047;font-family:Inter,Arial,sans-serif}.odx-document,.odx-annexure{max-width:1040px;margin:0 auto 18px;background:white;border:1px solid #cfe0ea;border-radius:10px;box-shadow:0 12px 30px #0f172a12;padding:22px}.odx-doc-head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #dbe7f3;padding-bottom:8px;font-size:11px;color:#64748b}.odx-doc-head b{color:#0b3d5c}.odx-doc-head span{margin-left:8px}.odx-doc-head em{font-style:normal;color:#64748b}.odx-document h1{font-size:30px;letter-spacing:-.04em;margin:22px 0 4px;color:#0b3d5c}.odx-subtitle{font-size:12px;color:#64748b;margin:0 0 12px}.odx-banner{display:grid;grid-template-columns:1fr 1fr 1fr;background:#eaf3fb;border:1px solid #c9dce8;margin:10px 0 18px}.odx-banner strong{padding:8px 10px;font-size:11px;text-transform:uppercase;color:#123047}.odx-parties{display:grid;grid-template-columns:1fr 1fr;gap:22px}.odx-document h2,.odx-annexure h2{font-size:17px;color:#0b3d5c;margin:16px 0 7px}.odx-annexure h3{font-size:14px;color:#0b3d5c;margin:18px 0 7px}.odx-field,.odx-items,.odx-total{width:100%;border-collapse:collapse;font-size:11px}.odx-field th,.odx-field td,.odx-items th,.odx-items td,.odx-total th,.odx-total td{border:1px solid #cfe0ea;padding:6px;vertical-align:top}.odx-field th{width:30%;text-align:left;color:#0b5c8e;background:#f8fbfd}.odx-items th{background:#075f94;color:white;text-align:left;font-size:10px}.odx-items tr:nth-child(even) td{background:#f8fbfd}.odx-total{width:48%;margin:12px 0 0 auto}.odx-total th{text-align:left;background:#f8fbfd}.odx-total tr:last-child th,.odx-total tr:last-child td{background:#eaf3fb;font-weight:800}.odx-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:18px 0}.odx-sign{height:112px;border:1px solid #cfe0ea;display:flex;flex-direction:column;justify-content:space-between;padding:10px;font-size:11px}.odx-sign strong{color:#123047}.odx-sign span{color:#64748b}.odx-terms{border:1px solid #cfe0ea;background:#f8fbfd;margin-top:12px;padding:10px;font-size:11px}.odx-terms strong{color:#123047}.odx-terms ul{margin:7px 0 0;padding-left:18px;line-height:1.55}.odx-annexure{page-break-before:always}.odx-annexure p,.odx-annexure li{font-size:12px;color:#334155;line-height:1.55}.odx-annexure ol{padding-left:18px}.odx-footer{display:flex;justify-content:space-between;border-top:1px solid #dbe7f3;margin-top:16px;padding-top:8px;color:#64748b;font-size:10px}@media print{.odx-page{background:white;padding:0}.odx-document,.odx-annexure{box-shadow:none;border-radius:0;margin:0 0 8mm;padding:0;border:0}.odx-document h1{font-size:24px}.odx-sign{height:88px}.odx-items,.odx-field,.odx-total{font-size:9px}.odx-doc-head{font-size:9px}.odx-terms{font-size:9px}.odx-footer{font-size:8px}}@media(max-width:760px){.odx-page{padding:12px}.odx-parties,.odx-banner,.odx-signatures{grid-template-columns:1fr}.odx-total{width:100%}}`;
