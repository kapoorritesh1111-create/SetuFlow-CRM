import { createClient } from '@/lib/supabase/server';

export type ReplyAnalysis = {
  summary: string;
  intent: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  missingInformation: string[];
  suggestedStage: string | null;
  suggestedResponse: string;
  recommendedFollowUp: string | null;
  quoteOrRfqAction: 'none' | 'create_quote' | 'create_rfq';
  notConfigured?: boolean;
};

const OUTPUT_SCHEMA_NOTE = [
  'Respond with strict JSON only, no markdown fences, matching this exact shape:',
  '{"summary": string, "intent": "low"|"medium"|"high", "urgency": "low"|"medium"|"high",',
  ' "missingInformation": string[], "suggestedStage": string|null, "suggestedResponse": string,',
  ' "recommendedFollowUp": string|null, "quoteOrRfqAction": "none"|"create_quote"|"create_rfq"}',
].join(' ');

function buildSystemPrompt() {
  return [
    'You are Setu Guru, analyzing a single buyer or supplier reply for a trade execution CRM (Setu Flow).',
    'Only use facts present in the pasted reply text and the CRM context provided. Never invent buyer facts, prices, certifications, or commitments that are not stated.',
    'You are advisory only: you suggest a next CRM stage and response, but you never send anything and never change CRM records yourself.',
    OUTPUT_SCHEMA_NOTE,
  ].join('\n');
}

export async function analyzeReply(params: {
  replyText: string;
  leadLabel: string;
  leadCountry: string | null;
}): Promise<ReplyAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      summary: 'Setu Guru live analysis is not configured yet. Add OPENAI_API_KEY in Vercel to enable the Reply Analyzer.',
      intent: 'low',
      urgency: 'low',
      missingInformation: [],
      suggestedStage: null,
      suggestedResponse: '',
      recommendedFollowUp: null,
      quoteOrRfqAction: 'none',
      notConfigured: true,
    };
  }

  const model = process.env.SETU_GURU_MODEL || 'gpt-4.1-mini';
  const userContent = [
    `Lead: ${params.leadLabel}${params.leadCountry ? ` (${params.leadCountry})` : ''}`,
    '',
    'Pasted reply:',
    params.replyText,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userContent },
      ],
    }),
  });

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Setu Guru reply analysis failed (${response.status}).`);
  }

  const raw = typeof result.output_text === 'string' ? result.output_text : '{}';
  let parsed: Partial<ReplyAnalysis>;
  try {
    parsed = JSON.parse(raw.trim().replace(/^```json\s*/i, '').replace(/```$/, ''));
  } catch {
    parsed = { summary: raw };
  }

  return {
    summary: parsed.summary || 'Setu Guru could not summarize this reply.',
    intent: (parsed.intent as ReplyAnalysis['intent']) || 'medium',
    urgency: (parsed.urgency as ReplyAnalysis['urgency']) || 'medium',
    missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation.slice(0, 10) : [],
    suggestedStage: parsed.suggestedStage ?? null,
    suggestedResponse: parsed.suggestedResponse || '',
    recommendedFollowUp: parsed.recommendedFollowUp ?? null,
    quoteOrRfqAction: (parsed.quoteOrRfqAction as ReplyAnalysis['quoteOrRfqAction']) || 'none',
  };
}

export async function getLeadContextForReply(orgId: string, leadId: string) {
  const supabase = await createClient();
  const client = supabase as any;

  const { data: lead, error } = await client
    .from('leads')
    .select('id,company_name,contact_name,country')
    .eq('organization_id', orgId)
    .eq('id', leadId)
    .maybeSingle();

  if (error) throw error;
  if (!lead) return null;

  return {
    label: lead.company_name || lead.contact_name || 'this lead',
    country: lead.country as string | null,
  };
}
