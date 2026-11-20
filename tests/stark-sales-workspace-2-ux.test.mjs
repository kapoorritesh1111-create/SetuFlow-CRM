import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const router=read('src/components/layout/authenticated-shell-router.tsx');
const inbound=read('src/app/(app)/leads/inbound/page.tsx');
const conversation=read('src/features/integrations/interakt/components/inbound-conversation-panel.tsx');
const owner=read('src/app/(app)/leads/sales-activity/SalesActivityView.tsx');
const ownerServer=read('src/app/(app)/leads/sales-activity/owner-activity-data.tsx');
const dashboard=read('src/app/(app)/dashboard/page.tsx');
const api=read('src/app/api/stark/customer-lookup/route.ts');
const crm=read('src/features/leads/components/workspace/leads-workspace-implementation.tsx');
test('one AppShell for Stark and all organizations; no special Stark shell',()=>{
 assert.doesNotMatch(router,/StarkSalesShell/);
 assert.match(router,/<AppShell \{\.\.\.props\}/);
 assert.equal(existsSync('src/components/layout/stark-sales-shell.tsx'),false);
});
test('Stark owners see role-scoped command center inside existing dashboard',()=>{
 assert.match(dashboard,/ownerRole/);
 assert.match(dashboard,/StarkSalesActivityDashboard/);
 assert.match(dashboard,/DashboardSectionTabs/);
 assert.doesNotMatch(dashboard,/redirect\('\/leads\/sales-activity'\)/);
 assert.match(owner,/Owner Command Center/);
 assert.match(ownerServer,/ownerReviewRows/);
});
test('inbound preserves context and avoids duplicate action toolbar',()=>{
 assert.match(inbound,/Work queues/);
 assert.match(inbound,/CrossModuleCustomerMatches/);
 assert.match(inbound,/<FilterBar searchParams=\{searchParams\}/);
 assert.doesNotMatch(inbound,/<nav aria-label="Customer actions"/);
 assert.match(conversation,/Conversation intelligence/);
 assert.match(conversation,/Setu Guru understood/);
 assert.match(conversation,/latestCustomerMessage/);
 assert.match(conversation,/<details open/);
});
test('existing inbound and CRM search fields show permission-scoped cross-module matches',()=>{
 assert.match(crm,/localSearch/);
 assert.match(crm,/CrossModuleCustomerMatches query=\{localSearch\}/);
 assert.match(api,/organization_id',STARK/);
 assert.match(api,/setu_assigned_user_id',workspace.user.id/);
 assert.match(api,/owner_user_id',workspace.user.id/);
});
test('current owner Won and Lost are separate from historical stage-change actor attribution',()=>{
 assert.match(ownerServer,/wonCurrent/);
 assert.match(ownerServer,/lostCurrent/);
 assert.match(ownerServer,/convertedWon/);
 assert.match(ownerServer,/changed_by/);
 assert.match(owner,/Won now/);
 assert.match(owner,/Converted → Won/);
});


test('quote number and linked inbound id use scoped lookup without a new customer page',()=>{
 const api=read('src/app/api/stark/customer-lookup/route.ts');
 assert.match(api,/quote_number/);
 assert.match(api,/qualified_lead_id/);
 assert.match(api,/owner_user_id/);
 const legacy=read('src/app/(app)/leads/customer-search/page.tsx');
 assert.ok(legacy.includes("redirect('/leads'"));
});
test('Won drill-down identifies current owner and qualified-inbound linkage',()=>{
 const owner=read('src/app/(app)/leads/sales-activity/SalesActivityView.tsx');
 const source=read('src/app/(app)/leads/sales-activity/owner-activity-data.tsx');
 assert.match(owner,/visibleOutcomeRows/);
 assert.match(owner,/Current owner/);
 assert.match(source,/convertedFromInbound/);
 assert.match(source,/uniqueConvertedLeadIds/);
});
