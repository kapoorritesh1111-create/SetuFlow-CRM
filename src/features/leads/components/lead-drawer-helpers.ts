/**
 * Helper utilities for lead-drawer.tsx.  Keeping the FormData builders in a
 * separate file reduces noise in the component and makes the intent of the
 * inline country/market creation flows easier to understand.
 */

export function buildMarketSettingsFormData(name: string, code: string) {
  const fd = new FormData();
  fd.set('table', 'markets');
  fd.set('name', name.trim());
  fd.set('market_code', code.trim() || '');
  fd.set('sort_order', '0');
  fd.set('is_active', 'on');
  return fd;
}

export function buildCountrySettingsFormData(args: {
  name: string;
  iso2: string;
  iso3: string;
  phone: string;
  marketId: string;
}) {
  const fd = new FormData();
  fd.set('table', 'countries');
  fd.set('name', args.name.trim());
  fd.set('iso2_code', args.iso2.trim() || '');
  fd.set('iso3_code', args.iso3.trim() || '');
  fd.set('phone_code', args.phone.trim() || '');
  fd.set('market_id', args.marketId.trim() || '');
  fd.set('sort_order', '0');
  fd.set('is_active', 'on');
  return fd;
}