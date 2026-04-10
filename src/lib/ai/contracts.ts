/*
 * AI contracts and typed interfaces
 *
 * This module defines the common types used across the AI service
 * boundaries. By centralising these contracts, the rest of the
 * application can import shared interfaces without depending on any
 * provider specific implementation. Consumers should treat all AI
 * outputs as advisory; no automatic mutations should occur based on
 * these structures.  The types defined here deliberately avoid
 * optional fields where possible to encourage normalised, stable
 * shapes.
 */

export enum AiTaskType {
  /**
   * Generic enrichment suggestions for records such as leads, RFQs or
   * quotes.  Use this when asking the AI to suggest additional
   * contextual information (e.g. company summary, inferred markets).
   */
  Enrichment = 'enrichment',
  /**
   * Follow up recommendations including next actions, timing hints and
   * outreach guidance.  Consumers should treat these suggestions as
   * advisory only.
   */
  FollowUp = 'followUp',
  /**
   * Concise summaries of records or lists of events.  Summaries should
   * be deterministic in shape and avoid long free‑form text.
   */
  Summarisation = 'summarisation',
}

/**
 * High level status of a task.  When invoking an AI provider the
 * return value may include a status for introspection.  The app
 * currently does not expose these statuses directly; they are
 * provided for potential future progress indicators.
 */
export enum AiTaskStatus {
  Idle = 'idle',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

/**
 * Standardised result wrapper returned from provider tasks.  The
 * `ok` flag indicates whether the call completed successfully.  The
 * `data` property contains the strongly typed payload on success; on
 * failure it will be undefined and `error` will hold a message.
 */
export interface AiProviderResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * A generic suggestion returned by enrichment or follow up tasks.  At
 * a minimum a suggestion includes a stable `id`, a short `title` and
 * a `detail` message which can be displayed to users.  Additional
 * structured metadata can be provided via the `meta` field; this
 * should remain serialisable and avoid arbitrary nested objects.  The
 * `source` field may indicate which system or model generated the
 * suggestion.  Consumers must never persist suggestions directly
 * without review by an operator.
 */
export interface AiSuggestion {
  /** Stable identifier for the suggestion.  Useful for diffing
   * repeated calls or referencing a specific suggestion when
   * applying it. */
  id: string;
  /** Short human friendly description of the suggestion. */
  title: string;
  /** Longer explanation or supporting information. */
  detail: string;
  /** Optional metadata providing structured fields such as tags,
   * categories or recommended values.  Consumers should treat this
   * field as best effort; unknown keys should be ignored. */
  meta?: Record<string, unknown>;
  /**
   * Name of the upstream provider or rule set that generated this
   * suggestion.  Useful for auditing and debugging.  The app
   * currently does not surface this to end users directly.
   */
  source?: string;
}

/**
 * Summary structure returned from summarisation tasks.  Summaries
 * should provide a short `summary` string along with optional
 * `highlights`, which can be used to render bullet points or tags.
 * Additional provider metadata may be returned via the `meta`
 * property.  Summaries must never contain sensitive information not
 * already present in the underlying record context.
 */
export interface AiSummary {
  /** Concise summary text no longer than a few sentences. */
  summary: string;
  /** Ordered list of key points extracted from the input. */
  highlights?: string[];
  /** Additional structured metadata returned by the provider. */
  meta?: Record<string, unknown>;
  /** Name of the upstream provider that generated the summary. */
  source?: string;
}

/**
 * Context passed into enrichment tasks.  The shape is flexible
 * because different entity types (leads, RFQs etc.) require
 * different fields.  At a minimum the `entityType` name must be
 * specified so providers can shape their output accordingly.  The
 * `payload` should include only primitives or serialisable objects.
 */
export interface EnrichmentContext {
  entityType: string;
  payload: Record<string, unknown>;
}

/**
 * Context passed into follow up suggestion tasks.  Include the
 * `entityType` so providers can tailor their logic.  The `payload`
 * holds relevant record fields or analytics; avoid large arrays.
 */
export interface FollowUpContext {
  entityType: string;
  payload: Record<string, unknown>;
}

/**
 * Context passed into summarisation tasks.  Provide the
 * `entityType` and any relevant fields.  For timeline summaries the
 * `payload` may include an array of events.  Providers should return
 * succinct outputs regardless of payload size.
 */
export interface SummarisationContext {
  entityType: string;
  payload: Record<string, unknown>;
}