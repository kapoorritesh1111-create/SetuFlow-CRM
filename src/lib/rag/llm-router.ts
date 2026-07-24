/**
 * src/lib/rag/llm-router.ts
 * Module G — Smart LLM Routing Engine (Stub)
 *
 * STATUS: Deferred by mutual agreement (Mayank, call 13 Jul 2026).
 * Reason: Risk of weak model hallucinating on complex regulatory queries
 * outweighs cost savings at current query volume. Token cost measurement
 * infrastructure (observability) should be in place first.
 *
 * Planned behaviour when implemented:
 * - Simple/short queries (< 50 words, no compliance keywords) -> light model
 * - Complex/compliance/regulatory queries -> Claude (Anthropic)
 * - Token cost tracking per route decision
 *
 * All current calls go directly to Claude via existing provider.ts.
 * Replace this stub with real routing logic once OpenObserv observability
 * is integrated and token costs can be measured.
 *
 * WHY THIS FILE IS MORE THAN ONE LINE EVEN THOUGH IT'S "JUST a stub":
 * A stub that silently governs which model answers every regulatory
 * query is still production-critical code. Three things are hardened
 * here even though the decision logic itself is deferred:
 *   1. A named, typed config surface (RouterConfig) instead of a bare
 *      function, so wiring in real tiering later is a config change +
 *      one function body, not a signature change that ripples outward.
 *   2. A fail-safe kill-switch read from env: if this file is ever
 *      edited incorrectly in the future, or a caller passes malformed
 *      input, the default MUST be 'claude', never silently 'light'.
 *   3. A call-site observability hook, so once OpenObserv is wired up,
 *      instrumentation doesn't require touching every call site again —
 *      it's already funneling through one function.
 */

export type RoutingTier = 'claude' | 'light';

export interface RoutingDecision {
  tier: RoutingTier;
  /** Human-readable reason, surfaced in logs/telemetry — makes it
   *  possible to audit "why did this query get routed here" without
   *  reading source, once real tiering ships. */
  reason: string;
}

export interface RoutingContext {
  /** Raw user query text. */
  question: string;
  /** Org id the query belongs to — reserved for future per-tenant
   *  routing overrides (e.g. a client that has contractually opted
   *  out of ever using a lighter model). Unused while routing is
   *  deferred, but part of the stable signature so call sites don't
   *  need to change when tiering lands. */
  orgId?: string;
}

/**
 * Env-driven kill-switch. Defaults to disabled (safe) if unset,
 * missing, or malformed — this must never accidentally enable a code
 * path that hasn't been implemented yet.
 *
 * Expected value: LLM_ROUTER_TIERING_ENABLED=true
 */
function isTieringEnabled(): boolean {
  const raw = process.env.LLM_ROUTER_TIERING_ENABLED;
  return raw === 'true';
}

/**
 * Optional telemetry sink. No-op until OpenObserv (or equivalent) is
 * wired in — kept as an injectable function rather than a hardcoded
 * import so this file has zero dependency on observability
 * infrastructure landing first.
 */
export type RoutingTelemetrySink = (decision: RoutingDecision, ctx: RoutingContext) => void;

let telemetrySink: RoutingTelemetrySink = () => {
  /* no-op by default */
};

/** Call once at app startup if/when observability is ready. Does not
 *  change routing behaviour — logging only. */
export function setRoutingTelemetrySink(sink: RoutingTelemetrySink): void {
  telemetrySink = sink;
}

/**
 * Resolves which model tier should answer a given query.
 *
 * Current behaviour: ALWAYS returns 'claude', regardless of input,
 * regardless of the env kill-switch, regardless of anything else.
 * Tiering logic (word-count / compliance-keyword heuristics described
 * in the header) is intentionally NOT implemented per the 13 Jul 2026
 * agreement — do not add it here without re-confirming scope.
 */
export function resolveRoutingTier(ctxOrQuestion: RoutingContext | string): RoutingDecision {
  const ctx: RoutingContext =
    typeof ctxOrQuestion === 'string' ? { question: ctxOrQuestion } : ctxOrQuestion;

  // Tiering is deferred. This check exists so that even if someone
  // flips the env flag on believing it does something, behaviour stays
  // safe until resolveRoutingTier is actually rewritten.
  const decision: RoutingDecision = isTieringEnabled()
    ? {
        tier: 'claude',
        reason:
          'LLM_ROUTER_TIERING_ENABLED is set, but no tiering logic is implemented yet (Module G deferred) — routing to Claude regardless.',
      }
    : {
        tier: 'claude',
        reason: 'Tiering deferred (Module G) — all queries route to Claude for maximum accuracy.',
      };

  telemetrySink(decision, ctx);
  return decision;
}