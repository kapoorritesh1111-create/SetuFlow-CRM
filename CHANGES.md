# PR-QUICKFIXES — Quote Save Follow-up

Status: **Pending proof — user running locally**

## Proof note

- I did **not** run `npm ci`, `npm run typecheck`, `npm run build`, or any npm/node command.
- Pipeline is locked per user instruction. No pipeline files were touched in this pass.
- Trade show changes were left intact.

## Files modified in this pass

1. `src/features/leads/components/leads-workspace.tsx`
2. `src/features/leads/server/actions.ts`
3. `public/internal-dcc/index.html`
4. `CHANGES.md`

## What changed

### Quote preview save now persists edits

`Create/open draft preview` now saves the current inline quote preview lines into the active quote draft before refresh/navigation context is restored. This covers edited QTY, edited unit price, and selected quote currency.

The sticky `Continue ... step` button now also saves the preview before advancing, so Pricing → Terms does not silently lose edits.

### Quotes page total/line pricing fix path

The quote preview save writes the edited lines into `quote_line_items` and mirrors them into `quote_version_line_items` when a current version exists. The `/quotes` page already reads `quote_line_items`, so saved line prices and totals should now show instead of USD 0.00 after returning.

### DCC status

`PR-QUICKFIXES` remains **Pending proof**. Scores were not changed.

## Key diffs

```diff
diff --git a/src/features/leads/components/leads-workspace.tsx b/src/features/leads/components/leads-workspace.tsx
@@
-import { batchScheduleLeadFollowUps, batchMoveLeadsToStage, scheduleLeadFollowUp, completeLeadFollowUp, openOrCreateLeadQuoteDraft, recordLeadQuoteApprovalRequest } from '@/features/leads/server/actions';
+import { batchScheduleLeadFollowUps, batchMoveLeadsToStage, scheduleLeadFollowUp, completeLeadFollowUp, openOrCreateLeadQuoteDraft, saveLeadQuoteDraftPreview, recordLeadQuoteApprovalRequest } from '@/features/leads/server/actions';
@@
 type DrawerMode = 'quick' | 'full';
+type QuotePreviewSavePayload = { currency: string; lines: Array<{ id?: string; productId: string | null; productVariantId?: string | null; quantity: number; unitPrice: number | null; currency: string; catalogPriceAmount?: number | null; catalogPriceCurrency?: string | null; notes?: string | null; source?: string | null }> };
@@
-  const handleInlineOpenOrCreateQuote = (leadId: string) => {
+  const handleInlineOpenOrCreateQuote = (leadId: string, preview?: QuotePreviewSavePayload) => {
@@
-      void openOrCreateLeadQuoteDraft(leadId).then((result) => {
+      const action = preview ? saveLeadQuoteDraftPreview({ leadId, ...preview }) : openOrCreateLeadQuoteDraft(leadId);
+      void action.then((result) => {
@@
+  const buildQuotePreviewSavePayload = React.useCallback((): QuotePreviewSavePayload => ({
+    currency,
+    lines: displayLines.map((line) => ({
+      id: line.source === 'quote' ? line.id : undefined,
+      productId: line.productId,
+      productVariantId: line.productVariantId ?? null,
+      quantity: Number(line.quantity) || 0,
+      unitPrice: line.unitPrice == null ? null : Number(line.unitPrice),
+      currency: currency || line.currency || 'USD',
+      catalogPriceAmount: line.catalogPriceAmount ?? line.unitPrice ?? null,
+      catalogPriceCurrency: line.catalogPriceCurrency ?? line.currency ?? currency ?? 'USD',
+      notes: line.note ?? null,
+      source: line.source,
+    })),
+  }), [currency, displayLines]);
+
+  const saveQuotePreview = React.useCallback(() => {
+    onOpenOrCreateQuote(lead.id, buildQuotePreviewSavePayload());
+  }, [buildQuotePreviewSavePayload, lead.id, onOpenOrCreateQuote]);
@@
-            <button type="button" onClick={() => onOpenOrCreateQuote(lead.id)} disabled={isInlineActionPending}
+            <button type="button" onClick={saveQuotePreview} disabled={isInlineActionPending}
@@
-          <button type="button" onClick={() => setBuilderStep((s) => Math.min(s + 1, steps.length - 1))} disabled={builderStep >= steps.length - 1}
+          <button type="button" onClick={() => { saveQuotePreview(); setBuilderStep((s) => Math.min(s + 1, steps.length - 1)); }} disabled={builderStep >= steps.length - 1}
```

```diff
diff --git a/src/features/leads/server/actions.ts b/src/features/leads/server/actions.ts
@@
+export async function saveLeadQuoteDraftPreview(input: QuotePreviewSaveInput): Promise<QuoteDraftActionState & { quoteId?: string }> {
+  const opened = await openOrCreateLeadQuoteDraft(input.leadId);
+  if (opened.error || !opened.quoteId) return opened;
+
+  const workspace = await requireWorkspace();
+  const currentUser = workspace.user;
+  const organization = workspace.organization;
+  if (!currentUser || !organization) return { error: 'Not authenticated.' };
+
+  const supabase = await createClient();
+  const db = supabase as any;
+  const nowIso = new Date().toISOString();
+  const currency = normalizeQuoteDisplayCurrency(input.currency ?? opened.quote?.currency ?? 'USD');
+  const previewLines = (input.lines ?? [])
+    .filter((line) => line.productId || line.notes)
+    .map((line) => {
+      const quantity = Number(line.quantity ?? 0);
+      const unitPrice = line.unitPrice == null ? null : Number(line.unitPrice);
+      const catalogPriceAmount = line.catalogPriceAmount == null ? unitPrice : Number(line.catalogPriceAmount);
+      const lineCurrency = normalizeQuoteDisplayCurrency(line.currency ?? currency);
+      const catalogCurrency = normalizeQuoteDisplayCurrency(line.catalogPriceCurrency ?? lineCurrency);
+      const isPriceOverridden = catalogPriceAmount != null && unitPrice != null && Number(unitPrice) !== Number(catalogPriceAmount);
+      return {
+        quote_id: opened.quoteId,
+        product_id: line.productId || null,
+        product_variant_id: line.productVariantId || null,
+        catalog_price_amount: Number.isFinite(catalogPriceAmount as number) ? catalogPriceAmount : null,
+        catalog_price_currency: catalogCurrency,
+        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
+        unit_price: unitPrice != null && Number.isFinite(unitPrice) ? unitPrice : null,
+        currency: lineCurrency,
+        is_price_overridden: isPriceOverridden,
+        override_reason: isPriceOverridden ? 'Edited in Leads quote preview' : null,
+        overridden_by: isPriceOverridden ? currentUser.id : null,
+        overridden_at: isPriceOverridden ? nowIso : null,
+        notes: line.notes ?? null,
+      };
+    });
+
+  await db.from('quote_line_items').delete().eq('quote_id', quote.id);
+  if (previewLines.length) await db.from('quote_line_items').insert(previewLines);
+
+  if (quote.current_version_id) {
+    await db.from('quote_version_line_items').delete().eq('quote_version_id', quote.current_version_id);
+    await db.from('quote_version_line_items').insert(versionLines);
+  }
+
+  return { success: 'Quote preview saved to the active draft.', quoteId: quote.id };
+}
```

```diff
diff --git a/public/internal-dcc/index.html b/public/internal-dcc/index.html
@@
-<span class="s warn">Pending proof — visual/quote follow-up fixes running locally</span>
+<span class="s warn">Pending proof — quote save fixes running locally</span>
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
- Click Continue Terms step and/or Create/open draft preview.
- Return to the quote builder and `/quotes?quoteId=...`.
- Confirm saved QTY, unit price, line total, quote total, and selected currency persist.
