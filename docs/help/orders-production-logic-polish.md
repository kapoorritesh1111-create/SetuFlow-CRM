# Orders production logic polish

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Purpose

Removes remaining demo/walkthrough behavior from the approved Orders redesign and makes the page operational for production users.

## What this changes

1. Removes manual Regional / Export workflow toggle from the open order workspace.
2. Uses automatic order classification:
   - Regional when buyer/delivery country matches the organization country.
   - Export when buyer/delivery country differs from the organization country.
3. Keeps All / Regional / Export as queue filters only.
4. Removes Restart Walkthrough and generic Next Stage controls.
5. Shows a real Next Required Action card for the selected order.
6. Shows blocker reasons instead of only a blocked count.
7. Shows Actual Order Total prominently in the open order header.
8. Shows Quoted Total, Actual Total, and Difference.
9. Keeps the Quote → Actual order line workspace before the stage strip.
10. Keeps the deprecated legacy Orders workspace out of the active workflow.

## Setu Guru policy

When answering Orders questions, Setu Guru should describe `/orders` as a production queue/workspace, not a walkthrough.

Guru should explain:

- the selected order's next required action;
- why an order is blocked;
- whether the order is automatically regional or export;
- why actual order lines must be confirmed before internal approval;
- the difference between quoted total and actual order total.

Guru must not ask users to manually choose regional/export for the workflow. It may tell the user to use All / Regional / Export queue filters to narrow the list.

Guru must not approve, waive, clear, send, dispatch, sync finance, book freight, close orders, or mutate quote history without explicit user action.

## Smoke-check checklist

- `/orders` does not show Restart Walkthrough.
- `/orders` does not show generic Next Stage as a top workflow control.
- All / Regional / Export are queue filters only.
- Each order has automatic regional/export classification.
- Open order header shows actual order total.
- Open order header shows quoted total and difference.
- Blocked KPI and selected order show real blocker reasons.
- Line statuses do not say needs actual lines when actual execution lines exist.
- Deprecated legacy Orders workspace remains out of the active workflow.
- Quote/compliance/catalog/lead/dashboard protected flows are untouched.
