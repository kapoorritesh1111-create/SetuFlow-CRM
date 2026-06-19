export const dynamic = 'force-dynamic';

const TITLES: Record<string, string> = {
  'sample-commercial-quote.pdf': 'Commercial Quote Preview',
  'sample-proforma-invoice.pdf': 'Proforma Invoice Preview',
  'sample-packing-list.pdf': 'Packing List Preview',
};

function safePdfText(value: string) {
  return value.replace(/[^a-zA-Z0-9 .,:/-]/g, ' ').slice(0, 120);
}

function makePdf(title: string) {
  const line1 = safePdfText(title);
  const line2 = 'Trade Show Trial preview only. Upgrade to generate real PDFs.';
  const content = `BT /F1 20 Tf 72 720 Td (${line1}) Tj /F1 12 Tf 0 -32 Td (${line2}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

export function GET(_request: Request, { params }: { params: { fileName: string } }) {
  const fileName = String(params.fileName ?? '');
  const title = TITLES[fileName];
  if (!title) return new Response('Not found', { status: 404 });
  return new Response(makePdf(title), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${fileName}"`,
    },
  });
}
