import { buildTradeEventHistoryRows } from './history';
import { classifyTradeEventMatch, normalizeTradeEventName } from './identity';
import type { TradeEventsCommandCenterData } from './query';
import { createClient } from '@/lib/supabase/server';

export type TradeEventRecommendation = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  startsOn: string | null;
  endsOn: string | null;
  websiteUrl: string | null;
  score: number;
  reasons: string[];
};

const words = (value: unknown) => String(value ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
const objectValue = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const arrayValue = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

export async function getTradeEventRecommendations(organizationId: string, data: TradeEventsCommandCenterData): Promise<TradeEventRecommendation[]> {
  const db: any = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [catalogResult, profileResult, productsResult, marketsResult, feedbackResult] = await Promise.all([
    db.from('trade_event_catalog').select('id, name, city, country, starts_on, ends_on, website_url, vertical_tags, status, metadata').or(`ends_on.gte.${today},ends_on.is.null`).order('starts_on', { ascending: true, nullsFirst: false }).limit(100),
    db.from('organization_industry_profiles').select('industry_key').eq('organization_id', organizationId).maybeSingle(),
    db.from('products').select('name, description').eq('organization_id', organizationId).eq('is_active', true).limit(100),
    db.from('markets').select('name, market_code').eq('organization_id', organizationId).eq('is_active', true).limit(50),
    db.from('trade_event_recommendation_feedback').select('catalog_event_id, feedback, reason').eq('organization_id', organizationId),
  ]);

  // Catalog/feedback tables are introduced by the PR migration. Until that migration is applied,
  // Discover Events intentionally returns no recommendations rather than fabricating data.
  if (catalogResult.error) return [];

  const industry = String(profileResult.data?.industry_key ?? '').toLowerCase();
  const productTokens = new Set((productsResult.data ?? []).flatMap((product: any) => [...words(product.name), ...words(product.description)]));
  const marketTokens = new Set((marketsResult.data ?? []).flatMap((market: any) => [...words(market.name), ...words(market.market_code)]));
  const dismissed = new Set((feedbackResult.data ?? []).filter((row: any) => row.feedback === 'not_relevant').map((row: any) => String(row.catalog_event_id)));
  const history = buildTradeEventHistoryRows(data);

  return (catalogResult.data ?? []).flatMap((event: any) => {
    if (dismissed.has(String(event.id))) return [];
    if (String(event.status ?? '').toLowerCase() === 'cancelled') return [];
    if (event.ends_on && event.ends_on < today) return [];
    if (data.events.some((attendance) => classifyTradeEventMatch(attendance, event) === 'exact')) return [];

    const tags = arrayValue(event.vertical_tags).map((tag) => tag.toLowerCase());
    const metadata = objectValue(event.metadata);
    const metadataTokens = new Set([...arrayValue(metadata.product_tags), ...arrayValue(metadata.buyer_types), ...arrayValue(metadata.markets)].flatMap(words));
    const industryTokens = new Set(words(industry));
    const verticalMatch = tags.some((tag) => industry.includes(tag) || words(tag).some((token) => industryTokens.has(token)));
    const productMatchCount = [...productTokens].filter((token) => tags.some((tag) => tag.includes(token)) || metadataTokens.has(token)).length;
    const marketMatch = [event.country, event.city, ...arrayValue(metadata.markets)].flatMap(words).some((token) => marketTokens.has(token));
    if (industry && tags.length && !verticalMatch && productMatchCount === 0) return [];

    let score = 10;
    const reasons: string[] = [];
    if (verticalMatch) { score += 40; reasons.push(`Matches your ${industry || 'industry'} profile`); }
    if (productMatchCount > 0) { score += Math.min(25, productMatchCount * 5); reasons.push('Matches products in your catalog'); }
    if (marketMatch) { score += 15; reasons.push('Fits an active target market'); }

    const baseName = normalizeTradeEventName(String(event.name ?? '').replace(/\b20\d{2}\b/g, ''));
    const prior = history.find((row) => normalizeTradeEventName(String(row.event.name ?? '').replace(/\b20\d{2}\b/g, '')) === baseName && baseName);
    if (prior) {
      if (prior.outcome.orderCount > 0 || prior.outcome.roiMultiple != null) { score += 25; reasons.push(`Prior edition produced ${prior.outcome.orderCount} order${prior.outcome.orderCount === 1 ? '' : 's'}${prior.outcome.roiMultiple == null ? '' : ` and ${prior.outcome.roiMultiple.toFixed(2)}× revenue/spend`}`); }
      else if (prior.qualified > 0) { score += 10; reasons.push(`Prior edition produced ${prior.qualified} qualified conversations`); }
    }

    if (!reasons.length) return [];
    return [{ id: String(event.id), name: String(event.name), city: event.city ?? null, country: event.country ?? null, startsOn: event.starts_on ?? null, endsOn: event.ends_on ?? null, websiteUrl: event.website_url ?? null, score: Math.min(100, score), reasons }];
  }).sort((left: TradeEventRecommendation, right: TradeEventRecommendation) => right.score - left.score || String(left.startsOn ?? '').localeCompare(String(right.startsOn ?? ''))).slice(0, 12);
}
