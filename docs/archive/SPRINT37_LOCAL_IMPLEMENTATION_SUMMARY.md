# Sprint 37 local implementation pass

This repo zip continues Sprint 37 from the uploaded `SetuFlow-CRM-main.zip` baseline.

## Completed in this local pass

### S37-TASK-003 — parent quote status authority cleanup

Changed `src/features/quotes/server/actions.ts` so fallback quote flows stop writing parent `quotes.status` and stop directly setting `current_version_id` / `sent_version_id`.

Parent status and version pointers are now expected to be derived by the live `quote_versions` sync trigger added in Sprint 37 migrations:

- `supabase/migrations/20260624173500_s37_task_003_single_quote_version_sync_trigger.sql`
- `supabase/migrations/20260624182000_s37_task_003_guard_parent_quote_status.sql`

Targeted search after the change shows no direct parent quote status update pattern in `src/`:

```bash
grep -R "from('quotes').update({ status\|from(\"quotes\").update({ status" -n src
```

### S37-BUG-004 — duplicate line seeding migration prepared

Added migration:

- `supabase/migrations/20260624190000_s37_bug_004_drop_duplicate_line_seed.sql`

This migration:

1. Drops the legacy deferred DB trigger `trg_setuflow_seed_quote_version_lines_from_lead_coverage`.
2. Drops the legacy function `setuflow_seed_quote_version_lines_from_lead_coverage()`.
3. Dedupes existing `quote_version_line_items` rows created by competing seed paths.
4. Recomputes `quote_versions.total_line_count` from remaining line rows.

## Validation run locally

No `npm ci` was run, per project rule. This zip has no `node_modules`, so full `npx tsc --noEmit` was not run locally.

Search checks run:

```bash
grep -R "from('quotes').update({ status\|from(\"quotes\").update({ status" -n src
grep -R "setuflow_seed_quote_version_lines_from_lead_coverage\|trg_setuflow_seed_quote_version_lines_from_lead_coverage" -n supabase/migrations src
```

## Next recommended live steps

1. Apply the S37-BUG-004 migration to Supabase live.
2. Deploy this repo to Vercel.
3. Run `npx tsc --noEmit` in the deployment/build environment.
4. Move S37-TASK-003 to `In Review` after production is green and the repo search is clean.
5. Move S37-BUG-004 to `In Review` after live DB confirms the trigger/function are gone and duplicate lines are removed.

## Next issue after this pass

S37-TASK-005 — build canonical `app_create_lead_quote_draft_tx` RPC.
