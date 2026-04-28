# PR-4 — Quotes Recovery + HTML Parity

Date: 2026-04-27

## Completed
- Started from PR-3 Pipeline HTML Parity baseline.
- Read `public/reference-html/setuflow-quotes-redesign.html`.
- Recovered `/quotes` so the shared AppShell owns the desktop topbar instead of a duplicate in-route header.
- Restored governed quote table with status, versions, value, validity, owner, and safe action column.
- Restored approval queue banner and pending approval shortcuts.
- Added quote detail slide-in panel driven by `quoteId` deep links.
- Added version history in the slide-in panel.
- Added safe send / approval / create order CTAs based on quote workflow status.
- Removed server-component event handlers from the quote table to avoid runtime errors.

## Workflow status
| Area | Status | Notes |
| --- | --- | --- |
| Shell parity | Complete | Uses PR-0 shared shell; no duplicate Quotes topbar. |
| Governed quote table | Complete | Matches reference grid and quote workflow columns. |
| Approval queue | Complete | Pending quote banner and review links restored. |
| Detail slide-in | Complete | Opens from row deep link and closes back to filtered list. |
| Version history | Complete | Uses existing `QuoteHistoryList`. |
| Safe send/approval CTAs | Complete | Routes through existing approval/send/order handoffs. |
| Full build verification | Pending | Dependency install timed out in this environment. |

## Quote workflow readiness
92%
