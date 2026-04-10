/*
 * Follow up suggestion boundary
 *
 * Functions in this module request advisory follow‑up actions for
 * records such as leads, RFQs or quotes.  They build the necessary
 * context, invoke the provider via `runAiTask` and normalise the
 * returned suggestions.  Suggestions should never be applied
 * automatically; they merely guide the user toward recommended next
 * steps.
 */

import { AiTaskType, AiSuggestion, FollowUpContext } from './contracts';
import { runAiTask } from './provider';
import { normalizeFollowUpSuggestion, buildFollowUpContext } from './normalizers';

/**
 * Request follow up suggestions for a given context.  The context
 * identifies the entity type and provides a payload of relevant
 * fields.  Returns an array of normalised suggestions or an empty
 * array on failure.
 */
export async function getFollowUpSuggestions(context: FollowUpContext): Promise<AiSuggestion[]> {
  const result = await runAiTask<unknown[]>(AiTaskType.FollowUp, context);
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data.map((raw) => normalizeFollowUpSuggestion(raw));
}

/**
 * Convenience helper to build a context and fetch follow up
 * suggestions for a lead record.  Accepts the raw lead object and
 * selects only relevant fields.  Returns an array of suggestions.
 */
export async function getLeadFollowUpSuggestions(lead: Record<string, unknown>): Promise<AiSuggestion[]> {
  const context = buildFollowUpContext('lead', {
    id: lead.id,
    stage_id: (lead as any).stage_id,
    next_follow_up_at: (lead as any).next_follow_up_at,
    last_contacted_at: (lead as any).last_contacted_at,
    created_at: (lead as any).created_at,
    updated_at: (lead as any).updated_at,
  });
  return getFollowUpSuggestions(context);
}