export type ContractCommercialSnapshot = {
  quoteId?: string | null;
  quoteStatus?: string | null;
  quoteCurrency?: string | null;
  pricingBasis?: string | null;
  approvalRequired?: boolean;
  approvalState?: string | null;
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
    quoteStatus: maybeString(record.quote_status),
    quoteCurrency: maybeString(record.quote_currency),
    pricingBasis: maybeString(record.pricing_basis),
    approvalRequired: typeof record.approval_required === 'boolean' ? record.approval_required : false,
    approvalState: maybeString(record.approval_state),
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
