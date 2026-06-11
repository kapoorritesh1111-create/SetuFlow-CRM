# SETU Flow CRM — AI Agent Instructions

This file is auto-read by Cursor. Claude and OpenAI agents should call `/api/workspace/agent` for live context.

## Quick Start

```bash
# Get your next issue with full context (marks it In Progress automatically)
curl https://setuflowcrm.com/api/workspace/agent?agent=cursor

# Dry run — see context without marking In Progress
curl https://setuflowcrm.com/api/workspace/agent?agent=cursor&dry_run=true
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

0. **Admin UX rebuild priority (S24-ADMUX series)** — While any `S24-ADMUX-*` issue is Open or In Progress, agents MUST select from that series before any other issue, in dependency order: foundation (21) → Admin Home (22) → Workspace (23) → Trade Setup (24) → Commerce & Governance (25) → SETU Internal (26) → protocol (27). Work ONE issue at a time, keep every change scoped to that issue's pages, and never start a broad multi-page admin rewrite that the tracker did not ask for. The Admin UX V2 design contract is `setu-admin-complete.html`; the shared component kit is `src/features/admin/components/admin-ui-kit.tsx` + `admin-kit-tabs.tsx` — reuse it, do not fork new card/tab styles per page.
1. **Never skip org scope** — all Supabase queries must include `.eq('organization_id', SETU_FLOW_ORG_ID)`
2. **Admin client for reads** — use `createAdminSupabaseClient()` to bypass RLS for server reads
3. **Smallest safe change** — only touch files related to the issue. No refactors.
4. **Commit format** — `SF-{sprint}-{num}: concise fix title` (e.g. `SF-23-011: Fix dashboard modal close button`)
5. **Typecheck before resolving** — run `npx tsc --noEmit` before marking an issue Resolved

## API Endpoints for Agents

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/workspace/agent` | GET | Get next issue + context packet |
| `/api/workspace/agent` | POST | Log a checkpoint/action |
| `/api/workspace/issues` | GET | List all issues |
| `/api/workspace/issues` | POST | Create new issue |
| `/api/workspace/issues/:id` | PATCH | Update issue (status, fix_applied, pr_link) |
| `/api/workspace/issues/comments` | POST | Add comment/checkpoint |

## Resolving an Issue

```bash
# After fixing, mark resolved with proof:
curl -X PATCH https://setuflowcrm.com/api/workspace/issues/{ISSUE_ID} \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Resolved",
    "fix_applied": "Description of what was changed and why",
    "pr_link": "https://github.com/org/repo/commit/abc123",
    "updated_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
```

## Workspace UI

The internal workspace is at `https://setuflowcrm.com/workspace` — requires SETU Flow org login.

- `/workspace` — Sprint health dashboard
- `/workspace/issues` — Issues board (table, kanban, backlog views)
- `/workspace/sprints` — Sprint planning
- `/workspace/agents` — AI agent queue and action log
- `/workspace/clients` — Per-client issue tracking
