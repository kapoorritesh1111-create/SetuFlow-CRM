// Self-contained catalog PDF builder for buyer shares.
// Mirrors the proven raw-PDF byte structure used by src/lib/orders/order-document-pdf.ts
// (no external deps, no puppeteer). Adds a buyer watermark line.

const INK = '#0f172a';
const MUTED = '#475569';
const NAVY = '#1f487c';
const TEAL = '#279491';
const LINE = '#cbd5e1';
const PANEL = '#f8fafc';

export type CatalogPdfLine = {
  name: string;
  packSize?: string | null;
  moq?: number | null;
  moqUnit?: string | null;
  country?: string | null;
  price?: number | null;
};

export type CatalogPdfData = {
  orgName: string;
  buyerCompany?: string | null;
  buyerName?: string | null;
  currency: string;
  incoterm?: string | null;
  validUntil?: string | null;
  shareRef: string;
  lines: CatalogPdfLine[];
};

function n(v: unknown, fallback = 0) { const x = Number(v ?? fallback); return Number.isFinite(x) ? x : fallback; }
function s(v: unknown, fallback = '-') { const t = String(v ?? '').trim(); return t || fallback; }
function short(v: unknown, max = 34, fallback = '-') { const t = s(v, fallback); return t.length > max ? `${t.slice(0, max - 3)}...` : t; }
function esc(v: string) {
  const slash = String.fromCharCode(92);
  return String(v).replace(/[\r\n]+/g, ' ').split('').map((ch) => {
    if (ch === slash) return slash + slash;
    if (ch === '(') return slash + '(';
    if (ch === ')') return slash + ')';
    return ch;
  }).join('');
}
function rgb(hex: string) {
  const value = parseInt(hex.replace('#', ''), 16);
  return `${(((value >> 16) & 255) / 255).toFixed(3)} ${(((value >> 8) & 255) / 255).toFixed(3)} ${((value & 255) / 255).toFixed(3)}`;
}
function money(amount: unknown, currency: string) {
  if (amount == null || amount === '') return 'On request';
  return `${currency} ${n(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateLabel(raw?: string | null) {
  if (!raw) return '-';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB');
}

type TextOp = { x: number; y: number; t: string; size?: number; bold?: boolean; color?: string; right?: boolean };

export function buildCatalogSharePdf(data: CatalogPdfData): Buffer {
  const currency = String(data.currency ?? 'USD').toUpperCase();
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
  const lineOp = (x1: number, y1: number, x2: number, y2: number, color = LINE, width = 0.7) => ops.push(`${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const txt = (x: number, y: number, t: string, size = 7, bold = false, color = INK, right = false) => texts.push({ x, y, t, size, bold, color, right });

  box(0, 0, 612, 792, '#ffffff');
  // header
  box(24, 724, 564, 44, '#ffffff', LINE);
  box(24, 724, 44, 44, NAVY);
  txt(39, 747, 'SF', 8, true, '#ffffff');
  txt(80, 750, short(data.orgName, 40), 11, true, NAVY);
  txt(80, 736, 'Product catalog', 6.5, false, MUTED);
  txt(236, 752, 'CATALOG', 16, true, TEAL);
  box(468, 732, 110, 28, PANEL, LINE);
  txt(480, 750, `Currency ${currency}`, 6, true, NAVY);
  txt(480, 739, data.incoterm ? `Incoterm ${data.incoterm}` : (data.validUntil ? `Valid ${dateLabel(data.validUntil)}` : 'Indicative'), 5.8, false, MUTED);

  // prepared-for + watermark
  box(24, 678, 564, 40, PANEL, LINE);
  txt(36, 704, 'PREPARED FOR', 6.5, true, TEAL);
  txt(36, 690, short(data.buyerCompany ?? 'Valued buyer', 50), 10, true, INK);
  txt(330, 704, `Reference: ${short(data.shareRef, 30)}`, 6, false, MUTED);
  txt(330, 692, data.validUntil ? `Valid until ${dateLabel(data.validUntil)}` : 'Pricing indicative', 6, false, MUTED);
  txt(330, 682, `Confidential — shared with ${short(data.buyerCompany ?? data.buyerName ?? 'buyer', 28)}`, 5.6, false, '#94a3b8');

  // table header
  let y = 648;
  const tableX = 24; const tableW = 564;
  const cols: Array<[string, number, 'left' | 'right']> = [
    ['#', 24, 'left'], ['Product', 230, 'left'], ['Pack / Origin', 130, 'left'], ['MOQ', 70, 'right'], ['Price', 110, 'right'],
  ];
  box(tableX, y - 16, tableW, 20, '#e2e8f0', LINE);
  let x = tableX + 8;
  cols.forEach(([label, width, align]) => { txt(align === 'right' ? x + width - 8 : x, y - 9, label, 5.5, true, NAVY, align === 'right'); x += width; });
  y -= 22;

  const rows = data.lines.length ? data.lines : [{ name: 'No products in this catalog', price: null }];
  rows.slice(0, 22).forEach((row, index) => {
    box(tableX, y - 14, tableW, 20, index % 2 ? '#ffffff' : '#f8fafc', LINE);
    x = tableX + 8;
    const cells: Array<[string, number, 'left' | 'right']> = [
      [String(index + 1), 24, 'left'],
      [short(row.name, 38), 230, 'left'],
      [short([row.packSize, row.country].filter(Boolean).join(' · '), 24, '-'), 130, 'left'],
      [row.moq != null ? `${row.moq} ${s(row.moqUnit, '')}`.trim() : '-', 70, 'right'],
      [money(row.price, currency), 110, 'right'],
    ];
    cells.forEach(([value, width, align]) => { txt(align === 'right' ? x + width - 8 : x, y - 6, value, 5.6, false, INK, align === 'right'); x += width; });
    y -= 20;
  });

  lineOp(tableX, y + 3, tableX + tableW, y + 3, NAVY, 1.0);
  y -= 20;
  txt(36, y, 'Prices are indicative and subject to confirmation. Contact the supplier to request a formal quote.', 5.8, false, MUTED);
  y -= 30;
  box(24, y - 30, 564, 30, PANEL, LINE);
  txt(36, y - 12, `Prepared by ${short(data.orgName, 40)} · Powered by SETU Flow`, 6, false, MUTED);
  txt(36, y - 22, `This catalog is confidential and intended only for ${short(data.buyerCompany ?? 'the recipient', 40)}.`, 5.6, false, '#94a3b8');

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
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, 'utf8');
}
