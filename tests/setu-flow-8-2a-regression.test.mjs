import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('8.2A Quick Lead keeps new buyer on coverage path before quote creation', () => {
  const leadWorkspace = read('src/features/leads/components/leads-workspace.tsx');
  assert.match(leadWorkspace, /needsCoverageAfterQuickLead/);
  assert.match(leadWorkspace, /initialStepId: 'coverage'/);
  assert.match(leadWorkspace, /Open coverage manager/);
  assert.match(leadWorkspace, /React\.useState\(\(\) => selectedProductIds\.length \? 1 : 0\)/);
  assert.match(leadWorkspace, /Select at least one product before pricing/);
});

test('8.2A quote-to-order handoff never passes quote id as openOrderId', () => {
  const quotesPage = read('src/app/(app)/quotes/page.tsx');
  const quoteActions = read('src/features/quotes/server/actions.ts');
  const legacyOrdersPage = read('src/app/(app)/orders/page.tsx');
  assert.doesNotMatch(quotesPage, /openOrderId:selected\.id/);
  assert.doesNotMatch(quotesPage, /openOrderId=\$\{quoteId\}/);
  assert.match(quotesPage, /sourceQuoteId:selected\.id/);
  assert.match(quotesPage, /result\.record\?\.orderId/);
  assert.match(quoteActions, /record: \{ quoteId, orderId:/);
  assert.match(legacyOrdersPage, /sourceQuoteId=\$\{order\.quoteId\}/);
});

test('8.2A Proforma and Order Confirmation preview use ordered quantity snapshot', () => {
  const previewPage = read('src/app/order-documents/preview/[token]/page.tsx');
  assert.match(previewPage, /function documentQuantity\(line: AnyRow, documentType: string\)/);
  assert.match(previewPage, /\['proforma_invoice', 'order_confirmation'\]\.includes\(documentType\)[\s\S]*ordered_quantity \?\? line\.quoted_quantity/);
  assert.match(previewPage, /lineTotal\(line, documentType\)/);
  assert.doesNotMatch(previewPage, /function quantity\(line: AnyRow\)[\s\S]*dispatched_quantity \?\? line\.approved_quantity/);
});

test('8.2A preview-only document flow cannot create approved documents', () => {
  const shareActions = read('src/features/orders/server/share-actions.ts');
  assert.doesNotMatch(shareActions, /findOrCreateApprovedOrderDocument/);
  assert.match(shareActions, /findApprovedOrderDocument/);
  assert.match(shareActions, /initialStatus: 'previewed'/);
  assert.match(shareActions, /order-document-approval-required/);
  assert.match(shareActions, /approved_by: initialStatus === 'approved'/);
  assert.doesNotMatch(shareActions, /status: 'approved',\s*version_no: 1/);
});

test('8.2A order workspace exposes actual line discounts, gates, locks, and closeout', () => {
  const workspace = read('src/features/orders/components/OrdersProductionWorkspace81DRepair3.tsx');
  assert.match(workspace, /stageAllowed/);
  assert.match(workspace, /LockedStage/);
  assert.match(workspace, /saveOrderDiscountAction/);
  assert.match(workspace, /line_discount_type/);
  assert.match(workspace, /savePackingOverridesAction/);
  assert.match(workspace, /saveProcessingCheckAction/);
  assert.match(workspace, /approveDeliveryNoteAction/);
  assert.match(workspace, /Paid & Closed/);
  assert.match(workspace, /payment_received/);
  assert.match(workspace, /Close order/);
});

test('8.2A server actions enforce stage gates before later stages and closeout', () => {
  const stageActions = read('src/features/orders/server/stage-gate-actions.ts');
  const firstDocActions = read('src/features/orders/server/execution-order-actions.ts');
  const invoiceActions = read('src/features/orders/server/dispatch-invoice-gate-actions.ts');
  assert.match(stageActions, /requireApprovedGate/);
  assert.match(stageActions, /first-document-approval-required/);
  assert.match(stageActions, /packing-approval-required/);
  assert.match(stageActions, /processing-approval-required/);
  assert.match(stageActions, /final-invoice-approval-required/);
  assert.match(stageActions, /reconciliation_status/);
  assert.match(stageActions, /documents_archived/);
  assert.match(stageActions, /status: 'completed'/);
  assert.match(firstDocActions, /actual-lines-approval-required/);
  assert.match(invoiceActions, /delivery-note-approval-required/);
  assert.match(invoiceActions, /updateDocumentGate\(formData, 'final_invoice', 'dispatch_invoice'/);
});

test('8.2A order layout carries gate and discount snapshots into UI model', () => {
  const ordersLayout = read('src/app/(app)/orders/layout.tsx');
  assert.match(ordersLayout, /metadata/);
  assert.match(ordersLayout, /approved_at, previewed_at, completed_at/);
  assert.match(ordersLayout, /line_discount_type/);
  assert.match(ordersLayout, /orderDiscountType/);
  assert.match(ordersLayout, /gates: gatesForOrder\.map/);
});
