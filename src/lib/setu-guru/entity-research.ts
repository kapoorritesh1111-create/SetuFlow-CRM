"use server";
import { createClient } from '@/lib/supabase/server';
import { getIcpProfile, type IcpProfile } from '@/lib/setu-guru/icp';
import { retrieveGuru } from '@/lib/rag/retrieve';
import { embedChunks } from '@/lib/rag/embedding-provider';
import { scoreFitAgainstIcp, type FitScoreResult } from '@/lib/setu-guru/fit-scoring';

import Anthropic from '@anthropic-ai/sdk';

export type { FitScoreResult };

export type ResearchCitation = {
  marker: string; // e.g. "[R1]"
  sourceType: string;
  sourceId: string;
};

export type EntityResearchResult = {
  entityId: string;
  entityType: 'buyer' | 'supplier';
  label: string;
  fitSummary: string;
  fitScore: FitScoreResult | null;
  recommendedProducts: string[];
  suggestedAngle: string | null;
  missingInformation: string[];
  recommendedNextAction: string;
  suggestedFollowUpTiming: string | null;
  complianceStatus?: 'ok' | 'gaps_found' | 'unknown';
  missingDocuments?: string[];
  rfqReadiness?: 'ready' | 'needs_input' | 'unknown';
  /** Sources actually cited in fitSummary/suggestedAngle, per SOW Module D
   *  "Citation UI Mapping" — only present when enrichWithRag() ran and the
   *  model referenced retrieved document chunks (e.g. "[R1]"). */
  citations?: ResearchCitation[];
};

type LeadRow = {
  id: string;
  company_name?: string | null;
  contact_name?: string | null;
  country?: string | null;
  lead_type?: string | null;
  products_or_needs?: string | null;
  main_product_category?: string | null;
  last_contacted_at?: string | null;
  intro_sent?: boolean | null;
  trade_event_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const AI_TIMEOUT_MS = 8000;
// Configurable via env, matching the SETU_GURU_MODEL / OPENAI_CONTACT_SCAN_MODEL pattern.
// Falls back to a current Haiku model if not set in .env.
const RAG_SYNTHESIS_MODEL = process.env.SETU_GURU_RAG_MODEL || 'claude-haiku-4-5-20251001';

// --- Singleton API clients (do not recreate per-request) ---
let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ timeout: AI_TIMEOUT_MS });
  return anthropicClient;
}

const ageDays = (value?: string | null) =>
  value ? Math.floor((Date.now() - Date.parse(value)) / DAY_MS) : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Defense-in-depth guard.
 *
 * The primary tenant-isolation guarantee for this app comes from Postgres
 * RLS (organization-scoped policies using is_org_member, per the RLS
 * hardening work already done on `leads`/`quotes`/etc). AS LONG AS
 * `createClient()` returns a session-scoped client (anon key + user's
 * auth cookie, not the service-role key), RLS alone already prevents a
 * malicious orgId from returning another tenant's rows.
 *
 * This guard adds a second, independent layer on top of that:
 *   1. Rejects requests with no authenticated session at all (fail
 *      closed instead of letting a malformed/anonymous call reach the
 *      database and rely solely on RLS).
 *   2. Rejects malformed orgId/leadId before any query runs, instead of
 *      trusting whatever string a caller passes in.
 *
 * NOTE: if `createClient()` in `@/lib/supabase/server` ever uses the
 * SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS entirely) instead of the
 * session-scoped anon client, this guard becomes the ONLY thing standing
 * between a caller and cross-tenant data â€” confirm that before shipping.
 */
async function assertRequestIsValid(
  client: any,
  orgId: string,
  leadId: string,
): Promise<boolean> {
  if (!UUID_RE.test(orgId) || !UUID_RE.test(leadId)) {
    console.warn('[Guru:Agentic-AI] Rejected malformed orgId/leadId', { orgId, leadId });
    return false;
  }

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    console.warn('[Guru:Agentic-AI] Rejected request with no authenticated session', { orgId, leadId });
    return false;
  }

  return true;
}

/**
 * Safely parse a JSON object out of an LLM text response.
 * Handles markdown code fences and stray leading/trailing text.
 */
function safeParseJson<T = Record<string, unknown>>(raw: string): T | null {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : cleaned;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

function computeMissingInfo(lead: LeadRow, entityType: 'buyer' | 'supplier'): string[] {
  const missing: string[] = [];
  if (!lead.country) missing.push('Country');
  if (!lead.products_or_needs) missing.push(entityType === 'supplier' ? 'Capability or product category' : 'Product interest or needs');
  if (entityType === 'buyer' && !lead.contact_name) missing.push('Contact name');
  return missing;
}

/**
 * Shared fetch: loads the lead row + ICP profile for a given org/lead,
 * optionally scoped with extra equality filters (e.g. lead_type = 'supplier').
 */
async function fetchLeadAndIcp(
  client: any,
  orgId: string,
  leadId: string,
  columns: string,
  extraFilters: Record<string, string> = {},
): Promise<{ lead: LeadRow | null; icp: IcpProfile | null }> {
  let query = client.from('leads').select(columns).eq('organization_id', orgId).eq('id', leadId);
  for (const [key, value] of Object.entries(extraFilters)) {
    query = query.eq(key, value);
  }

  const [{ data: lead, error: leadError }, icp] = await Promise.all([query.maybeSingle(), getIcpProfile(orgId)]);

  if (leadError) {
    // Log full detail server-side only; never let raw DB error objects
    // (which can include table/column names) reach the client.
    console.error('[Guru:Agentic-AI] fetchLeadAndIcp DB error:', { orgId, leadId, error: leadError });
    throw new Error('Unable to load lead data.');
  }
  return { lead: lead ?? null, icp };
}

/**
 * Attempts to enrich a fit summary / outreach angle using RAG + an LLM.
 * Falls back silently to the rule-based defaults on any failure (network,
 * embedding, retrieval, or JSON parsing errors), logging the failure for
 * observability without breaking the caller.
 *
 * FIX (this pass): the query embedding used to come from OpenAI's
 * text-embedding-3-small (1536-dim). guru_embeddings / match_guru_embeddings
 * are hardcoded to vector(1024) (BGE-M3's output size — see
 * supabase/migrations/20260713000000_guru_rag_embeddings_hardening.sql).
 * A 1536-dim query embedding against a 1024-dim RPC would fail every call;
 * the failure was invisible because this function's catch-all silently
 * falls back to the rule-based summary. Switched to embedChunks() (BGE-M3,
 * same provider ingest.ts writes with) so query-side and storage-side
 * embeddings are dimensionally consistent.
 */
async function enrichWithRag(params: {
  orgId: string;
  label: string;
  products: string | null | undefined;
  country: string | null | undefined;
  fallbackAngle: string | null;
  fallbackSummary: string;
}): Promise<{ angle: string | null; summary: string; citations: ResearchCitation[] }> {
  const { orgId, label, products, country, fallbackAngle, fallbackSummary } = params;
  const fallback = { angle: fallbackAngle, summary: fallbackSummary, citations: [] as ResearchCitation[] };

  try {
    const ragQuestion = `Find the best outreach angle and historical data for a buyer interested in ${
      products || 'our products'
    } from ${country || 'unknown region'}.`;

    const embeddingResult = await embedChunks([ragQuestion]);
    if (!embeddingResult.ok || !embeddingResult.embeddings) {
      console.warn('[Guru:Agentic-AI] Query embedding failed, using fallback', {
        orgId,
        label,
        error: embeddingResult.error,
      });
      return fallback;
    }
    const queryEmbedding = embeddingResult.embeddings[0];

    const ragResult = await retrieveGuru({
      organizationId: orgId,
      question: ragQuestion,
      queryEmbedding,
      matchCount: 3,
    });

    if (!ragResult.found) {
      return fallback;
    }

    const aiResponse = await getAnthropic().messages.create({
      model: RAG_SYNTHESIS_MODEL,
      max_tokens: 300,
      system: ragResult.groundingPrompt,
      messages: [
        {
          role: 'user',
          content: `Based on the RAG data, write a 1-sentence personalized outreach angle for ${label}. Then write a 1-sentence fit summary. Cite retrieved sources inline using their [R#] markers wherever a claim is drawn from them. Respond with ONLY valid JSON, no markdown fences, in exactly this shape: {"angle": "...", "summary": "...", "sourcesUsed": ["R1", "R2"]}`,
        },
      ],
    });

    const block = aiResponse.content.find((item) => item.type === 'text');
    const responseText = block && 'text' in block ? block.text : '';
    const parsed = safeParseJson<{ angle?: string; summary?: string; sourcesUsed?: string[] }>(responseText);

    if (!parsed) {
      console.warn('[Guru:Agentic-AI] Could not parse LLM JSON response, using fallback', { orgId, label });
      return fallback;
    }

    // Map the model's self-reported "R1"/"R2" markers back to full source
    // info from the actual retrieved chunks, so the UI can render a
    // verifiable source list rather than trusting the model's citation
    // claims at face value.
    const citedMarkers = new Set((parsed.sourcesUsed ?? []).map((m) => m.replace(/[^\dR]/gi, '').toUpperCase()));
    const citations: ResearchCitation[] = ragResult.chunks
      .filter((chunk) => citedMarkers.has(chunk.citation.replace(/[^\dR]/gi, '').toUpperCase()))
      .map((chunk) => ({
        marker: chunk.citation,
        sourceType: chunk.source_type,
        sourceId: chunk.source_id,
      }));

    return {
      angle: parsed.angle || fallbackAngle,
      summary: parsed.summary || fallbackSummary,
      citations,
    };
  } catch (error) {
    console.error('[Guru:Agentic-AI] Failed to orchestrate RAG enrichment:', { orgId, label, error });
    return fallback;
  }
}

export async function generateBuyerResearch(orgId: string, leadId: string): Promise<EntityResearchResult | null> {
  const supabase = await createClient();
  const client = supabase as any;

  if (!(await assertRequestIsValid(client, orgId, leadId))) return null;

  const { lead, icp } = await fetchLeadAndIcp(
    client,
    orgId,
    leadId,
    'id,company_name,contact_name,country,lead_type,products_or_needs,main_product_category,last_contacted_at,intro_sent,trade_event_id,created_at',
  );
  if (!lead) return null;

  const [{ data: quotes }, { data: shares }, { data: communications }] = await Promise.all([
    client
      .from('quotes')
      .select('id,status,sent_at,last_customer_response_at')
      .eq('organization_id', orgId)
      .eq('lead_id', leadId)
      .limit(20),
    client.from('catalog_shares').select('id,last_opened_at').eq('organization_id', orgId).eq('lead_id', leadId).limit(20),
    client
      .from('communications')
      .select('id,direction,sent_at,created_at')
      .eq('organization_id', orgId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const label = lead.company_name || lead.contact_name || 'This buyer';
  const fitScore = scoreFitAgainstIcp(lead, icp);
  const hasQuote = (quotes ?? []).length > 0;
  const hasCatalogOpen = (shares ?? []).some((share: any) => Boolean(share.last_opened_at));
  const lastInbound = (communications ?? []).find((item: any) => item.direction === 'inbound');

  const missingInformation = computeMissingInfo(lead, 'buyer');

  const summaryParts: string[] = [];
  if (fitScore) {
    summaryParts.push(
      fitScore.score >= 65
        ? `This buyer looks like a strong fit (fit score ${fitScore.score}/100).`
        : fitScore.score >= 40
          ? `This buyer is a moderate fit (fit score ${fitScore.score}/100).`
          : `This buyer does not clearly match your configured ICP yet (fit score ${fitScore.score}/100).`,
    );
    if (fitScore.reasons.length) summaryParts.push(fitScore.reasons.join(' '));
  } else {
    summaryParts.push('Set up your ICP profile so Setu Guru can score how well this buyer fits your target market.');
  }
  if (lead.trade_event_id) summaryParts.push('This lead was captured from a trade event.');
  if (hasQuote) summaryParts.push('A quote already exists for this buyer.');
  if (hasCatalogOpen) summaryParts.push('The buyer has opened a shared catalog.');

  const recommendedProducts = icp && fitScore?.matchedProduct ? icp.products.slice(0, 5) : [];

  let recommendedNextAction = 'Open the buyer lead and confirm the next CRM step.';
  let suggestedFollowUpTiming: string | null = null;
  if (!lead.last_contacted_at && !lead.intro_sent) {
    recommendedNextAction = 'Prepare the first approved outreach message.';
    suggestedFollowUpTiming = 'Today';
  } else if (hasCatalogOpen && !lastInbound) {
    recommendedNextAction = 'Follow up after the catalog was opened with no reply yet.';
    suggestedFollowUpTiming = 'Within 2 days';
  } else if (hasQuote) {
    recommendedNextAction = 'Check in on the open quote and offer to answer questions.';
    suggestedFollowUpTiming = 'Within 3 days of the quote being sent';
  }

  const fallbackAngle = icp?.outreach_style
    ? icp.outreach_style
    : recommendedProducts.length
      ? `Lead with ${recommendedProducts[0]} and reference why it matches their market.`
      : null;
  const fallbackSummary = summaryParts.join(' ');

  const { angle: finalSuggestedAngle, summary: finalFitSummary, citations } = await enrichWithRag({
    orgId,
    label,
    products: lead.products_or_needs,
    country: lead.country,
    fallbackAngle,
    fallbackSummary,
  });

  return {
    entityId: lead.id,
    entityType: 'buyer',
    label,
    fitSummary: finalFitSummary,
    fitScore,
    recommendedProducts,
    suggestedAngle: finalSuggestedAngle,
    missingInformation,
    recommendedNextAction,
    suggestedFollowUpTiming,
    citations: citations.length ? citations : undefined,
  };
}

/**
 * NOTE (flagged, not changed): unlike generateBuyerResearch, this function
 * does not call enrichWithRag() — it's rule-based only (fitScore + document
 * expiry + RFQ status from CRM tables directly). This may be intentional
 * (supplier compliance status arguably shouldn't depend on an LLM's
 * synthesis), but nothing in the code documents that as a deliberate
 * decision, and it's inconsistent with the buyer path. Worth confirming
 * with whoever owns this feature whether supplier research should also get
 * RAG-grounded synthesis, or whether rule-based-only is correct as-is.
 */
export async function generateSupplierResearch(orgId: string, leadId: string): Promise<EntityResearchResult | null> {
  const supabase = await createClient();
  const client = supabase as any;

  if (!(await assertRequestIsValid(client, orgId, leadId))) return null;

  const { lead, icp } = await fetchLeadAndIcp(
    client,
    orgId,
    leadId,
    'id,company_name,contact_name,country,lead_type,products_or_needs,main_product_category,created_at,updated_at',
    { lead_type: 'supplier' },
  );
  if (!lead) return null;

  const [{ data: documents }, { data: rfqs }] = await Promise.all([
    client
      .from('documents')
      .select('id,status,expires_at')
      .eq('organization_id', orgId)
      .eq('related_entity', 'lead')
      .eq('related_id', leadId)
      .limit(50),
    client
      .from('rfqs')
      .select('id,status,validity_date,updated_at')
      .eq('organization_id', orgId)
      .eq('lead_id', leadId)
      .order('updated_at', { ascending: false })
      .limit(20),
  ]);

  const label = lead.company_name || lead.contact_name || 'This supplier';
  const fitScore = scoreFitAgainstIcp(lead, icp);

  const requiredDocs = icp?.required_documents ?? [];
  const existingDocs = documents ?? [];
  const now = Date.now();
  const expiredDocs = existingDocs.filter((doc: any) => doc.expires_at && Date.parse(doc.expires_at) < now);

  const missingDocuments =
    requiredDocs.length && existingDocs.length === 0
      ? requiredDocs
      : expiredDocs.map((doc: any) => `${doc.status ?? 'Document'} expired`);

  const complianceStatus: EntityResearchResult['complianceStatus'] =
    requiredDocs.length === 0 ? 'unknown' : missingDocuments.length ? 'gaps_found' : 'ok';

  const openRfq = (rfqs ?? []).find((rfq: any) => !['completed', 'closed', 'approved'].includes(String(rfq.status ?? '').toLowerCase()));
  const rfqReadiness: EntityResearchResult['rfqReadiness'] =
    complianceStatus === 'gaps_found' ? 'needs_input' : (rfqs ?? []).length ? 'ready' : 'unknown';

  const missingInformation = computeMissingInfo(lead, 'supplier');

  const summaryParts: string[] = [];
  if (fitScore) {
    summaryParts.push(
      fitScore.score >= 65
        ? `This supplier looks like a strong sourcing fit (fit score ${fitScore.score}/100).`
        : `This supplier is a partial sourcing fit (fit score ${fitScore.score}/100).`,
    );
    if (fitScore.reasons.length) summaryParts.push(fitScore.reasons.join(' '));
  } else {
    summaryParts.push('Set up your ICP profile so Setu Guru can score supplier fit against your sourcing needs.');
  }
  if (complianceStatus === 'gaps_found') {
    summaryParts.push('Required compliance documents are missing or expired.');
  } else if (complianceStatus === 'ok') {
    summaryParts.push('Required documents are on file.');
  }
  if (openRfq) summaryParts.push('An RFQ with this supplier is still open.');

  const recommendedNextAction =
    complianceStatus === 'gaps_found'
      ? 'Request the missing or expired compliance documents before moving forward.'
      : openRfq
        ? 'Review the open RFQ response and confirm next steps.'
        : 'Confirm supplier capability details and consider creating an RFQ.';

  return {
    entityId: lead.id,
    entityType: 'supplier',
    label,
    fitSummary: summaryParts.join(' '),
    fitScore,
    recommendedProducts: [],
    suggestedAngle: null, // supplier path is rule-based only, doesn't generate an outreach angle
    missingInformation,
    recommendedNextAction,
    suggestedFollowUpTiming: openRfq ? 'As soon as possible' : null,
    complianceStatus,
    missingDocuments,
    rfqReadiness,
  };
}