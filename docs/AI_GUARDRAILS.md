# AI Guardrails

## Current AI position after PR-34

Setu Flow uses AI as an **assistive, provider-backed, operator-reviewed** layer.

That is the correct buyer and investor description.

It is **not** an autonomous workflow engine.

## What the repo now proves

### Provider posture

The repo has a real provider abstraction in `src/lib/ai/provider.ts`.

Current truth:

- **Anthropic-backed assistive tasks are supported**
- **safe fallback exists** when AI is disabled or misconfigured
- **OpenAI remains explicitly not implemented** in this shipped baseline

That means the product can honestly claim provider-backed assistive AI, but it should not claim multi-provider maturity.

## What AI is allowed to do

AI is allowed to:

- help draft follow-up messages
- help draft introduction messages
- help structure quote cover notes
- help suggest compliance next steps
- summarize context
- explain the next safe action from existing blockers and workflow evidence

## What AI is not allowed to do

AI is not allowed to:

- invent catalog or final prices
- approve quote overrides
- bypass approval thresholds
- clear compliance blockers
- clear document blockers
- advance workflow state automatically
- send final commercial terms autonomously
- dispatch, release, or complete orders autonomously

## Why this matters

The product’s differentiation is governed commercial truth.

AI must therefore remain **downstream of governance**, not upstream of it.

That means:

- AI may **draft** around governed truth
- AI may **summarize** governed truth
- AI may **route attention** to governed truth
- AI may **not replace** governed truth

## Safe buyer phrasing

“Setu Flow uses AI as a bounded operator assistant. It helps teams draft, summarize, and prioritize work, but pricing, approvals, compliance clearance, and execution remain under governed human control.”

## Safe investor phrasing

“The AI layer is now explicit and bounded. Provider-backed assistive workflows are present, but the system is intentionally non-autonomous in commercial, compliance, and execution decisions.”

## What still remains for future maturity

- broader named-provider support if required
- operational telemetry and callback evidence around AI usage at scale
- hardening and packaging expected in the final diligence passes
