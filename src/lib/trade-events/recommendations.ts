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

const words = (value: unknown): string[] => String(value ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
const objectValue = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const arrayValue = (value: unknown): string[] => Array.isArray(value) ? value.map((item) => String(item)) : [];

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
  if (catalogResult.error) return [];

  const industry = String(profileResult.data?.industry_key ?? '').toLowerCase();
  const productTokens: Set<string> = new Set<string>((productsResult.data ?? []).flatMap((product: any) => [...words(product.name), ...words(product.description)]));
  const marketTokens: Set<string> = new Set<string>((marketsResult.data ?? []).flatMap((market: any) => [...words(market.name), ...words(market.market_code)]));
  const dismissed: Set<string> = new Set<string>((feedbackResult.data ?? []).filter((row: any) => row.feedback === 'not_relevant').map((row: any) => String(row.catalog_event_id)));
  const history = buildTradeEventHistoryRows(data);

  const recommendations: TradeEventRecommendation[] = [];
  for (const event of catalogResult.data ?? []) {
    if (dismissed.has(String(event.id))) continue;
    if (String(event.status ?? '').toLowerCase() === 'cancelled') continue;
    if (event.ends_on && event.ends_on < today) continue;
    if (data.events.some((attendance) => classifyTradeEventMatch(attendance, event) === 'exact')) continue;

    const tags: string[] = arrayValue(event.vertical_tags).map((tag) => tag.toLowerCase());
    const metadata = objectValue(event.metadata);
    const metadataTokens: Set<string> = new Set<string>([...arrayValue(metadata.product_tags), ...arrayValue(metadata.buyer_types), ...arrayValue(metadata.markets)].flatMap((item) => words(item)));
    const industryTokens: Set<string> = new Set<string>(words(industry));
    const verticalMatch = tags.some((tag) => industry.includes(tag) || words(tag).some((token) => industryTokens.has(token)));
    const productMatchCount = [...productTokens].filter((token: string) => tags.some((tag: string) => tag.includes(token)) || metadataTokens.has(token)).length;
    const marketMatch = [event.country, event.city, ...arrayValue(metadata.markets)].flatMap((item) => words(item)).some((token: string) => marketTokens.has(token));
    if (industry && tags.length && !verticalMatch && productMatchCount === 0) continue;

    let score = 10;
    const reasons: string[] = [];
    if (verticalMatch) { score += 40; reasons.push(`Matches your ${industry || 'industry'} profile`); }
    if (productMatchCount > 0) { score += Math.min(25, productMatchCount * 5); reasons.push('Matches products in your catalog'); }
    if (marketMatch) { score += 15; reasons.push('Fits an active target market'); }

    const baseName = normalizeTradeEventName(String(event.name ?? '').replace(/\b20\d{2}\b/g, ''));
    const prior = history.find((row) => normalizeTradeEventName(String(row.event.name ?? '').replace(/\b20\d{2}\b/g, '')) === baseName && Boolean(baseName));
    if (prior?.outcome.orderCount || prior?.outcome.roiMultiple != null) {
      score += 25;
      reasons.push(`Prior edition produced ${prior.outcome.orderCount} order${prior.outcome.orderCount === 1 ? '' : 's'}${prior.outcome.roiMultiple == null ? '' : ` and ${prior.outcome.roiMultiple.toFixed(2)}× revenue/spend`}`);
    } else if (prior?.qualified) {
      score += 10;
      reasons.push(`Prior edition produced ${prior.qualified} qualified conversations`);
    }

    if (!reasons.length) continue;
    recommendations.push({ id: String(event.id), name: String(event.name), city: event.city ?? null, country: event.country ?? null, startsOn: event.starts_on ?? null, endsOn: event.ends_on ?? null, websiteUrl: event.website_url ?? null, score: Math.min(100, score), reasons });
  }

  return recommendations.sort((left, right) => right.score - left.score || String(left.startsOn ?? '').localeCompare(String(right.startsOn ?? ''))).slice(0, 12);
}
