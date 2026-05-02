# Pass 23 Lead Delete Null Guard Build Hotfix

## Reason

Vercel type checking failed because `WorkspaceAccessContext.organization` is nullable. The delete actions accessed `workspace.organization.id` directly.

## Fix

Both delete actions now follow the existing guarded server-action pattern:

- Read `currentUser` and `organization` from `requireWorkspace()`.
- Return a workspace/auth error if either is missing.
- Use the narrowed `organization.id` and `currentUser.id` after the guard.

## Supabase check

The live Supabase schema was checked before this fix. Lead child tables use `ON DELETE CASCADE`, including `scheduled_tasks.lead_id`; `trade_event_entries.converted_lead_id` uses `ON DELETE SET NULL`. The app still performs scheduled-task cleanup before deleting leads as a compatibility guard.

## Files changed

- `src/features/leads/server/actions.ts`
