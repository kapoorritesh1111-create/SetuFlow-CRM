# Orders approved PDF rebuild action path

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-12

## Sprint 8V decision

When historical quote-version rows are incomplete or do not match the buyer-approved PDF/source, Orders must not silently use the broken rows for buyer-facing execution documents.

Operators can now select **Use approved PDF/source** from the Orders commercial source panel.

## What the action does

The action records a commercial reconciliation gate on the order:

- source quote id
- source quote version id
- PDF/source count found
- loaded quote-line count
- expected quote-version line count
- buyer approval timestamps where available
- operator reconciliation reason

The action does **not** mutate quote history.

## Workflow after reconciliation

1. Use approved PDF/source as the commercial reference.
2. Prepare actual order lines.
3. Confirm actual quantities/prices and reasons for changes.
4. Internally approve actual lines.
5. Generate buyer-facing documents only after actual lines are reviewed.

## Guardrails

Do not generate Order Confirmation, Proforma, Packing Sheet, Final Invoice, or send links from unreconciled historical data.

Do not edit old quote versions to hide mismatch. Quote history remains evidence. Orders stores the reconciliation decision separately.

## Setu Guru response policy

When the user asks why Orders is blocked even though the quote PDF looks right, explain:

> The buyer-approved PDF can be correct while historical quote-version rows are incomplete. Use the approved PDF/source reconciliation action, then prepare actual order lines. This protects the quote history and prevents wrong commercial data from flowing into order documents.
