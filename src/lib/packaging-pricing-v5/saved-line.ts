export type PricingV5SavedLineSummary = {
  lineId: string;
  sizeProfileId: string;
  constructionId: string;
  print: 'CMYK' | 'CMYKW';
  quantity: number;
  bottomPrintMode: 'solid_unregistered' | 'registered_artwork' | '';
  selectedChargeCodes: string[];
  kldFileId: string;
  spotUvEnabled: boolean;
  spotUvAmount: number | null;
  unitPrice: number;
  currency: string;
};

export function isPricingV5SavedQuoteLine(line: any) {
  return Boolean(
    line?.id &&
    line?.line_type === 'packaging' &&
    Number(line?.calculation_version) === 5 &&
    Number(line?.input_snapshot_json?.engine_version) === 5,
  );
}

export function toPricingV5SavedLineSummary(line: any): PricingV5SavedLineSummary | null {
  if (!isPricingV5SavedQuoteLine(line)) return null;
  const input = line.input_snapshot_json?.input;
  if (!input || typeof input !== 'object') return null;
  const manual = Array.isArray(input.manual_quote_charges) ? input.manual_quote_charges : [];
  const spot = manual.find((item: any) => item?.code === 'EXTRA_SPOT_UV');
  const bottom = input.bottom_print_mode === 'solid_unregistered' || input.bottom_print_mode === 'registered_artwork'
    ? input.bottom_print_mode
    : '';
  const print: 'CMYK' | 'CMYKW' = input.print === 'CMYK' ? 'CMYK' : 'CMYKW';
  return {
    lineId: String(line.id),
    sizeProfileId: String(input.size_profile_id ?? ''),
    constructionId: String(input.construction_id ?? ''),
    print,
    quantity: Math.max(0, Number(input.quantity ?? line.quantity ?? 0)),
    bottomPrintMode: bottom,
    selectedChargeCodes: Array.isArray(input.selected_charge_codes)
      ? input.selected_charge_codes.map((item: unknown) => String(item)).filter(Boolean)
      : [],
    kldFileId: String(input.kld_file_id ?? ''),
    spotUvEnabled: Boolean(spot && Number(spot.amount) > 0),
    spotUvAmount: spot && Number.isFinite(Number(spot.amount)) ? Number(spot.amount) : null,
    unitPrice: Number(line.unit_price ?? 0),
    currency: String(line.currency ?? 'INR'),
  };
}

export function listPricingV5SavedLineSummaries(lines: any[]): PricingV5SavedLineSummary[] {
  return (Array.isArray(lines) ? lines : [])
    .map(toPricingV5SavedLineSummary)
    .filter((item): item is PricingV5SavedLineSummary => Boolean(item));
}
