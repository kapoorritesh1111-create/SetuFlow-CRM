# SETU Flow CRM — AI Agent Instructions

This file is auto-read by Cursor. Claude and OpenAI agents should call the Setu Mission Control APIs for live issue context.

## Quick Start

```bash
# List Sprint / SMC issues with full context
curl https://setuflowcrm.com/api/smc/issues

# Update an issue after work is deployed and ready for review
curl -X PATCH https://setuflowcrm.com/api/smc/issues/{ISSUE_ID} \
  -H 'Content-Type: application/json' \
  -d '{"status":"In Review"}'
```

## Codebase

- **Framework:** Next.js 14 App Router, TypeScript strict
- **DB:** Supabase (project: `sjzfzloggabsmcuxktnl`)
- **Auth:** `@supabase/ssr` cookies — use `createClient()` from `@/lib/supabase/server`
- **Styles:** Tailwind CSS — use existing `workspace*Class` constants from `@/components/ui/workspace-surfaces`
- **Main org:** `3327b9a7-aadb-44b0-9793-30c4045d3c92` (SETU Flow) — always scope DB queries

## Key Directories

```
src/app/(app)/          — Next.js authenticated pages (all require org membership)
src/app/api/            — API routes (auth via createClient + organization_id scoping)
src/features/           — Feature components (client-only React components)
src/lib/queries/        — Server-side data fetching
src/lib/workspace/      — Auth helpers (getWorkspaceAccess, requireWorkspace, etc.)
src/components/ui/      — Shared UI components
public/internal/        — Legacy HTML workspace tools (issue-tracker, docs, roadmap)
```

## Critical Rules

0. **SMC is the active tracker** — Setu Mission Control has replaced the retired Workspace agent protocol. Read issues from `GET /api/smc/issues`. Update with `PATCH /api/smc/issues/{id}` or `PATCH /api/smc/issues/bulk`.
1. **Never skip org scope** — all Supabase queries must include `.eq('organization_id', SETU_FLOW_ORG_ID)` unless the request explicitly needs cross-org administrative diagnostics.
2. **Admin client for internal reads** — use `createAdminSupabaseClient()` for server reads that must bypass RLS.
3. **Smallest safe change** — only touch files related to the issue. No drive-by refactors.
4. **Commit format** — use `S{sprint}-{TYPE}-{num}: concise title`, for example `S37-TASK-001: Add approval requests table`.
5. **Typecheck before review** — run `npx tsc --noEmit` before marking an issue ready for review.
6. **Never auto-resolve** — after deployment proof is attached, set SMC issues to `In Review`. Ritesh manually verifies and resolves.

## API Endpoints for Agents

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/smc/issues` | GET | List issues and live tracker context |
| `/api/smc/issues` | POST | Create a new SMC issue |
| `/api/smc/issues/:id` | PATCH | Update issue status, fix details, files, commit, and regression proof |
| `/api/smc/issues/bulk` | PATCH | Bulk update issue metadata when explicitly requested |

## Completing an Issue for Review

```bash
curl -X PATCH https://setuflowcrm.com/api/smc/issues/{ISSUE_ID} \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "In Review",
    "fix_applied": "Description of what changed and why",
    "commit_url": "https://github.com/kapoorritesh1111-create/SetuFlow-CRM/commit/abc123",
    "regression_test": "PASS — typecheck and targeted validation completed"
  }'
```

## Setu Mission Control UI

The internal workspace is Setu Mission Control (SMC). It requires SETU Flow org login.

- `/smc` — Sprint health dashboard / command center
- `/smc/issues` — Issues board and implementation tracker
- `/smc/sprints` — Sprint planning
- `/smc/agents` — AI agent queue and action log
- `/smc/clients` — Per-client issue tracking

Legacy `/workspace/*` pages may still exist for compatibility, but new agent work should use SMC routes and APIs.
