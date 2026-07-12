# Growth Center help

Route: `/growth-agent`
Owner: Setu Guru knowledge base
Last updated: 2026-07-12 (Sprint 47 — Setu Guru Experience Redesign)

## Purpose

Growth Center is Setu Guru's first-class business workspace — a "Trade Growth Command
Center" rather than a floating assistant panel. It is the primary entry point for
Setu Guru's assistive workspaces and replaces the older pattern of scattered Guru
controls spread across individual pages.

Use Growth Center when the user is asking:

1. What needs my attention across the whole business today?
2. Which quotes are aging or at risk and need follow-up?
3. Which suppliers need action — RFQ response, compliance, readiness?
4. What research or opportunity context exists for a buyer or supplier?
5. Which trade-event contacts still need follow-up?
6. Where are the gaps in product/catalog pricing?

## Workspaces inside Growth Center

- **Today** — the business work queue: highest-priority items across quotes, suppliers,
  trade events, and research, each with one clear primary action.
- **Revenue** — a portfolio-level quote follow-up queue: status, age, buyer/lead
  context, revenue impact, and urgency, with a direct route into the relevant quote or
  lead.
- **Supplier** — supplier verification readiness, document completion, RFQ response and
  open counts, composite supplier fit/readiness, compliance status, and overdue RFQ
  actions. Reuses existing supplier, RFQ, and compliance services — no parallel data
  model.
- **Research** — reuses the existing ICP, Opportunity Finder, and grounded research
  services (Sprint 43) to surface opportunity matching, fit context, missing
  information, and sourced research signals. Review-first; does not write to product,
  pricing, or compliance records automatically.
- **Trade Events** — pre-show buyer prioritization and post-show follow-up queue, built
  on the Sprint 46 Trade Event Meeting Assistant and summary generator.
- **Pricing Intelligence** — also reachable at `/products?mode=pricing`. Detects catalog
  pricing gaps: missing EXW/FOB/CIF/DDP coverage, missing MOQ, stale prices, missing
  pricing-rule coverage, missing market-layer references, discount-readiness risk. Can
  prepare a **suggested price list** (market, currency, incoterm, buyer segment, stored
  margin/markup, MOQ, lead time, FX) as a reviewable draft — never activated or shared
  automatically.
- **Executive business brief** — attention counts and headline signals surfaced across
  the workspaces above; also shown as a compact strip on the Dashboard.

## Lead Detail Smart Actions

Growth Center's assistive actions also surface directly on Lead Detail as a compact
"Smart Actions" panel (replacing the older permanent Guru control stack): Research,
Draft outreach (email/WhatsApp, `mailto:`/`wa.me` handoff, save as draft activity),
Analyze reply, Quote readiness, and Supplier RFQ assistance. Nothing is sent
automatically — every draft requires explicit human send.

## Relationship to Dashboard, Pipeline, and Leads

- **Dashboard** carries a compact Setu Guru business-brief strip that routes into
  Growth Center; the Dashboard itself does not become a second recommendation center.
- **Pipeline / Leads** remain the record-level and stage-movement workspaces. Growth
  Center is the cross-cutting, prioritized "what should I do next across the whole
  business" workspace — analogous to how Pipeline is deal-movement and Leads is
  record-level detail (see `docs/help/pipeline.md`).

## Common blockers

- User cannot find where Setu Guru's assistive workspaces "live" now — point them to
  `/growth-agent`, not the old floating widget alone.
- User expects automatic pricing, outreach sends, or price-list activation from
  Pricing Intelligence or the suggested price list — all of these are draft-only and
  require explicit human action.
- User expects a new pricing/recommendation database — Growth Center intentionally
  reuses existing tables (leads, follow-ups, quotes/quote versions, supplier/RFQ,
  compliance/documents, product variants, pricing rule sets/product pricing rules,
  price lists/items, communications, AI suggestions, trade events). No replacement
  table was introduced.

## Allowed guidance

Setu Guru may explain what each Growth Center workspace shows, summarize attention
counts, suggest the next commercial action, and route the user to the relevant
workspace, lead, quote, order, or supplier record.

## Human approval rules

Setu Guru must not send outreach, change a price, activate or share a suggested price
list, or approve/waive/advance any supplier, compliance, or quote state without
explicit user review and action. Suggested pricing must be grounded in stored SETU
Flow data — Setu Guru does not claim external competitor pricing unless verified
external market data has been stored.

## Suggested prompts

- What needs my attention today?
- Which quotes are at risk of going stale?
- Which suppliers need follow-up right now?
- Where are the pricing gaps in the catalog?
- Draft a suggested price list for [market/currency/incoterm].
