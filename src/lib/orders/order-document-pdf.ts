const INK = '#0f172a';
const MUTED = '#475569';
const NAVY = '#0b2e4a';
const BLUE = '#1d4ed8';
const LINE = '#cbd5e1';
const PANEL = '#f8fafc';

export type OrderPdfLine = {
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice?: number | null;
  currency?: string | null;
  notes?: string | null;
};

export type OrderPdfOrganization = {
  name?: string | null;
  legal_name?: string | null;
  registered_address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  headquarters_country?: string | null;
  website?: string | null;
  contact_email?: string | null;
  tax_id?: string | null;
  quote_terms_conditions?: string | null;
  order_terms_conditions?: string | null;
};

export type OrderPdfData = {
  documentType: 'order-confirmation' | 'invoice';
  documentNo: string;
  companyName: string;
  contactName?: string | null;
  country?: string | null;
  quoteId: string;
  contractId: string;
  quoteCurrency?: string | null;
  pricingBasis?: string | null;
  signedAt?: string | null;
  createdAt?: string | null;
  dueLabel?: string;
  paymentStatus?: string;
  organization?: OrderPdfOrganization | null;
  lines: OrderPdfLine[];
};

type TextOp = { x: number; y: number; t: string; size?: number; bold?: boolean; color?: string; right?: boolean };

function n(v: unknown, fallback = 0) {
  const value = Number(v ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function s(v: unknown, fallback = '-') {
  const text = String(v ?? '').trim();
  return text || fallback;
}

function short(v: unknown, max = 34, fallback = '-') {
  const text = s(v, fallback);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function esc(v: string) {
  const slash = String.fromCharCode(92);
  return String(v)
    .replace(/[\r\n]+/g, ' ')
    .split('')
    .map((ch) => {
      if (ch === slash) return slash + slash;
      if (ch === '(') return slash + '(';
      if (ch === ')') return slash + ')';
      return ch;
    })
    .join('');
}

function rgb(hex: string) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return `${(((value >> 16) & 255) / 255).toFixed(3)} ${(((value >> 8) & 255) / 255).toFixed(3)} ${((value & 255) / 255).toFixed(3)}`;
}

function money(amount: unknown, currency = 'USD') {
  return `${currency} ${n(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: unknown) {
  const raw = s(value, '');
  if (!raw) return '-';
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB');
}

function addDaysLabel(value: unknown, days: number) {
  const raw = s(value, '');
  const base = raw ? new Date(raw.includes('T') ? raw : `${raw}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return '-';
  base.setDate(base.getDate() + days);
  return dateLabel(base.toISOString());
}

function paymentDaysFromTerms(terms: string) {
  const netMatch = terms.match(/\bnet\s*(\d{1,3})\b/i);
  if (!netMatch) return 30;
  const days = Number(netMatch[1]);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

function compactAddress(org?: OrderPdfOrganization | null) {
  const parts = [org?.registered_address, org?.city, org?.postal_code, org?.headquarters_country]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean);
  return parts.join(', ');
}

function splitTerms(text: string, maxLines = 3) {
  const source = s(text, 'Commercial terms follow the accepted quote, signed contract, and agreed Incoterms.');
  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lines = sentences.length ? sentences : [source];
  return lines.slice(0, maxLines).map((line) => short(line, 110));
}

function lineTotal(line: OrderPdfLine) {
  return n(line.quantity, 0) * n(line.unitPrice, 0);
}

export function buildOrderDocumentPdf(data: OrderPdfData): Buffer {
  const currency = String(data.quoteCurrency ?? data.lines[0]?.currency ?? 'USD').toUpperCase();
  const title = data.documentType === 'invoice' ? 'Invoice' : 'Order Confirmation';
  const org = data.organization;
  const orgName = org?.legal_name ?? org?.name ?? 'SETU Flow CRM';
  const termsText = org?.order_terms_conditions ?? org?.quote_terms_conditions ?? 'Commercial terms follow the accepted quote, signed contract, and agreed Incoterms.';
  const paymentDays = paymentDaysFromTerms(termsText);
  const issueSource = data.createdAt ?? new Date().toISOString();
  const dueDate = addDaysLabel(issueSource, paymentDays);
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const ops: string[] = [];
  const texts: TextOp[] = [];
  const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string) => {
    if (fill) ops.push(`${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`);
    if (stroke) ops.push(`${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color = LINE, width = 0.7) => ops.push(`${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const txt = (x: number, y: number, t: string, size = 7, bold = false, color = INK, right = false) => texts.push({ x, y, t, size, bold, color, right });

  const subtotal = data.lines.reduce((sum, row) => sum + lineTotal(row), 0);
  const issueDate = dateLabel(issueSource);
  const signedDate = dateLabel(data.signedAt);

  box(0, 0, 612, 792, '#ffffff');
  box(24, 724, 564, 44, '#ffffff', LINE);
  box(24, 724, 44, 44, NAVY);
  txt(37, 747, 'SETU', 7, true, '#ffffff');
  txt(80, 750, orgName, 11, true, NAVY);
  txt(80, 736, 'Trade execution document', 6.5, false, MUTED);
  txt(236, 752, title, 17, true, NAVY);
  txt(236, 736, data.documentNo, 8, true, BLUE);
  box(468, 732, 110, 28, PANEL, LINE);
  txt(480, 750, `Issued ${issueDate}`, 6, true, NAVY);
  txt(480, 739, data.documentType === 'invoice' ? `Due ${dueDate}` : (data.dueLabel ?? 'Execution copy'), 5.8, false, MUTED);

  box(24, 626, 270, 80, PANEL, LINE);
  txt(36, 690, 'BUYER / CUSTOMER', 6.5, true, BLUE);
  txt(36, 674, short(data.companyName, 42), 10, true, INK);
  txt(36, 660, short(data.contactName, 44, ''), 6.5, false, MUTED);
  txt(36, 648, short(data.country, 44, ''), 6.5, false, MUTED);
  txt(36, 634, `Quote: ${short(data.quoteId, 24)}`, 6.2, false, MUTED);

  box(318, 626, 270, 80, PANEL, LINE);
  if (org) {
    txt(330, 690, 'SELLER / EXPORTER', 6.5, true, BLUE);
    txt(330, 674, short(orgName, 38), 9, true, INK);
    txt(330, 661, short(compactAddress(org), 48, ''), 5.8, false, MUTED);
    txt(330, 649, short(org.contact_email ?? org.website, 48, ''), 5.8, false, MUTED);
    txt(330, 637, `Tax ID: ${short(org.tax_id, 34, 'Not provided')}`, 5.8, false, MUTED);
    txt(330, 626, `Payment: Net ${paymentDays}`, 5.8, false, MUTED);
  } else {
    txt(330, 690, 'ORDER DETAILS', 6.5, true, BLUE);
    txt(330, 674, `Contract: ${short(data.contractId, 28)}`, 6.5, false, MUTED);
    txt(330, 662, `Commercial lock: ${signedDate === '-' ? 'Pending signature' : `Signed ${signedDate}`}`, 6.5, false, MUTED);
    txt(330, 650, `Pricing basis: ${short(data.pricingBasis, 28, 'FOB')}`, 6.5, false, MUTED);
    txt(330, 638, `Currency: ${currency}`, 6.5, false, MUTED);
    txt(330, 626, `Payment: ${short(data.paymentStatus, 28, 'Tracking pending')}`, 6.5, false, MUTED);
  }

  box(24, 596, 564, 18, data.documentType === 'invoice' ? '#f5f3ff' : '#eef6ff', data.documentType === 'invoice' ? '#ddd6fe' : '#bfdbfe');
  txt(36, 602, data.documentType === 'invoice'
    ? `Invoice generated from accepted quote and signed contract. Contract: ${short(data.contractId, 18)}. Basis: ${short(data.pricingBasis, 18, 'FOB')}.`
    : 'Order confirmation generated from the accepted quote, signed contract snapshot, and locked order lines.', 5.7, false, data.documentType === 'invoice' ? '#5b21b6' : '#1e3a8a');

  let y = 560;
  const tableX = 24;
  const tableW = 564;
  const cols: Array<[string, number, 'left' | 'right']> = [
    ['#', 24, 'left'],
    ['Item', 210, 'left'],
    ['SKU / Variant', 120, 'left'],
    ['Qty', 50, 'right'],
    ['Unit', 70, 'right'],
    ['Total', 90, 'right'],
  ];
  box(tableX, y - 16, tableW, 20, '#e2e8f0', LINE);
  let x = tableX + 8;
  cols.forEach(([label, width, align]) => {
    txt(align === 'right' ? x + width - 8 : x, y - 9, label, 5.3, true, NAVY, align === 'right');
    x += width;
  });
  y -= 22;

  const rows = data.lines.length ? data.lines : [{ productName: 'Order line pending', quantity: 1, unitPrice: 0, currency }];
  rows.slice(0, 12).forEach((row, index) => {
    box(tableX, y - 14, tableW, 20, index % 2 ? '#ffffff' : '#f8fafc', LINE);
    x = tableX + 8;
    const cells: Array<[string, number, 'left' | 'right']> = [
      [String(index + 1), 24, 'left'],
      [short(row.productName, 34), 210, 'left'],
      [short(row.sku ?? row.variantName, 22, '-'), 120, 'left'],
      [String(n(row.quantity, 0)), 50, 'right'],
      [money(row.unitPrice ?? 0, currency), 70, 'right'],
      [money(lineTotal(row), currency), 90, 'right'],
    ];
    cells.forEach(([value, width, align]) => {
      txt(align === 'right' ? x + width - 8 : x, y - 6, value, 5.5, index === 0 && align === 'left', INK, align === 'right');
      x += width;
    });
    y -= 20;
  });

  line(tableX, y + 3, tableX + tableW, y + 3, NAVY, 1.1);
  txt(410, y - 10, data.documentType === 'invoice' ? 'Amount Due' : 'Order Value', 8.5, true, NAVY);
  txt(584, y - 10, money(subtotal, currency), 9, true, NAVY, true);

  y -= 42;
  box(24, y - 62, 270, 62, PANEL, LINE);
  txt(36, y - 13, 'EXECUTION NOTES', 7, true, NAVY);
  txt(36, y - 28, '1. Commercial terms follow the accepted quote and locked contract snapshot.', 5.7, false, MUTED);
  txt(36, y - 40, '2. Dispatch, release, waiver, and closeout require human approval.', 5.7, false, MUTED);
  txt(36, y - 52, '3. Attach final signed evidence in the order workspace.', 5.7, false, MUTED);

  box(318, y - 62, 270, 62, PANEL, LINE);
  txt(330, y - 13, data.documentType === 'invoice' ? 'PAYMENT SUMMARY' : 'ORDER CONFIRMATION', 7, true, NAVY);
  txt(330, y - 28, `Subtotal: ${money(subtotal, currency)}`, 5.8, false, MUTED);
  txt(330, y - 40, data.documentType === 'invoice' ? `Payment due: ${dueDate} (Net ${paymentDays})` : 'Order confirmation subject to document readiness.', 5.8, false, MUTED);
  txt(330, y - 52, data.documentType === 'invoice' ? 'Taxes/duties: per agreed Incoterm unless included.' : 'Invoice should be issued after release/dispatch posture is clear.', 5.8, false, MUTED);

  y -= 82;
  box(24, y - 56, 564, 56, '#ffffff', LINE);
  txt(36, y - 13, 'TERMS & CONDITIONS', 6.5, true, NAVY);
  splitTerms(termsText, 3).forEach((termsLine, index) => {
    txt(36, y - 27 - index * 10, termsLine, 5.4, false, MUTED);
  });

  y -= 70;
  box(24, y - 42, 564, 42, '#ffffff', LINE);
  txt(36, y - 13, 'AUTHORIZED REVIEW', 6.5, true, NAVY);
  txt(36, y - 29, `Prepared by ${short(orgName, 34, 'SETU Flow CRM')}`, 5.7, false, MUTED);
  txt(300, y - 13, 'CUSTOMER / OPERATIONS ACKNOWLEDGEMENT', 6.5, true, NAVY);
  txt(300, y - 29, 'Signature: _______________________________', 5.7, false, MUTED);

  ops.push('BT');
  for (const item of texts) {
    const size = item.size ?? 7;
    const xPos = item.right ? Math.max(18, item.x - item.t.length * size * 0.45) : item.x;
    ops.push(`/${item.bold ? 'F2' : 'F1'} ${size} Tf\n${rgb(item.color ?? INK)} rg\n1 0 0 1 ${xPos} ${item.y} Tm (${esc(item.t)}) Tj`);
  }
  ops.push('ET');
  const content = ops.join('\n');
  const contentId = add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
  const pagesId = add(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  objects[pageId - 1] = objects[pageId - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'utf8');
}
