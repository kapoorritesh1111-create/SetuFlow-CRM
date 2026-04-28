import { getPricingBasisLabel as getCanonicalPricingBasisLabel, normalizePricingBasis, type QuotePricingBasis } from '@/lib/pricing-basis-contract';

export type ContractCommercialSnapshot = {
  quoteId?: string | null;
  acceptedVersionId?: string | null;
  acceptedVersionNo?: number | null;
  currentVersionId?: string | null;
  snapshotMode?: string | null;
  sourceHandoffLabel?: string | null;
  commercialSourceTruth?: string | null;
  commercialHandoffAt?: string | null;
  quoteStatus?: string | null;
  quoteCurrency?: string | null;
  pricingBasis?: QuotePricingBasis | null;
  pricingBasisLabel?: string | null;
  approvalRequired?: boolean;
  approvalState?: string | null;
  approvalLabel?: string | null;
  approvedAt?: string | null;
  approvalActor?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  lineCount?: number;
  overrideCount?: number;
  subtotal?: number;
  lockState?: string | null;
};

export type ContractLineContinuitySnapshot = {
  quoteLineItemId?: string | null;
  quoteVersionLineItemId?: string | null;
  quoteVersionId?: string | null;
  acceptedVersionId?: string | null;
  sourceMode?: string | null;
  productId?: string | null;
  productVariantId?: string | null;
  quantity?: number | null;
  catalogPriceAmount?: number | null;
  catalogPriceCurrency?: string | null;
  finalUnitPrice?: number | null;
  currency?: string | null;
  isPriceOverridden?: boolean;
  overrideReason?: string | null;
  notes?: string | null;
};

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function maybeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function maybeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseContractCommercialSnapshot(value: unknown): ContractCommercialSnapshot {
  const record = normalizeRecord(value);
  return {
    quoteId: maybeString(record.quote_id),
    acceptedVersionId: maybeString(record.accepted_version_id),
    acceptedVersionNo: maybeNumber(record.accepted_version_no) ?? undefined,
    currentVersionId: maybeString(record.current_version_id),
    snapshotMode: maybeString(record.snapshot_mode),
    sourceHandoffLabel: maybeString(record.source_handoff_label),
    commercialSourceTruth: maybeString(record.commercial_source_truth),
    commercialHandoffAt: maybeString(record.commercial_handoff_at),
    quoteStatus: maybeString(record.quote_status),
    quoteCurrency: maybeString(record.quote_currency),
    pricingBasis: record.pricing_basis == null ? null : normalizePricingBasis(record.pricing_basis),
    pricingBasisLabel: maybeString(record.pricing_basis_label) ?? getCanonicalPricingBasisLabel(record.pricing_basis),
    approvalRequired: typeof record.approval_required === 'boolean' ? record.approval_required : false,
    approvalState: maybeString(record.approval_state),
    approvalLabel: maybeString(record.approval_label) ?? maybeString(record.approval_state),
    approvedAt: maybeString(record.approved_at),
    approvalActor: maybeString(record.approval_actor),
    sentAt: maybeString(record.sent_at),
    acceptedAt: maybeString(record.accepted_at),
    lineCount: maybeNumber(record.line_count) ?? undefined,
    overrideCount: maybeNumber(record.override_count) ?? undefined,
    subtotal: maybeNumber(record.subtotal) ?? undefined,
    lockState: maybeString(record.lock_state),
  };
}

export function parseContractLineContinuitySnapshot(value: unknown): ContractLineContinuitySnapshot {
  const record = normalizeRecord(value);
  return {
    quoteLineItemId: maybeString(record.quote_line_item_id),
    quoteVersionLineItemId: maybeString(record.quote_version_line_item_id),
    quoteVersionId: maybeString(record.quote_version_id),
    acceptedVersionId: maybeString(record.accepted_version_id),
    sourceMode: maybeString(record.source_mode),
    productId: maybeString(record.product_id),
    productVariantId: maybeString(record.product_variant_id),
    quantity: maybeNumber(record.quantity) ?? undefined,
    catalogPriceAmount: maybeNumber(record.catalog_price_amount) ?? undefined,
    catalogPriceCurrency: maybeString(record.catalog_price_currency),
    finalUnitPrice: maybeNumber(record.final_unit_price) ?? undefined,
    currency: maybeString(record.currency),
    isPriceOverridden: typeof record.is_price_overridden === 'boolean' ? record.is_price_overridden : false,
    overrideReason: maybeString(record.override_reason),
    notes: maybeString(record.notes),
  };
}

export function getCommercialLockStateLabel(lockState: string | null | undefined) {
  switch (String(lockState ?? '').toLowerCase()) {
    case 'accepted_locked':
      return 'Accepted version locked';
    case 'contract_locked':
      return 'Contract locked';
    case 'sent_locked':
      return 'Sent locked';
    case 'approved_ready':
      return 'Approved ready';
    default:
      return 'Draft open';
  }
}

export function getPricingBasisLabel(pricingBasis: unknown) {
  return pricingBasis == null ? 'Unspecified' : getCanonicalPricingBasisLabel(pricingBasis);
}

export function getApprovalStateLabel(approvalState: string | null | undefined) {
  switch (String(approvalState ?? '').toLowerCase()) {
    case 'approved':
      return 'Approved';
    case 'pending':
    case 'approval_pending':
      return 'Approval pending';
    case 'rejected':
      return 'Rejected';
    case 'not_required':
      return 'Not required';
    default:
      return approvalState ?? 'Unknown';
  }
}
