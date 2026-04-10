import type { CurrencyCode, FxResolutionResult } from '../types';
import type { ExchangeRateRepository, PricingSupabaseClient } from './types';

type ExchangeRateRow = {
  base_currency: string;
  quote_currency: string;
  rate: number;
  provider: string;
  effective_at: string;
  fetched_at: string;
};

export class SupabaseExchangeRateRepository implements ExchangeRateRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async getLatestRate(args: { baseCurrency: 'USD'; displayCurrency: CurrencyCode; asOf?: string | null }): Promise<FxResolutionResult | null> {
    let query = this.db
      .from('exchange_rates')
      .select('base_currency, quote_currency, rate, provider, effective_at, fetched_at')
      .eq('base_currency', args.baseCurrency)
      .eq('quote_currency', args.displayCurrency);

    if (args.asOf) {
      query = query.lte('effective_at', args.asOf);
    }

    const { data, error } = await query
      .order('effective_at', { ascending: false })
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle<ExchangeRateRow>();

    if (error) {
      throw new Error(`Failed to resolve exchange rate for ${args.baseCurrency}/${args.displayCurrency}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      baseCurrency: data.base_currency as 'USD',
      displayCurrency: data.quote_currency as CurrencyCode,
      rate: data.rate,
      provider: data.provider,
      effectiveAt: data.effective_at,
    };
  }
}
