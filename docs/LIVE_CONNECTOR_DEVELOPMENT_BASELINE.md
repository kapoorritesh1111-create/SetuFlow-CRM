# SETU Flow Live Connector Development Baseline

Date: 2026-04-30
Pass: PR-NS-16B — Live Supabase/Vercel DCC Baseline

## Purpose

This pass updates the internal DCC operating model now that Supabase and Vercel are connected to GPT. Future SETU Flow builds should no longer rely only on static repo inspection when the work touches schema, RLS, demo data, deployment status, build errors, or runtime route behavior.

## Connector baseline verified in this pass

### Supabase

Connection: working.

Detected projects:

| Project | Project ref | Status | Region | Database |
|---|---|---|---|---|
| SETU Flow CRM | `sjzfzloggabsmcuxktnl` | ACTIVE_HEALTHY | us-west-2 | Postgres 17.6.1 |
| Timesheet_Webapp | `ytzstwejjkqpmmoymdte` | ACTIVE_HEALTHY | us-west-2 | Postgres 17.6.1 |

SETU Flow project to use for DCC verification:

```text
sjzfzloggabsmcuxktnl
```

### Vercel

Connection: working.

Detected team:

```text
team_FUuclvXHj0efPiI9SQJvY1nK — ritesh_kapoor's projects
```

Detected project:

```text
prj_j3kkTnBcjXKyLLEw9IEMXBfVzfFG — setu-flow-crm
```

Latest deployment baseline observed:

| Deployment | State | Target | Commit message | Commit SHA |
|---|---|---|---|---|
| `dpl_AbF8tddXDqGQKpKxiNMjLvpCx8rr` | READY | production | Mobile redirect | `ff90a31295224a8d631c1514d2d3ec875934654c` |

Recent deployment history also includes both READY and ERROR states, so future PRs must inspect Vercel logs when build or runtime risk is relevant.

## Development process from PR-NS-17 onward

Every future PR must use this order unless the task is docs-only:

1. Read the latest repo/package provided by the user.
2. Check Supabase if the PR touches schema, RLS, RPCs, seed data, quote/order handoff, auth/membership, storage, or integrations.
3. Check Vercel if the PR touches build-sensitive code, app routes, deployment config, environment assumptions, or runtime behavior.
4. Make the smallest safe repo changes.
5. Update DCC in all affected tabs.
6. Update readiness/tracker docs.
7. Return the full updated repo zip.
8. Include the next DCC prompt.

## Mandatory live verification fields for every future DCC PR

Each PR must record:

```text
LIVE VERIFICATION:
- Supabase project identified: yes/no + project ref
- Supabase schema checked: yes/no/not applicable
- Supabase data checked: yes/no/not applicable
- Supabase RLS/advisors checked: yes/no/not applicable
- Supabase logs checked: yes/no/not applicable
- Vercel project identified: yes/no + project id
- Vercel latest deployment checked: yes/no/not applicable
- Vercel build logs checked: yes/no/not applicable
- Runtime route checked through Vercel: yes/no/not applicable
```

## Standing rule

Do not run `npm ci` unless the user explicitly reverses that instruction. Use static inspection, targeted code checks, Supabase verification, and Vercel build/deployment logs instead.
