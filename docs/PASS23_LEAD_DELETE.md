# Pass 23 Lead Delete

## Summary

Adds lead deletion to the Leads workspace so test or unwanted leads can be removed from the system.

## UX

- Each lead row now includes a visible **Delete** button.
- The row overflow menu also includes **Delete lead**.
- Selecting one or more rows exposes **Delete selected** in the batch action bar.
- All delete paths ask for browser confirmation before running.
- Successful deletes remove the lead from the local workspace immediately and refresh server data.

## Server behavior

- New `deleteLead` server action validates the active workspace and lead ownership by `organization_id`.
- New `batchDeleteLeads` server action validates that every selected lead belongs to the active workspace.
- `scheduled_tasks` rows are deleted first because the live database FK currently does not cascade.
- The lead is then hard-deleted; related rows with cascade FKs are removed by Supabase.
- An audit log row is written before deletion with the deleted lead snapshot.

## Supabase check

Live Supabase was checked before implementation. Lead child relations already cascade except `scheduled_tasks.lead_id`, which is handled in app code. Optional migration:

```sql
mitigation/supabase/sql/125_pass23_lead_delete_cascade.sql
```

This optional migration changes `scheduled_tasks.lead_id` to `ON DELETE CASCADE` for future direct database deletes.

## Verification boundary

`npm run build` was attempted without running `npm ci`; it could not run because `node_modules` is absent and `next` is not installed in the extracted workspace. No dependency install was run.
