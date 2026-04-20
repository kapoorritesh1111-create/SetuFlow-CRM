export type ProductTradeAttributes = {
  countryOfOrigin: string | null;
  exportMetadata: string | null;
  packagingType: string | null;
  packagingUnit: string | null;
  unitsPerCase: number | null;
  netWeightKg: number | null;
  shipmentNotes: string | null;
  shipmentAttributesJson: Record<string, unknown> | null;
  exportMetadataJson: Record<string, unknown> | null;
  unitOfMeasure: 'case' | 'unit' | 'kg' | null;
};

const KEY = 'setu_trade_attributes';
const LINE_NOTE_PREFIX = '[SETU_LINE_CONTINUITY]';

function asText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : null;
}

function asUnitOfMeasure(value: unknown): ProductTradeAttributes['unitOfMeasure'] {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'case' || normalized === 'unit' || normalized === 'kg' ? normalized : null;
}

export function normalizeTradeAttributes(value: Partial<ProductTradeAttributes> | null | undefined): ProductTradeAttributes {
  return {
    countryOfOrigin: asText(value?.countryOfOrigin),
    exportMetadata: asText(value?.exportMetadata),
    packagingType: asText(value?.packagingType),
    packagingUnit: asText(value?.packagingUnit),
    unitsPerCase: asNumber(value?.unitsPerCase),
    netWeightKg: asNumber(value?.netWeightKg),
    shipmentNotes: asText(value?.shipmentNotes),
    shipmentAttributesJson: asObject((value as any)?.shipmentAttributesJson),
    exportMetadataJson: asObject((value as any)?.exportMetadataJson),
    unitOfMeasure: asUnitOfMeasure(value?.unitOfMeasure),
  };
}

export function parseTradeAttributes(sourcePayload: unknown): ProductTradeAttributes {
  if (!sourcePayload || typeof sourcePayload !== 'object' || Array.isArray(sourcePayload)) {
    return normalizeTradeAttributes(null);
  }
  const record = sourcePayload as Record<string, unknown>;
  const legacy = normalizeTradeAttributes(record[KEY] as Partial<ProductTradeAttributes> | null | undefined);
  const exportMetadataJson = asObject(record.export_metadata);
  const shipmentAttributesJson = asObject(record.shipment_attributes);
  return normalizeTradeAttributes({
    countryOfOrigin: asText(record.country_of_origin) ?? legacy.countryOfOrigin,
    exportMetadata: asText(exportMetadataJson?.summary) ?? legacy.exportMetadata,
    packagingType: asText(record.packaging_type) ?? legacy.packagingType,
    packagingUnit: asText(record.packaging_unit) ?? legacy.packagingUnit,
    unitsPerCase: asNumber(record.units_per_case) ?? legacy.unitsPerCase,
    netWeightKg: asNumber(record.net_weight_kg) ?? legacy.netWeightKg,
    shipmentNotes: asText(record.shipment_notes) ?? asText(shipmentAttributesJson?.notes) ?? legacy.shipmentNotes,
    shipmentAttributesJson: shipmentAttributesJson ?? legacy.shipmentAttributesJson,
    exportMetadataJson: exportMetadataJson ?? legacy.exportMetadataJson,
    unitOfMeasure: asUnitOfMeasure(record.pricing_mode_default) ?? legacy.unitOfMeasure,
  });
}

export function mergeTradeAttributesIntoStructuredFields(sourceRecord: unknown, attributes: Partial<ProductTradeAttributes>) {
  const normalized = normalizeTradeAttributes(attributes);
  const base = sourceRecord && typeof sourceRecord === 'object' && !Array.isArray(sourceRecord)
    ? { ...(sourceRecord as Record<string, unknown>) }
    : {};
  base.country_of_origin = normalized.countryOfOrigin;
  base.export_metadata = normalized.exportMetadataJson ?? (normalized.exportMetadata ? { summary: normalized.exportMetadata } : {});
  base.packaging_type = normalized.packagingType;
  base.packaging_unit = normalized.packagingUnit;
  base.units_per_case = normalized.unitsPerCase;
  base.net_weight_kg = normalized.netWeightKg;
  base.shipment_notes = normalized.shipmentNotes;
  base.shipment_attributes = normalized.shipmentAttributesJson ?? (normalized.shipmentNotes ? { notes: normalized.shipmentNotes } : {});
  base.pricing_mode_default = normalized.unitOfMeasure;
  return base;
}


export function mergeTradeAttributesIntoSourcePayload(sourcePayload: unknown, attributes: Partial<ProductTradeAttributes>) {
  const base = sourcePayload && typeof sourcePayload === 'object' && !Array.isArray(sourcePayload)
    ? { ...(sourcePayload as Record<string, unknown>) }
    : {};
  base[KEY] = normalizeTradeAttributes(attributes);
  return base;
}

export function buildTradeAttributesSummary(attributes: Partial<ProductTradeAttributes> | null | undefined) {
  const normalized = normalizeTradeAttributes(attributes);
  const parts = [
    normalized.countryOfOrigin ? `Origin ${normalized.countryOfOrigin}` : null,
    normalized.exportMetadata ? `Export ${normalized.exportMetadata}` : null,
    normalized.packagingType ? `Pack ${normalized.packagingType}` : null,
    normalized.packagingUnit ? `Unit ${normalized.packagingUnit}` : null,
    normalized.unitsPerCase != null ? `${normalized.unitsPerCase} per case` : null,
    normalized.netWeightKg != null ? `${normalized.netWeightKg} kg net` : null,
    normalized.unitOfMeasure ? `UOM ${normalized.unitOfMeasure}` : null,
    normalized.shipmentNotes ? normalized.shipmentNotes : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function buildLineContinuityNote(attributes: Partial<ProductTradeAttributes> | null | undefined, existingNotes?: string | null) {
  const normalizedExisting = typeof existingNotes === 'string' ? existingNotes.trim() : '';
  const summary = buildTradeAttributesSummary(attributes);
  if (!summary) return normalizedExisting || null;
  const nextMetaLine = `${LINE_NOTE_PREFIX} ${summary}`;
  const withoutExistingMeta = normalizedExisting
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith(LINE_NOTE_PREFIX))
    .join('\n')
    .trim();
  return withoutExistingMeta ? `${withoutExistingMeta}\n${nextMetaLine}` : nextMetaLine;
}

export function extractLineContinuityNote(note: string | null | undefined) {
  const text = typeof note === 'string' ? note : '';
  const line = text.split('\n').find((entry) => entry.trim().startsWith(LINE_NOTE_PREFIX));
  return line ? line.replace(LINE_NOTE_PREFIX, '').trim() : null;
}
