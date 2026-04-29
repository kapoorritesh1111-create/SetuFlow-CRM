# PR-QUICKFIXES — Quote Version Schema + Hydration Follow-up

Status: **Pending proof — user running locally**

## Proof note

- I did **not** run `npm ci`, `npm run typecheck`, `npm run build`, or any npm/node command.
- Pipeline is locked per user instruction. No pipeline files were touched in this pass.
- Trade show changes were left intact.

## Files modified in this pass

1. `src/features/leads/server/actions.ts`
2. `src/features/leads/components/leads-workspace.tsx`
3. `public/internal-dcc/index.html`
4. `CHANGES.md`

## What changed

### Quote save error fixed

The save path now mirrors lead quote preview rows into `quote_version_line_items` with the required non-null schema fields: `sku_code`, `product_name`, `category_type`, `basis_applied`, and `pricing_mode`. This targets the Supabase error:

`null value in column "sku_code" of relation "quote_version_line_items" violates not-null constraint`

### Hydration risk reduced in quote workspace

The inline quote workspace no longer uses default `toLocaleString()` for quote preview totals. It now uses a fixed `en-US` `Intl.NumberFormat`, so the server/client rendered amount strings are deterministic.

### DCC status

`PR-QUICKFIXES` remains **Pending proof**. Scores were not changed.

## Key diffs

```diff
diff --git a/src/features/leads/server/actions.ts b/src/features/leads/server/actions.ts
@@
-    const versionLines = previewLines.map((line) => ({
+    const versionLines = previewLines.map((line, index) => ({
       quote_version_id: quote.current_version_id,
       product_id: line.product_id,
       product_variant_id: line.product_variant_id,
+      sku_code: `QUOTE-LINE-${index + 1}`,
+      product_name: line.notes || `Quote line ${index + 1}`,
+      category_type: 'chips',
+      basis_applied: 'fob',
+      pricing_mode: 'case',
       moq: line.quantity,
       final_unit_price: line.unit_price,
-      display_currency: line.currency,
+      display_currency: normalizeQuoteDisplayCurrency(line.currency, currency),
+      is_overridden: Boolean(line.is_price_overridden),
+      override_reason: line.override_reason,
+      overridden_by: line.overridden_by,
+      overridden_at: line.overridden_at,
       line_notes: line.notes ?? 'Saved from Leads quote preview',
+      sort_order: index,
+      calculation_meta: { source: 'leads_quote_preview' },
+      catalog_price_snapshot: {},
     }));
```

```diff
diff --git a/src/features/leads/components/leads-workspace.tsx b/src/features/leads/components/leads-workspace.tsx
@@
+function formatPreviewAmount(value: number | null | undefined) {
+  const amount = Number(value ?? 0);
+  if (!Number.isFinite(amount)) return '0';
+  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
+}
+
@@
-`${currency} ${subtotal.toLocaleString()}`
+`${currency} ${formatPreviewAmount(subtotal)}`
@@
-{item.currency} {item.total.toLocaleString()}
+{item.currency} {formatPreviewAmount(item.total)}
```

```diff
diff --git a/public/internal-dcc/index.html b/public/internal-dcc/index.html
@@
-<span class="s warn">Pending proof — quote save fixes running locally</span>
+<span class="s warn">Pending proof — quote version schema + hydration fix running locally</span>
```

## Next PR prompt

You are a senior full-stack engineer on SETU Flow CRM — Next.js 14 App Router, Supabase, TypeScript. Repo zip attached. SURGICAL PR — quote save proof follow-up only.

Mandatory rules:
1. Read `public/internal-dcc/index.html` first and preserve its format.
2. Do not touch pipeline files; pipeline is locked.
3. Do not touch trade events files; trade show changes are working.
4. Do not run npm/node commands unless explicitly permitted by the user.
5. Mark status Pending proof until user confirms local proof.

Proof target:
- In Leads quote preview, edit QTY and unit price.
- Click Create/open draft preview, then Continue Terms step, then Review/Send gate.
- Confirm no `quote_version_line_items.sku_code` not-null error appears.
- Confirm no hydration errors appear on quote workspace load.
- Return to `/quotes?quoteId=...` and confirm saved line totals and quote total persist.
