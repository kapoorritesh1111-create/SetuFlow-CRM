# Trade Show Trial Preview Policy

Updated: Sprint 31 / PR #19

## Product decision

Trade Show Trial clients should not feel like they are entering a stripped-down or broken workspace. They should see the Setu Flow product shape clearly, while only approved trial actions are executable.

## Active trial functions

Trial users can actively use:

- Trade Show Trial Home (`/trade-events?mode=trade_show_trial`)
- vCard / QR sharing
- Existing Quick Lead drawer for booth lead capture
- Leads list review for captured booth leads
- Follow-up tasks tied to captured trade show leads
- Chat and limited Setu Guru guidance
- CSV export when enabled by trial capability

## Preview-only spaces

These spaces should be visible so clients understand what they are signing up for, but mutation actions remain disabled or blocked until upgrade:

- Dashboard and analytics surfaces
- Pipeline
- Send / approval-send
- Documents and compliance readiness
- Catalog
- Quotes
- Orders

Each preview page should show a friendly top note explaining that the function is available after upgrade, rather than an error dead-end.

## Blocked actions

The trial must block create/update/send actions outside approved trial behavior, especially:

- Quote creation
- Quote sending
- Order creation or fulfillment actions
- Catalog management
- Document upload/edit actions unless separately approved
- Admin setup changes
- Setu Guru actions that mutate quotes, orders, catalog, documents, admin, or send workflows

## Data requirements

Every Trade Show Trial organization must be seeded with default reference data so Quick Lead is usable on first login:

- Default markets
- Default countries
- Default next steps including `Send Introduction`

Current PR migrations add backfill protection for existing trial orgs and persistent normalization for full preview capability lists.

## Navigation policy

Analytics and Reports are Dashboard tabs, not standalone primary left-navigation modules. They may remain accessible from Dashboard, but should be hidden from the primary left sidebar across all organizations.
