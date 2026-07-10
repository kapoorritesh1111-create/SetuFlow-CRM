# Sprint 42 — Setu Guru Growth Agent Foundation QA

## Release scope

This release adds the Setu Guru Growth Center, organization-scoped recommendation storage, deterministic recommendation generation, and the dashboard recommendation strip.

## Security and governance proof

- Recommendation reads and writes are scoped to the authenticated organization.
- The generation endpoint resolves the organization from the active workspace session and does not accept a client-provided organization id.
- RLS policies cover select, insert, update, and delete through `public.is_org_member(org_id)`.
- Two-organization transactional QA proved:
  - own-organization select, update, and delete are allowed;
  - cross-organization select returns zero rows;
  - cross-organization update and delete affect zero rows;
  - cross-organization insert is blocked;
  - test records are rolled back and do not persist.
- The open-recommendation unique index prevents duplicate open recommendations for the same organization, type, entity type, and entity id.
- Lifecycle constraints reject invalid completed, dismissed, or expired rows without required timestamps and reasons.
- Setu Guru does not autonomously send email or WhatsApp messages and does not autonomously update leads, quotes, orders, stages, or supplier records.

## Functional proof

Each recommendation contains:

- organization id;
- entity type and entity id;
- recommendation type;
- title and summary;
- plain-language reason;
- priority;
- recommended CRM action;
- CRM action link;
- lifecycle status and timestamps.

The Growth Center and dashboard strip query only open recommendations for the current organization. The dashboard displays no more than five recommendations, ordered by priority and then recency.

## Automated QA

`tests/s42-setu-guru-growth-agent.test.mjs` verifies:

- migration RLS and rollback contract;
- all eight initial recommendation rules;
- authenticated organization resolution;
- organization-scoped queries;
- explainable card content;
- approval-first language;
- no autonomous outbound messaging;
- no autonomous CRM record mutation;
- dashboard ordering, item limit, loading, empty, error, and responsive contracts.

The production build runs `npm run test:s42` before `next build`, so Growth Agent foundation checks must pass before a deployment can become ready.

## Rollback

Application rollback:

1. Revert the Sprint 42 Growth Agent commits from `main`.
2. Redeploy the last known-good production commit.

Database rollback, only when all application references have already been removed and data retention has been approved:

```sql
drop table public.ai_recommendations cascade;
```

Dropping the table permanently removes recommendation history. Export or retain required audit data before running the database rollback.

## Owner review checklist

- Confirm Growth Center language is owner-facing and contains no developer metadata.
- Confirm dashboard spacing with zero, one, and five recommendations.
- Confirm buyer, supplier, quote, order, and trade-event workflows continue to behave normally.
- Confirm every action opens the intended CRM record or workspace.
- Confirm recommendation generation creates no outbound communications.
