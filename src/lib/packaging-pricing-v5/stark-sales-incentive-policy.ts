/**
 * Stark Packmate sales incentives — future functionality ONLY.
 *
 * No scheduled task, quote save, discount flow or payout action invokes this
 * module. Owners must explicitly configure and enable a future integration.
 */
export type SalesIncentivePolicyV1 = {
  enabled: boolean;
  currency: 'INR';
  period: 'calendar_month';
  published_price_floor_pct: number;
  maximum_credit_pct_of_margin: number;
  tiers: Array<{ minimum_realized_price_pct: number; credit_pct_of_margin: number }>;
};
export const STARK_INCENTIVES_DISABLED: Readonly<SalesIncentivePolicyV1> = Object.freeze({
  enabled: false,
  currency: 'INR',
  period: 'calendar_month',
  published_price_floor_pct: 0,
  maximum_credit_pct_of_margin: 0,
  tiers: [],
});
export type SalesIncentivePreview = {
  status: 'disabled' | 'not_eligible' | 'illustrative';
  credit: number;
  reason: string;
};
/** Explicitly disabled until an owner-approved policy is added and integrated. */
export function previewSalesIncentive(
  policy: SalesIncentivePolicyV1 = STARK_INCENTIVES_DISABLED,
  data?: { published_total: number; realized_total: number; verified_margin: number },
): SalesIncentivePreview {
  if (!policy.enabled) return { status: 'disabled', credit: 0, reason: 'Sales incentives are not active.' };
  if (!data || ![data.published_total,data.realized_total,data.verified_margin].every(Number.isFinite)
      || data.published_total<=0 || data.realized_total<=0 || data.verified_margin<=0) {
    return {status:'not_eligible',credit:0,reason:'Verified published price, realized amount, and margin are required.'};
  }
  const achieved = 100*data.realized_total/data.published_total;
  if (achieved < policy.published_price_floor_pct) return {status:'not_eligible',credit:0,reason:'Below owner-configured floor.'};
  const tier = policy.tiers.filter(t=>Number.isFinite(t.minimum_realized_price_pct)&&Number.isFinite(t.credit_pct_of_margin)
    && t.credit_pct_of_margin>=0 && t.minimum_realized_price_pct<=achieved)
    .sort((a,b)=>b.minimum_realized_price_pct-a.minimum_realized_price_pct)[0];
  if (!tier) return {status:'not_eligible',credit:0,reason:'No eligible owner-configured tier.'};
  const maxPct = Math.max(0,Math.min(100,policy.maximum_credit_pct_of_margin));
  return {status:'illustrative',credit:Math.round(data.verified_margin*Math.min(maxPct,tier.credit_pct_of_margin)/100*100)/100,reason:'Preview only; not payable or posted.'};
}
