import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const router=read('src/components/layout/authenticated-shell-router.tsx');
const shell=read('src/components/layout/stark-sales-shell.tsx');
const inbound=read('src/app/(app)/leads/inbound/page.tsx');
const conversation=read('src/features/integrations/interakt/components/inbound-conversation-panel.tsx');
const owner=read('src/app/(app)/leads/sales-activity/SalesActivityView.tsx');
const ownerServer=read('src/app/(app)/leads/sales-activity/page.tsx');
const dashboard=read('src/app/(app)/dashboard/page.tsx');
test('Stark-specific navigation is scoped by organization and keeps sales workflows in one shell',()=>{
 assert.match(router,/props.organizationId==='b97913cb-3b95-4247-8ced-ffdc0d392d2a'/);
 assert.ok(router.includes("pathname.startsWith('/leads/')"));
 assert.match(shell,/Owner Command/);
 assert.match(shell,/Inbound/);
 assert.match(shell,/Customers/);
 assert.match(shell,/CRM Leads/);
 assert.match(shell,/Quotations/);
 assert.match(shell,/currentRoles.some/);
});
test('inbound is conversation-first with queue rail and collapsed secondary filters',()=>{
 assert.match(inbound,/My Work Queues/);
 assert.match(inbound,/Advanced filters & inbound statistics/);
 assert.match(inbound,/Owner Command Center/);
 assert.match(conversation,/Customer conversation/);
 assert.match(conversation,/max-h-\[540px\]/);
 assert.doesNotMatch(conversation,/<details className="rounded-card border border-line bg-surface-1 px-3 py-2">/);
});
test('Stark owners land on command center without elevating support users',()=>{
 assert.match(dashboard,/ownerRole/);
 assert.ok(dashboard.includes("redirect('/leads/sales-activity')"));
 assert.match(owner,/Owner Command Center/);
 assert.match(owner,/Sales \/ Field Sales/);
 assert.match(owner,/OwnerReplyReview/);
 assert.match(ownerServer,/ownerReviewRows/);
});
