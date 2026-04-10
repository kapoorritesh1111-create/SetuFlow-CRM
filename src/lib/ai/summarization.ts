/*
 * Summarisation boundary
 *
 * Functions in this module request concise summaries of records and
 * timelines.  They build the appropriate context, invoke the
 * underlying provider via `runAiTask` and normalise the result
 * into an `AiSummary`.  When no summary can be generated, the
 * function returns undefined.  Summaries should be displayed as
 * optional assistance rather than replacing existing UI.
 */

import { AiTaskType, AiSummary, SummarisationContext } from './contracts';
import { runAiTask } from './provider';
import { normalizeSummaryOutput } from './normalizers';

/**
 * Generic helper to request a summary given a summarisation context.
 * Returns an `AiSummary` or undefined on failure or when no summary
 * is available.
 */
export async function getSummary(context: SummarisationContext): Promise<AiSummary | undefined> {
  const result = await runAiTask<unknown>(AiTaskType.Summarisation, context);
  if (!result.ok || !result.data) return undefined;
  return normalizeSummaryOutput(result.data);
}

/**
 * Request a lead summary.  Builds a context from the provided lead
 * and optional extra fields.  Returns undefined when no summary is
 * produced.
 */
export async function summarizeLeadContext(lead: Record<string, unknown>, extra?: Record<string, unknown>): Promise<AiSummary | undefined> {
  const context: SummarisationContext = {
    entityType: 'lead',
    payload: {
      id: lead.id,
      company_name: (lead as any).company_name,
      contact_name: (lead as any).contact_name,
      country: (lead as any).country,
      stage_id: (lead as any).stage_id,
      notes: (lead as any).notes,
      ...(extra ?? {}),
    },
  };
  return getSummary(context);
}

/**
 * Request a timeline summary.  Accepts an array of event objects and
 * returns a concise summary or undefined.  The order of events is
 * preserved in the payload but may not be preserved in the summary.
 */
export async function summarizeTimeline(events: Array<Record<string, unknown>>, meta?: Record<string, unknown>): Promise<AiSummary | undefined> {
  const context: SummarisationContext = {
    entityType: 'timeline',
    payload: {
      events,
      ...(meta ?? {}),
    },
  };
  return getSummary(context);
}