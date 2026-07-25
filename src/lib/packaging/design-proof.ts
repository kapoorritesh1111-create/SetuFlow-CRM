import type { ProductionStage } from '@/lib/packaging/types';

export type PackagingDesignSource = 'customer_provided' | 'design_team';
export type PackagingDesignStatus = 'required' | 'in_review' | 'revision_required' | 'ready';
export type PackagingProofStatus = 'pending' | 'approved' | 'rejected';

export type PackagingDesignProof = {
  id: string;
  organization_id: string;
  quote_line_item_id: string;
  version: number;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: PackagingProofStatus;
  reviewed_at: string | null;
  review_comment: string | null;
  approval_token: string;
  token_expires_at: string;
  design_source: PackagingDesignSource | null;
};

const PACKAGING_ARTWORK_FAMILY_CODES = new Set([
  'digital_labels',
  'shrink_sleeves',
  'flexible_packaging',
  'prototypes_mockups',
  'variable_data_printing',
  'packshots_3d',
  'prepress_artwork',
]);

export function packagingProductNeedsDesign(product: {
  sku?: string | null;
  product_family_code?: string | null;
  enabled_capabilities?: string[] | null;
} | null | undefined): boolean {
  if (!product) return false;
  if (Array.isArray(product.enabled_capabilities) && product.enabled_capabilities.includes('artwork_approval')) return true;
  const family = String(product.product_family_code ?? '').trim().toLowerCase();
  if (PACKAGING_ARTWORK_FAMILY_CODES.has(family)) return true;
  const sku = String(product.sku ?? '').trim().toUpperCase();
  return sku.startsWith('SP-') && sku !== 'SP-ADDONS';
}

export type PackagingDesignReadiness = {
  ready: boolean;
  status: PackagingDesignStatus;
  source: PackagingDesignSource | null;
  proofStatus: PackagingProofStatus | null;
  proofId: string | null;
};

export function derivePackagingDesignReadiness(
  proof: Pick<PackagingDesignProof, 'id' | 'status' | 'design_source'> | null | undefined,
): PackagingDesignReadiness {
  if (!proof) {
    return { ready: false, status: 'required', source: null, proofStatus: null, proofId: null };
  }

  const source: PackagingDesignSource = proof.design_source === 'customer_provided'
    ? 'customer_provided'
    : 'design_team';

  if (proof.status === 'rejected') {
    return { ready: false, status: 'revision_required', source, proofStatus: proof.status, proofId: proof.id };
  }

  if (source === 'customer_provided') {
    return { ready: true, status: 'ready', source, proofStatus: proof.status, proofId: proof.id };
  }

  if (proof.status === 'approved') {
    return { ready: true, status: 'ready', source, proofStatus: proof.status, proofId: proof.id };
  }

  return { ready: false, status: 'in_review', source, proofStatus: proof.status, proofId: proof.id };
}

export function packagingDesignStatusLabel(status: PackagingDesignStatus): string {
  if (status === 'ready') return 'Design ready';
  if (status === 'in_review') return 'Design awaiting approval';
  if (status === 'revision_required') return 'Design revision required';
  return 'Design required';
}

export function packagingDesignSourceLabel(source: PackagingDesignSource | null): string {
  if (source === 'customer_provided') return 'Customer provided';
  if (source === 'design_team') return 'Design team';
  return 'Not selected';
}

export function productionStageRequiresReadyDesign(stage: ProductionStage): boolean {
  return stage !== 'pre_press';
}
