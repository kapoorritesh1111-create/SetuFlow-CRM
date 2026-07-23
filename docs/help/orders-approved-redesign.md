# Orders approved redesign and legacy deprecation

Route: `/orders`
Owner: Setu Guru knowledge base
Last updated: 2026-05-11

## Approved design direction

The approved Orders UI source of truth is the uploaded HTML walkthrough named:

```text
Orders Full Redesign Approval Walkthrough
```

This design direction is the active Orders workflow:

```text
Order queue on the left
→ one selected order open on the right
→ seven-stage workflow strip
→ stage-specific action panel
→ Prepare / Preview / Approve / Send or Advance gates
```

## Deprecated workspace

The older embedded Orders drawer/workspace is deprecated for workflow use.

Setu Guru must not direct users to the old Orders drawer as the primary workflow. Future Orders work must build on the approved queue + selected-order workspace.

Legacy components may remain in code only as compatibility/fallback until a later cleanup pass removes them safely.

## Active workflow stages

1. Quote Approved — actual order/proforma lines.
2. Internal Approval — Order Confirmation or Proforma Invoice gate.
3. Packing Sheet — packing sheet and freight/delivery rate request.
4. Processing — packing list and packed-for-loading gate.
5. Logistics — delivery/shipping documents and shipment draft.
6. Dispatched — dispatch release and final invoice gate.
7. Paid & Closed — receipt, archive, and reorder reminder boundary.

## Setu Guru policy

When answering Orders questions, Setu Guru should explain the approved Orders page as a queue/workspace workflow. It should separate regional and export modes, use human approval language, and avoid suggesting the deprecated embedded drawer.

Guru must not approve, waive, clear, send, dispatch, sync finance, book freight, close orders, or mutate quote history without explicit user action.

## Smoke-check checklist

- `/orders` shows the approved queue-left/workspace-right layout.
- Only one selected order opens at a time.
- Regional/export mode is visible.
- Seven workflow stages are visible.
- Legacy Orders drawer is not the active workflow.
- Quote history, quote Review compliance, Catalog Admin/import, lead filters, and dashboard map are untouched.
