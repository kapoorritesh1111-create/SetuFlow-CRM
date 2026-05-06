import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ResearchRequestSchema = z.object({
  message: z.string().min(2).max(4000),
  route: z.string().max(300).optional(),
  role: z.string().max(80).optional(),
  organization: z
    .object({
      name: z.string().max(200).optional(),
      country: z.string().max(120).optional(),
    })
    .optional(),
  context: z.record(z.unknown()).optional(),
});

function wantsLiveResearch(message: string) {
  const query = message.toLowerCase();
  return [
    'margin',
    'markup',
    'benchmark',
    'industry standard',
    'hsn',
    'hs code',
    'commodity code',
    'htariff',
    'tariff',
    'duty',
    'vat',
    'compliance',
    'document',
    'ship',
    'export',
    'import',
    'uk',
    'ireland',
    'eu',
  ].some((term) => query.includes(term));
}

function buildSystemPrompt(liveSearch: boolean) {
  return [
    'You are Setu Guru, the embedded help chatbot for Setu Flow CRM.',
    'Help users with CRM workflows, onboarding, troubleshooting, pricing guidance, product classification research, and export/import compliance research.',
    'For CRM workflow questions, answer from Setu Flow knowledge and give exact app routes when possible.',
    liveSearch
      ? 'For industry margins, HS/HSN/HTS/commodity codes, tariff, duty, VAT, import/export, food safety, labelling, plant health, and compliance questions, use live web search and cite official or high-quality sources.'
      : 'Live search is disabled in this environment. Say what information would need live verification and avoid giving unsupported current regulatory claims.',
    'Source priority: official customs portals, official food/plant/animal/standards regulators, government trade guidance, reputable industry associations, then user-provided internal context.',
    'Never autonomously approve quotes, change governed pricing defaults, send messages, advance order states, clear compliance decisions, invite users, change roles, import/delete data, or overwrite product master data.',
    'For requests to fill missing HS/HSN codes, prepare a review table with candidates, confidence, and sources. Do not claim master data has been changed unless a separate approved write-back action confirms it.',
    'For margin questions, provide a benchmark range, explain margin vs markup if relevant, and tell the user how to enter it in Setu Flow as a draft or approval-backed assumption.',
    'For compliance document questions, provide likely documents/checks and confidence, but do not say a shipment is legally cleared.',
    'Answer with: What I checked, Recommendation, How to use it in Setu Flow, Confidence/Sources if live research was used, and one next action.',
  ].join('\n');
}

function extractSources(output: unknown) {
  const sources: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();

  function visit(node: unknown) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const record = node as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : undefined;
    if (url && /^https?:\/\//.test(url) && !seen.has(url)) {
      seen.add(url);
      sources.push({
        title: typeof record.title === 'string' ? record.title : url,
        url,
      });
    }
    Object.values(record).forEach(visit);
  }

  visit(output);
  return sources.slice(0, 8);
}

export async function POST(request: NextRequest) {
  const parsed = ResearchRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid Setu Guru research request.', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        answer:
          'Setu Guru live research is not configured yet. Add OPENAI_API_KEY and SETU_GURU_MODEL in Vercel, then retry. Until then, I can provide CRM workflow help but not verified live margin, tariff, HS/HSN, or compliance guidance.',
        sources: [],
        confidence: 'not_configured',
        recommendedNextAction: 'Add OpenAI environment variables in Vercel and redeploy.',
      },
      { status: 503 }
    );
  }

  const body = parsed.data;
  const shouldUseLiveSearch = process.env.SETU_GURU_LIVE_SEARCH !== 'false' && wantsLiveResearch(body.message);
  const model = process.env.SETU_GURU_MODEL || 'gpt-4.1-mini';
  const crmContext = {
    route: body.route,
    role: body.role,
    organization: body.organization,
    context: body.context,
    writeBackAllowed: process.env.SETU_GURU_ALLOW_WRITEBACK === 'true',
    adminApprovalRequired: process.env.SETU_GURU_REQUIRE_ADMIN_APPROVAL !== 'false',
  };

  const openAiBody = {
    model,
    input: [
      { role: 'system', content: buildSystemPrompt(shouldUseLiveSearch) },
      {
        role: 'user',
        content: `User question:\n${body.message}\n\nCRM context JSON:\n${JSON.stringify(crmContext, null, 2)}`,
      },
    ],
    tools: shouldUseLiveSearch ? [{ type: 'web_search_preview' }] : [],
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(openAiBody),
  });

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return NextResponse.json(
      {
        error: 'Setu Guru live research failed.',
        details: result,
      },
      { status: response.status }
    );
  }

  const answer = typeof result.output_text === 'string' ? result.output_text : 'Setu Guru could not produce a readable answer.';
  const sources = extractSources(result.output);

  return NextResponse.json({
    answer,
    sources,
    confidence: shouldUseLiveSearch ? 'source_backed' : 'crm_context_only',
    recommendedNextAction: shouldUseLiveSearch
      ? 'Review the answer and sources before saving CRM values or acting commercially.'
      : 'Use the suggested CRM route/action, then reopen Setu Guru if you remain blocked.',
  });
}
