# CHANGES.md

PR: PR-FIX-TYPEHACKS
Status: Pending proof

## Files modified
- src/features/leads/types/workspace.ts
- src/features/leads/components/leads-workspace.tsx
- src/app/(app)/leads/page.tsx

## Notes
- Added typed initialEventId support to LeadsWorkspaceProps.
- Removed the leads/page.tsx initialEventId `as any` bypass.
- Wired trade event Quick Lead context into the new-lead drawer boundary without touching lead-drawer.tsx, which was outside the allowed file list.
- DCC was not edited because public/internal-dcc/index.html was not in the allowed files list for this surgical PR.
- No npm commands were run.

## Verification
```bash
$ grep -n "initialEventId" src/features/leads/types/workspace.ts
106:  initialEventId?: string | null;

$ grep -n "initialEventId" src/features/leads/components/leads-workspace.tsx
278:  initialEventId = null,
777:    if (!initialEventId || drawerState.leadId) return undefined;
798:      trade_event_id: initialEventId,
809:  }, [drawerState.leadId, initialEventId, initialQuickCapture?.sourceLabel, initialQuickCapture?.sourceType]);

$ grep -n "as any" src/app/(app)/leads/page.tsx

$ grep -n "trade_event_id" src/features/leads/components/leads-workspace.tsx
57:  trade_event_id: string | null;
761:            (view.id === 'trade-event' && Boolean(lead.trade_event_id)) ||
798:      trade_event_id: initialEventId,
```

## Diffs

### src/features/leads/types/workspace.ts
```diff
--- /tmp/workspace.ts.orig	2026-04-29 02:44:19.131860288 +0000
+++ src/features/leads/types/workspace.ts	2026-04-29 02:45:03.255526615 +0000
@@ -103,6 +103,7 @@
   initialTodayState?: TodayLayerState;
   storageKey?: string;
   initialQuickCapture?: LeadQuickCapturePrefill | null;
+  initialEventId?: string | null;
 };
 
 export type LeadDrawerLead = Pick<LeadRow,
```

### src/features/leads/components/leads-workspace.tsx
```diff
--- /tmp/leads-workspace.tsx.orig	2026-04-29 02:44:19.151854285 +0000
+++ src/features/leads/components/leads-workspace.tsx	2026-04-29 02:46:22.453492951 +0000
@@ -275,6 +275,7 @@
   readOnlyMessage = null,
   isWorkspaceEmpty = false,
   initialQuickCapture = null,
+  initialEventId = null,
 }: LeadsWorkspaceProps) {
   const router = useRouter();
   const pathname = usePathname();
@@ -771,6 +772,42 @@
     return workspaceLeads.find((lead) => lead.id === drawerState.leadId);
   }, [drawerState.leadId, workspaceLeads]);
 
+
+  const initialEventLead = useMemo<LeadDrawerLead | undefined>(() => {
+    if (!initialEventId || drawerState.leadId) return undefined;
+    return {
+      id: '',
+      company_name: '',
+      contact_name: null,
+      job_title: null,
+      email: null,
+      phone: null,
+      phone_secondary: null,
+      lead_type: 'buyer',
+      country: null,
+      country_id: null,
+      source_type: initialQuickCapture?.sourceType ?? null,
+      source_label: initialQuickCapture?.sourceLabel ?? null,
+      next_follow_up_at: null,
+      created_at: null,
+      updated_at: null,
+      last_contacted_at: null,
+      stage_id: null,
+      next_step_id: null,
+      owner_user_id: null,
+      trade_event_id: initialEventId,
+      notes: null,
+      website: null,
+      social_handle: null,
+      deal_value: null,
+      deal_currency: null,
+      pipeline_id: null,
+      intro_sent: false,
+      phone_country_code: null,
+      phone_secondary_country_code: null,
+    };
+  }, [drawerState.leadId, initialEventId, initialQuickCapture?.sourceLabel, initialQuickCapture?.sourceType]);
+
   const spotlightLead = useMemo(() => {
     const preferredId = spotlightLeadId ?? selectedLeadIds[0] ?? sortedLeads[0]?.id ?? null;
     return sortedLeads.find((lead) => lead.id === preferredId) ?? sortedLeads[0];
@@ -1029,7 +1066,7 @@
     setDrawerState((current) => (current.open ? current : { open: true, mode: 'quick', leadId: null, initialStepId: 'basics' }));
     const params = new URLSearchParams(searchParams.toString());
     let changed = false;
-    for (const key of ['quickLead', 'autoQuote', 'productId', 'sourceType', 'sourceLabel']) {
+    for (const key of ['quickLead', 'autoQuote', 'productId', 'sourceType', 'sourceLabel', 'eventId']) {
       if (params.has(key)) {
         params.delete(key);
         changed = true;
@@ -1438,7 +1475,7 @@
           setActiveView('quote');
         }}
         mode={drawerState.mode}
-        lead={drawerState.leadId ? selectedLead : undefined}
+        lead={drawerState.leadId ? selectedLead : initialEventLead}
         title={drawerState.leadId ? 'Edit Lead' : drawerState.mode === 'quick' ? 'Quick Add Lead' : 'Full Add Lead'}
         currentUserId={currentUserId}
         stages={stages}
```

### src/app/(app)/leads/page.tsx
```diff
--- /tmp/leads-page.tsx.orig	2026-04-29 02:44:19.170294274 +0000
+++ src/app/(app)/leads/page.tsx	2026-04-29 02:45:03.433231523 +0000
@@ -114,7 +114,7 @@
         initialLeadType={viewModel.initialLeadType}
         initialTodayState={viewModel.todayState}
         initialQuickCapture={initialQuickCapture}
-        {...({ initialEventId: eventId || null } as any)}
+        initialEventId={eventId || null}
       />
     </div>
   );
```
