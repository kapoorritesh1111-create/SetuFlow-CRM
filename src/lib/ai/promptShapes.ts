/*
 * Prompt shape helpers
 *
 * The functions and constants defined here assist in constructing
 * typed instructions for AI providers.  Keeping prompt text and
 * structural instructions centralised makes it easier to adjust
 * language without touching call sites.  Providers are not
 * necessarily prompt based; these helpers can still provide
 * consistency when forming payloads.
 */

/**
 * Standard summarisation instruction.  Providers may use this
 * instruction string when composing prompts; internal rules engines
 * can ignore it.  The placeholder `{context}` should be replaced
 * with the entity type (e.g. 'lead', 'timeline').
 */
export function summarisationInstructionFor(context: string): string {
  return `Summarise the ${context} context into a concise paragraph and extract key highlights. Avoid speculation.`;
}

/**
 * Standard follow up instruction.  Suggest the next best action for
 * the given record.  The `{entity}` placeholder should be replaced
 * with the entity type.
 */
export function followUpInstructionFor(entity: string): string {
  return `Suggest up to three actionable next steps for the ${entity}. Each suggestion should be short and start with an imperative verb.`;
}

/**
 * Standard enrichment instruction.  Suggest additional context and
 * inferred information for the given entity.  The `{entity}`
 * placeholder should be replaced with the entity type.
 */
export function enrichmentInstructionFor(entity: string): string {
  return `Provide additional context, inferred details and missing data suggestions for the ${entity}. Return short bullet points.`;
}