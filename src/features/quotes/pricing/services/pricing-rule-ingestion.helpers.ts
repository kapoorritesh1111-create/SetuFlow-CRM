import type { Json } from '@/types/database';
import type { PricingRuleImportError, PricingRuleImportRow } from '../types';

function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

function pushError(
  errors: PricingRuleImportError[],
  rowNo: number,
  code: string,
  message: string,
): void {
  errors.push({ rowNo, code, message });
}

function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

function isPresentNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasAtLeastOnePrice(row: PricingRuleImportRow): boolean {
  return [
    row.exFactoryUsd,
    row.fobUsd,
    row.bulkExFactoryUsdPerKg,
    row.exFactoryInr,
    row.fobInr,
    row.bulkExFactoryInrPerKg,
  ].some(isPresentNumber);
}

function validateNonNegativeNumber(
  errors: PricingRuleImportError[],
  rowNo: number,
  fieldName: string,
  value: number | null | undefined,
): void {
  if (value == null) {
    return;
  }

  if (!Number.isFinite(value)) {
    pushError(errors, rowNo, 'INVALID_NUMBER', `${fieldName} must be a valid number.`);
    return;
  }

  if (value < 0) {
    pushError(errors, rowNo, 'NEGATIVE_NUMBER', `${fieldName} cannot be negative.`);
  }
}

export function validatePricingRuleImportRows(rows: PricingRuleImportRow[]): PricingRuleImportError[] {
  const errors: PricingRuleImportError[] = [];
  const seenSkus = new Map<string, number>();

  rows.forEach((row) => {
    const normalizedSku = normalizeSku(row.skuCode);

    if (isBlank(row.skuCode)) {
      pushError(errors, row.rowNo, 'MISSING_SKU', 'SKU code is required.');
    }

    if (isBlank(row.productName)) {
      pushError(errors, row.rowNo, 'MISSING_PRODUCT_NAME', 'Product name is required.');
    }

    if (!['chips', 'powders'].includes(row.categoryType)) {
      pushError(errors, row.rowNo, 'INVALID_CATEGORY', 'Category type must be chips or powders.');
    }

    if (!hasAtLeastOnePrice(row)) {
      pushError(errors, row.rowNo, 'MISSING_PRICE', 'At least one pricing field is required.');
    }

    if (normalizedSku) {
      const existingRowNo = seenSkus.get(normalizedSku);
      if (existingRowNo != null) {
        pushError(
          errors,
          row.rowNo,
          'DUPLICATE_SKU',
          `Duplicate SKU detected. First seen on row ${existingRowNo}.`,
        );
      } else {
        seenSkus.set(normalizedSku, row.rowNo);
      }
    }

    validateNonNegativeNumber(errors, row.rowNo, 'unitsPerCase', row.unitsPerCase);
    validateNonNegativeNumber(errors, row.rowNo, 'moq', row.moq);
    validateNonNegativeNumber(errors, row.rowNo, 'exFactoryUsd', row.exFactoryUsd);
    validateNonNegativeNumber(errors, row.rowNo, 'fobUsd', row.fobUsd);
    validateNonNegativeNumber(errors, row.rowNo, 'bulkExFactoryUsdPerKg', row.bulkExFactoryUsdPerKg);
    validateNonNegativeNumber(errors, row.rowNo, 'exFactoryInr', row.exFactoryInr);
    validateNonNegativeNumber(errors, row.rowNo, 'fobInr', row.fobInr);
    validateNonNegativeNumber(errors, row.rowNo, 'bulkExFactoryInrPerKg', row.bulkExFactoryInrPerKg);
  });

  return errors;
}

export function toAuditPayload(input: {
  pricingRuleSetId?: string | null;
  importRequest?: {
    name: string;
    description?: string | null;
    sourceReference?: string | null;
    rowCount: number;
  };
  importedCount?: number;
  errors?: PricingRuleImportError[];
  actorUserId?: string | null;
}): Record<string, Json> {
  return {
    pricingRuleSetId: input.pricingRuleSetId ?? null,
    actorUserId: input.actorUserId ?? null,
    importRequest: input.importRequest
      ? {
          name: input.importRequest.name,
          description: input.importRequest.description ?? null,
          sourceReference: input.importRequest.sourceReference ?? null,
          rowCount: input.importRequest.rowCount,
        }
      : null,
    importedCount: input.importedCount ?? 0,
    errors: (input.errors ?? []).map((error) => ({
      rowNo: error.rowNo,
      code: error.code,
      message: error.message,
    })),
  };
}
