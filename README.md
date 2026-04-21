# Setu Flow CRM

Setu Flow CRM is now presented as a governed commercial system first and a feature set second.

The current shipped baseline closes the planned readiness stack through PR-36. The repo now tells one consistent story across the DCC, README, architecture notes, release readiness, investor brief, and product-status contract.

## Current repo truth after PR-36

Read the product in this order:

1. **Lead truth** proves qualification, product linkage, and market readiness before quote progress.
2. **Catalog truth** defines the default commercial posture.
3. **Quote truth** starts from catalog/base price.
4. **Override truth** captures why pricing differs.
5. **Approval truth** governs when policy thresholds are crossed.
6. **Communication truth** can notify buyers through email or WhatsApp, but it cannot send final quote state while approval is still pending.
7. **Order / contract truth** starts only from accepted quotes and preserves `quote_id` continuity.
8. **Integration truth** mirrors already-governed contract, communication, or execution state through adapters, validation, sync logs, and replay posture.
9. **AI truth** is assistive, provider-backed, and operator-reviewed. It drafts, summarizes, and routes the next safe action, but it does not approve, dispatch, mutate record state, or invent commercial terms.
10. **Hardening and investor truth** now make the repo easier to diligence: baseline security headers are explicit, setup and verification are documented, and investor-facing proof is separated from deferred operating claims.

The DCC at `public/internal-dcc/index.html` remains the first place to read current readiness.

## What PR-36 adds

PR-36 does not invent new product behavior. It closes the final truth-surface gap by making the investor package concise, defensible, and non-technical.

That means the shipped baseline now proves:

- the differentiated system story is clear: governed commercial truth first, then communication, sync, AI, and hardening around it
- repo-backed proof, doc-aligned proof, and deferred operating proof are now separated cleanly
- the buyer journey, communication governance, AI boundaries, and hardening posture remain aligned in every primary truth surface
- investor-facing next steps are now visible without weakening current claims
- the governed pricing and approval contract remains unchanged

## What PR-36 does **not** claim

This pass still does **not** claim:

- a completed external security audit
- production secrets rotation
- cloud-network controls such as WAF, rate limiting, or SIEM alerting
- fully mature communication-provider operations across all live vendors
- large-scale operating proof beyond the current repo baseline

Those remain environment, production, or future-scale concerns, not proof that can be honestly claimed from the repo alone.

## Important rule

AI, communications, integrations, and hardening are subordinate to commercial truth.
They may draft, notify, mirror, protect, or explain governed state, but they must never outrun:

- qualification requirements
- catalog/base pricing truth
- override reason requirements
- approval policy thresholds
- accepted-quote-only order admission
- contract continuity and execution controls

## Setup and verification

### Runtime expectations

- Node: `22.x`
- npm: `10.x`

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

### Verify shipped baseline

```bash
npm test
npm run verify
```

`npm run verify` is the preferred handoff check because it runs cleanup, typecheck, dashboard freeze check, tests, and build in sequence.

## Current readiness snapshot

- Engineering baseline: 94%
- Demo readiness: 95%
- Buyer readiness: 92%
- Investor readiness: 94%
- Overall readiness: 93%
- Security hardening: 80%

## Remaining PR stack

- None in the planned readiness stack
