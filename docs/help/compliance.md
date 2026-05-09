# Compliance help

Purpose: Use Compliance to clarify what is required now, what is advisory for later, and what evidence must be reviewed before commercial or execution steps continue.

## Best for

- Reviewing compliance blockers and evidence status in the active lead or quote workflow.
- Resolving quote-review blockers from the inline quote Review step without leaving the workflow.
- Separating quote-send requirements from order/dispatch requirements.
- Explaining waiver, dispatch deferral, and human approval requirements.
- Guiding users to the next safe action without adding duplicate action panels.

## Common questions Setu Guru should answer

- Why exactly is this quote blocked?
- Did the compliance check open the correct lead and quote?
- Where do I attach the required document?
- Can I ignore this for quote and record it for dispatch?
- Is this a true quote-send blocker or an advisory dispatch document?
- Who needs to approve a waiver or dispatch deferral?
- Why does Review look clear but Send Gate still shows an active blocker?
- Why does the lead list show dispatch blocked after Quote Review is clear?

## Correct quote workflow

The working quote workflow is:

1. Go to `/leads`.
2. Open the lead from the lead queue.
3. In the Lead Command Center, click **Continue quote**.
4. Complete Product, Terms, and Pricing.
5. On **Step 4 — Review**, resolve any red **Resolve compliance/document blocker** card from inside that same review panel.
6. Choose exactly one reviewer action:
   - **Attach evidence** when a real document is available.
   - **Waive for quote** when the reviewer decides the quote may proceed without the document.
   - **Defer to dispatch** when the quote may proceed but the document must be collected before order/dispatch.
7. Save the action with a human reviewer reason.
8. Click **Refresh draft after fix** or **Create/open draft preview** so the gate re-checks persisted data.
9. Continue to **Step 5 — Send gate** only after Review, pricing, approval posture, compliance, and quote draft are all clear.

Do not open a separate Compliance Assist page as the primary fix path for quote Review. Do not show a sticky bottom helper or global compliance panel. The correction belongs inside the quote Review workflow.

## Source-of-truth policy

Quote Review and Send Gate must not be cleared by page text alone. The workflow must check persisted records first:

- quote-linked `documents` rows with `requirement_code = quote_review_document`
- lead-level `quote_review_document` clearance rows linked to the active quote
- open `lead_compliance_items`
- quote and current quote-version approval timestamps
- persisted `quote_line_items`
- persisted `quote_versions.total_line_count`
- priced quote/RFQ lines as valid pricing coverage, even when catalog pricing-rule coverage is not present

If Quote Review is clear but Send Gate still shows an active blocker, Setu Guru should tell the user to refresh the quote preview and then verify these source-of-truth records. The send gate is clear only when the shared readiness state says pricing, approval, compliance, and quote draft are all saved.

## Compliance fix-panel policy

The fix controls must live inside Step 4 Review's existing red blocker card. They must not be mounted from `src/app/(app)/layout.tsx`, must not use DOM injection, and must not use MutationObserver.

The panel should keep the user in the current quote context and show the action choices clearly:

- Attach evidence
- Waive for quote
- Defer to dispatch

The save path is `/api/compliance/quote-fix`. Waive and Defer are idempotent for the same quote/action/requirement context: repeated clicks update the existing quote and lead clearance rows instead of creating duplicate waiver/deferral records. Attach evidence can create a new row because each evidence upload can represent a distinct document.

## Compliance stage policy

Use four labels consistently:

- **Required quote-send blocker**: must be satisfied, approved, waived, or deferred by a reviewer before quote send.
- **Advisory dispatch prep**: useful for execution, dispatch, or buyer confidence; does not block quote send unless an active organization rule makes it mandatory.
- **Waive for quote**: a reviewer decision with permission and reason that the requirement is not needed for this quote context.
- **Defer to dispatch**: a reviewer decision with permission and reason that quote can proceed, but the document must remain visible for order dispatch.

COA and Packing List should stay advisory before dispatch/order execution for the main org unless an active organization rule explicitly makes them quote-send mandatory.

## If this breaks again

Troubleshoot in this order:

1. Confirm there is no global compliance import/render in `src/app/(app)/layout.tsx`.
2. Confirm the visible workflow is `/leads` → open lead → Continue quote → Step 4 Review.
3. Confirm the Step 4 blocker card is reading the active quote, not a background hot-list lead or unrelated quote.
4. In Supabase, verify the active quote has approved `quote_review_document` evidence/waiver/defer records linked by `linked_quote_id`.
5. Verify any lead-level `quote_review_document` clearance row is approved and linked to the same quote.
6. Verify `lead_compliance_items` has no open blocker statuses for that lead.
7. Verify quote line items exist, are priced, and `quote_versions.total_line_count` reflects the saved quote lines.
8. If the red card remains while data is clear, fix the shared read path in `src/lib/catalog-pricing-model.ts` or `src/features/leads/components/leads-workspace.tsx`; do not add a DOM workaround.

## Allowed actions

- Explain blocker stage and remediation steps.
- Point the user to the Step 4 inline Review blocker card.
- Tell the user to attach evidence, waive for quote, or defer to dispatch with reason from that panel.
- Recommend live research for country/product rules and cite sources.

## Disallowed / approval-required actions

- Do not approve evidence automatically.
- Do not waive or defer a requirement without a permitted human reviewer and reason.
- Do not clear, delete, or mark compliance complete from chat alone.
- Do not silently change document requirement rules or compliance policy.
- Do not create duplicate action surfaces when the Step 4 inline card already has evidence, waiver, and dispatch-deferral controls.

## Approval rules

Setu Guru must not approve, waive, defer, clear, delete, or mark compliance complete. A human with the correct permission must review evidence and approve, waive, or defer with a reason.

## Response policy

Always distinguish mandatory blockers, advisory dispatch preparation, human approval actions, and live research suggestions. Use live quote or lead context for blocker questions before generic compliance text. When a quote is blocked, route to the Step 4 inline Review blocker card first and name the three safe choices: attach evidence, waive for quote with reason, or defer to dispatch with reason.
