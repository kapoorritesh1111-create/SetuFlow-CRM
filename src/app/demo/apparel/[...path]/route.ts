import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

function normalizeText(value: string) {
  return value.replace(/[()\\]/g, '').replace(/[^\x20-\x7E]/g, ' ').trim();
}

function titleFromPath(pathParts: string[]) {
  const filename = pathParts[pathParts.length - 1] ?? 'document.pdf';
  const stem = filename.replace(/\.pdf$/i, '');
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.length <= 3 ? word.toUpperCase() : `${word[0]?.toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function typeFromPath(pathParts: string[]) {
  const joined = pathParts.join('/').toLowerCase();
  if (joined.includes('/quotes/') || joined.includes('app-q-')) return 'Commercial Quote PDF';
  if (joined.includes('confirmation')) return 'Order Confirmation';
  if (joined.includes('packing')) return 'Packing Sheet';
  if (joined.includes('shipment')) return 'Shipment Booking';
  if (joined.includes('sample')) return 'Sample Approval';
  if (joined.includes('catalog')) return 'Buyer Catalog';
  return 'Apparel Demo Document';
}

function pdfLine(text: string, x: number, y: number, size = 12) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${normalizeText(text)}) Tj ET`;
}

function createPdf(pathParts: string[]) {
  const title = titleFromPath(pathParts);
  const docType = typeFromPath(pathParts);
  const requestedPath = `/demo/apparel/${pathParts.join('/')}`;
  const now = new Date().toISOString().slice(0, 10);

  const stream = [
    pdfLine('SETU Flow CRM', 54, 750, 18),
    pdfLine('Apparel Exporter Demo Document', 54, 724, 14),
    pdfLine(title, 54, 682, 20),
    pdfLine(`Document type: ${docType}`, 54, 646, 12),
    pdfLine(`Demo path: ${requestedPath}`, 54, 624, 10),
    pdfLine(`Generated: ${now}`, 54, 606, 10),
    pdfLine('This demo-safe PDF is used to validate the Apparel DEMO document workflow.', 54, 562, 11),
    pdfLine('It prevents seeded walkthrough records from opening broken placeholder links.', 54, 544, 11),
    pdfLine('Client-facing walkthrough: lead -> catalog -> quote -> order -> shipment.', 54, 526, 11),
    pdfLine('Primary buyer story: Gulf Active Distribution, APP-Q-0001, APP-ORD-0001.', 54, 498, 11),
    pdfLine('Confidential - Demo data for Setu Flow CRM validation.', 54, 96, 9),
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const pathParts = params.path ?? [];
  const lastPart = pathParts[pathParts.length - 1] ?? '';

  if (!lastPart.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Demo document not found' }, { status: 404 });
  }

  const body = createPdf(pathParts);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${normalizeText(lastPart) || 'apparel-demo-document.pdf'}"`,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
