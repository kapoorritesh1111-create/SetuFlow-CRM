# Pipeline help

Route: `/pipeline`
Owner: Setu Guru knowledge base
Last updated: 2026-05-25

## Purpose

Pipeline is the trade command center for deal movement, stage risk, revenue value, and quote-ready action. It uses the same underlying lead records as Leads, but it should feel operational, compact, and premium rather than instructional.

Use Pipeline when the user is asking:

1. Which stage is this deal in?
2. What value is sitting in each stage?
3. Which records are overdue, blocked, or ready to advance?
4. Which buyer or supplier should be converted to quote next?
5. What commercial action should happen now?

Use Leads when the user is asking for contact details, product interests, qualification notes, profile cleanup, or detailed record editing.

## Pipeline versus Leads

Setu Guru should explain the distinction inside Help or the Guru drawer, not as heavy copy on the Pipeline workspace.

- **Pipeline** = stage movement, revenue movement, blockers, follow-up pressure, quote-ready action, and deal value.
- **Leads** = contact details, product interests, qualification data, profile cleanup, and record-level editing.

If a user says the two screens feel duplicated, explain that they are complementary views of the same dataset: Pipeline is the action-taking deal board; Leads is the information and follow-up workspace.

## Screen guidance policy

The Pipeline page should stay clean, compact, and operational.

Do not add large explanatory banners to the main Pipeline canvas. If short guidance is needed, use a small hint, tooltip, Help topic, or Setu Guru prompt instead.

Acceptable on-screen guidance examples:

- Pipeline command center: stage movement, risk, and deal value.
- Ask Setu Guru what Pipeline is showing.
- Open Leads for contact details and product-interest cleanup.

Avoid explanatory blocks that repeat what Pipeline and Leads are in paragraph form on the page.

## Premium command-center expectations

Pipeline should prioritize:

- stage lanes;
- deal value;
- follow-up risk;
- blockers;
- quote/action readiness;
- compact visual hierarchy.

The page should not feel like a generic SaaS walkthrough. It should look like a trade command center where the user can make decisions quickly.

## Supplier Mode (Sprint 41 — Supplier Journey Workflow)

Supplier leads run a parallel journey to buyer leads on the same underlying data model
(`leads`, `pipeline_stage_id`), strictly scoped by `lead_type` — there is no silent
buyer fallback anywhere in the supplier path (save, pipeline resolver, or mobile
capture defaults).

- Dedicated routes `/pipeline/suppliers` and `/pipeline/buyers` filter the same board
  by `lead_type`, in addition to the workspace mode strip (All / Buyers / Suppliers).
- Lead Detail Command Center shows supplier-specific tabs and primary actions for
  supplier leads, distinct from the buyer command center.
- Supplier compliance has its own document requirement rule seed and its own
  readiness/approval blockers, separate from buyer compliance.
- Supplier approval follows its own state and stage-transition model, separate from
  buyer quote approval.
- On the supplier side, a **Supplier Cost Request** replaces the buyer Quote CTA — this
  is the RFQ/cost-request workflow, and RFQ responses link back to the supplier lead.
- **Supplier Offer Comparison** lets an operator compare multiple supplier
  responses/offers side by side before selecting a source.
- Supplier capability data links to buyer demand (demand linkage) so sourcing gaps are
  visible.
- **Supplier Performance KPIs** and periodic review metadata are tracked, along with
  supplier-specific dashboard metrics and a supplier analytics funnel/movement model —
  separate from buyer-side analytics and reports.
- Order/execution screens show supplier link visibility for sourced orders, and
  supplier communications/audit events use their own taxonomy.
- Setu Guru has supplier-aware context and recommendations (see `docs/help/growth-agent.md`
  and the Supplier workspace inside Growth Center).

## Common blockers

- User cannot tell whether to work in Pipeline or Leads.
- Heavy instructional text pushes the board down.
- Setu Guru route help does not explain what Pipeline is for.
- Value totals are visible but not framed as deal movement.
- Primary action does not clearly point toward quote conversion.

## Allowed guidance

Setu Guru may explain the Pipeline versus Leads difference, summarize stage/value/risk signals, suggest the next commercial action, and route the user to Leads, Quotes, or Compliance when needed.

## Human approval rules

Setu Guru must not move stages, convert to quote, approve pricing, waive compliance, send quotes, or change records without explicit user approval and app permission.

## Suggested prompts

- What should I do next in Pipeline?
- Why should I use Pipeline instead of Leads?
- Which stage has the most value at risk?
- Which deals are ready to convert to quote?
- What is blocking this Pipeline card?
- What is different about a supplier lead versus a buyer lead?
- Which suppliers have overdue RFQ responses?
