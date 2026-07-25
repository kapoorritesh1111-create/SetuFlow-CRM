import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  derivePackagingDesignReadiness,
  packagingProductNeedsDesign,
  productionStageRequiresReadyDesign,
} from '../../src/lib/packaging/design-proof';

function proof(input: { status: 'pending' | 'approved' | 'rejected'; design_source: 'customer_provided' | 'design_team' }) {
  return { id: 'proof-1', ...input };
}

describe('packaging design readiness', () => {
  test('requires design evidence when no proof exists', () => {
    assert.deepEqual(derivePackagingDesignReadiness(null), {
      ready: false,
      status: 'required',
      source: null,
      proofStatus: null,
      proofId: null,
    });
  });

  test('customer-provided artwork is production-ready unless rejected', () => {
    assert.equal(derivePackagingDesignReadiness(proof({ status: 'approved', design_source: 'customer_provided' })).ready, true);
    assert.equal(derivePackagingDesignReadiness(proof({ status: 'pending', design_source: 'customer_provided' })).ready, true);
    assert.equal(derivePackagingDesignReadiness(proof({ status: 'rejected', design_source: 'customer_provided' })).status, 'revision_required');
  });

  test('Design Team artwork requires approval', () => {
    assert.equal(derivePackagingDesignReadiness(proof({ status: 'pending', design_source: 'design_team' })).status, 'in_review');
    assert.equal(derivePackagingDesignReadiness(proof({ status: 'approved', design_source: 'design_team' })).ready, true);
    assert.equal(derivePackagingDesignReadiness(proof({ status: 'rejected', design_source: 'design_team' })).status, 'revision_required');
  });

  test('recognizes packaging production products and excludes generic add-on charges', () => {
    assert.equal(packagingProductNeedsDesign({ product_family_code: 'digital_labels' }), true);
    assert.equal(packagingProductNeedsDesign({ sku: 'SP-PREPRESS' }), true);
    assert.equal(packagingProductNeedsDesign({ enabled_capabilities: ['artwork_approval'] }), true);
    assert.equal(packagingProductNeedsDesign({ sku: 'SP-ADDONS', product_family_code: 'packaging_addons' }), false);
  });

  test('pre-press can start without final design but Printing and later cannot', () => {
    assert.equal(productionStageRequiresReadyDesign('pre_press'), false);
    assert.equal(productionStageRequiresReadyDesign('printing'), true);
    assert.equal(productionStageRequiresReadyDesign('qc'), true);
    assert.equal(productionStageRequiresReadyDesign('dispatched'), true);
  });
});
