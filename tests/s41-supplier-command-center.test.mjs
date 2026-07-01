import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const buyerDetail = read('src/features/leads/components/buyer-detail-page.tsx');
const supplierCenter = read('src/features/leads/components/supplier-command-center.tsx');
const supplierWorkflow = read('src/lib/supplier-workflow.ts');
const migration = read('supabase/migrations/20260701015000_s41_supplier_document_requirement_rules.sql');

test('S41-SUP-010 lead detail branches supplier records to supplier command center', () => {
  assert.match(buyerDetail, /lead\?\.lead_type === 'supplier'/);
  assert.match(buyerDetail, /<SupplierCommandCenter data=\{data\} \/>/);
  assert.match(buyerDetail, /data-s41-buyer-command-center="true"/);
  assert.match(supplierCenter, /data-s41-supplier-command-center="true"/);
  assert.match(supplierCenter, /SupplierCommandCenter/);
  assert.match(supplierCenter, /Capability/);
  assert.match(supplierCenter, /Cost Requests/);
  assert.match(supplierCenter, /Linked Demand/);
});

test('S41-SUP-011 and S41-SUP-012 supplier documents and readiness are supplier native', () => {
  for (const code of [
    'SUPPLIER_PROFILE',
    'BUSINESS_REGISTRATION',
    'FACTORY_PROFILE',
    'QUALITY_CERTIFICATIONS',
    'PAYMENT_TERMS',
    'INCOTERMS_CAPABILITY',
    'SAMPLE_APPROVAL',
    'SUPPLIER_APPROVAL_NOTE',
  ]) {
    assert.match(migration, new RegExp(code));
  }
  assert.match(migration, /lead_type,\n  progression_scope/);
  assert.match(migration, /'supplier'/);
  assert.match(supplierWorkflow, /getSupplierComplianceReadiness/);
  assert.match(supplierWorkflow, /missingMandatory/);
  assert.match(supplierCenter, /Approval blocked/);
});

test('S41-SUP-013 through S41-SUP-017 supplier approval, cost request, responses, offers and demand linkage are represented', () => {
  assert.match(supplierWorkflow, /getSupplierApprovalState/);
  assert.match(supplierWorkflow, /getSupplierResponseRows/);
  assert.match(supplierWorkflow, /getSupplierOfferComparison/);
  assert.match(supplierWorkflow, /getSupplierDemandMatches/);
  assert.match(supplierCenter, /Request Cost/);
  assert.match(supplierCenter, /supplier responses/);
  assert.match(supplierCenter, /Offer comparison/);
  assert.match(supplierCenter, /buyer demand/);
  assert.doesNotMatch(supplierCenter, /Open quote workspace/);
});
