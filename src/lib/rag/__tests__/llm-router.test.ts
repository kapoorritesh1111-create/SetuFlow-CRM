/**
 * src/lib/rag/__tests__/llm-router.test.ts
 * Module G — Smart LLM Routing Engine (Stub) — tests
 *
 * These tests exist to guard against silent scope creep: if someone
 * later "helpfully" adds a heuristic to this file without going
 * through the deferred-scope conversation again, this suite should
 * fail loudly instead of a compliance query quietly landing on a
 * lighter model in production.
 */

import {
  resolveRoutingTier,
  setRoutingTelemetrySink,
  RoutingDecision,
  RoutingContext,
} from '../llm-router';

describe('resolveRoutingTier (Module G stub)', () => {
  afterEach(() => {
    delete process.env.LLM_ROUTER_TIERING_ENABLED;
    setRoutingTelemetrySink(() => {});
  });

  it('always returns claude for a short, simple query', () => {
    expect(resolveRoutingTier('hi').tier).toBe('claude');
  });

  it('always returns claude for a long compliance-heavy query', () => {
    const longQuery = 'regulatory compliance '.repeat(50);
    expect(resolveRoutingTier(longQuery).tier).toBe('claude');
  });

  it('always returns claude even if the tiering env flag is turned on', () => {
    process.env.LLM_ROUTER_TIERING_ENABLED = 'true';
    const decision = resolveRoutingTier('any query at all');
    expect(decision.tier).toBe('claude');
    expect(decision.reason).toMatch(/no tiering logic is implemented/i);
  });

  it('accepts a RoutingContext object as well as a raw string', () => {
    const ctx: RoutingContext = { question: 'what is the notice period?', orgId: 'org_demo_a' };
    expect(resolveRoutingTier(ctx).tier).toBe('claude');
  });

  it('always returns claude for empty or malformed input', () => {
    expect(resolveRoutingTier('').tier).toBe('claude');
    // @ts-expect-error — deliberately passing an invalid shape to confirm no crash
    expect(resolveRoutingTier({}).tier).toBe('claude');
  });

  it('invokes the telemetry sink exactly once per call, without altering the decision', () => {
    const calls: Array<{ decision: RoutingDecision; ctx: RoutingContext }> = [];
    setRoutingTelemetrySink((decision, ctx) => calls.push({ decision, ctx }));

    resolveRoutingTier('does telemetry fire?');

    expect(calls).toHaveLength(1);
    expect(calls[0].decision.tier).toBe('claude');
  });
});