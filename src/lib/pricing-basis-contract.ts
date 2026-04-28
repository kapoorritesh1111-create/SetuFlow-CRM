export const PRICING_BASIS_VALUES = ['ex_factory', 'fob', 'cif', 'bulk_chips'] as const;
export type PricingBasisContract = (typeof PRICING_BASIS_VALUES)[number];
export type QuotePricingBasis = PricingBasisContract;

export const DEFAULT_CATALOG_PRICE_CURRENCY = 'USD' as const;
export const DEFAULT_QUOTE_PRICING_BASIS: QuotePricingBasis = 'ex_factory';

const PRICING_BASIS_LABELS: Record<QuotePricingBasis, string> = {
  ex_factory: 'Ex-Factory',
  fob: 'FOB',
  cif: 'CIF',
  bulk_chips: 'Bulk/Kg',
};

export function isPricingBasis(value: unknown): value is QuotePricingBasis {
  return PRICING_BASIS_VALUES.includes(String(value).trim().toLowerCase() as QuotePricingBasis);
}

export function normalizePricingBasis(
  value: unknown,
  fallback: QuotePricingBasis = DEFAULT_QUOTE_PRICING_BASIS,
): QuotePricingBasis {
  const normalized = String(value ?? fallback).trim().toLowerCase().replace(/\s+/g, '_');
  switch (normalized) {
    case 'ex_factory':
    case 'ex-factory':
    case 'exfactory':
    case 'factory':
      return 'ex_factory';
    case 'fob':
      return 'fob';
    case 'cif':
      return 'cif';
    case 'bulk_chips':
    case 'bulk':
    case 'bulk_kg':
    case 'bulk/kg':
    case 'kg':
      return 'bulk_chips';
    default:
      return fallback;
  }
}

export function getPricingBasisLabel(value: unknown): string {
  return PRICING_BASIS_LABELS[normalizePricingBasis(value)];
}

export const APPROVAL_AUTHORITY_ROLES = ['owner', 'admin', 'manager'] as const;
export type ApprovalAuthorityRole = (typeof APPROVAL_AUTHORITY_ROLES)[number];

export function hasApprovalAuthority(roles: Array<string | null | undefined> | null | undefined): boolean {
  return (roles ?? []).some((role) => APPROVAL_AUTHORITY_ROLES.includes(String(role ?? '').trim().toLowerCase() as ApprovalAuthorityRole));
}

export function requiresApprovalForCommercialChange(input: {
  actorRoles?: Array<string | null | undefined> | null;
  hasPriceChange?: boolean | null;
}): boolean {
  return Boolean(input.hasPriceChange) || !hasApprovalAuthority(input.actorRoles);
}
