/**
 * src/lib/rag/__tests__/llm-router.test.ts
 * Module G — Smart LLM Routing Engine (Stub) — tests
 *
 * These tests exist to guard against silent scope creep: if someone
 * later "helpfully" adds a heuristic to this file without going
 * through the deferred-scope conversation again, this suite should
 * fail loudly instead of a compliance query quietly landing on a
 * lighter model in production.
 *
 * Uses Node's built-in test runner (node:test / node:assert), matching
 * how `npm test` already invokes every other test file in this repo
 * (no Jest/Mocha dependency installed) — this file previously used
 * Jest-style globals (describe/it/expect) that don't exist under
 * `node --test`, which is why it failed typecheck.
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.strictEqual(resolveRoutingTier('hi').tier, 'claude');
  });

  it('always returns claude for a long compliance-heavy query', () => {
    const longQuery = 'regulatory compliance '.repeat(50);
    assert.strictEqual(resolveRoutingTier(longQuery).tier, 'claude');
  });

  it('always returns claude even if the tiering env flag is turned on', () => {
    process.env.LLM_ROUTER_TIERING_ENABLED = 'true';
    const decision = resolveRoutingTier('any query at all');
    assert.strictEqual(decision.tier, 'claude');
    assert.match(decision.reason, /no tiering logic is implemented/i);
  });

  it('accepts a RoutingContext object as well as a raw string', () => {
    const ctx: RoutingContext = { question: 'what is the notice period?', orgId: 'org_demo_a' };
    assert.strictEqual(resolveRoutingTier(ctx).tier, 'claude');
  });

  it('always returns claude for empty or malformed input', () => {
    assert.strictEqual(resolveRoutingTier('').tier, 'claude');
    // @ts-expect-error — deliberately passing an invalid shape to confirm no crash
    assert.strictEqual(resolveRoutingTier({}).tier, 'claude');
  });

  it('invokes the telemetry sink exactly once per call, without altering the decision', () => {
    const calls: Array<{ decision: RoutingDecision; ctx: RoutingContext }> = [];
    setRoutingTelemetrySink((decision, ctx) => calls.push({ decision, ctx }));
    resolveRoutingTier('does telemetry fire?');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].decision.tier, 'claude');
  });
});