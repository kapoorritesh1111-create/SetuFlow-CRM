export function formatQuoteMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (typeof value !== 'number') return '—';
  const normalizedCurrency = (currency ?? '').trim().toUpperCase() || 'USD';
  return `${normalizedCurrency} ${value.toFixed(2)}`;
}
