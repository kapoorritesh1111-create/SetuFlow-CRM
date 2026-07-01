import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const supplierInsights = read('src/lib/supplier-insights.ts');
const supplierDashboardPage = read('src/app/(app)/dashboard/supplier-insights/page.tsx');
const supplierReportsPage = read('src/app/(app)/reports/suppliers/page.tsx');
const guruSupplierContext = read('src/lib/setu-guru/supplier-context.ts');

test('S41-SUP-018 supplier performance KPIs are modeled', () => {
  assert.match(supplierInsights, /calculateSupplierPerformanceKpis/);
  assert.match(supplierInsights, /approvedSuppliers/);
  assert.match(supplierInsights, /readinessPercent/);
  assert.match(supplierInsights, /activeCostRequests/);
  assert.match(supplierInsights, /atRiskSuppliers/);
});

test('S41-SUP-019 and S41-SUP-020 supplier dashboard metrics and funnel are visible', () => {
  assert.match(supplierDashboardPage, /data-s41-supplier-dashboard-insights="true"/);
  assert.match(supplierDashboardPage, /Supplier Insights/);
  assert.match(supplierDashboardPage, /Supplier analytics funnel/);
  assert.match(supplierInsights, /buildSupplierAnalyticsFunnel/);
  assert.match(supplierInsights, /Suppliers Captured/);
  assert.match(supplierInsights, /Cost \/ Sample Requested/);
  assert.match(supplierInsights, /Approved Supplier/);
});

test('S41-SUP-021 supplier sourcing reports are owner-facing and supplier-native', () => {
  assert.match(supplierReportsPage, /data-s41-supplier-sourcing-reports="true"/);
  assert.match(supplierReportsPage, /Supplier Reports/);
  assert.match(supplierReportsPage, /Document Readiness/);
  assert.match(supplierReportsPage, /Cost Requests/);
  assert.match(supplierReportsPage, /Demand Link Value/);
  assert.match(supplierInsights, /buildSupplierSourcingReportRows/);
});

test('S41-SUP-022 Setu Guru supplier context uses supplier actions, not buyer quote actions', () => {
  assert.match(guruSupplierContext, /buildSetuGuruSupplierContext/);
  assert.match(guruSupplierContext, /Request Cost/);
  assert.match(guruSupplierContext, /Link to Demand/);
  assert.match(guruSupplierContext, /leads\.lead_type=supplier/);
  assert.doesNotMatch(guruSupplierContext, /Open quote workspace/);
});
