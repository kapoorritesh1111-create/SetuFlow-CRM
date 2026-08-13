import 'server-only';

export type InteraktCompanyIntelligence = {
  companyName: string | null;
  brandName: string | null;
  confidence: number;
  evidence: string;
  source: 'message_text' | 'image';
  model: string | null;
};

function cleanEntity(value: unknown) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;,-]+|[\s:;,-]+$/g, '')
    .trim();
  if (!text || text.length < 2 || text.length > 120) return null;
  return text;
}

function truncateEntity(value: string) {
  return cleanEntity(value.split(/(?:[.!?\n]|\s+(?:and\s+(?:we|i)|we\s+(?:need|require|want|are looking)|i\s+(?:need|require|want|am looking)|looking for|need|require|want)\b)/i)[0]);
}

function looksLikeCompanyName(value: string) {
  return /\b(?:pvt|private|ltd|limited|llp|inc|llc|corp|corporation|company|co\.?|industries|industry|foods?|agro|packaging|packmate|enterprises?|traders?|trading|exports?|imports?|solutions|systems|products?|ventures|international|global|manufacturing|manufacturers?)\b/i.test(value);
}

function looksLikeNaturalSentence(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length > 6
    || /^(?:we|i|our|my|this|it|the)\b/i.test(value)
    || /\b(?:we|i)\s+(?:are|am|have|make|sell|need|want|do)\b/i.test(value);
}

function directWorkflowCompanyName(value: string) {
  const candidate = cleanEntity(value);
  if (!candidate || looksLikeNaturalSentence(candidate)) return null;
  if (/\b(?:startup|company|business|firm)\b/i.test(candidate) && candidate.split(/\s+/).length > 4) return null;
  return candidate;
}

export function extractExplicitCompanyFromText(textValue: unknown): InteraktCompanyIntelligence | null {
  const text = String(textValue ?? '').trim();
  if (!text || text.length > 5000) return null;

  const companyPatterns = [
    /(?:my|our)\s+(?:company|business|firm)\s+(?:name\s+)?(?:is|:|-)?\s*([^\n.!?]{2,120})/i,
    /(?:company|business|firm)\s+(?:name\s+)?(?:is|:|-)\s*([^\n.!?]{2,120})/i,
  ];
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    const companyName = match?.[1] ? truncateEntity(match[1]) : null;
    if (companyName) {
      return {
        companyName,
        brandName: null,
        confidence: 0.99,
        evidence: match?.[0]?.trim() || text.slice(0, 240),
        source: 'message_text',
        model: null,
      };
    }
  }

  const brandMatch = text.match(/(?:my|our)?\s*brand\s+(?:name\s+)?(?:is|:|-)\s*([^\n.!?]{2,120})/i);
  const brandName = brandMatch?.[1] ? truncateEntity(brandMatch[1]) : null;
  if (brandName) {
    return {
      companyName: null,
      brandName,
      confidence: 0.99,
      evidence: brandMatch?.[0]?.trim() || text.slice(0, 240),
      source: 'message_text',
      model: null,
    };
  }

  const fromMatch = text.match(/(?:i am|i'm|we are|we're)\s+(?:from|with)\s+([^\n.!?]{2,120})/i);
  const fromName = fromMatch?.[1] ? truncateEntity(fromMatch[1]) : null;
  if (fromName && looksLikeCompanyName(fromName)) {
    return {
      companyName: fromName,
      brandName: null,
      confidence: 0.94,
      evidence: fromMatch?.[0]?.trim() || text.slice(0, 240),
      source: 'message_text',
      model: null,
    };
  }

  return null;
}

export function normalizeWorkflowCompanyAnswer(answerValue: unknown): InteraktCompanyIntelligence | null {
  const answer = String(answerValue ?? '').replace(/\s+/g, ' ').trim();
  if (!answer || answer.length > 500) return null;

  const explicit = extractExplicitCompanyFromText(answer);
  if (explicit?.companyName) {
    return { ...explicit, evidence: answer };
  }

  const contextualPatterns = [
    /\b(?:startup|company|business|firm)\s+(?:called\s+|named\s+)?([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,3})(?=\s+(?:for|in|with|making|selling|which|that|and)\b|[,.!?]|$)/,
    /\b(?:startup|company|business|firm)\s+(?:called\s+|named\s+)?([A-Za-z0-9][A-Za-z0-9&'.-]{1,60})(?=\s+(?:for|in|with|making|selling|which|that|and)\b|[,.!?]|$)/i,
  ];
  for (const pattern of contextualPatterns) {
    const match = answer.match(pattern);
    const companyName = match?.[1] ? cleanEntity(match[1]) : null;
    if (companyName && !/^(?:new|small|d2c|b2b|startup|company|business)$/i.test(companyName)) {
      return {
        companyName,
        brandName: null,
        confidence: 0.9,
        evidence: answer,
        source: 'message_text',
        model: null,
      };
    }
  }

  const direct = directWorkflowCompanyName(answer);
  if (direct) {
    return {
      companyName: direct,
      brandName: null,
      confidence: 0.98,
      evidence: answer,
      source: 'message_text',
      model: null,
    };
  }

  return null;
}

function extractOpenAiText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as unknown[]
      : [];
    return content.map((part) => part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string'
      ? String((part as Record<string, unknown>).text)
      : '');
  }).filter(Boolean).join('\n').trim();
}

function parseImageIntelligence(raw: string, model: string): InteraktCompanyIntelligence | null {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const companyName = cleanEntity(parsed.company_name);
    const brandName = cleanEntity(parsed.brand_name);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
    const evidence = String(parsed.evidence ?? parsed.visible_text ?? '').trim().slice(0, 500);
    if (!companyName && !brandName) return null;
    return {
      companyName,
      brandName,
      confidence,
      evidence: evidence || 'Visible identity evidence detected in customer image.',
      source: 'image',
      model,
    };
  } catch {
    return null;
  }
}

export async function analyzeInteraktCustomerImage(imageUrlValue: unknown, captionValue?: unknown): Promise<InteraktCompanyIntelligence | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const imageUrl = String(imageUrlValue ?? '').trim();
  if (!/^https:\/\//i.test(imageUrl)) return null;

  const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
  const caption = String(captionValue ?? '').trim().slice(0, 1000);
  const prompt = [
    'Analyze this customer-supplied packaging/business image only for organization identity evidence.',
    'Return JSON only with keys: company_name, brand_name, confidence, evidence.',
    'company_name must be a legal/business/company identity that is visibly supported by the image. Do not put a product name, person name, location, or generic packaging words in company_name.',
    'brand_name may contain a consumer/product brand if visibly supported.',
    'If only a brand/logo is visible and the legal company is not visible, set company_name to null.',
    'If there is no reliable organization identity, set both names to null and confidence to 0.',
    'confidence must be a number from 0 to 1. evidence should briefly state the visible words or logo that support the answer.',
    caption ? `Customer message/caption context: ${caption}` : null,
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: imageUrl, detail: 'high' },
          ],
        }],
        max_output_tokens: 500,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as Record<string, unknown>;
    return parseImageIntelligence(extractOpenAiText(payload), model);
  } catch {
    return null;
  }
}
