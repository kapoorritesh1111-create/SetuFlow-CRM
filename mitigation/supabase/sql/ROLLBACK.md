# Supabase migration rollback policy

Sprint 18 issue SF-18-021 adds rollback discipline for the mitigation SQL directory.

## Principles

- Additive migrations that only create tables, add nullable columns, add indexes, or add policies are usually forward-only and can be left without a rollback file.
- High-risk migrations need an explicit paired rollback when a safe rollback exists.
- Data-destructive migrations are not automatically reversible. Use a point-in-time restore or a manually reviewed recovery script.

## Rollback file naming

For a migration named:

```text
045_enable_rls_core_tables.sql
```

Use:

```text
045_enable_rls_core_tables_ROLLBACK.sql
```

## High-risk migrations requiring review

Create or document a rollback plan for migrations that include:

- Dropping constraints, triggers, policies, functions, columns, or tables.
- Deleting or truncating rows.
- Changing foreign key behavior.
- Replacing business-critical triggers or functions.
- Enabling or materially changing RLS on production tables.

## Current rollback coverage

| Migration | Rollback status | Notes |
| --- | --- | --- |
| `045_enable_rls_core_tables.sql` | `045_enable_rls_core_tables_ROLLBACK.sql` | Emergency rollback disables RLS for the tables enabled by the forward migration. Use only during an incident. |
| `057_drop_category_type_constraint.sql` | Manual review required | Forward migration updates category values to live category names. Reapplying the historical chips/powders check may fail or corrupt current semantics. Restore from backup or manually normalize data first. |
| `125_pass23_lead_delete_cascade.sql` | Manual review required | FK behavior can be changed back only after checking scheduled task rows and delete behavior expectations. |
| `152_patch_1_workflow_trigger_cleanup.sql` | Manual review required | Trigger cleanup intentionally removes duplicate or overlapping behavior. Recreating old triggers risks duplicate writes. |

## Supabase point-in-time restore process

When a migration deletes data or changes semantics in a way that cannot be reversed safely:

1. Stop new writes if the incident is active.
2. Open Supabase project backups or point-in-time recovery for the production project.
3. Restore to a safe timestamp before the migration.
4. Validate schema, RLS, critical workflows, and data counts before resuming traffic.
5. Record the incident, restore timestamp, and validation proof in the sprint tracker.

## CI expectation

New high-risk migration files in `mitigation/supabase/sql/` should either have a paired `_ROLLBACK.sql` file or include one of these reviewed annotations in the migration body:

```sql
-- rollback: not-safe
-- rollback: forward-only
```

Use `npm run check:rollback` locally before opening a PR.
