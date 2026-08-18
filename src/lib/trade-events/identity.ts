export type TradeEventIdentity = {
  id?: string | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  canonical_event_id?: string | null;
};

export type TradeEventMatchStrength = 'exact' | 'possible' | 'none';

export const normalizeTradeEventName = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\b(expo|exhibition|trade show|tradeshow|fair)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '');

export const normalizeTradeEventPlace = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

function dateValue(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function rangesOverlap(left: TradeEventIdentity, right: TradeEventIdentity) {
  const leftStart = dateValue(left.starts_on);
  const leftEnd = dateValue(left.ends_on) ?? leftStart;
  const rightStart = dateValue(right.starts_on);
  const rightEnd = dateValue(right.ends_on) ?? rightStart;
  if (leftStart == null || leftEnd == null || rightStart == null || rightEnd == null) return null;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function placesCompatible(left: TradeEventIdentity, right: TradeEventIdentity) {
  const leftCity = normalizeTradeEventPlace(left.city);
  const rightCity = normalizeTradeEventPlace(right.city);
  const leftCountry = normalizeTradeEventPlace(left.country);
  const rightCountry = normalizeTradeEventPlace(right.country);
  if (leftCity && rightCity && leftCity !== rightCity) return false;
  if (leftCountry && rightCountry && leftCountry !== rightCountry) return false;
  return true;
}

function extractedYear(event: TradeEventIdentity) {
  const fromDate = event.starts_on?.slice(0, 4);
  if (fromDate && /^\d{4}$/.test(fromDate)) return fromDate;
  return String(event.name ?? '').match(/\b(20\d{2})\b/)?.[1] ?? null;
}

export function classifyTradeEventMatch(left: TradeEventIdentity, right: TradeEventIdentity): TradeEventMatchStrength {
  if (left.canonical_event_id && right.canonical_event_id && left.canonical_event_id === right.canonical_event_id) return 'exact';

  const leftName = normalizeTradeEventName(left.name);
  const rightName = normalizeTradeEventName(right.name);
  if (!leftName || !rightName || leftName !== rightName) return 'none';

  const leftYear = extractedYear(left);
  const rightYear = extractedYear(right);
  if (leftYear && rightYear && leftYear !== rightYear) return 'none';
  if (!placesCompatible(left, right)) return 'none';

  const overlap = rangesOverlap(left, right);
  if (overlap === true) return 'exact';
  if (overlap === false) return 'none';

  // Same normalized name/year with incomplete date/location data is a review case,
  // never something the UI should silently collapse.
  return 'possible';
}

export function tradeEventIdentityKey(event: TradeEventIdentity) {
  return [
    normalizeTradeEventName(event.name),
    extractedYear(event) ?? '',
    normalizeTradeEventPlace(event.city),
    normalizeTradeEventPlace(event.country),
    event.starts_on ?? '',
    event.ends_on ?? '',
  ].join('|');
}
