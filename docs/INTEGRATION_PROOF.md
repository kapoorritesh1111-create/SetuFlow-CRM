# Integration proof

## Purpose

This document explains the strongest integration and communication proof paths currently visible in the repo, without overstating production maturity.

## The control-plane proof that remains valid from PR-32

### Step 1 — Governed commercial truth already exists

The integration layer starts after the commercial path is already valid:

- catalog/base price is the default truth
- override reason is required when pricing changes
- approval remains required when policy threshold is met
- only accepted quotes move into Orders / Contracts

### Step 2 — Provider event enters the adapter layer

Inbound events enter:

- `/api/integrations/webhooks/[provider]`

The provider connector:

- maps inbound payload structure
- validates payload shape and required fields
- derives a continuity key

### Step 3 — Governance impact is checked

Before the event is treated as safe, the repo checks whether the target contract or quote is in a governed state that can safely accept or mirror the event.

### Step 4 — Sync evidence is persisted

The event is saved into `integration_events` with a visible state such as:

- `processed`
- `needs_review`
- `queued`
- `failed`

## The communication-layer proof added in PR-32A

### Step 1 — Quote communication is treated as governed output

When a quote-share communication is sent through lead operations:

- the channel can be `email` or `whatsapp`
- the lead remains linked to the commercial object (`quote_id` when present)
- communication metadata retains provider delivery context

### Step 2 — Approval-aware gate runs before delivery is queued

For governed quote messages:

- if the quote requires approval and is not approved, delivery is blocked
- the repo returns a hard error instead of queuing a final outbound message
- this preserves the rule that communication cannot bypass pricing governance

### Step 3 — Delivery state enters the integrations event log

When the workspace has `email_outbound` or `whatsapp_outbound` configured:

- an outbound `integration_events` row is inserted
- the payload retains target, template, continuity key, and commercial linkage
- status is `queued` for safe delivery or `needs_review` for blocked conditions

### Step 4 — Communication and delivery evidence stay linked

The communication record stores delivery-log context in `provider_payload` and `metadata`, so a reviewer can understand:

- which commercial object triggered the message
- which channel was used
- whether delivery was queued
- whether connector setup is still missing

## What is proven

- the integration surface is not just a mock dashboard shell
- inbound payload validation and governance logic are visible in the repo
- sync state is persisted and surfaced
- replay posture exists and is continuity-aware
- governed quote communication can now queue outbound email/WhatsApp delivery evidence
- approval can block customer-facing quote communication before it reaches the provider layer

## What is not yet proven

- named production-grade third-party providers beyond the current provider-ready delivery connectors
- broad real-world traffic and reconciliation metrics
- long-duration reliability evidence
- production template management and callback webhooks for every provider

## Buyer-safe explanation

A buyer should hear this as:

“Setu Flow already governs what is commercially true, and now its communication layer is governed too. Email or WhatsApp delivery can be logged and reviewed, but a quote that still needs approval cannot be pushed out as if it were final.”

## Investor-safe explanation

An investor should hear this as:

“The repo now demonstrates a stronger operating loop: governed contract truth, governed integrations, and approval-aware outbound communications. It is materially stronger than a slide-only claim, but it is still short of broad production-provider proof.”
