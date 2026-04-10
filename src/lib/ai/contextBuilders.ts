/*
 * Context builders for AI tasks
 *
 * This module provides helper functions to construct context
 * payloads for various entity types.  Separating these builders
 * keeps the call sites concise and centralises which fields are
 * selected.  As the data model evolves you can adjust the builders
 * here without touching consumer code.
 */

import { FollowUpContext, SummarisationContext } from './contracts';
import { buildLeadEnrichmentContext } from './normalizers';

/**
 * Build an enrichment context for leads.  Re-exported from
 * normalizers for convenience.
 */
export { buildLeadEnrichmentContext } from './normalizers';

/**
 * Build a follow up context for leads.  Extracts only the fields
 * relevant for follow up recommendations.  Additional fields can be
 * added to improve future models.
 */
export function buildLeadFollowUpContext(lead: Record<string, unknown>): FollowUpContext {
  return {
    entityType: 'lead',
    payload: {
      id: lead.id,
      stage_id: (lead as any).stage_id,
      next_follow_up_at: (lead as any).next_follow_up_at,
      last_contacted_at: (lead as any).last_contacted_at,
      created_at: (lead as any).created_at,
      updated_at: (lead as any).updated_at,
    },
  };
}

/**
 * Build a summarisation context for leads.  Selects a subset of
 * fields that summarisation models may use to generate concise
 * descriptions.  Additional fields (e.g. arrays of activities) can
 * be passed via the `extra` parameter.
 */
export function buildLeadSummarisationContext(lead: Record<string, unknown>, extra?: Record<string, unknown>): SummarisationContext {
  return {
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
}

/**
 * Build a summarisation context for a timeline of events.  Accepts an
 * array of event objects and optional metadata.  Providers should
 * respect the order of events when generating summaries.
 */
export function buildTimelineSummarisationContext(events: Array<Record<string, unknown>>, meta?: Record<string, unknown>): SummarisationContext {
  return {
    entityType: 'timeline',
    payload: {
      events,
      ...(meta ?? {}),
    },
  };
}