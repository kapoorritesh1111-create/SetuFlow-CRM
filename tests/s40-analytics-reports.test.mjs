import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analyticsPage = readFileSync('src/app/(app)/dashboard/analytics/page.tsx', 'utf8');
const analyticsQuery = readFileSync('src/lib/queries/analytics.ts', 'utf8');
const reportsPage = readFileSync('src/app/(app)/reports/page.tsx', 'utf8');
const reportsWorkspace = readFileSync('src/features/reports/components/reports-workspace.tsx', 'utf8');

test('Sprint 40 analytics keeps approved premium intelligence layout and icon system', () => {
  for (const expected of [
    'Analytics',
    'Know where your export pipeline is growing, stuck, and ready to convert.',
    'Pipeline Value',
    'Quotes Sent',
    'Conversion Rate',
    'Orders Won',
    'Revenue Won',
    'Conversion Funnel',
    'Pipeline Movement',
    'Top Markets by Pipeline',
    'Top Products by Pipeline',
    'Insights & Anomalies',
    'Market & Region Performance',
    'Movement by business value, not raw stage count.',
  ]) {
    assert.match(analyticsPage, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const iconName of ['TrendingUp', 'Mail', 'Target', 'Trophy', 'CircleDollarSign', 'CalendarDays', 'Users', 'Globe2', 'Download']) {
    assert.match(analyticsPage, new RegExp(`\\b${iconName}\\b`));
  }

  assert.doesNotMatch(analyticsPage, /Funnel stage count/);
});

test('Sprint 40 analytics uses business-backed RFQ, product, stalled, and market growth signals', () => {
  for (const expected of [
    "db.from('rfqs')",
    "db.from('lead_stage_history')",
    'Qualified Leads / RFQs',
    'pipelineMovement',
    'stalled14DaysUsd',
    'stalled14Days',
    'image_url',
    'imageUrl',
    'topMarket',
    'growthPct',
  ]) {
    assert.match(analyticsQuery + analyticsPage, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const banned of ['growth: [22.4, 18.7, 15.6, 14.2, 35]', 'const stalledValue = Math.max(0, (qm.totalSent']) {
    assert.doesNotMatch(analyticsPage, new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('Sprint 40 reports remains an owner-facing business report center', () => {
  assert.doesNotMatch(reportsPage, /ReportsControlsPanel/);

  for (const expected of [
    'Export clean business reports for owners, sales teams, and trade follow-ups.',
    'Reports Generated',
    'Open Quotes',
    'Overdue Follow-ups',
    'Markets Active',
    'Sales Pipeline Report',
    'Quote Aging Report',
    'Product Demand Report',
    'Market Performance Report',
    'Buyer Follow-up Report',
    'Orders & Execution Report',
    'Trade Event ROI Report',
    'Price / Margin Report',
    'Buyer Account Report',
    'Recently Generated Reports',
    'Need help with reports?',
  ]) {
    assert.match(reportsWorkspace, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const iconName of ['FileText', 'FileSpreadsheet', 'Clock3', 'Globe2', 'Filter', 'BarChart3', 'Truck', 'CalendarDays', 'Tag', 'Building2', 'Share2']) {
    assert.match(reportsWorkspace, new RegExp(`\\b${iconName}\\b`));
  }

  for (const banned of ['Consistency check', 'Audit expansion', 'Missing metric context', 'governed workflow surface', 'Dashboard and reports totals stay aligned']) {
    assert.doesNotMatch(reportsWorkspace, new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
