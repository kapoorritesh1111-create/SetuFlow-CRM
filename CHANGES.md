# CHANGES.md - PR-SCHEMA-FIX-QUOTE-ORDER-LOOP

Status: Pending proof

## Files changed
- `src/mitigation/supabase/sql/111_quote_order_loop_schema.sql`
- `src/types/database.generated.ts`
- `src/app/(app)/approval-send/page.tsx`
- `public/internal-dcc/index.html`
- `CHANGES.md`

## Schema inspection result
The attached current schema confirms `contracts.quote_id`, `quote_versions.sent_at`, `quote_version_line_items.final_case_price`, `final_kg_price`, `final_unit_price`, `is_overridden`, and `trade_events.capture_defaults` already exist. The approval-send quote lifecycle was missing `quotes.sent_at`, so this PR adds that field safely and aligns generated types.

## Exact migration SQL

```sql
-- 111_quote_order_loop_schema.sql
-- PR-SCHEMA-FIX-QUOTE-ORDER-LOOP
-- Additive schema alignment for approval-send and sent quote order ingestion.
-- Run in Supabase before regenerating src/types/database.generated.ts.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_quotes_organization_status
  ON public.quotes (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_quotes_sent_at
  ON public.quotes (sent_at);

CREATE INDEX IF NOT EXISTS idx_contracts_quote_id
  ON public.contracts (quote_id);

CREATE INDEX IF NOT EXISTS idx_contracts_organization_status
  ON public.contracts (organization_id, status);
```

## Verification

```bash
grep -n "sent_at\|quote_id\|quote_version_lines\|lines" src/types/database.generated.ts
# Relevant matches include:
# 4001:          quote_id: string
# 4002:          sent_at: string | null
# 4025:          quote_id: string
# 4026:          sent_at?: string | null
# 4049:          quote_id?: string
# 4050:          sent_at?: string | null
# 4137:          sent_at: string | null
# 4170:          sent_at?: string | null
# 4203:          sent_at?: string | null
```

```bash
grep -n "as any" src/app/(app)/approval-send/page.tsx
# 0 matches
```

```bash
grep -n "111_quote_order_loop_schema" -n src/mitigation/supabase/sql/111_quote_order_loop_schema.sql
# 1:-- 111_quote_order_loop_schema.sql
```

## Diffs

### `src/app/(app)/approval-send/page.tsx`

```diff
@@
   await typedSupabase
     .from('quotes')
-    .update({ status: 'sent', updated_at: sentAt })
+    .update({ status: 'sent', sent_at: sentAt, updated_at: sentAt })
@@
   const { data: lines } = version?.id
-    ? await supabase
+    ? await typedSupabase
       .from('quote_version_line_items')
```

### `src/types/database.generated.ts`

```diff
@@ quotes.Row
           quote_number: string | null
           rfq_id: string | null
+          sent_at: string | null
           source_file_name: string | null
@@ quotes.Insert
           quote_number?: string | null
           rfq_id?: string | null
+          sent_at?: string | null
           source_file_name?: string | null
@@ quotes.Update
           quote_number?: string | null
           rfq_id?: string | null
+          sent_at?: string | null
           source_file_name?: string | null
```

### `src/mitigation/supabase/sql/111_quote_order_loop_schema.sql`

```diff
+-- 111_quote_order_loop_schema.sql
+-- PR-SCHEMA-FIX-QUOTE-ORDER-LOOP
+-- Additive schema alignment for approval-send and sent quote order ingestion.
+-- Run in Supabase before regenerating src/types/database.generated.ts.
+
+ALTER TABLE public.quotes
+  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;
+
+CREATE INDEX IF NOT EXISTS idx_quotes_organization_status
+  ON public.quotes (organization_id, status);
+
+CREATE INDEX IF NOT EXISTS idx_quotes_sent_at
+  ON public.quotes (sent_at);
+
+CREATE INDEX IF NOT EXISTS idx_contracts_quote_id
+  ON public.contracts (quote_id);
+
+CREATE INDEX IF NOT EXISTS idx_contracts_organization_status
+  ON public.contracts (organization_id, status);
```

### `public/internal-dcc/index.html`

```diff
+<div class="co w"><strong>Pending proof — PR-SCHEMA-FIX-QUOTE-ORDER-LOOP:</strong> Migration 111 aligns the quote sent lifecycle with the generated type contract. Apply migration 111 in Supabase, regenerate DB types from live DB, then run build. Scores stay unchanged until proof is green.</div>
```

## Proof reminder
Run migration 111 in Supabase, regenerate DB types from live DB, then run build.

No npm commands were run in this environment.
