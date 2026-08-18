# Sprint 50 — Packaging Intelligence

## Goal

Make Growth Center and Setu Guru understand the Packaging vertical from inquiry through repeat order while preserving human approval boundaries and non-Packaging behavior.

## Live baseline

Packaging org: `3f8ef935-16bf-49de-bc04-85b51a3e0cb8`

- 14 leads
- 8 products
- 48 quotes
- 8 orders
- 0 organization ICP profiles
- 0 AI recommendations
- 0 discovery campaigns or external opportunities

## Canonical Packaging journey

`Inquiry → qualification → family/specification → pricing template/MOQ → quote → approval/send → buyer outcome → order → artwork/proof → pre-press → printing/converting/finishing/QC → packing/dispatch → repeat order`

## Required capabilities

1. Packaging organization starter ICP and vertical-aware ICP wizard.
2. Packaging-aware CRM and external opportunity fit scoring.
3. Shared Packaging Intelligence snapshot from leads, quotes, lines, products, families, templates, proofs, production events, and orders.
4. Deterministic recommendations for specification, MOQ/template fit, artwork/proofs, production, dispatch, template health, repeat orders, and cross-sell.
5. First-class Packaging workspace in Growth Center.
6. Setu Guru route contexts and live-search modes for Design Queue, Dispatch Board, packaging templates/families, proof approval, quote readiness, production, and Academy.
7. Packaging knowledge base covering qualification, pricing, artwork, proofing, production, compliance, dispatch, and repeat orders.
8. Packaging-specific regression tests and strict Packaging-vertical isolation.

## Recommendation families

- Qualification: missing family, dimensions, material, quantity, artwork status.
- Pricing: missing template, below MOQ, alternative template, unhealthy template, missing freight/pre-press, mixed currency.
- Design: artwork required, proof missing, waiting approval, rejected proof, approved and ready.
- Production: job not started, stalled pre-press, design-gated printing, overdue stage, QC pending, dispatch ready/delayed.
- Growth: repeat order due, quantity-tier savings, labels/packshot/pre-press cross-sell, material upgrade, inactive buyer reactivation.

## Guardrails

- Apply only when `vertical_key='packaging'` or `trial_template_key='packaging_converter'`.
- Setu Guru may explain, rank, draft, and route. It may not approve, send, waive, change pricing, advance production, dispatch, or create leads without explicit human action.
- All reads/writes remain organization-scoped.
- External discovery must remain truthful and disabled until a licensed provider is configured.

## Tracker

Sprint issues: `S50-PKI-001` through `S50-PKI-024` in `public.sprint_issues`.

## Acceptance

- Packaging workspace appears only for Packaging orgs.
- Live metrics reconcile to source tables.
- Packaging pages never fall back to generic Dashboard help.
- Recommendations deduplicate and auto-complete when conditions resolve.
- Non-Packaging org behavior is unchanged.
- Build, tests, and production deployment are green before issues are marked resolved.
