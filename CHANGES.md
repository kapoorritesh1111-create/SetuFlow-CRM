# CHANGES — PR-QUICKFIXES

Status: Pending proof — user running locally.

Proof was not run here. Per instruction, no npm/node/typecheck/build commands were attempted.

## Modified files
- `src/app/(app)/quotes/page.tsx`
- `src/features/pipeline/components/PipelineBoardFilters.tsx`
- `src/features/pipeline/components/pipeline-board.tsx`
- `src/mitigation/supabase/sql/110_trade_event_capture_defaults.sql` (new)
- `public/internal-dcc/index.html`
- `CHANGES.md`

## Not modified
- `public/reference-html/*.html`
- `src/app/(app)/admin/trade-events/page.tsx`
- `src/features/trade-events/server/actions.ts`

## Quotes validity diff
```diff
-  const daysLeft = Math.max(0, 30 - daysSinceUpdate);
-  if (daysLeft <= 3) return { label: `${daysLeft} days left!`, rose: true, amber: false, emerald: false };
-  if (daysLeft <= 7) return { label: `${daysLeft} days left`, rose: false, amber: true, emerald: false };
+  const daysLeft = Math.max(0, 7 - daysSinceUpdate);
+  if (daysLeft <= 1) return { label: `${daysLeft} days left!`, rose: true, amber: false, emerald: false };
+  if (daysLeft <= 4) return { label: `${daysLeft} days left`, rose: false, amber: true, emerald: false };
```

## Pipeline filters diff summary
```diff
+import PipelineBoardFilters from './PipelineBoardFilters';
```

```diff
+  const [followUpTiming, setFollowUpTiming] = useState(() => searchParams.get('follow') ?? '');
+  const [productId, setProductId] = useState(() => searchParams.get('product') ?? searchParams.get('category') ?? '');
+  const [marketId, setMarketId] = useState(() => searchParams.get('market') ?? '');
```

```diff
+        <PipelineBoardFilters
+          search={search}
+          onSearchChange={setSearch}
+          leadType={leadTypeFilter}
+          onLeadTypeChange={(value) => setLeadTypeFilter(normalizeLeadTypeParam(value))}
+          ownerId={ownerFilter}
+          onOwnerIdChange={setOwnerFilter}
+          followUpTiming={followUpTiming}
+          onFollowUpTimingChange={setFollowUpTiming}
+          productId={productId}
+          onProductIdChange={setProductId}
+          marketId={marketId}
+          onMarketIdChange={setMarketId}
+        />
```

```diff
+      const matchesFollowUp = !followUpTiming
+        || followState === followUpTiming
+        || (followUpTiming === 'week' && isThisWeek)
+        || (followUpTiming === 'none' && followState === 'unscheduled');
+      const matchesProduct = !productId || (leadProductsMap.get(lead.id)?.includes(productId) ?? false);
+      const matchesMarket = !marketId || (leadMarketsMap.get(lead.id)?.includes(marketId) ?? false);
```

`PipelineBoardFilters.tsx` now includes follow-up timing, product, and market dropdowns plus active clear chips. Existing search, leadType, and ownerId props remain.

DnD logic was not changed: `draggedLeadId`, `dragOverStageId`, `handleMove`, and drop handlers were left intact.

## Trade Events capture_defaults result
`src/types/database.generated.ts` does not include `capture_defaults` under `trade_events` Row/Insert/Update.

Migration added:
```diff
+ALTER TABLE trade_events ADD COLUMN IF NOT EXISTS capture_defaults JSONB;
```

Migration needed before server action can be wired.

## DCC update
`public/internal-dcc/index.html` was read first. Scores were not changed. Only PR-QUICKFIXES status was updated:
```diff
-<span class="s neutral">Next</span>
+<span class="s warn">Pending proof — user running locally</span>
```

## Next PR prompt
```txt
You are a senior full-stack engineer on SETU Flow CRM — Next.js 14 App Router, Supabase, TypeScript.
Repo zip attached. PR-QUICKFIXES is Pending proof, not complete.

Run proof locally only:
1. Apply migration if needed: src/mitigation/supabase/sql/110_trade_event_capture_defaults.sql
2. Run npm ci.
3. Run npm run typecheck.
4. Run npm run build.
5. Verify pipeline filter chips: follow-up timing, owner, product, market, lead type, clear chips.
6. Verify quote validity is 7 days with rose threshold <=1 and amber threshold <=4.

If proof is green, update public/internal-dcc/index.html to mark PR-QUICKFIXES Complete and proceed to the next surgical PR.
If proof fails, return the exact failing output and touch only the files needed for the fix.
```
