import { parseQuoteWorkflow, type QuoteWorkflowMeta } from '@/lib/quoteWorkflow';
import { normalizeCurrencyCode } from '@/lib/catalog-pricing-model';

export type QuoteFxLock = {
  source_currency: string;
  quote_currency: string;
  fx_rate: number;
  fx_week_start: string;
  fx_valid_until: string;
  provider?: string | null;
  effective_at?: string | null;
};

export type QuoteFxMeta = QuoteWorkflowMeta & {
  fx?: QuoteFxLock | null;
};

type FxRow = {
  rate: number | string | null;
  provider?: string | null;
  effective_at?: string | null;
  fetched_at?: string | null;
};

function startOfUtcWeek(date = new Date()) {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function getQuoteFxLockFromNotes(notes: string | null | undefined): QuoteFxLock | null {
  const parsed = parseQuoteWorkflow(notes) as { meta?: QuoteFxMeta };
  const fx = parsed?.meta?.fx;
  if (!fx || typeof fx !== 'object') return null;
  const sourceCurrency = normalizeCurrencyCode(fx.source_currency) ?? '';
  const quoteCurrency = normalizeCurrencyCode(fx.quote_currency) ?? '';
  const rate = Number(fx.fx_rate);
  if (!sourceCurrency || !quoteCurrency || !Number.isFinite(rate) || rate <= 0) return null;
  return {
    source_currency: sourceCurrency,
    quote_currency: quoteCurrency,
    fx_rate: rate,
    fx_week_start: String(fx.fx_week_start ?? ''),
    fx_valid_until: String(fx.fx_valid_until ?? ''),
    provider: fx.provider ?? null,
    effective_at: fx.effective_at ?? null,
  };
}

export function isQuoteFxLockReusable(lock: QuoteFxLock | null, sourceCurrency: string, quoteCurrency: string, now = new Date()) {
  if (!lock) return false;
  if (lock.source_currency !== sourceCurrency || lock.quote_currency !== quoteCurrency) return false;
  const validUntil = Date.parse(lock.fx_valid_until);
  return Number.isFinite(validUntil) && validUntil > now.getTime();
}

export async function resolveWeeklyQuoteFxLock(
  db: any,
  args: {
    sourceCurrency: string;
    quoteCurrency: string;
    existingNotes?: string | null;
    now?: Date;
  },
): Promise<{ fxLock: QuoteFxLock | null; error?: string }> {
  const sourceCurrency = normalizeCurrencyCode(args.sourceCurrency) ?? 'USD';
  const quoteCurrency = normalizeCurrencyCode(args.quoteCurrency) ?? 'USD';
  const now = args.now ?? new Date();

  if (sourceCurrency === quoteCurrency) return { fxLock: null };

  const existingLock = getQuoteFxLockFromNotes(args.existingNotes);
  if (isQuoteFxLockReusable(existingLock, sourceCurrency, quoteCurrency, now)) {
    return { fxLock: existingLock };
  }

  const weekStart = startOfUtcWeek(now);
  const validUntil = addDays(weekStart, 7);

  const { data, error } = await db
    .from('exchange_rates')
    .select('rate, provider, effective_at, fetched_at')
    .eq('base_currency', sourceCurrency)
    .eq('quote_currency', quoteCurrency)
    .gte('effective_at', weekStart.toISOString())
    .lt('effective_at', validUntil.toISOString())
    .order('effective_at', { ascending: false });

  if (error) return { fxLock: null, error: error.message };

  let rows = (Array.isArray(data) ? data : []) as FxRow[];

  if (!rows.length) {
    const latest = await db
      .from('exchange_rates')
      .select('rate, provider, effective_at, fetched_at')
      .eq('base_currency', sourceCurrency)
      .eq('quote_currency', quoteCurrency)
      .lte('effective_at', now.toISOString())
      .order('effective_at', { ascending: false })
      .order('fetched_at', { ascending: false })
      .limit(7);
    if (latest.error) return { fxLock: null, error: latest.error.message };
    rows = (Array.isArray(latest.data) ? latest.data : []) as FxRow[];
  }

  const numericRates = rows.map((row) => Number(row.rate)).filter((rate) => Number.isFinite(rate) && rate > 0);
  if (!numericRates.length) {
    return { fxLock: null, error: `Missing ${sourceCurrency}/${quoteCurrency} exchange rate. Add weekly exchange_rates rows before quoting in ${quoteCurrency}.` };
  }

  const averageRate = Number((numericRates.reduce((sum, rate) => sum + rate, 0) / numericRates.length).toFixed(6));
  const newest = rows[0] ?? null;

  return {
    fxLock: {
      source_currency: sourceCurrency,
      quote_currency: quoteCurrency,
      fx_rate: averageRate,
      fx_week_start: weekStart.toISOString(),
      fx_valid_until: validUntil.toISOString(),
      provider: newest?.provider ?? 'weekly_average',
      effective_at: newest?.effective_at ?? null,
    },
  };
}

export function convertQuoteLinePrice(args: {
  catalogAmount?: number | null;
  catalogCurrency?: string | null;
  quoteCurrency?: string | null;
  fxLock?: QuoteFxLock | null;
}) {
  const catalogAmount = typeof args.catalogAmount === 'number' ? Number(args.catalogAmount) : null;
  if (catalogAmount == null || !Number.isFinite(catalogAmount)) return null;
  const catalogCurrency = normalizeCurrencyCode(args.catalogCurrency) ?? normalizeCurrencyCode(args.quoteCurrency) ?? 'USD';
  const quoteCurrency = normalizeCurrencyCode(args.quoteCurrency) ?? catalogCurrency;
  if (catalogCurrency === quoteCurrency) return Number(catalogAmount.toFixed(2));
  if (args.fxLock?.source_currency === catalogCurrency && args.fxLock.quote_currency === quoteCurrency) {
    return Number((catalogAmount * Number(args.fxLock.fx_rate)).toFixed(2));
  }
  return null;
}
