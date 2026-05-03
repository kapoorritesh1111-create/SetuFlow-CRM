import { parseContactText, type ContactExtractionResult, type ContactSourceProfile, type ExtractionConfidence } from '@/lib/contact-exchange/contact-parser';
import { extractContactWithOcrProvider, type ContactOcrProviderResult, type ProviderFieldConfidence } from '@/lib/contact-exchange/contact-ocr-provider';

export type ContactExtractionBoundary =
  | 'server_text'
  | 'server_pdf_text_layer'
  | 'server_pdf_ocr_ready'
  | 'server_pdf_ocr_live'
  | 'server_image_ocr_ready'
  | 'server_image_ocr_live'
  | 'server_manual_text';

export type ContactServerExtractionResult = ContactExtractionResult & {
  boundary: ContactExtractionBoundary;
  reviewRequired: true;
  acceptedSourceKind: 'text' | 'pdf' | 'image' | 'manual' | 'file';
  sourceMimeType: string;
};

type ExtractContactSourceArgs = {
  assistText?: string | null;
  sourceMode?: 'upload' | 'camera' | 'manual';
  filename?: string | null;
  fileType?: string | null;
  fileText?: string | null;
  pdfText?: string | null;
  source?: File | null;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizePdfText(input: string) {
  return input
    .replace(/\\r/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPdfStringsFromArray(raw: string) {
  const matches = raw.match(/\((?:\\.|[^\\)])+\)/g) ?? [];
  return matches.map((match) => normalizePdfText(match.slice(1, -1))).filter(Boolean);
}

function buildOcrSummary(providerResult: ContactOcrProviderResult) {
  const parts: string[] = [];
  if (providerResult.draft.address) parts.push(`Address: ${providerResult.draft.address}`);
  if (providerResult.draft.notes) parts.push(providerResult.draft.notes);
  if (providerResult.draft.rawText) parts.push(`OCR excerpt: ${providerResult.draft.rawText.slice(0, 500)}`);
  if (providerResult.draft.warnings.length) parts.push(`OCR warnings: ${providerResult.draft.warnings.join(' · ')}`);
  return parts.join('\n');
}

function mergeNotes(...values: string[]) {
  return uniqueValues(values.flatMap((value) => String(value || '').split(/\n+/)).map((value) => value.trim()).filter(Boolean)).join('\n');
}

function ocrToUiConfidence(value: 'high' | 'medium' | 'low'): ExtractionConfidence {
  return value === 'high' ? 'High' : value === 'medium' ? 'Medium' : 'Low';
}

function maxConfidence(left: ExtractionConfidence, right: ExtractionConfidence): ExtractionConfidence {
  const order: ExtractionConfidence[] = ['Low', 'Medium', 'High'];
  return order[Math.max(order.indexOf(left), order.indexOf(right))] ?? left;
}

function inferProfileFromBoundary(boundary: ContactExtractionBoundary, providerProfile?: ContactSourceProfile, parsedProfile?: ContactSourceProfile): ContactSourceProfile {
  if (providerProfile && providerProfile !== 'generic') return providerProfile;
  if (boundary === 'server_pdf_text_layer' || boundary === 'server_pdf_ocr_live' || boundary === 'server_pdf_ocr_ready') return 'scan_pdf';
  return parsedProfile ?? 'generic';
}

function buildFieldConfidence(parsedField: ExtractionConfidence, providerField: 'high' | 'medium' | 'low' | undefined, overall: 'high' | 'medium' | 'low', value: string, preferModerate = false): ExtractionConfidence {
  if (!value.trim()) return 'Low';
  const fromProvider = providerField ? ocrToUiConfidence(providerField) : ocrToUiConfidence(overall);
  const merged = maxConfidence(parsedField, fromProvider);
  if (preferModerate && merged === 'High') return 'Medium';
  return merged;
}

function buildFieldMap(parsed: ContactExtractionResult) {
  return new Map(parsed.fields.map((field) => [field.label, field.confidence]));
}

function mergeOcrResult(parsed: ContactExtractionResult, providerResult: ContactOcrProviderResult): ContactExtractionResult {
  const rawTextParsed = providerResult.draft.rawText
    ? parseContactText(providerResult.draft.rawText, { filename: 'ocr-raw-text.txt', sourceMode: 'camera', fileType: 'text/plain' })
    : null;
  const phones = uniqueValues([
    ...providerResult.draft.phones,
    rawTextParsed?.draft.phone ?? '',
    rawTextParsed?.draft.phoneSecondary ?? '',
  ]);
  const emails = uniqueValues([
    ...providerResult.draft.emails,
    rawTextParsed?.draft.email ?? '',
  ]);
  const websites = uniqueValues([
    ...providerResult.draft.websites,
    rawTextParsed?.draft.website ?? '',
  ]);
  const combinedNotes = mergeNotes(parsed.draft.notes, rawTextParsed?.draft.notes ?? '', buildOcrSummary(providerResult));

  const draft = {
    ...parsed.draft,
    contactName: providerResult.draft.contactName || rawTextParsed?.draft.contactName || parsed.draft.contactName,
    companyName: providerResult.draft.companyName || rawTextParsed?.draft.companyName || parsed.draft.companyName,
    jobTitle: providerResult.draft.jobTitle || rawTextParsed?.draft.jobTitle || parsed.draft.jobTitle,
    email: emails[0] || parsed.draft.email,
    phone: phones[0] || parsed.draft.phone,
    phoneSecondary: phones[1] || parsed.draft.phoneSecondary,
    website: websites[0] || parsed.draft.website,
    notes: combinedNotes,
  };

  const parsedFieldMap = buildFieldMap(parsed);
  const fieldConfidence = providerResult.draft.fieldConfidence as ProviderFieldConfidence;
  const sourceProfile = providerResult.draft.sourceProfile === 'generic' ? parsed.sourceProfile : providerResult.draft.sourceProfile;

  const fields = [
    { label: 'Full name', value: draft.contactName, confidence: buildFieldConfidence(parsedFieldMap.get('Full name') ?? 'Low', fieldConfidence.contactName, providerResult.draft.confidence, draft.contactName) },
    { label: 'Role', value: draft.jobTitle, confidence: buildFieldConfidence(parsedFieldMap.get('Role') ?? 'Low', fieldConfidence.jobTitle, providerResult.draft.confidence, draft.jobTitle, sourceProfile === 'screenshot') },
    { label: 'Company', value: draft.companyName, confidence: buildFieldConfidence(parsedFieldMap.get('Company') ?? 'Low', fieldConfidence.companyName, providerResult.draft.confidence, draft.companyName) },
    { label: 'Email', value: draft.email, confidence: buildFieldConfidence(parsedFieldMap.get('Email') ?? 'Low', fieldConfidence.email, providerResult.draft.confidence, draft.email) },
    { label: 'Phone', value: draft.phone, confidence: buildFieldConfidence(parsedFieldMap.get('Phone') ?? 'Low', fieldConfidence.phone, providerResult.draft.confidence, draft.phone, sourceProfile === 'scan_pdf') },
    { label: 'Phone 2', value: draft.phoneSecondary, confidence: buildFieldConfidence(parsedFieldMap.get('Phone 2') ?? 'Low', fieldConfidence.phoneSecondary, providerResult.draft.confidence, draft.phoneSecondary, true) },
    { label: 'Website', value: draft.website, confidence: buildFieldConfidence(parsedFieldMap.get('Website') ?? 'Low', fieldConfidence.website, providerResult.draft.confidence, draft.website) },
    { label: 'Notes', value: draft.notes, confidence: buildFieldConfidence(parsedFieldMap.get('Notes') ?? 'Low', fieldConfidence.notes, providerResult.draft.confidence, draft.notes, true) },
  ] as ContactExtractionResult['fields'];

  const lowConfidence = fields.filter((field) => field.value && field.confidence === 'Low').map((field) => field.label.toLowerCase());
  const mediumConfidence = fields.filter((field) => field.value && field.confidence === 'Medium').map((field) => field.label.toLowerCase());

  return {
    ...parsed,
    sourceProfile,
    draft,
    fields,
    notes: [
      `Live OCR extraction ran through ${providerResult.provider} (${providerResult.model}) before deterministic CRM field mapping.`,
      providerResult.draft.sourceProfile === 'business_card'
        ? 'OCR classified this source as a business card and prioritized face-name/title/company blocks.'
        : providerResult.draft.sourceProfile === 'screenshot'
          ? 'OCR classified this source as a screenshot and prioritized signature-style and labeled rows.'
          : providerResult.draft.sourceProfile === 'scan_pdf'
            ? 'OCR classified this source as a scan-PDF and merged OCR with PDF text-layer recovery when available.'
            : 'OCR used the generic contact parser path for this source.',
      ...(providerResult.draft.warnings.length ? providerResult.draft.warnings.map((warning) => `OCR warning: ${warning}`) : []),
      ...(lowConfidence.length ? [`Low-confidence fields still need a close review: ${lowConfidence.join(', ')}.`] : []),
      ...(!lowConfidence.length && mediumConfidence.length ? [`Medium-confidence fields worth a quick check: ${mediumConfidence.join(', ')}.`] : []),
      ...parsed.notes,
    ],
  };
}

export function extractPdfTextLayer(buffer: Buffer) {
  const latin = buffer.toString('latin1');
  const segments: string[] = [];
  for (const match of latin.matchAll(/\((?:\\.|[^\\)])+\)\s*Tj/g)) {
    const raw = match[0].replace(/\s*Tj$/, '').trim();
    if (!raw.startsWith('(') || !raw.endsWith(')')) continue;
    const value = normalizePdfText(raw.slice(1, -1));
    if (value.length >= 2) segments.push(value);
  }
  for (const match of latin.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    segments.push(...extractPdfStringsFromArray(match[1] ?? ''));
  }
  const content = uniqueValues(segments).filter((value) => /[A-Za-z0-9@.+]/.test(value)).join('\n');
  return content.trim();
}

export async function extractContactSource(args: ExtractContactSourceArgs): Promise<ContactServerExtractionResult> {
  const assistText = String(args.assistText ?? '').trim();
  const fileType = String(args.fileType ?? '').trim();
  const fileText = String(args.fileText ?? '').trim();
  const pdfText = String(args.pdfText ?? '').trim();

  const acceptedSourceKind: ContactServerExtractionResult['acceptedSourceKind'] = fileType.startsWith('text/')
    ? 'text'
    : fileType === 'application/pdf'
      ? 'pdf'
      : fileType.startsWith('image/')
        ? 'image'
        : fileType
          ? 'file'
          : 'manual';

  let boundary: ContactExtractionBoundary = acceptedSourceKind === 'text'
    ? 'server_text'
    : acceptedSourceKind === 'pdf'
      ? (pdfText ? 'server_pdf_text_layer' : 'server_pdf_ocr_ready')
      : acceptedSourceKind === 'image'
        ? 'server_image_ocr_ready'
        : 'server_manual_text';

  let parsed = parseContactText([assistText, fileText, pdfText].filter(Boolean).join('\n'), {
    filename: args.filename,
    sourceMode: args.sourceMode,
    fileType,
  });

  if (args.source && (acceptedSourceKind === 'image' || acceptedSourceKind === 'pdf')) {
    try {
      const providerResult = await extractContactWithOcrProvider({
        source: args.source,
        assistText,
        sourceMode: args.sourceMode,
        filename: args.filename,
        fileType,
      });
      if (providerResult) {
        parsed = mergeOcrResult(parsed, providerResult);
        boundary = acceptedSourceKind === 'pdf' ? 'server_pdf_ocr_live' : 'server_image_ocr_live';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Live OCR extraction failed.';
      console.error('[mobile-contact-scan] live OCR extraction failed', { acceptedSourceKind, fileType, filename: args.filename, message });
      parsed = { ...parsed, notes: [`Live OCR extraction could not complete: ${message}`, ...parsed.notes] };
    }
  }

  const sourceProfile = inferProfileFromBoundary(boundary, parsed.sourceProfile, parsed.sourceProfile);

  const boundaryNotes = boundary === 'server_text'
    ? ['Server extraction read the uploaded text source directly before prefill.']
    : boundary === 'server_pdf_text_layer'
      ? ['Server extraction recovered embedded PDF text before prefill. Live OCR is optional and only runs when the AI provider is configured.']
      : boundary === 'server_pdf_ocr_live'
        ? ['Server extraction used a live OCR provider for this PDF before deterministic CRM field mapping.']
        : boundary === 'server_pdf_ocr_ready'
          ? ['Server extraction accepted this PDF through an OCR-ready boundary. Configure the OCR provider to extract image-based PDF content automatically, or add assist text and review inline before saving.']
          : boundary === 'server_image_ocr_live'
            ? ['Server extraction used a live OCR provider for this image before deterministic CRM field mapping.']
            : boundary === 'server_image_ocr_ready'
              ? ['Server extraction accepted this image through an OCR-ready boundary. Configure the OCR provider to enable automatic image extraction, or use assist text and review inline before saving.']
              : ['Server extraction is running without an attached file. Paste visible text and review inline before saving.'];

  return {
    ...parsed,
    sourceProfile,
    boundary,
    reviewRequired: true,
    acceptedSourceKind,
    sourceMimeType: fileType || 'manual/text',
    notes: [...boundaryNotes, ...parsed.notes, 'Explicit user review is required before applying the scan result to the lead form.'],
  };
}
