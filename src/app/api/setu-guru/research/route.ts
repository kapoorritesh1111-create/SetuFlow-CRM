import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { answerFromApprovedLessons, isOrganizationPolicyQuestion } from '@/lib/setu-guru/organization-learning';

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
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(1200) })).max(6).optional(),
});

function wantsLiveResearch(message: string) {
  // Whole terms only: 'eu' within 'quantity' or 'uk' within 'bulk' must not trigger paid web search.
  return /\b(benchmark|industry standard|hsn|hs code|commodity code|tariff|customs|import duty|export duty|vat rate|latest regulation|current regulation|trade law)\b/i.test(message);
}

function buildSystemPrompt(liveSearch: boolean) {
  return [
    'You are Setu Guru, the existing AI assistant inside Setu Flow CRM. Answer the user\'s actual question from anywhere in the application; the current page is context, NOT the topic unless they ask about that page.',
    'Be conversational and useful for general questions too. Distinguish general guidance from live organization facts. You have NOT looked up a CRM record unless an authorized data source is supplied.',
    'When a user asks about a company-specific policy without approved knowledge, say you do not know and ask them to request an owner-approved answer. Never make up Stark Packmate policy.',
    'For packaging MOQ or quantities distinguish a production minimum measured in meters from a piece/kg quantity; never calculate a precise MOQ without verified geometry, construction and active production rule.',
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
    'Answer the question directly first. When business data or operational evidence is relevant, identify what was verified, what remains unknown, and one concrete next step. Do not force page-help boilerplate onto every response.',
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
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Please sign in to ask Guru.', error: 'Authentication required' }, { status: 401 });
  const parsed = ResearchRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid Setu Guru research request.', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const body = parsed.data;
  // Approved organization knowledge takes precedence over generic model guesses.
  const approved = await answerFromApprovedLessons(workspace.organization.id, body.message).catch(() => null);
  if (approved) return NextResponse.json(approved);
  if (isOrganizationPolicyQuestion(body.message)) {
    return NextResponse.json({
      answer: 'I do not have an approved procedure for this organization yet. Ask your owner or authorized admin to teach Guru, or use Request answer.',
      confidence: 'low', mode: 'unanswered_company_policy', unresolved: true, actions: ['Request answer'], sources: [],
    });
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

  const shouldUseLiveSearch = process.env.SETU_GURU_LIVE_SEARCH !== 'false' && wantsLiveResearch(body.message);
  const model = process.env.SETU_GURU_MODEL || 'gpt-4.1-mini';
  const isCenterSealQuestion = /\b(center[ -]?seal|centre[ -]?seal|3ss|three[ -]?side[ -]?seal)\b/i.test(body.message)
    && /\b(moq|minimum|pouch|quantity|production run|pieces|pcs)\b/i.test(body.message);
  const crmContext = {
    route: body.route,
    role: workspace.currentRoles.join(', '),
    organization: { name: workspace.organization.name, slug: workspace.organization.slug },
    // Client page context is an untrusted navigation hint, not verified CRM evidence.
    pageHint: typeof body.context?.routeTitle === 'string' ? body.context.routeTitle.slice(0, 120) : undefined,
    previousConversation: body.history ?? [],
    verifiedPricingCodeReference: isCenterSealQuestion
      ? 'The existing Pricing V5 Center Seal/3SS frame-family costing core checks minimum_run_length_m from the active template; its fallback minimum is 250 meters. Exact MOQ in PCS/KG must be computed using the active construction, open width, repeat/units per frame and run length. This is code-level guidance, NOT a live quote calculation and NOT confirmation that the current template has the fallback value.'
      : undefined,
    writeBackAllowed: false,
    adminApprovalRequired: true,
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

  let response: Response;
  try { response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(openAiBody),
    signal: AbortSignal.timeout(25000),
  }); } catch {
    return NextResponse.json({ answer: 'Guru could not reach the AI provider. Please retry; I have not changed any CRM data.', confidence: 'unavailable', sources: [] }, { status: 503 });
  }

  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return NextResponse.json(
      {
        error: 'Setu Guru live research failed.',
        answer: 'The AI provider could not answer right now. Please retry or request an owner-approved answer.',
      },
      { status: 502 }
    );
  }

  const answer = typeof result.output_text === 'string' && result.output_text.trim()
    ? result.output_text.trim()
    : (Array.isArray(result.output) ? result.output.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const parts = (item as { content?: unknown }).content;
        return Array.isArray(parts) ? parts.flatMap((part) => {
          return part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
            ? [String((part as { text: string }).text)] : [];
        }) : [];
      }).join('\n').trim() : '');
  if (!answer) return NextResponse.json({ answer: 'The AI provider returned no readable answer. Please retry.', sources: [], confidence: 'unavailable' }, { status: 502 });
  const sources = extractSources(result.output);

  return NextResponse.json({
    answer,
    sources,
    confidence: shouldUseLiveSearch ? 'source_backed' : 'ai_guidance',
    mode: 'ai_assistant',
    source: 'ai_provider',
    recommendedNextAction: shouldUseLiveSearch
      ? 'Review the answer and sources before saving CRM values or acting commercially.'
      : 'Use the suggested CRM route/action, then reopen Setu Guru if you remain blocked.',
  });
}
