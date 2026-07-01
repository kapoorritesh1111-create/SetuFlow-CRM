import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const journey = read('src/lib/journey.ts');
const workflow = read('src/lib/lead-workflow.ts');
const productMarketsSection = read('src/features/leads/components/ProductMarketsSection.tsx');

test('S41 supplier terminology uses sourcing-native labels instead of buyer quote labels', () => {
  assert.match(journey, /export const JOURNEY_TERMINOLOGY/);
  assert.match(journey, /supplier:[\s\S]*primaryRequestLabel: 'Cost Request'/);
  assert.match(journey, /supplier:[\s\S]*primaryOfferLabel: 'Supplier Offer'/);
  assert.match(journey, /supplier:[\s\S]*positiveStageLabel: 'Approved Supplier'/);
  assert.match(journey, /supplier:[\s\S]*primaryActionLabel: 'Request Cost'/);
  assert.match(journey, /supplier:[\s\S]*documentActionLabel: 'Request Documents'/);
  assert.match(journey, /supplier:[\s\S]*commandCenterTitle: 'Supplier sourcing command center'/);
});

test('S41 supplier workflow metadata supports all package capability fields', () => {
  for (const field of [
    'category',
    'moq',
    'productionCapacity',
    'leadTime',
    'paymentTerms',
    'incoterms',
    'exportMarkets',
    'riskStatus',
    'approvalStatus',
    'reliabilityScore',
    'qualityScore',
    'responseTimeScore',
  ]) {
    assert.match(workflow, new RegExp(field));
  }
  assert.match(workflow, /supplierCapability: SupplierCapabilityMetadata/);
  assert.match(workflow, /parseSupplierCapabilityFromNotes/);
  assert.match(workflow, /mergeSupplierCapabilityIntoNotes/);
  assert.match(workflow, /SETU_LEAD_WORKFLOW/);
});

test('S41 supplier drawer renders capability section only when lead_type is supplier', () => {
  assert.match(productMarketsSection, /readDrawerInputValue\('lead_type'\)/);
  assert.match(productMarketsSection, /leadType === 'supplier'/);
  assert.match(productMarketsSection, /data-s41-supplier-capability-section="true"/);
  assert.match(productMarketsSection, /MOQ/);
  assert.match(productMarketsSection, /Production capacity/);
  assert.match(productMarketsSection, /Payment terms/);
  assert.match(productMarketsSection, /Incoterms/);
  assert.match(productMarketsSection, /Export markets/);
  assert.match(productMarketsSection, /Supplier only/);
});
