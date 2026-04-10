/*
 * Normalisation helpers for AI outputs and context builders
 *
 * Providers may return outputs in arbitrary formats.  These
 * functions convert those raw structures into the internal types
 * defined in contracts.ts.  Normalisers should be idempotent and
 * avoid throwing exceptions; unknown fields are ignored.  When a
 * required field is missing, sensible defaults are applied.
 */

import { AiSuggestion, AiSummary, EnrichmentContext, FollowUpContext, SummarisationContext } from './contracts';

/**
 * Convert a raw enrichment suggestion into a strongly typed
 * `AiSuggestion`.  If the provider did not supply an `id`, a
 * deterministic fallback is created using a timestamp and random
 * component.  Unknown fields are copied into `meta`.
 */
export function normalizeEnrichmentOutput(raw: any): AiSuggestion {
  const id = typeof raw?.id === 'string' && raw.id ? raw.id : `suggestion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const title = typeof raw?.title === 'string' ? raw.title : '';
  const detail = typeof raw?.detail === 'string' ? raw.detail : '';
  const source = typeof raw?.source === 'string' ? raw.source : undefined;
  // Copy all other enumerable properties into meta, excluding known fields
  const meta: Record<string, unknown> = {};
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      if (!['id', 'title', 'detail', 'source', 'meta'].includes(key)) {
        meta[key] = (raw as any)[key];
      }
    }
    // If provider already provided a meta object, merge it
    if (raw.meta && typeof raw.meta === 'object') {
      Object.assign(meta, raw.meta);
    }
  }
  return { id, title, detail, meta: Object.keys(meta).length ? meta : undefined, source };
}

/**
 * Convert a raw follow up suggestion into an `AiSuggestion`.  This
 * function delegates to `normalizeEnrichmentOutput` because the
 * structure is identical.  Keeping separate exports makes future
 * provider-specific logic easier to accommodate.
 */
export function normalizeFollowUpSuggestion(raw: any): AiSuggestion {
  return normalizeEnrichmentOutput(raw);
}

/**
 * Convert a raw summary output into a strongly typed `AiSummary`.
 * If the provider omits the summary string the function returns
 * undefined, signalling the caller that no summary could be
 * generated.  Unknown fields are copied into the meta object.
 */
export function normalizeSummaryOutput(raw: any): AiSummary | undefined {
  const summary = typeof raw?.summary === 'string' ? raw.summary : undefined;
  if (!summary) return undefined;
  const highlights = Array.isArray(raw?.highlights) ? raw.highlights.filter((h: unknown) => typeof h === 'string') : undefined;
  const source = typeof raw?.source === 'string' ? raw.source : undefined;
  const meta: Record<string, unknown> = {};
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(raw)) {
      if (!['summary', 'highlights', 'source', 'meta'].includes(key)) {
        meta[key] = (raw as any)[key];
      }
    }
    if (raw.meta && typeof raw.meta === 'object') {
      Object.assign(meta, raw.meta);
    }
  }
  return { summary, highlights, meta: Object.keys(meta).length ? meta : undefined, source };
}

/**
 * Build an enrichment context for a lead record.  Only a subset of
 * lead fields are included to minimise payload size and avoid
 * leaking sensitive data.  Additional fields can be added as
 * necessary provided they are serialisable primitives.  Consumers
 * should avoid passing entire nested objects or arrays unless the
 * provider requires them explicitly.
 */
export function buildLeadEnrichmentContext(lead: Record<string, unknown>): EnrichmentContext {
  return {
    entityType: 'lead',
    payload: {
      id: lead.id,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      job_title: lead.job_title,
      email: lead.email,
      phone: lead.phone,
      country: lead.country,
      market_id: (lead as any).market_id,
      product_interest_summary: (lead as any).product_interest_summary ?? undefined,
      notes: lead.notes,
    },
  };
}

/**
 * Build a follow up context for any entity.  Accepts an entity type
 * string and a record of serialisable values.  Consumers are
 * responsible for selecting only the fields relevant to follow up
 * suggestions.  This helper simply wraps the provided payload.
 */
export function buildFollowUpContext(entityType: string, payload: Record<string, unknown>): FollowUpContext {
  return { entityType, payload };
}

/**
 * Build a summarisation context for any entity.  Accepts an entity
 * type string and a payload of serialisable values (including arrays
 * of events).  Consumers should trim unneeded fields to keep the
 * payload size reasonable.
 */
export function buildSummarisationContext(entityType: string, payload: Record<string, unknown>): SummarisationContext {
  return { entityType, payload };
}