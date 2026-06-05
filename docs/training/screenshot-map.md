# Training Screenshot Map

## Purpose

This file maps screenshot assets to the training workspace and written guide. It should be updated whenever new screenshots are added to the training material.

Primary training route:

```txt
/training
```

Primary screenshot inventory folder requested for ongoing training review:

```txt
public/internal/docs-screenshots
```

## Current training workspace screenshot usage

The `/training` page currently uses public, training-safe marketing screenshots that are already part of the Setu Flow site. These are appropriate for a shareable training workspace because they avoid exposing private main organization records.

| Training module | Current asset | Usage |
|---|---|---|
| Understand the workspace | `/marketing/dashboard-command-center.png` | Command view and daily operating orientation |
| Capture a new inquiry | `/marketing/trade-events.png` | Trade event and source-based inquiry capture |
| Review and qualify the lead | `/marketing/follow-up-queue.png` | Follow-up queue and qualification rhythm |
| Prepare quote and commercial details | `/marketing/quote-workflow.png` | Quote preparation and approval readiness |
| Confirm documents and order readiness | `/marketing/ss-documents.jpg` | Document tracking and readiness checks |
| Move from ready state to dispatch | `/marketing/ss-orders.jpg` | Order execution and dispatch handoff readiness |
| Use mobile capture in the field | `/marketing/mobile-quick-lead.png` | Mobile field capture orientation |

## Internal screenshot review workflow

When reviewing `public/internal/docs-screenshots`, evaluate every screenshot against these questions:

1. What workflow step does this screenshot support?
2. Which role should use this screen?
3. What should the user click first?
4. What should the user check before saving?
5. What is the expected result after saving?
6. What common mistake should be prevented on this screen?
7. Is the screenshot safe to share with users?

## Screenshot classification model

Use this classification when expanding the guide:

| Category | Meaning | Training usage |
|---|---|---|
| Orientation | Dashboards, queues, workspace home, summaries | Start-here module |
| Capture | Lead entry, trade event, card scan, field capture | Capture module |
| Qualification | Lead details, notes, follow-up, owner/status fields | Qualification module |
| Commercial | Product, quote, pricing, approvals, buyer/seller details | Quote/order module |
| Documents | Contract, invoice, packing, compliance, file status | Readiness module |
| Dispatch | Shipment status, execution handoff, tracking, follow-up | Dispatch module |
| Mobile | Field mobile, quick lead, scanning, event use | Mobile module |
| Admin-only | User/role/configuration, internal controls | Keep separate from shareable user guide |

## User-shareable screenshot standards

Before including a screenshot in `/training`, docs, PDF, or video:

- Do not show private customer, buyer, supplier, main organization, or financial data.
- Do not show internal-only tooling or Setu Mission Control.
- Do not show access keys, tokens, emails, phone numbers, addresses, or internal operational notes.
- Prefer representative product views and workflow examples.
- Crop unnecessary browser chrome where possible.
- Keep the visual focus on the action the user needs to learn.

## Expansion template

Use this block for each screenshot added from `public/internal/docs-screenshots`:

```md
### Screenshot: <filename>

- Workflow step:
- Role:
- Screen purpose:
- First action:
- Required checks:
- Expected result:
- Common mistake:
- Shareable status: Approved / Needs crop / Internal only
- Recommended module:
```

## Future video mapping

Each training video should map to the same module names used in `/training`:

1. Understand the workspace.
2. Capture a new inquiry.
3. Review and qualify the lead.
4. Prepare quote and commercial details.
5. Confirm documents and order readiness.
6. Move from ready state to dispatch.
7. Use mobile capture in the field.

This keeps the written guide, training workspace, screenshots, and future videos aligned.
