# Architecture

## Current architecture story after PR-36

Setu Flow now reads as a governed business system first and a feature collection second.

The architecture order is:

1. lead and market qualification
2. catalog and commercial baseline
3. quote construction
4. override reason capture
5. policy-driven approval
6. governed buyer communication
7. accepted-quote admission into order / contract continuity
8. governed integration replay and sync evidence
9. bounded AI assistance
10. repo-level hardening and investor-facing readiness framing

## Core architecture rule

Commercial truth stays above every downstream system.

That means:

- catalog/base price remains the default source of truth
- override requires reason
- override requires approval when policy threshold is met
- communication cannot bypass pending approval
- integrations mirror governed state rather than creating it
- AI assists operators but does not mutate commercial or operational truth autonomously

## Why the architecture is differentiated

The strongest product claim is not “CRM plus features.”

The stronger claim is:

> Setu Flow treats governed commercial truth as the system center, then makes communication, integration, AI, and hardening follow that truth.

That matters because many systems can create messages, sync events, or AI drafts. Fewer systems make those downstream layers subordinate to price discipline, approval policy, accepted quote continuity, and execution control.

## What is proven directly in repo behavior

- lead readiness exists before quote progress
- quote truth starts from catalog/base price
- override reason and approval posture are modeled explicitly
- communication is approval-aware and cannot outrun final quote truth
- accepted quotes are the admission rule for order / contract continuity
- integration architecture includes webhook ingestion, adapters, governed processing, sync logs, and replay posture
- AI remains assistive, provider-backed, operator-reviewed, and non-autonomous
- baseline browser-facing hardening is centralized in `middleware.ts`

## What is proven by aligned readiness surfaces

The repo now has a tighter explanation layer around that architecture:

- `public/internal-dcc/index.html` explains the readiness stack in plain language
- `README.md` explains setup, verification, and current truth
- `docs/RELEASE_READINESS.md` explains what is proven, what is partial, and what is deferred
- `docs/INVESTOR_READINESS.md` explains the investor story without engineering jargon

## What remains environment-level or future-scale proof

PR-36 does not pretend the repo alone can prove:

- infrastructure firewalling or WAF rules
- secrets rotation discipline
- provider-side delivery SLAs
- production monitoring and alert routing
- external audit or certification
- large-scale operating evidence under live production load

Those should be described as operating-environment or next-maturity work, not repo-level proof.
