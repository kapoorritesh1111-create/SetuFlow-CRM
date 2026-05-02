# Pass 23 Lead Delete Build Hotfix

## Problem

Vercel build failed because `deleteLead` and `batchDeleteLeads` used `workspace.supabase`, but `WorkspaceAccessContext` does not expose a `supabase` property.

## Fix

Both delete actions now use the existing server pattern:

```ts
const supabase = await createClient();
const db = supabase as any;
```

## Supabase check

Live Supabase lead foreign keys were checked before packaging this hotfix. `scheduled_tasks.lead_id` now has `ON DELETE CASCADE`; the app still deletes linked scheduled tasks first as a compatibility guard for older branches/databases.

## Files changed

- `src/features/leads/server/actions.ts`
- `CHANGES.md`
- `docs/PASS23_LEAD_DELETE_BUILD_HOTFIX.md`
