import { getAiProviderKey, getAiProviderName, isAiEnabled } from '@/lib/ai/config';
import { parseContactText, type ContactSourceProfile } from '@/lib/contact-exchange/contact-parser';

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
  provider: 'openai';
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

const OPENAI_CONTACT_SCAN_MODEL = process.env.OPENAI_CONTACT_SCAN_MODEL || 'gpt-4.1-mini';

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

function isOpenAiVisionConfigured() {
  return isAiEnabled() && getAiProviderName().toLowerCase() === 'openai' && Boolean(getAiProviderKey());
}

function buildExtractionInstructions(args: ExtractContactWithOcrArgs) {
  const filename = String(args.filename ?? '').trim() || 'contact source';
  const fileType = String(args.fileType ?? '').trim() || 'application/octet-stream';
  const assistText = String(args.assistText ?? '').trim();
  const sourceMode = args.sourceMode === 'camera' ? 'camera capture' : args.sourceMode === 'manual' ? 'manual assist text' : 'upload';

  return [
    'Extract business contact information from the provided source into JSON.',
    'Classify the source profile as business_card, screenshot, scan_pdf, or generic.',
    'Read the full image or PDF carefully. Return only information that is visibly present or directly inferable from layout labels.',
    'Do not invent values. Use empty strings or empty arrays when a field is missing.',
    'Prefer the primary person and company shown in the source. If multiple options exist, choose the best lead/contact interpretation.',
    'Keep phone numbers as shown. Keep websites and emails exact. Put contextual leftovers into notes.',
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



async function callOpenAiResponsesApi(args: ExtractContactWithOcrArgs, dataUrl: string) {
  const apiKey = getAiProviderKey();
  if (!apiKey) throw new Error('OpenAI key is not configured for contact scan OCR.');

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
          content: [{ type: 'input_text', text: buildExtractionInstructions(args) }],
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

export async function extractContactWithOcrProvider(args: ExtractContactWithOcrArgs): Promise<ContactOcrProviderResult | null> {
  const fileType = String(args.fileType ?? '').trim();
  if (!fileType || (!fileType.startsWith('image/') && fileType !== 'application/pdf')) return null;
  if (!isOpenAiVisionConfigured()) {
    return null;
  }

  const buffer = Buffer.from(await args.source.arrayBuffer());
  const dataUrl = fileType === 'application/pdf'
    ? `data:application/pdf;base64,${buffer.toString('base64')}`
    : `data:${fileType || 'image/jpeg'};base64,${buffer.toString('base64')}`;

  const draft = await callOpenAiResponsesApi(args, dataUrl);
  return {
    provider: 'openai',
    model: OPENAI_CONTACT_SCAN_MODEL,
    draft,
  };
}
