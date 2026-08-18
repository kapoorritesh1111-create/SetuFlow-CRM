import { createHash } from 'node:crypto';
import type { PackagingPricingResult, PackagingPricingTemplateV4 } from './types';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function pricingSourceHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(payload))).digest('hex');
}

export function snapshotPayload<T extends Record<string, unknown>>(payload: T): T & { source_hash: string } {
  return { ...payload, source_hash: pricingSourceHash(payload) };
}

export type PackagingPricingInputSnapshotV4 = {
  engine_version: 4;
  family_id: string;
  family_name: string;
  template_id: string;
  template_name: string;
  template_version: number;
  calculation_engine_key: PackagingPricingTemplateV4['calculation_engine_key'];
  input: unknown;
  source_hash: string;
  /** Full KLD metadata used at save time. Null means no KLD was selected. */
  kld: Record<string, unknown> | null;
};

export type PackagingPricingSnapshotV4 = {
  snapshot_version: 1;
  input_snapshot: PackagingPricingInputSnapshotV4;
  pricing_result: PackagingPricingResult;
  snapshotted_at: string;
  /** Integrity hash for the frozen input, pricing result, KLD metadata and timestamp. */
  snapshot_hash: string;
};

type SnapshotBody = Omit<PackagingPricingSnapshotV4, 'snapshot_hash'>;

/**
 * Freeze the exact server-authoritative pricing result and KLD metadata used by
 * a quote version. Historical reproduction must read this payload; it must not
 * query today's Master rates, recipes, matrix rows or KLD records.
 */
export function createPackagingPricingSnapshot(
  inputSnapshot: PackagingPricingInputSnapshotV4,
  pricingResult: PackagingPricingResult,
  snapshottedAt = new Date().toISOString(),
): PackagingPricingSnapshotV4 {
  if (pricingResult.engine_version !== 4 || inputSnapshot.engine_version !== 4) {
    throw new Error('Only Packaging Pricing v4 results can be snapshotted by this helper.');
  }
  if (!pricingResult.source_hash || pricingResult.source_hash !== inputSnapshot.source_hash) {
    throw new Error('Packaging pricing source hash does not match the input snapshot.');
  }
  if (!snapshottedAt) throw new Error('Packaging pricing snapshot timestamp is required.');

  const body: SnapshotBody = {
    snapshot_version: 1,
    input_snapshot: jsonClone(inputSnapshot),
    pricing_result: jsonClone(pricingResult),
    snapshotted_at: snapshottedAt,
  };
  return { ...body, snapshot_hash: pricingSourceHash(body) };
}

/**
 * Reproduce a historical v4 price from the immutable stored payload only.
 * The returned object is a deep copy, so callers cannot mutate the stored
 * version in memory. Integrity/source-hash checks fail closed on tampering.
 */
export function reproducePackagingPricingSnapshot(snapshot: unknown): PackagingPricingSnapshotV4 {
  const source = record(snapshot);
  if (!source || source.snapshot_version !== 1) throw new Error('Unsupported Packaging Pricing snapshot version.');
  const input = record(source.input_snapshot);
  const result = record(source.pricing_result);
  if (!input || input.engine_version !== 4 || !result || result.engine_version !== 4) {
    throw new Error('Packaging Pricing snapshot is missing a valid v4 input/result.');
  }
  const inputSourceHash = String(input.source_hash ?? '');
  const resultSourceHash = String(result.source_hash ?? '');
  if (!inputSourceHash || inputSourceHash !== resultSourceHash) {
    throw new Error('Packaging Pricing snapshot source hash is inconsistent.');
  }
  const snapshottedAt = String(source.snapshotted_at ?? '');
  const snapshotHash = String(source.snapshot_hash ?? '');
  if (!snapshottedAt || !snapshotHash) throw new Error('Packaging Pricing snapshot integrity metadata is missing.');

  const body: SnapshotBody = {
    snapshot_version: 1,
    input_snapshot: jsonClone(source.input_snapshot) as PackagingPricingInputSnapshotV4,
    pricing_result: jsonClone(source.pricing_result) as PackagingPricingResult,
    snapshotted_at: snapshottedAt,
  };
  if (pricingSourceHash(body) !== snapshotHash) throw new Error('Packaging Pricing snapshot integrity check failed.');
  return jsonClone({ ...body, snapshot_hash: snapshotHash });
}
