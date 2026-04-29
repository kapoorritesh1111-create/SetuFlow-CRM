# PR-TRADEEVENTS-FULL — Pending proof

## Status
Pending proof. No npm commands were run.

## Migration reminder
Run `src/mitigation/supabase/sql/110_trade_event_capture_defaults.sql` in Supabase before testing the new `capture_defaults` server action. Without that column, saving Quick Lead defaults will fail.

## Reference files read
- `public/reference-html/setuflow-northstar.html` — Trade Event → Quick Lead section
- `public/reference-html/setuflow-admin-settings-redesign.html` — trade events admin pattern

## Files changed
- `src/features/trade-events/server/actions.ts`
- `src/app/(app)/admin/trade-events/page.tsx`
- `src/features/trade-events/components/trade-events-manager.tsx`
- `src/app/(app)/trade-events/page.tsx`
- `src/app/(app)/leads/page.tsx`
- `public/internal-dcc/index.html`
- `CHANGES.md`

## Implementation summary
- Added `saveTradeEventCaptureDefaults(formData)` server action.
- Added admin edit drawer fields for `source_label` and `quick_lead_title` defaults.
- Added event-card `Quick Lead` link with `sourceType=trade_event`, encoded `sourceLabel`, and `eventId`.
- Added `eventId` parsing in `leads/page.tsx` and passed it to `LeadsWorkspace` as an escape-hatch prop for the next QuickCapture wiring pass.
- Updated DCC: Trade Events 88%, Leads 84%, NorthStar 78%, PR-TRADEEVENTS-FULL Pending proof.

## Verification greps

```bash
grep -rn "capture_defaults" src/
```

```text
src/app/(app)/admin/trade-events/page.tsx:14:  const { data: rowsData } = await supabase.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes, updated_at, capture_defaults').eq('organization_id', organization.id).order('starts_on', { ascending: false }).order('name', { ascending: true });
src/app/(app)/trade-events/page.tsx:31:    .select('id, capture_defaults')
src/app/(app)/trade-events/page.tsx:34:    (captureDefaultRows ?? []).map((row: any) => [row.id, row.capture_defaults ?? null]),
src/features/trade-events/components/trade-events-manager.tsx:15:  capture_defaults?: { source_label?: string | null; quick_lead_title?: string | null } | null;
src/features/trade-events/components/trade-events-manager.tsx:61:      <input name="source_label" placeholder="Quick Lead source label" defaultValue={event?.capture_defaults?.source_label ?? ''} />
src/features/trade-events/components/trade-events-manager.tsx:62:      <input name="quick_lead_title" placeholder="Quick Lead default title" defaultValue={event?.capture_defaults?.quick_lead_title ?? ''} />
src/features/trade-events/components/trade-events-manager.tsx:153:              description="Prefill the Trade Event → Quick Lead handoff once the capture_defaults migration has been applied."
src/features/trade-events/server/actions.ts:178:    .update({ capture_defaults: { source_label: sourceLabel, quick_lead_title: quickLeadTitle } })
src/mitigation/supabase/sql/110_trade_event_capture_defaults.sql:1:ALTER TABLE trade_events ADD COLUMN IF NOT EXISTS capture_defaults JSONB;
```

```bash
grep -n "Quick Lead" src/app/\(app\)/trade-events/page.tsx
```

```text
156:                Quick Lead
```

```bash
grep -n "eventId" src/app/\(app\)/leads/page.tsx
```

```text
21:    eventId?: string | string[];
59:  const eventId = readParam(searchParams?.eventId).trim();
117:        {...({ initialEventId: eventId || null } as any)}
```

## Key diffs

### `src/features/trade-events/server/actions.ts`

```diff
+export async function saveTradeEventCaptureDefaults(formData: FormData) {
+  'use server';
+  const supabase = await createClient();
+  const eventId = formData.get('event_id') as string;
+  const sourceLabel = formData.get('source_label') as string;
+  const quickLeadTitle = formData.get('quick_lead_title') as string;
+  if (!eventId) return;
+  await supabase.from('trade_events')
+    .update({ capture_defaults: { source_label: sourceLabel, quick_lead_title: quickLeadTitle } })
+    .eq('id', eventId);
+  revalidatePath('/admin/trade-events');
+  revalidatePath('/trade-events');
+  revalidatePath('/leads');
+}
```

### `src/app/(app)/admin/trade-events/page.tsx`

```diff
-  const { data: rowsData } = await supabase.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes, updated_at').eq('organization_id', organization.id).order('starts_on', { ascending: false }).order('name', { ascending: true });
+  const { data: rowsData } = await supabase.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes, updated_at, capture_defaults').eq('organization_id', organization.id).order('starts_on', { ascending: false }).order('name', { ascending: true });
```

### `src/features/trade-events/components/trade-events-manager.tsx`

```diff
-import { deleteTradeEvent, saveTradeEvent } from '@/features/trade-events/server/actions';
+import { deleteTradeEvent, saveTradeEvent, saveTradeEventCaptureDefaults } from '@/features/trade-events/server/actions';
+
+  capture_defaults?: { source_label?: string | null; quick_lead_title?: string | null } | null;
+
+  const renderCaptureDefaultFields = (event?: TradeEvent) => (
+    <>
+      <input type="hidden" name="event_id" defaultValue={event?.id ?? ''} />
+      <input name="source_label" placeholder="Quick Lead source label" defaultValue={event?.capture_defaults?.source_label ?? ''} />
+      <input name="quick_lead_title" placeholder="Quick Lead default title" defaultValue={event?.capture_defaults?.quick_lead_title ?? ''} />
+    </>
+  );
+
+        {editingEvent ? (
+          <form id="trade-event-capture-defaults-form" action={saveTradeEventCaptureDefaults} className="mt-5 space-y-5">
+            <DrawerSection
+              title="Quick Lead defaults"
+              description="Prefill the Trade Event → Quick Lead handoff once the capture_defaults migration has been applied."
+            >
+              <div className="grid gap-3 md:grid-cols-2">{renderCaptureDefaultFields(editingEvent)}</div>
+              <button type="submit" disabled={isPending} className="mt-3 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
+                Save Quick Lead defaults
+              </button>
+            </DrawerSection>
+          </form>
+        ) : null}
```

### `src/app/(app)/trade-events/page.tsx`

```diff
+import { createClient } from '@/lib/supabase/server';
+
+  const supabase = await createClient();
+  const { data: captureDefaultRows } = await (supabase as any)
+    .from('trade_events')
+    .select('id, capture_defaults')
+    .eq('organization_id', workspace.organization.id);
+  const captureDefaultsByEventId = new Map<string, { source_label?: string | null; quick_lead_title?: string | null } | null>(
+    (captureDefaultRows ?? []).map((row: any) => [row.id, row.capture_defaults ?? null]),
+  );
+
+            const captureDefaults = captureDefaultsByEventId.get(event.id) ?? null;
+            const quickLeadSourceLabel = captureDefaults?.source_label ?? event.name;
+
+              <a
+                href={`/leads?quickLead=1&sourceType=trade_event&sourceLabel=${encodeURIComponent(quickLeadSourceLabel)}&eventId=${event.id}`}
+                className="mt-4 inline-flex rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
+              >
+                Quick Lead
+              </a>
```

### `src/app/(app)/leads/page.tsx`

```diff
+    eventId?: string | string[];
+
+  const eventId = readParam(searchParams?.eventId).trim();
+
+        {...({ initialEventId: eventId || null } as any)}
```

### `public/internal-dcc/index.html`

```diff
-    <span class="pill r">capture_defaults SQL only — not wired</span>
+    <span class="pill w">PR-TRADEEVENTS-FULL Pending proof</span>

-    <div class="mr"><div class="mn">Trade Events</div><div class="bw"><div class="bf r" style="width:62%"></div></div><div class="mp" style="color:var(--bad)">62%</div><span class="s bad">SQL migration created. Column not in DB. No server action. No Quick Lead button on event cards. Unchanged.</span></div>
+    <div class="mr"><div class="mn">Trade Events</div><div class="bw"><div class="bf g" style="width:88%"></div></div><div class="mp" style="color:var(--good)">88%</div><span class="s warn">PR-TRADEEVENTS-FULL pending proof. capture_defaults server action, admin defaults form, and event-card Quick Lead links are wired. Run SQL migration before testing saves.</span></div>

-    <div class="mr"><div class="mn">Cross-page NorthStar</div><div class="bw"><div class="bf r" style="width:60%"></div></div><div class="mp" style="color:var(--bad)">60%</div><span class="s bad">Quote save fixed. Pipeline real. Trade Event &rarr; Quick Lead still broken (no event card button, no capture_defaults).</span></div>
+    <div class="mr"><div class="mn">Cross-page NorthStar</div><div class="bw"><div class="bf w" style="width:78%"></div></div><div class="mp" style="color:var(--warn)">78%</div><span class="s warn">PR-TRADEEVENTS-FULL pending proof: Trade Event &rarr; Quick Lead path now has event links and eventId handoff. Supabase migration and QuickCapture trade_event_id wiring remain proof/follow-up items.</span></div>
```
