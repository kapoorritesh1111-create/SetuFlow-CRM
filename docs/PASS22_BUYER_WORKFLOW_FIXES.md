# Pass 22 Buyer Workflow Fixes

## Scope
Fixes latest live QA blockers for buyer capture-to-order retest and shared-module regressions:

- Quick Add Lead save failed when `lead_markets.organization_id` was missing in direct relation insert fallback.
- `/integrations` redirected to `/approval-send` instead of rendering connector cards.
- `/documents` had no global upload/register surface.
- `/compliance` document review failed in live DB because document workflow expected `documents.updated_at`.
- `/tasks` scheduled task creation could be rejected by RLS in older deployments.
- `/admin/organization` lacked an editable profile form for the org name.

## Files changed

- `src/features/leads/server/actions.ts`
- `src/features/trade-events/server/actions.ts`
- `src/types/database.ts`
- `src/features/tasks/server/actions.ts`
- `src/features/compliance/server/actions.ts`
- `src/features/compliance/components/compliance-workspace.tsx`
- `src/app/(app)/documents/page.tsx` (uses updated workspace component)
- `src/app/(app)/integrations/page.tsx`
- `src/features/admin/server/actions.ts`
- `src/app/(app)/admin/organization/page.tsx`
- `mitigation/supabase/sql/120_pass22_buyer_capture_documents_tasks.sql`
- `public/internal-dcc/index.html`

## Database step required

Apply:

```sql
mitigation/supabase/sql/120_pass22_buyer_capture_documents_tasks.sql
```

This adds/repairs `documents.updated_at`, backfills/locks `lead_markets.organization_id`, and repairs scheduled task RLS policies.

## Retest checklist

1. `/leads` → Quick Add Lead → create buyer with company, country, contact, email, phone, WhatsApp, deal value, next follow-up, and After Save.
2. Confirm no `lead_markets.organization_id` error and saved buyer appears in lead list.
3. Continue buyer-to-order: qualify lead, add products, create RFQ/Quote, approve, send, convert to order/contract, and process order.
4. `/tasks` → Add task → save → mark complete.
5. `/documents` → Global upload → choose lead and file → save; verify Submitted status.
6. `/compliance` → change Submitted document to Approved → save.
7. `/integrations` → verify connector cards render and URL does not redirect.
8. `/admin/organization` → edit organization name/default currency → save and reload.
