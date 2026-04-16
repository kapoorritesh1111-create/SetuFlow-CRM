import { NextRequest, NextResponse } from 'next/server';
import { extractContactSource, extractPdfTextLayer } from '@/lib/contact-exchange/contact-extraction';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const source = formData.get('source');
  if (!(source instanceof File)) {
    return NextResponse.json({ error: 'Attach a document or image first.' }, { status: 400 });
  }

  let fileText = '';
  let pdfText = '';
  if (source.type.startsWith('text/') || source.type === 'application/json') {
    fileText = await source.text();
  } else if (source.type === 'application/pdf') {
    pdfText = extractPdfTextLayer(Buffer.from(await source.arrayBuffer()));
  }

  const extraction = await extractContactSource({
    assistText: '',
    sourceMode: 'upload',
    filename: source.name,
    fileType: source.type,
    fileText,
    pdfText,
    source,
  });

  return NextResponse.json({
    contactName: extraction.draft.contactName,
    companyName: extraction.draft.companyName,
    jobTitle: extraction.draft.jobTitle,
    email: extraction.draft.email,
    phone: extraction.draft.phone,
    notes: extraction.draft.notes,
    extraction,
  });
}
