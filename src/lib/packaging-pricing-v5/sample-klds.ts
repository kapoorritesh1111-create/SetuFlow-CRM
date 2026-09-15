export const PRICING_V5_SUP_SAMPLE_KLDS = [
  { width_mm: 80, height_mm: 130, bottom_gusset_each_mm: 25, sample_url: '/kld/pricing-v5/sup/80x130-bg-25-25.svg', status: 'review_sample' as const },
  { width_mm: 98, height_mm: 150, bottom_gusset_each_mm: 30, sample_url: '/kld/pricing-v5/sup/98x150-bg-30-30.svg', status: 'review_sample' as const },
  { width_mm: 110, height_mm: 170, bottom_gusset_each_mm: 30, sample_url: '/kld/pricing-v5/sup/110x170-bg-30-30.svg', status: 'review_sample' as const },
  { width_mm: 150, height_mm: 150, bottom_gusset_each_mm: 40, sample_url: '/kld/pricing-v5/sup/150x150-bg-40-40.svg', status: 'review_sample' as const },
  { width_mm: 120, height_mm: 210, bottom_gusset_each_mm: 40, sample_url: '/kld/pricing-v5/sup/120x210-bg-40-40.svg', status: 'review_sample' as const },
  { width_mm: 125, height_mm: 210, bottom_gusset_each_mm: 40, sample_url: '/kld/pricing-v5/sup/125x210-bg-40-40.svg', status: 'review_sample' as const },
  { width_mm: 130, height_mm: 210, bottom_gusset_each_mm: 40, sample_url: '/kld/pricing-v5/sup/130x210-bg-40-40.svg', status: 'review_sample' as const },
  { width_mm: 140, height_mm: 210, bottom_gusset_each_mm: 40, sample_url: '/kld/pricing-v5/sup/140x210-bg-40-40.svg', status: 'review_sample' as const },
  { width_mm: 145, height_mm: 210, bottom_gusset_each_mm: 40, sample_url: '/kld/pricing-v5/sup/145x210-bg-40-40.svg', status: 'review_sample' as const },
  { width_mm: 150, height_mm: 220, bottom_gusset_each_mm: 50, sample_url: '/kld/pricing-v5/sup/150x220-bg-50-50.svg', status: 'review_sample' as const },
  { width_mm: 160, height_mm: 240, bottom_gusset_each_mm: 50, sample_url: '/kld/pricing-v5/sup/160x240-bg-50-50.svg', status: 'review_sample' as const },
  { width_mm: 170, height_mm: 250, bottom_gusset_each_mm: 50, sample_url: '/kld/pricing-v5/sup/170x250-bg-50-50.svg', status: 'review_sample' as const },
  { width_mm: 185, height_mm: 270, bottom_gusset_each_mm: 50, sample_url: '/kld/pricing-v5/sup/185x270-bg-50-50.svg', status: 'review_sample' as const },
  { width_mm: 200, height_mm: 300, bottom_gusset_each_mm: 55, sample_url: '/kld/pricing-v5/sup/200x300-bg-55-55.svg', status: 'review_sample' as const },
  { width_mm: 210, height_mm: 300, bottom_gusset_each_mm: 55, sample_url: '/kld/pricing-v5/sup/210x300-bg-55-55.svg', status: 'review_sample' as const },
  { width_mm: 220, height_mm: 300, bottom_gusset_each_mm: 55, sample_url: '/kld/pricing-v5/sup/220x300-bg-55-55.svg', status: 'review_sample' as const },
  { width_mm: 230, height_mm: 310, bottom_gusset_each_mm: 55, sample_url: '/kld/pricing-v5/sup/230x310-bg-55-55.svg', status: 'review_sample' as const },
  { width_mm: 245, height_mm: 320, bottom_gusset_each_mm: 55, sample_url: '/kld/pricing-v5/sup/245x320-bg-55-55.svg', status: 'review_sample' as const },
  { width_mm: 260, height_mm: 340, bottom_gusset_each_mm: 60, sample_url: '/kld/pricing-v5/sup/260x340-bg-60-60.svg', status: 'review_sample' as const },
  { width_mm: 280, height_mm: 360, bottom_gusset_each_mm: 60, sample_url: '/kld/pricing-v5/sup/280x360-bg-60-60.svg', status: 'review_sample' as const },
] as const;

export function getPricingV5SupSampleKld(size: { width_mm?: number; height_mm?: number; bottom_gusset_each_mm?: number } | null | undefined) {
  if (!size) return null;
  return PRICING_V5_SUP_SAMPLE_KLDS.find((item) => item.width_mm === Number(size.width_mm) && item.height_mm === Number(size.height_mm) && item.bottom_gusset_each_mm === Number(size.bottom_gusset_each_mm)) ?? null;
}
