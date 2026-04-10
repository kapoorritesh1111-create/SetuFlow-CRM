/*
 * Enrichment service boundary
 *
 * This module exposes functions to request enrichment suggestions
 * across different entity types.  It builds the appropriate
 * context for the provider, invokes the underlying AI service via
 * `runAiTask`, and normalises the result into a strongly typed
 * array of `AiSuggestion` objects.  When AI is disabled or the
 * provider fails, an empty array is returned.  Consumers should
 * display suggestions in a review interface and never apply them
 * automatically.
 */

import { AiTaskType, AiSuggestion, EnrichmentContext } from './contracts';
import { runAiTask } from './provider';
import { normalizeEnrichmentOutput, buildLeadEnrichmentContext } from './normalizers';

/**
 * Fetch enrichment suggestions for a given context.  The context
 * describes the entity type (e.g. 'lead', 'rfq') and a payload of
 * serialisable fields to be used by the provider.  Returns a
 * normalised array of suggestions.  When the provider returns no
 * data or fails, an empty array is returned.
 */
export async function getEnrichmentSuggestions(context: EnrichmentContext): Promise<AiSuggestion[]> {
  const result = await runAiTask<unknown[]>(AiTaskType.Enrichment, context);
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data.map((raw) => normalizeEnrichmentOutput(raw));
}

/**
 * Convenience helper to build a context and fetch enrichment
 * suggestions for a lead record.  Accepts the raw lead object and
 * builds a trimmed payload containing only relevant fields.  Uses
 * `buildLeadEnrichmentContext` defined in normalizers.ts to
 * construct the context.  Returns an array of suggestions.
 */
export async function getLeadEnrichmentSuggestions(lead: Record<string, unknown>): Promise<AiSuggestion[]> {
  const context = buildLeadEnrichmentContext(lead);
  return getEnrichmentSuggestions(context);
}