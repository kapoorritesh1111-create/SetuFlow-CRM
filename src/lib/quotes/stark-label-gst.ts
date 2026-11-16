/** GST policy for Stark Packmate's domestic workbook-backed label quotes.
 * The label workbook stores EXCLUSIVE-of-tax prices, and older snapshots have no selling_price.gst.
 * Never apply the fallback to other organizations or product families.
 */
export const STARK_PACKMATE_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
export const STARK_PACKMATE_GST_RATE = 18;

export function quoteLineGst(line: any, organizationId: string | null | undefined): number {
  if (line?.line_type !== 'packaging' || Number(line?.calculation_version) !== 5) return 0;
  const amount = Number(line?.pricing_breakdown_json?.selling_price?.gst);
  if (Number.isFinite(amount) && amount > 0) return Math.round(amount * 100) / 100;
  const engine = String(line?.pricing_breakdown_json?.calculation_engine_key
    ?? line?.input_snapshot_json?.calculation_engine_key ?? '');
  if (organizationId !== STARK_PACKMATE_ID || engine !== 'label_workbook_v5') return 0;
  const base = Number(line?.quantity) * Number(line?.unit_price);
  return Number.isFinite(base) && base > 0
    ? Math.round(base * STARK_PACKMATE_GST_RATE) / 100
    : 0;
}
