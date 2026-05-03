import { NextRequest, NextResponse } from 'next/server';
import { extractContactSource, extractPdfTextLayer } from '@/lib/contact-exchange/contact-extraction';

export const runtime = 'nodejs';

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const assistText = String(formData.get('assist_text') ?? '').trim();
    const sourceModeValue = String(formData.get('source_mode') ?? 'upload').trim();
    const sourceMode = sourceModeValue === 'camera' ? 'camera' : sourceModeValue === 'manual' ? 'manual' : 'upload';
    const source = formData.get('source');
    const requireOcr = String(formData.get('require_ocr') ?? '').trim() === 'true';

    if (!(source instanceof File) && !assistText) {
      return NextResponse.json({ error: 'Attach a business card photo or file before scanning.' }, { status: 400 });
    }

    if (source instanceof File && source.size > MAX_SOURCE_BYTES) {
      return NextResponse.json({ error: 'The selected file is too large for quick scan. Use a photo or file under 10 MB.' }, { status: 413 });
    }

    let fileText = '';
    let pdfText = '';
    let filename = '';
    let fileType = '';

    if (source instanceof File) {
      filename = source.name;
      fileType = source.type;
      if (fileType.startsWith('text/') || fileType === 'application/json') {
        fileText = await source.text();
      } else if (fileType === 'application/pdf') {
        pdfText = extractPdfTextLayer(Buffer.from(await source.arrayBuffer()));
      }
    }

    const extraction = await extractContactSource({
      assistText,
      sourceMode,
      filename,
      fileType,
      pdfText,
      fileText,
      source: source instanceof File ? source : null,
    });

    const isImageSource = source instanceof File && String(fileType).startsWith('image/');
    if (requireOcr && isImageSource && extraction.boundary !== 'server_image_ocr_live') {
      const debugNote = Array.isArray(extraction.notes)
        ? extraction.notes.find((note: string) => note.includes('Live OCR extraction could not complete'))
        : '';
      return NextResponse.json({
        ok: false,
        error: debugNote
          ? `The photo reached SETU Flow, but card reading failed: ${debugNote.replace('Live OCR extraction could not complete: ', '')}`
          : 'The photo reached SETU Flow, but live card reading did not complete. Retake the card closer and flatter, or try Upload file. If this repeats, check the OCR model logs.',
        extraction,
      }, { status: 422 });
    }

    return NextResponse.json({ ok: true, extraction });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Business card scan failed before extraction completed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
