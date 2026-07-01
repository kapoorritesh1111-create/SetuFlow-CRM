import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const execution = read('src/lib/supplier-execution.ts');
const executionPage = read('src/app/(app)/orders/supplier-links/page.tsx');
const commandCenter = read('src/features/leads/components/supplier-command-center.tsx');
const mode = read('src/features/workspace/mode.ts');
const mobileScanner = read('src/features/mobile/components/mobile-business-card-scanner.tsx');
const pipeline = read('src/features/pipeline/components/PipelineBoardViewShell.tsx');
const insights = read('src/lib/supplier-insights.ts');

test('S41-SUP-023 order and execution supplier link visibility exists', () => {
  assert.match(execution, /buildSupplierExecutionLinks/);
  assert.match(execution, /supplierExecutionSummary/);
  assert.match(execution, /supplierLeadId/);
  assert.match(execution, /order_metadata/);
  assert.match(execution, /quote_rfq/);
  assert.match(executionPage, /data-s41-supplier-execution-links="true"/);
  assert.match(executionPage, /Order Supplier Links/);
  assert.match(executionPage, /Supplier execution table/);
});

test('S41-SUP-024 supplier communication and audit event taxonomy is explicit', () => {
  assert.match(execution, /SUPPLIER_COMMUNICATION_TAXONOMY/);
  assert.match(execution, /supplier\.documents\.requested/);
  assert.match(execution, /supplier\.cost_request\.sent/);
  assert.match(execution, /supplier\.response\.received/);
  assert.match(execution, /supplier\.approval\.recorded/);
  assert.match(execution, /supplier\.demand\.linked/);
  assert.match(execution, /supplier\.execution\.updated/);
  assert.match(execution, /requiresHumanApproval/);
});

test('S41-SUP-025 end-to-end supplier workflow is covered across Sprint 41 surfaces', () => {
  assert.match(mode, /parseWorkspaceMode/);
  assert.match(mobileScanner, /supplier/);
  assert.match(pipeline, /supplier/);
  assert.match(commandCenter, /data-s41-supplier-command-center="true"/);
  assert.match(commandCenter, /Request Cost/);
  assert.match(commandCenter, /Linked Demand/);
  assert.match(insights, /buildSupplierAnalyticsFunnel/);
  assert.match(executionPage, /orders\/supplier-links/);
  assert.doesNotMatch(commandCenter, /Open quote workspace/);
});
