import type { CommercialBandV5, PricingBucketV5 } from './types';

export type ResolvedCommercialBandV5 = {
  bucket_no: PricingBucketV5;
  run_length_m: number;
  run_length_max_m: number;
  wastage_pct: number;
  margin_per_frame: number;
  sort_order: number;
};

export function resolveCommercialBandV5(
  bands: CommercialBandV5[],
  bucket: PricingBucketV5,
  runLengthM: number,
): ResolvedCommercialBandV5 | null {
  if (!Number.isFinite(runLengthM) || runLengthM < 0) return null;

  const bucketBands = bands
    .filter((band) => Number(band.pricing_bucket) === bucket)
    .sort((a, b) => Number(a.run_length_max_m) - Number(b.run_length_max_m));

  if (!bucketBands.length) return null;

  const band = bucketBands.find((item) => runLengthM <= Number(item.run_length_max_m)) ?? bucketBands[bucketBands.length - 1];

  return {
    bucket_no: bucket,
    run_length_m: runLengthM,
    run_length_max_m: Number(band.run_length_max_m),
    wastage_pct: Number(band.wastage_pct),
    margin_per_frame: Number(band.margin_per_frame),
    sort_order: Number(band.sort_order),
  };
}

export function assertCommercialBandV5(
  bands: CommercialBandV5[],
  bucket: PricingBucketV5,
  runLengthM: number,
): ResolvedCommercialBandV5 {
  const resolved = resolveCommercialBandV5(bands, bucket, runLengthM);
  if (!resolved) throw new Error(`No Pricing v5 commercial band is configured for bucket ${bucket}.`);
  return resolved;
}
