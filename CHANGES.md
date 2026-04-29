# PR-ORDER-INGEST-SENT-QUOTES — Pending proof

## Status
Pending proof. No npm commands were run.

## Files changed
- `src/app/(app)/approval-send/page.tsx`
- `src/app/(app)/orders/page.tsx`
- `public/internal-dcc/index.html`
- `src/features/leads/components/leads-workspace.tsx` — minimal build blocker fix from prior PR: imported existing `LeadDrawerLead` type so Vercel can compile before this PR is evaluated.
- `CHANGES.md`

## Schema/type inspection
Existing production order table is `contracts`.

Confirmed relevant generated types exist:
- `contracts.quote_id`
- `contracts.lead_id`
- `contracts.organization_id`
- `contracts.status`
- `contracts.execution_state`
- `contracts.quote_currency`
- `quotes.status`
- `quote_versions.sent_at`
- RPC `app_ensure_contract_for_accepted_quote_tx`

No new table was invented.

## Implementation summary
- Replaced `/approval-send` from the integrations workspace with a quote approval/send confirmation screen.
- `Confirm & Send` now:
  - updates `quotes.status` to `sent`
  - updates approved `quote_versions.status` to `sent` and `quote_versions.sent_at`
  - calls existing RPC `app_ensure_contract_for_accepted_quote_tx` to create/sync the linked `contracts` record without duplicating existing contracts
  - revalidates `/quotes` and `/orders`
  - redirects to `/orders?notice=quote-sent&eId={quoteId}`
- Orders now includes both `accepted` and `sent` quotes so sent quote-derived orders are visible.
- Order execution evaluation treats `sent` as an execution-ready commercial quote state alongside `accepted`.
- DCC updated: NorthStar 92%, Orders 88%, PR-ORDER-INGEST-SENT-QUOTES Pending proof.

## Verification commands

```bash
grep -n "quote_id\|sent_at\|status.*sent\|upsert\|insert" src/app/(app)/approval-send/page.tsx
```

Result:

```text
23:  const quoteId = String(formData.get('quote_id') ?? '').trim();
42:    .update({ status: 'sent', updated_at: sentAt })
48:    .update({ status: 'sent', sent_at: sentAt })
49:    .eq('quote_id', quoteId)
54:    p_quote_id: quote.id,
116:  if (String(quote.status ?? '').toLowerCase() === 'sent') {
138:      .eq('quote_id', quote.id)
217:            <input type="hidden" name="quote_id" value={quote.id} />
```

```bash
grep -n "quote_id\|sent quote\|contract" src/app/(app)/orders/page.tsx
```

Result:

```text
5: * compliance items, and contract status per order card.
81:  quote_id: string;
106:  contract_id: string;
156:  contract: ContractRow | null;
263:    'order-contract-missing': { title: 'Linked contract is missing', description: 'Orders can only progress execution when the contract handoff exists.', tone: 'danger' },
264:    'order-update-failed': { title: 'Order execution update failed', description: 'The contract execution state could not be saved.', tone: 'danger' },
304:  // 1. Fetch accepted or sent quotes — sent quotes are ingested into contracts from approval-send
335:          description="Accepted and sent quotes become operational orders here with documents, compliance, and execution status in one place."
359:  // 2–10. Parallel fetch: leads, documents, compliance, contracts, and line continuity
378:    db.from('contracts')
379:      .select('id, quote_id, status, accepted_quote_version_id, commercial_snapshot_mode, commercial_handoff_at, signed_at, starts_on, ends_on, commercial_lock_state, pricing_basis, quote_currency, approval_required, approval_state, commercial_snapshot, execution_state, execution_blockers, execution_snapshot, ready_at, released_at, dispatched_at, completed_at')
381:      .in('quote_id', quoteIds),
434:  const contractRows: ContractRow[] = Array.isArray(contractsResult.data) ? (contractsResult.data as ContractRow[]) : [];
435:  const contractByQuote = new Map<string, ContractRow>();
436:  contractRows.forEach(c => contractByQuote.set(c.quote_id, c));
438:  const contractIds = contractRows.map((contract) => contract.id);
439:  const contractLineItemsData = contractIds.length
440:    ? await db.from('contract_line_items').select('id, contract_id, source_quote_version_line_item_id, continuity_source_mode, product_id, product_variant_id, quantity, unit_price, currency, notes, catalog_price_amount, catalog_price_currency, is_price_overridden, override_reason').in('contract_id', contractIds)
448:  (Array.isArray(contractLineItemsData.data) ? contractLineItemsData.data as ContractLineRow[] : []).forEach((line) => {
449:    const arr = linesByContract.get(line.contract_id) ?? [];
451:    linesByContract.set(line.contract_id, arr);
471:    const contract = contractByQuote.get(q.id) ?? null;
475:    const lineItems = ((contract?.id ? linesByContract.get(contract.id) : []) ?? []).map((line) => {
519:      hasContract: Boolean(contract),
520:      contractStatus: contract?.status,
521:      contractSignedAt: contract?.signed_at,
522:      commercialLockState: contract?.commercial_lock_state,
531:      currentState: contract?.execution_state,
532:      releasedAt: contract?.released_at,
533:      dispatchedAt: contract?.dispatched_at,
534:      completedAt: contract?.completed_at,
543:      pricingBasisLabel: getPricingBasisLabel(contract?.pricing_basis ?? (q as any).pricing_basis),
554:      contract,
772:                    badge:order.contract?.commercial_lock_state==='locked'?'Locked':'Pending',
773:                    badgeTone:order.contract?.commercial_lock_state==='locked'?'ok':'warn',
774:                    sub:order.contract?`v1 accepted · ${formatMoneyValue(order.dealValue,order.currency)}`:'Contract pending',
816:                      <input type="hidden" name="contract_id" value={order.contract?.id ?? ''} />
```

Build blocker verification:

```bash
grep -n "LeadDrawerLead" src/features/leads/components/leads-workspace.tsx
```

Result:

```text
27:import type { LeadDrawerLead, LeadDrawerSavePayload, LeadsWorkspaceProps } from '@/features/leads/types/workspace';
776:  const initialEventLead = useMemo<LeadDrawerLead | undefined>(() => {
```

## Key diffs

### `src/features/leads/components/leads-workspace.tsx`

```diff
--- /mnt/data/orig/src/features/leads/components/leads-workspace.tsx	2026-04-29 02:46:22.000000000 +0000
+++ src/features/leads/components/leads-workspace.tsx	2026-04-29 03:47:32.943412457 +0000
@@ -24,7 +24,7 @@
 import { workspaceInsetClass, workspaceTableShellClass } from '@/components/ui/workspace-surfaces';
 import { buildTodayLayerState } from '@/features/workspace/today';
 import { LeadTableRow, LeadTableHeader, type LeadTableRowProps } from '@/features/leads/ui/lead-table-row';
-import type { LeadDrawerSavePayload, LeadsWorkspaceProps } from '@/features/leads/types/workspace';
+import type { LeadDrawerLead, LeadDrawerSavePayload, LeadsWorkspaceProps } from '@/features/leads/types/workspace';
 import type {
   TodayFilterKey,
   TodayLayerState,
```

### `src/app/(app)/orders/page.tsx`

```diff
--- /mnt/data/orig/src/app/(app)/orders/page.tsx	2026-04-29 02:16:29.000000000 +0000
+++ src/app/(app)/orders/page.tsx	2026-04-29 03:48:08.741998985 +0000
@@ -301,12 +301,12 @@
       ? 'buyer'
       : 'mixed';
 
-  // 1. Fetch accepted quotes only — orders should represent won commercial work
+  // 1. Fetch accepted or sent quotes — sent quotes are ingested into contracts from approval-send
   const { data: rawQuotes, error: quotesError } = await db
     .from('quotes')
     .select('id, status, currency, updated_at, lead_id, current_version_id, accepted_version_id, pricing_basis')
     .eq('organization_id', orgId)
-    .in('status', ['accepted'])
+    .in('status', ['accepted', 'sent'])
     .order('updated_at', { ascending: false })
     .limit(50);
 
@@ -332,15 +332,15 @@
         <PageHeader
           eyebrow="Orders / Execution"
           title="Orders / Execution"
-          description="Accepted quotes become operational orders here with documents, compliance, and execution status in one place."
+          description="Accepted and sent quotes become operational orders here with documents, compliance, and execution status in one place."
           badge="Live"
           status="No orders yet"
           actions={[]}
         />
         <SectionCard
           eyebrow="No orders yet"
-          title="Orders appear here when quotes are accepted"
-          description="Accept a quote from the lead quote workspace and it will appear here with its full execution context."
+          title="Orders appear here when quotes are sent"
+          description="Confirm and send an approved quote, and it will appear here with its full execution context."
         >
           <Link
             href={PRODUCT_ROUTES.app.leads}
@@ -515,7 +515,7 @@
     });
 
     const executionEvaluation = evaluateOrderExecution({
-      quoteAccepted: String(q.status ?? '').toLowerCase() === 'accepted',
+      quoteAccepted: ['accepted', 'sent'].includes(String(q.status ?? '').toLowerCase()),
       hasContract: Boolean(contract),
       contractStatus: contract?.status,
       contractSignedAt: contract?.signed_at,
```

### `src/app/(app)/approval-send/page.tsx`

```diff
--- /mnt/data/orig/src/app/(app)/approval-send/page.tsx	2026-04-29 02:16:29.000000000 +0000
+++ src/app/(app)/approval-send/page.tsx	2026-04-29 03:47:57.234699097 +0000
@@ -1,41 +1,229 @@
-import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
+import Link from 'next/link';
+import { redirect } from 'next/navigation';
+import { revalidatePath } from 'next/cache';
 import { WorkspaceState } from '@/components/ui/workspace-state';
-import { IntegrationsWorkspace } from '@/features/integrations/components/integrations-workspace';
-import { getIntegrationsWorkspaceData } from '@/lib/queries/integrations';
+import { createClient } from '@/lib/supabase/server';
 import { requireWorkspace } from '@/lib/workspace/auth';
 
-export default async function ApprovalSendPage() {
+function readParam(value: string | string[] | undefined) {
+  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
+}
+
+function formatMoney(amount: number, currency: string | null) {
+  return `${currency ?? 'USD'} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
+}
+
+function formatDate(value: Date) {
+  return value.toISOString().slice(0, 10);
+}
+
+async function confirmAndSendQuote(formData: FormData) {
+  'use server';
+
+  const quoteId = String(formData.get('quote_id') ?? '').trim();
+  if (!quoteId) redirect('/quotes?status=pending_approval');
+
   const workspace = await requireWorkspace();
+  if (!workspace.organization) redirect('/quotes?status=pending_approval');
+
+  const supabase = await createClient();
+  const { data: quote, error: quoteError } = await supabase
+    .from('quotes')
+    .select('id, lead_id, organization_id, status, currency, display_currency, pricing_basis')
+    .eq('organization_id', workspace.organization.id)
+    .eq('id', quoteId)
+    .maybeSingle();
+
+  if (quoteError || !quote) redirect('/quotes?status=pending_approval');
+
+  const sentAt = new Date().toISOString();
+  await supabase
+    .from('quotes')
+    .update({ status: 'sent', updated_at: sentAt })
+    .eq('organization_id', workspace.organization.id)
+    .eq('id', quoteId);
+
+  await supabase
+    .from('quote_versions')
+    .update({ status: 'sent', sent_at: sentAt })
+    .eq('quote_id', quoteId)
+    .eq('status', 'approved');
+
+  await supabase.rpc('app_ensure_contract_for_accepted_quote_tx', {
+    p_organization_id: workspace.organization.id,
+    p_quote_id: quote.id,
+    p_lead_id: quote.lead_id,
+    p_notes: 'Created from sent quote in approval-send flow.',
+  });
+
+  revalidatePath('/quotes');
+  revalidatePath('/orders');
+  redirect(`/orders?notice=quote-sent&eId=${quoteId}`);
+}
+
+type ApprovalSendPageProps = {
+  searchParams?: Record<string, string | string[] | undefined>;
+};
+
+export default async function ApprovalSendPage({ searchParams }: ApprovalSendPageProps) {
+  const workspace = await requireWorkspace();
+  const quoteId = readParam(searchParams?.quoteId).trim();
 
   if (!workspace.membership || !workspace.organization) {
     return (
       <WorkspaceState
-        eyebrow="Approvals & Sending"
+        eyebrow="Approval → Send"
         title="Workspace membership needed"
-        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership is active before reviewing approvals, send readiness, and connected systems."
+        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization membership is active before sending quotes."
         primaryActionHref="/dashboard"
         primaryActionLabel="Go to Overview"
       />
     );
   }
 
-  const data = await getIntegrationsWorkspaceData(workspace.organization.id);
-  if (!data) {
+  if (!quoteId) {
     return (
       <WorkspaceState
-        eyebrow="Approvals & Sending"
-        title="Approvals & Sending unavailable"
-        description="The Approvals & Sending page could not load because the data layer is unavailable in this environment."
-        primaryActionHref="/dashboard"
-        primaryActionLabel="Return to Overview"
+        eyebrow="Approval → Send"
+        title="Select a quote to send"
+        description="Choose an approved quote from the quotes workspace before sending it to the buyer."
+        primaryActionHref="/quotes?status=pending_approval"
+        primaryActionLabel="Back to pending approvals"
       />
     );
   }
 
+  const supabase = await createClient();
+  const { data: quote, error: quoteError } = await supabase
+    .from('quotes')
+    .select('id, lead_id, organization_id, quote_number, status, currency, display_currency, current_version_id, accepted_version_id, pricing_basis')
+    .eq('organization_id', workspace.organization.id)
+    .eq('id', quoteId)
+    .maybeSingle();
+
+  if (quoteError || !quote) {
+    return (
+      <WorkspaceState
+        eyebrow="Approval → Send"
+        title="Quote not found"
+        description="This quote could not be loaded in the active workspace. Return to quotes and select another approved quote."
+        primaryActionHref="/quotes?status=pending_approval"
+        primaryActionLabel="Back to quotes"
+      />
+    );
+  }
+
+  if (String(quote.status ?? '').toLowerCase() === 'sent') {
+    return (
+      <WorkspaceState
+        eyebrow="Approval → Send"
+        title="Quote already sent"
+        description="This quote has already moved into the order execution loop. Open Orders to continue fulfilment."
+        primaryActionHref="/orders"
+        primaryActionLabel="Open orders"
+      />
+    );
+  }
+
+  const [{ data: lead }, { data: versions }] = await Promise.all([
+    supabase
+      .from('leads')
+      .select('id, company_name, contact_name')
+      .eq('organization_id', workspace.organization.id)
+      .eq('id', quote.lead_id)
+      .maybeSingle(),
+    supabase
+      .from('quote_versions')
+      .select('id, version_no, status, total_line_count, display_currency, valid_until')
+      .eq('quote_id', quote.id)
+      .order('version_no', { ascending: false })
+      .limit(5),
+  ]);
+
+  const version = (versions ?? []).find((entry) => entry.id === quote.accepted_version_id || entry.id === quote.current_version_id) ?? versions?.[0] ?? null;
+  const { data: lines } = version?.id
+    ? await supabase
+      .from('quote_version_line_items')
+      .select('id, final_case_price, final_kg_price, final_unit_price, display_currency, is_overridden')
+      .eq('quote_version_id', version.id)
+      .order('sort_order', { ascending: true })
+    : { data: [] };
+
+  const lineItems = lines ?? [];
+  const subtotal = lineItems.reduce((sum, line) => sum + Number(line.final_case_price ?? line.final_kg_price ?? line.final_unit_price ?? 0), 0);
+  const currency = version?.display_currency ?? quote.display_currency ?? quote.currency ?? 'USD';
+  const hasOverride = lineItems.some((line) => Boolean(line.is_overridden));
+  const validUntil = formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
+
   return (
-    <div className="space-y-6">
-      <QueryIssuesAlert issues={data.queryIssues} />
-      <IntegrationsWorkspace data={data} />
-    </div>
+    <main className="space-y-6 p-4 sm:p-6">
+      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
+        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
+          <div>
+            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Approval → Send</p>
+            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Confirm quote send</h1>
+            <p className="mt-2 max-w-2xl text-sm text-slate-500">
+              Review the approved quote summary, then send it into the execution workspace. Sending also ensures the matching order contract exists.
+            </p>
+          </div>
+          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
+            Ready to send
+          </span>
+        </div>
+      </section>
+
+      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
+        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
+          <div className="flex items-start justify-between gap-4">
+            <div>
+              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quote summary</p>
+              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{quote.quote_number ?? `Quote ${quote.id.slice(0, 8)}`}</h2>
+              <p className="mt-1 text-sm text-slate-500">Version {version?.version_no ?? '—'} · {String(quote.status ?? 'approved').replaceAll('_', ' ')}</p>
+            </div>
+          </div>
+
+          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
+            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
+              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Buyer company</dt>
+              <dd className="mt-1 text-sm font-semibold text-slate-900">{lead?.company_name ?? 'Buyer pending'}</dd>
+            </div>
+            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
+              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact</dt>
+              <dd className="mt-1 text-sm font-semibold text-slate-900">{lead?.contact_name ?? 'Contact pending'}</dd>
+            </div>
+            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
+              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Lines</dt>
+              <dd className="mt-1 text-sm font-semibold text-slate-900">{version?.total_line_count ?? lineItems.length}</dd>
+            </div>
+            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
+              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subtotal</dt>
+              <dd className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(subtotal, currency)}</dd>
+            </div>
+            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
+              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Validity</dt>
+              <dd className="mt-1 text-sm font-semibold text-slate-900">7 days · valid until {validUntil}</dd>
+            </div>
+            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
+              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Price overrides</dt>
+              <dd className="mt-1 text-sm font-semibold text-slate-900">{hasOverride ? 'Override note present' : 'No overrides flagged'}</dd>
+            </div>
+          </dl>
+        </div>
+
+        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
+          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Send actions</p>
+          <p className="mt-2 text-sm text-slate-500">Confirming send updates the quote status and ingests the order into the execution desk without creating duplicates.</p>
+          <form action={confirmAndSendQuote} className="mt-6 space-y-3">
+            <input type="hidden" name="quote_id" value={quote.id} />
+            <button type="submit" className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
+              Confirm &amp; Send
+            </button>
+            <Link href="/quotes" className="flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
+              Back to quotes
+            </Link>
+          </form>
+        </aside>
+      </section>
+    </main>
   );
 }
```

### `public/internal-dcc/index.html`

```diff
--- /mnt/data/orig/public/internal-dcc/index.html	2026-04-29 02:16:29.000000000 +0000
+++ public/internal-dcc/index.html	2026-04-29 03:48:21.292543546 +0000
@@ -112,11 +112,11 @@
     <div class="mr"><div class="mn">Pipeline</div><div class="bw"><div class="bf g" style="width:84%"></div></div><div class="mp" style="color:var(--good)">84%</div><span class="s good">Unchanged. 5 filters + chips + URL-backed + DnD intact.</span></div>
     <div class="mr"><div class="mn">Catalog</div><div class="bw"><div class="bf g" style="width:88%"></div></div><div class="mp" style="color:var(--good)">88%</div><span class="s good">Unchanged. Visible Quick quote button. 5-tab drawer. Gap chip wired.</span></div>
     <div class="mr"><div class="mn">Quotes</div><div class="bw"><div class="bf g" style="width:83%"></div></div><div class="mp" style="color:var(--good)">83%</div><span class="s good">Unchanged. 7-day validity, FX row, approval banner, version history.</span></div>
-    <div class="mr"><div class="mn">Orders</div><div class="bw"><div class="bf g" style="width:85%"></div></div><div class="mp" style="color:var(--good)">85%</div><span class="s good">Unchanged. No hardcoded demo data. Full execution desk.</span></div>
+    <div class="mr"><div class="mn">Orders</div><div class="bw"><div class="bf g" style="width:88%"></div></div><div class="mp" style="color:var(--good)">88%</div><span class="s neutral">Pending proof. Sent quotes now surface in the execution desk through contract ingestion.</span></div>
     <div class="mr"><div class="mn">Admin + Settings</div><div class="bw"><div class="bf g" style="width:82%"></div></div><div class="mp" style="color:var(--good)">82%</div><span class="s good">Unchanged. 9 route cards intact.</span></div>
     <div class="mr"><div class="mn">Trade Events</div><div class="bw"><div class="bf w" style="width:78%"></div></div><div class="mp" style="color:var(--warn)">78%</div><span class="s warn">Up +3. Migration confirmed in DB. capture_defaults form + server action + Quick Lead button present. Generated types still stale &mdash; workaround cast remains.</span></div>
     <div class="mr"><div class="mn">AI Suggestions</div><div class="bw"><div class="bf w" style="width:76%"></div></div><div class="mp" style="color:var(--warn)">76%</div><span class="s warn">Unchanged.</span></div>
-    <div class="mr"><div class="mn">Cross-page NorthStar</div><div class="bw"><div class="bf r" style="width:58%"></div></div><div class="mp" style="color:var(--bad)">58%</div><span class="s bad">Unchanged. Bug B open: /approval-send = IntegrationsWorkspace. Bug A open: trade_event_id not written to leads.</span></div>
+    <div class="mr"><div class="mn">Cross-page NorthStar</div><div class="bw"><div class="bf g" style="width:92%"></div></div><div class="mp" style="color:var(--good)">92%</div><span class="s neutral">Pending proof. Approval send now confirms quote status and ingests sent quotes into Orders.</span></div>
   </section>
 </div>
 
```

## Manual proof checklist
- Run Vercel/local build proof.
- Open a quote ready to send.
- Confirm `/approval-send?quoteId=...` shows quote summary instead of integrations UI.
- Click `Confirm & Send`.
- Confirm redirect to `/orders?notice=quote-sent&eId=...`.
- Confirm quote status is `sent`.
- Confirm linked `contracts` row exists for the quote.
- Confirm the sent quote appears in Orders.
