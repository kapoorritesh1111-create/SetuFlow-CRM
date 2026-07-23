# Claude Handoff — Setu Guru Growth Panel Continuation

## Mission

Continue the Setu Guru Growth Panel after the completed Sprint 42 foundation. Preserve the working production behavior, finish remaining Growth Center work through new tracked issues, and do not regress the dashboard, recommendation links, organization isolation, or approval-first behavior.

## Project

- Repository: `kapoorritesh1111-create/SetuFlow-CRM`
- Branch: `main`
- Production: `https://www.setuflowcrm.com`
- Supabase project ref: `sjzfzloggabsmcuxktnl`
- Vercel project: `setu-flow-crm`
- Vercel project ID: `prj_j3kkTnBcjXKyLLEw9IEMXBfVzfFG`
- Vercel team ID: `team_FUuclvXHj0efPiI9SQJvY1nK`
- Tracker UI: `/smc/issues`
- Tracker API: `/api/smc/issues`
- Database tracker table: `public.sprint_issues`

## Mandatory preflight

Before changing code:

1. Read the root `AGENTS.md` completely.
2. Read `docs/releases/S42_SETU_GURU_FOUNDATION_QA.md`.
3. Read this handoff.
4. Inspect the latest `main` branch and production deployment.
5. Query the live tracker for open Growth Panel issues.
6. Do not reopen or edit resolved Sprint 42 issues unless a confirmed regression exists.
7. Work one issue at a time unless Ritesh explicitly approves a batch.

## Completed Sprint 42 foundation

The following issues are complete and resolved:

- `S42-GURU-001` — Growth Center shell
- `S42-GURU-002` — AI recommendation data model and RLS
- `S42-GURU-003` — Deterministic recommendation generator
- `S42-GURU-004` — Compact dashboard Growth Panel strip and top-three overlay
- `S42-GURU-005` — QA, route hardening, production verification, and owner UAT

Final functional implementation:

- Commit: `c51cdbd442b9107195401f1a73302091f53ab7b6`
- Deployment: `dpl_6BL2XTLDMRXRJURgjtEEHdh3QNtE`
- Deployment state: `READY`
- Dedicated tests: `10 passed, 0 failed`

Documentation finalization commit:

- `bc8b6ab24fc86e7847db0f4b3589e3612b149f71`

## Current product behavior that must remain locked

### Dashboard

- Dashboard shows one compact Setu Guru strip only.
- Clicking the strip opens an on-demand overlay with three diverse actions.
- Mobile uses the overlay/bottom-sheet experience rather than stacking action cards on the dashboard.
- `View all` opens `/growth-agent`.
- Dashboard KPIs and the rest of the dashboard remain immediately visible.

### Recommendation identity

Every recommendation must clearly identify the affected record.

Examples:

- `Review overdue RFQ for Peru Ancient Grains`
- `Follow up on Q-2026-0023 for Rio Specialty Foods`
- `Prepare a quote for Doha Specialty Imports`

Never ship generic cards such as:

- `Follow up on a sent quote`
- `Review an overdue supplier RFQ`

without buyer, supplier, quote, RFQ, lead, or event context.

### Supported links

Use only confirmed routes.

Supported examples:

- `/leads/{lead_id}`
- `/leads`
- `/quotes`
- `/trade-events`
- `/growth-agent`

Do not generate unsupported routes:

- `/quotes/{quote_id}`
- `/leads/{lead_id}/quote`
- `/leads/{lead_id}/rfq`

The route-contract test must continue rejecting unsupported patterns.

### Approval and safety

Setu Guru is advisory. It must not autonomously:

- send email;
- send WhatsApp messages;
- change a lead stage;
- create or send a quote;
- approve a supplier;
- change an order;
- complete an RFQ.

The user must approve and perform the CRM action.

### Organization isolation

All recommendation data is organization-scoped.

- Authenticated reads and writes rely on the active workspace organization.
- Never accept `organization_id` from a client request for recommendation generation.
- Preserve RLS on `public.ai_recommendations`.
- Preserve select, insert, update, and delete policies using `public.is_org_member(org_id)`.

## Important implementation files

- `src/app/(app)/growth-agent/page.tsx`
- `src/app/(app)/growth-agent/loading.tsx`
- `src/app/(app)/growth-agent/error.tsx`
- `src/features/setu-guru/growth-center.tsx`
- `src/features/setu-guru/setu-guru-dashboard-strip.tsx`
- `src/features/setu-guru/setu-guru-dashboard-popover.tsx`
- `src/lib/setu-guru/recommendations.ts`
- `src/lib/setu-guru/recommendation-generator.ts`
- `src/app/api/setu-guru/recommendations/generate/route.ts`
- `tests/s42-setu-guru-growth-agent.test.mjs`
- `supabase/migrations/20260710203000_s42_guru_002_ai_recommendations.sql`
- `docs/releases/S42_SETU_GURU_FOUNDATION_QA.md`

## How to inspect and update issues

### Read issues through SMC

```bash
curl https://setuflowcrm.com/api/smc/issues
```

Use `/smc/issues` for the owner-facing board.

### Start an issue

Before code, set the selected issue to `In Progress` and record what is being changed.

```bash
curl -X PATCH https://setuflowcrm.com/api/smc/issues/{ISSUE_ID} \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "In Progress",
    "git_branch": "main",
    "fix_applied": "Implementation started. Describe the exact scope and why the change is needed."
  }'
```

### Update an issue after implementation

Attach complete evidence:

```bash
curl -X PATCH https://setuflowcrm.com/api/smc/issues/{ISSUE_ID} \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "In Review",
    "fix_applied": "Describe the completed implementation in product language.",
    "files_changed": ["path/to/file.tsx"],
    "db_migrations": [],
    "commit_url": "https://github.com/kapoorritesh1111-create/SetuFlow-CRM/commit/COMMIT_SHA",
    "git_branch": "main",
    "regression_test": "PASS — include targeted tests, typecheck, build, deployment and live verification.",
    "qa_notes": "List anything the owner must verify before resolution."
  }'
```

### Resolve an issue

Do not resolve automatically under normal workflow. Set `In Review` after proof. Resolve only after Ritesh explicitly confirms UAT passed.

When Ritesh explicitly directs resolution:

```bash
curl -X PATCH https://setuflowcrm.com/api/smc/issues/{ISSUE_ID} \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Resolved",
    "verified_at": "CURRENT_TIMESTAMP_OR_SUPPORTED_VALUE",
    "qa_notes": "Owner UAT passed and resolution explicitly approved by Ritesh."
  }'
```

If the API field contract has changed, inspect the API route or update `public.sprint_issues` through the approved Supabase tooling. Never guess field names.

## How to create remaining Growth Panel work

Do not hide unimplemented scope inside Sprint 42. Create new issues in a new sprint or approved enhancement batch.

For each remaining item:

1. Inspect current production behavior.
2. Write a concise product-facing issue description.
3. Include measurable acceptance criteria.
4. Record dependencies.
5. Set status `Open`.
6. Implement only after Ritesh approves the issue sequence.

Suggested remaining work areas to evaluate and convert into tracked issues:

### 1. Recommendation controls

- Dismiss with reason.
- Mark completed from the Growth Center where appropriate.
- Snooze until a selected date.
- Restore accidentally dismissed actions.
- Audit all lifecycle transitions.

### 2. Growth Center filtering and search

- Filter by buyer, supplier, quote, RFQ, event, priority, owner, and age.
- Search by company, contact, quote number, RFQ number, product, or market.
- Preserve filter state in the URL.
- Keep mobile controls compact.

### 3. Better recommendation context

- Show quote number, buyer, value, sent date, and age.
- Show supplier, RFQ reference, requested products, validity date, and response status.
- Show trade event name and days since capture.
- Show why the priority was assigned.
- Never show raw technical metadata to business users.

### 4. Recommendation scheduling

- Decide whether generation runs on demand, after relevant CRM mutations, or through a scheduled server job.
- Ensure idempotency and duplicate prevention.
- Record generation runs and failures.
- Do not create noisy recommendations repeatedly.

### 5. Ownership and assignment

- Show the CRM owner responsible for each action.
- Allow assignment or reassignment with permission checks.
- Support owner-specific queues and team views.

### 6. Growth impact and analytics

- Track recommendation opened, acted on, dismissed, snoozed, completed, and converted.
- Connect actions to quote response, stage movement, order creation, or supplier approval outcomes.
- Add explainable impact metrics without claiming AI causality that cannot be proven.

### 7. Permissions

- Define which roles can generate, dismiss, complete, assign, or view recommendations.
- Add server-side enforcement.
- Add tests for owner, admin, manager, and restricted roles.

### 8. Data quality hardening

- Identify recommendations missing company names or record references.
- Fall back to contact name only when company name is absent.
- Do not display opaque UUIDs to users.
- Repair existing rows if display context rules change.

## Implementation rules for every remaining issue

1. Use the smallest safe change.
2. Preserve existing buyer and supplier workflows.
3. Query only the active organization.
4. Never invent CRM data.
5. Never display generic action copy when record context exists.
6. Confirm every generated `action_href` maps to a real application route.
7. Update existing production recommendation rows when generator copy or links change.
8. Add a regression test for every confirmed owner-reported defect.
9. Run the dedicated Growth Agent tests.
10. Run TypeScript validation.
11. Run the production build.
12. Wait for Vercel `READY`.
13. Check runtime error/fatal logs.
14. Perform live desktop and mobile verification.
15. Update the tracker with exact evidence.

## Required verification commands

```bash
npm install
npm run test:s42
npm run typecheck
npm run build
```

For broader release readiness:

```bash
npm run verify
```

A production deployment is not complete until:

- targeted tests pass;
- TypeScript passes;
- Next.js build passes;
- Vercel reports `READY`;
- the production route loads;
- action links do not produce 404s;
- runtime error/fatal logs are clean;
- owner-facing desktop and mobile layouts are reviewed.

## Database rules

- Use migrations for DDL.
- Do not hardcode generated IDs in migrations.
- Use transactional QA for RLS tests.
- Roll back QA rows.
- Confirm zero QA records remain.
- Preserve the partial unique index that prevents duplicate open recommendations.
- Preserve lifecycle timestamp constraints.

## Known lessons from Sprint 42

- A successful build does not prove a link exists.
- Next.js prefetch exposes invalid links as console 404s before a user clicks.
- Route tests must validate real application routes, not assumed URL patterns.
- Generic titles are unusable even when technically correct.
- Dashboard recommendations must remain a small signal, not replace the dashboard.
- Mobile should show a thin strip and an on-demand overlay, not a long action stack.
- Production data may need a repair update when display copy or links change.
- Owner screenshots and console logs are authoritative UAT evidence.

## Starting instruction for Claude

Begin by reading `AGENTS.md`, this handoff, the Sprint 42 release document, and the live SMC issues. Report the current open Growth Panel issues and their dependency order before changing code. Do not modify the resolved Sprint 42 foundation unless you reproduce a regression. Work one approved issue at a time, update SMC at each state transition, and attach commit, test, build, deployment, runtime, and live UI proof before requesting review.
