import { parseContactText, type ContactSourceProfile, type ExtractionConfidence } from '@/lib/contact-exchange/contact-parser';

export type ProviderFieldConfidence = {
  contactName: 'high' | 'medium' | 'low';
  companyName: 'high' | 'medium' | 'low';
  jobTitle: 'high' | 'medium' | 'low';
  email: 'high' | 'medium' | 'low';
  phone: 'high' | 'medium' | 'low';
  phoneSecondary: 'high' | 'medium' | 'low';
  website: 'high' | 'medium' | 'low';
  address: 'high' | 'medium' | 'low';
  notes: 'high' | 'medium' | 'low';
};

export type ContactOcrProviderDraft = {
  contactName: string;
  companyName: string;
  jobTitle: string;
  emails: string[];
  phones: string[];
  websites: string[];
  address: string;
  notes: string;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
  sourceProfile: ContactSourceProfile;
  fieldConfidence: ProviderFieldConfidence;
  warnings: string[];
};

export type ContactOcrProviderResult = {
  provider: 'openai' | 'openai-vision' | 'google-vision' | 'google-vision+openai';
  model: string;
  draft: ContactOcrProviderDraft;
};

type ExtractContactWithOcrArgs = {
  filename?: string | null;
  fileType?: string | null;
  assistText?: string | null;
  sourceMode?: 'upload' | 'camera' | 'manual';
  source: File;
};

type OpenAiStructuredResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

type GoogleVisionAnnotateResponse = {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string };
  }>;
  error?: { message?: string };
};

const OPENAI_CONTACT_SCAN_MODEL = process.env.OPENAI_CONTACT_SCAN_MODEL || 'gpt-4.1-mini';
const GOOGLE_VISION_MODEL_LABEL = 'google-cloud-vision-text-detection';

const CONTACT_EXTRACTION_SCHEMA = {
  name: 'contact_scan_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['contactName', 'companyName', 'jobTitle', 'emails', 'phones', 'websites', 'address', 'notes', 'rawText', 'confidence', 'sourceProfile', 'fieldConfidence', 'warnings'],
    properties: {
      contactName: { type: 'string' },
      companyName: { type: 'string' },
      jobTitle: { type: 'string' },
      emails: { type: 'array', items: { type: 'string' } },
      phones: { type: 'array', items: { type: 'string' } },
      websites: { type: 'array', items: { type: 'string' } },
      address: { type: 'string' },
      notes: { type: 'string' },
      rawText: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      sourceProfile: { type: 'string', enum: ['business_card', 'screenshot', 'scan_pdf', 'generic'] },
      fieldConfidence: {
        type: 'object',
        additionalProperties: false,
        required: ['contactName', 'companyName', 'jobTitle', 'email', 'phone', 'phoneSecondary', 'website', 'address', 'notes'],
        properties: {
          contactName: { type: 'string', enum: ['high', 'medium', 'low'] },
          companyName: { type: 'string', enum: ['high', 'medium', 'low'] },
          jobTitle: { type: 'string', enum: ['high', 'medium', 'low'] },
          email: { type: 'string', enum: ['high', 'medium', 'low'] },
          phone: { type: 'string', enum: ['high', 'medium', 'low'] },
          phoneSecondary: { type: 'string', enum: ['high', 'medium', 'low'] },
          website: { type: 'string', enum: ['high', 'medium', 'low'] },
          address: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
      warnings: { type: 'array', items: { type: 'string' } },
    },
  },
} as const;

function getContactScanProvider() {
  const provider = String(process.env.CONTACT_SCAN_PROVIDER || 'openai').trim().toLowerCase();
  return provider === 'google-vision' || provider === 'openai' || provider === 'openai-vision' ? provider : 'openai';
}

function getContactScanFallbackProvider() {
  const provider = String(process.env.CONTACT_SCAN_FALLBACK_PROVIDER || 'openai').trim().toLowerCase();
  return provider === 'openai' || provider === 'none' || provider === 'off' ? provider : 'openai';
}

function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function isGoogleVisionConfigured() {
  return Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim());
}

function buildExtractionInstructions(args: ExtractContactWithOcrArgs, mode: 'vision' | 'text' = 'vision') {
  const filename = String(args.filename ?? '').trim() || 'contact source';
  const fileType = String(args.fileType ?? '').trim() || 'application/octet-stream';
  const assistText = String(args.assistText ?? '').trim();
  const sourceMode = args.sourceMode === 'camera' ? 'camera capture' : args.sourceMode === 'manual' ? 'manual assist text' : 'upload';

  return [
    mode === 'text'
      ? 'Extract business contact information from OCR text into JSON.'
      : 'Extract business contact information from the provided source into JSON.',
    'Classify the source profile as business_card, screenshot, scan_pdf, or generic.',
    'Return only information that is visibly present in the OCR/source text or directly inferable from layout labels.',
    'Do not invent values. Use empty strings or empty arrays when a field is missing.',
    'Prefer the primary person and company shown in the source. If multiple options exist, choose the best lead/contact interpretation.',
    'Keep phone numbers as shown. Keep websites and emails exact. Put contextual leftovers into notes.',
    'For business cards, do not confuse taglines, dates, file names, or decorative words with company names.',
    'Never use the uploaded filename, generic words like image/photo/scan, or camera metadata as a company or contact value.',
    'Company is usually the brand/logo/company name. Contact name is a human name. Job title is a role such as CEO, CMO, Founder, Director, Manager, Procurement, Sales.',
    'Provide fieldConfidence for each mapped CRM field. Use high only when the value is clearly visible, medium when it is likely but layout/noise could cause ambiguity, and low when the value is tentative.',
    'Use warnings for anything that may need human review, especially multiple similar names, duplicate companies, or uncertain OCR characters.',
    `Source filename: ${filename}`,
    `Source mime type: ${fileType}`,
    `Capture mode: ${sourceMode}`,
    assistText ? `Operator assist text:\n${assistText}` : 'Operator assist text: none',
  ].join('\n');
}

function buildUserContent(args: ExtractContactWithOcrArgs, dataUrl: string) {
  const fileType = String(args.fileType ?? '').trim();
  const content: Array<Record<string, unknown>> = [
    { type: 'input_text', text: 'Extract contact details for CRM lead capture and return JSON only.' },
  ];

  if (fileType === 'application/pdf') {
    content.push({
      type: 'input_file',
      filename: args.filename || 'contact-source.pdf',
      file_data: dataUrl,
    });
  } else {
    content.push({
      type: 'input_image',
      image_url: dataUrl,
    });
  }

  if (args.assistText?.trim()) {
    content.push({
      type: 'input_text',
      text: `Operator assist text:\n${args.assistText.trim()}`,
    });
  }

  return content;
}

function getStructuredResponseText(payload: OpenAiStructuredResponse) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string' && content.text.trim()) {
        return content.text.trim();
      }
    }
  }
  return '';
}

function normalizeList(values: unknown) {
  if (!Array.isArray(values)) return [] as string[];
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

function normalizeConfidence(value: unknown): 'high' | 'medium' | 'low' {
  const normalized = String(value ?? '').toLowerCase();
  return normalized === 'high' || normalized === 'medium' || normalized === 'low' ? normalized : 'low';
}

function defaultFieldConfidence(): ProviderFieldConfidence {
  return {
    contactName: 'low',
    companyName: 'low',
    jobTitle: 'low',
    email: 'low',
    phone: 'low',
    phoneSecondary: 'low',
    website: 'low',
    address: 'low',
    notes: 'low',
  };
}

function confidenceFromUi(value: ExtractionConfidence | undefined): 'high' | 'medium' | 'low' {
  if (value === 'High') return 'high';
  if (value === 'Medium') return 'medium';
  return 'low';
}

function normalizeDraft(input: unknown): ContactOcrProviderDraft {
  const record = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const rawSourceProfile = String(record.sourceProfile ?? '').toLowerCase();
  const sourceProfile: ContactSourceProfile = rawSourceProfile === 'business_card' || rawSourceProfile === 'screenshot' || rawSourceProfile === 'scan_pdf' || rawSourceProfile === 'generic'
    ? rawSourceProfile
    : 'generic';
  const rawFieldConfidence = (record.fieldConfidence && typeof record.fieldConfidence === 'object' ? record.fieldConfidence : {}) as Record<string, unknown>;
  const fieldConfidence: ProviderFieldConfidence = {
    contactName: normalizeConfidence(rawFieldConfidence.contactName),
    companyName: normalizeConfidence(rawFieldConfidence.companyName),
    jobTitle: normalizeConfidence(rawFieldConfidence.jobTitle),
    email: normalizeConfidence(rawFieldConfidence.email),
    phone: normalizeConfidence(rawFieldConfidence.phone),
    phoneSecondary: normalizeConfidence(rawFieldConfidence.phoneSecondary),
    website: normalizeConfidence(rawFieldConfidence.website),
    address: normalizeConfidence(rawFieldConfidence.address),
    notes: normalizeConfidence(rawFieldConfidence.notes),
  };

  return {
    contactName: String(record.contactName ?? '').trim(),
    companyName: String(record.companyName ?? '').trim(),
    jobTitle: String(record.jobTitle ?? '').trim(),
    emails: normalizeList(record.emails),
    phones: normalizeList(record.phones),
    websites: normalizeList(record.websites),
    address: String(record.address ?? '').trim(),
    notes: String(record.notes ?? '').trim(),
    rawText: String(record.rawText ?? '').trim(),
    confidence: normalizeConfidence(record.confidence),
    sourceProfile,
    fieldConfidence: Object.values(fieldConfidence).some(Boolean) ? fieldConfidence : defaultFieldConfidence(),
    warnings: normalizeList(record.warnings),
  };
}

function draftFromParsedRawText(rawText: string, args: ExtractContactWithOcrArgs): ContactOcrProviderDraft {
  const parsed = parseContactText(rawText, {
    filename: args.filename,
    sourceMode: args.sourceMode,
    fileType: args.fileType,
  });
  const fieldMap = new Map(parsed.fields.map((field) => [field.label, field.confidence]));
  return {
    contactName: parsed.draft.contactName,
    companyName: parsed.draft.companyName,
    jobTitle: parsed.draft.jobTitle,
    emails: parsed.draft.email ? [parsed.draft.email] : [],
    phones: [parsed.draft.phone, parsed.draft.phoneSecondary].filter(Boolean),
    websites: parsed.draft.website ? [parsed.draft.website] : [],
    address: parsed.draft.notes.match(/Address:\s*([^\n]+)/i)?.[1]?.trim() || '',
    notes: parsed.draft.notes,
    rawText,
    confidence: parsed.draft.contactName || parsed.draft.companyName || parsed.draft.email || parsed.draft.phone ? 'medium' : 'low',
    sourceProfile: parsed.sourceProfile === 'generic' ? 'business_card' : parsed.sourceProfile,
    fieldConfidence: {
      contactName: confidenceFromUi(fieldMap.get('Full name')),
      companyName: confidenceFromUi(fieldMap.get('Company')),
      jobTitle: confidenceFromUi(fieldMap.get('Role')),
      email: confidenceFromUi(fieldMap.get('Email')),
      phone: confidenceFromUi(fieldMap.get('Phone')),
      phoneSecondary: confidenceFromUi(fieldMap.get('Phone 2')),
      website: confidenceFromUi(fieldMap.get('Website')),
      address: parsed.draft.notes.includes('Address:') ? 'medium' : 'low',
      notes: confidenceFromUi(fieldMap.get('Notes')),
    },
    warnings: parsed.draft.contactName || parsed.draft.companyName || parsed.draft.email || parsed.draft.phone
      ? []
      : ['Google Vision OCR returned text, but deterministic field mapping found limited structured lead details.'],
  };
}

async function callOpenAiResponsesApi(args: ExtractContactWithOcrArgs, dataUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured for contact scan OCR. Add it to the production deployment environment and redeploy.');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_CONTACT_SCAN_MODEL,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: buildExtractionInstructions(args, 'vision') }],
        },
        {
          role: 'user',
          content: buildUserContent(args, dataUrl),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...CONTACT_EXTRACTION_SCHEMA,
        },
      },
      max_output_tokens: 1400,
    }),
  });

  const payload = (await response.json()) as OpenAiStructuredResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI OCR request failed with status ${response.status}.`);
  }

  const jsonText = getStructuredResponseText(payload);
  if (!jsonText) throw new Error('OpenAI OCR response did not include structured output text.');
  return normalizeDraft(JSON.parse(jsonText));
}

async function callOpenAiTextMapper(args: ExtractContactWithOcrArgs, rawText: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured for contact scan field mapping.');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_CONTACT_SCAN_MODEL,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: buildExtractionInstructions(args, 'text') }],
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: `OCR text from business card/photo:\n\n${rawText}` },
            ...(args.assistText?.trim() ? [{ type: 'input_text', text: `Operator assist text:\n${args.assistText.trim()}` }] : []),
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...CONTACT_EXTRACTION_SCHEMA,
        },
      },
      max_output_tokens: 1200,
    }),
  });

  const payload = (await response.json()) as OpenAiStructuredResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI contact field mapping failed with status ${response.status}.`);
  }
  const jsonText = getStructuredResponseText(payload);
  if (!jsonText) throw new Error('OpenAI contact field mapping did not include structured output text.');
  return normalizeDraft(JSON.parse(jsonText));
}

async function callGoogleVisionTextDetection(buffer: Buffer) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured. Add it to Vercel Production and redeploy.');

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: buffer.toString('base64') },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          imageContext: {
            languageHints: ['en', 'hi'],
          },
        },
      ],
    }),
  });

  const payload = (await response.json()) as GoogleVisionAnnotateResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Vision OCR request failed with status ${response.status}.`);
  }
  const first = payload.responses?.[0];
  if (first?.error?.message) throw new Error(first.error.message);
  const rawText = first?.fullTextAnnotation?.text || first?.textAnnotations?.[0]?.description || '';
  if (!rawText.trim()) throw new Error('Google Vision OCR did not find readable text in this photo. Retake closer, flatter, and with less glare.');
  return rawText.trim();
}

async function extractWithGoogleVision(args: ExtractContactWithOcrArgs, buffer: Buffer): Promise<ContactOcrProviderResult> {
  const rawText = await callGoogleVisionTextDetection(buffer);
  let draft = draftFromParsedRawText(rawText, args);
  let provider: ContactOcrProviderResult['provider'] = 'google-vision';
  const fallbackProvider = getContactScanFallbackProvider();

  if (fallbackProvider === 'openai' && isOpenAiConfigured()) {
    try {
      draft = await callOpenAiTextMapper(args, rawText);
      draft.rawText = draft.rawText || rawText;
      provider = 'google-vision+openai';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI field mapping failed after Google Vision OCR.';
      draft = {
        ...draft,
        warnings: [...draft.warnings, `OpenAI field mapping fallback failed: ${message}`],
      };
    }
  }

  return {
    provider,
    model: provider === 'google-vision+openai' ? `${GOOGLE_VISION_MODEL_LABEL} + ${OPENAI_CONTACT_SCAN_MODEL}` : GOOGLE_VISION_MODEL_LABEL,
    draft,
  };
}

async function extractWithOpenAiVision(args: ExtractContactWithOcrArgs, buffer: Buffer, providerLabel: 'openai' | 'openai-vision' = 'openai'): Promise<ContactOcrProviderResult> {
  const fileType = String(args.fileType ?? '').trim();
  const dataUrl = fileType === 'application/pdf'
    ? `data:application/pdf;base64,${buffer.toString('base64')}`
    : `data:${fileType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  const draft = await callOpenAiResponsesApi(args, dataUrl);
  return {
    provider: providerLabel,
    model: providerLabel === 'openai-vision' ? `${OPENAI_CONTACT_SCAN_MODEL} vision-direct` : OPENAI_CONTACT_SCAN_MODEL,
    draft,
  };
}

export async function extractContactWithOcrProvider(args: ExtractContactWithOcrArgs): Promise<ContactOcrProviderResult | null> {
  const fileType = String(args.fileType ?? '').trim();
  if (!fileType || (!fileType.startsWith('image/') && fileType !== 'application/pdf')) return null;

  const buffer = Buffer.from(await args.source.arrayBuffer());
  const provider = getContactScanProvider();
  const isImage = fileType.startsWith('image/');

  if (provider === 'openai-vision' && isImage) {
    if (!isOpenAiConfigured()) return null;
    return extractWithOpenAiVision(args, buffer, 'openai-vision');
  }

  if (provider === 'google-vision' && isImage && isGoogleVisionConfigured()) {
    try {
      return await extractWithGoogleVision(args, buffer);
    } catch (error) {
      const fallbackProvider = getContactScanFallbackProvider();
      if (fallbackProvider === 'openai' && isOpenAiConfigured()) {
        return extractWithOpenAiVision(args, buffer, 'openai');
      }
      throw error;
    }
  }

  if (!isOpenAiConfigured()) return null;
  return extractWithOpenAiVision(args, buffer, provider === 'openai-vision' && isImage ? 'openai-vision' : 'openai');
}

export function getConfiguredContactOcrProviderState() {
  const provider = getContactScanProvider();
  const fallbackProvider = getContactScanFallbackProvider();
  const googleConfigured = isGoogleVisionConfigured();
  const openAiConfigured = isOpenAiConfigured();
  const activeProvider = provider === 'openai-vision'
    ? (openAiConfigured ? 'openai-vision' : 'none')
    : provider === 'google-vision' && googleConfigured
      ? (fallbackProvider === 'openai' && openAiConfigured ? 'google-vision+openai' : 'google-vision')
      : openAiConfigured
        ? 'openai'
        : 'none';

  return {
    requestedProvider: provider,
    fallbackProvider,
    activeProvider,
    googleConfigured,
    openAiConfigured,
    openAiModel: OPENAI_CONTACT_SCAN_MODEL,
    googleModel: GOOGLE_VISION_MODEL_LABEL,
  };
}
