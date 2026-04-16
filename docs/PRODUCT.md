# Setu Flow Product Contract

## Product definition
Setu Flow is a trade execution system for import-export sales teams.

## Core flow
Capture -> Lead -> Quote -> Order

## Primary product promise
Setu Flow should turn messy trade inputs into structured commercial execution **without losing trust, approvals, or execution visibility**.

## Primary operating surfaces
These are the surfaces that define the product story:
- Leads
- Quotes
- Orders
- Dashboard
- Admin

## Supporting surfaces that already exist in code
These are real parts of the repo, but they should stay subordinate to the main flow rather than becoming competing product stories:
- Capture / intake
- Products and pricing support
- Compliance
- Documents
- Contracts
- Tasks
- Trade events
- Integrations
- AI assist
- Contact exchange / My Card

## Current baseline truth
- Sprints 1 through 6 are effectively present in the codebase.
- Sprint 7 Dashboard rebuild is closed in the repo.
- Sprint 8 My Card / outward share is closed in the repo.
- Sprint 9 cleanup is still required because the implementation is ahead of the repo hygiene.

## Product rules
- No feature should bypass the locked commercial flow.
- Important capabilities do not automatically become top-level destinations.
- Dashboard and My Card must reinforce the core workflow, not compete with it.
- Repo and development pages must describe implemented product truth honestly.

## Demo standard
A credible walkthrough should be able to show:
Capture -> Lead -> Quote -> Order
plus the supporting trust, dashboard, and outward-share context that now exists in the repo.
