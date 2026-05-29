import type { SetuGuruLiveResearchMode } from './live-research';

type SourceType = 'official' | 'trade_reference' | 'market_reference' | 'internal_review';
type FetchStatus = 'fetched' | 'unavailable' | 'internal_review_only';

export type SetuGuruSourceSearchInput = {
  mode: SetuGuruLiveResearchMode;
  question: string;
  product?: string;
  country?: string;
};

export type SetuGuruTrustedSource = {
  id: string;
  title: string;
  url: string;
  sourceType: SourceType;
  why: string;
  searchHint: string;
};

export type SetuGuruSourceSearchResult = SetuGuruTrustedSource & {
  fetchedAt: string;
  fetchStatus: FetchStatus;
  confidence: 'low' | 'medium' | 'high';
  excerpt: string;
  searchUrl: string;
};

const FETCH_TIMEOUT_MS = 4500;
const MAX_EXCERPT_LENGTH = 520;

const TRUSTED_SOURCES: Record<SetuGuruLiveResearchMode, SetuGuruTrustedSource[]> = {
  hsn_enrichment: [
    { id: 'wco-hs', title: 'World Customs Organization HS Nomenclature', url: 'https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx', sourceType: 'official', why: 'Use for HS chapter and heading structure before selecting a product code.', searchHint: 'HS nomenclature chapter heading notes' },
    { id: 'icegate', title: 'India ICEGATE customs portal', url: 'https://www.icegate.gov.in/', sourceType: 'official', why: 'Use for India-specific HSN/tariff validation when India is the origin or destination context.', searchHint: 'India HSN tariff customs code' },
    { id: 'us-hts', title: 'US Harmonized Tariff Schedule', url: 'https://hts.usitc.gov/', sourceType: 'official', why: 'Use for US HTS candidates, notes, and duty references when the US is the destination context.', searchHint: 'US HTS tariff code duty' },
    { id: 'eu-access2markets', title: 'EU Access2Markets', url: 'https://trade.ec.europa.eu/access-to-markets/en/home', sourceType: 'official', why: 'Use for EU import requirements, tariffs, and product-specific market access checks.', searchHint: 'EU import tariff requirements commodity code' },
  ],
  document_requirements: [
    { id: 'eu-access2markets', title: 'EU Access2Markets', url: 'https://trade.ec.europa.eu/access-to-markets/en/home', sourceType: 'official', why: 'Use for destination-specific EU import requirements, duties, and document guidance.', searchHint: 'EU import document requirements duties measures' },
    { id: 'uk-trade-tariff', title: 'UK Trade Tariff', url: 'https://www.gov.uk/trade-tariff', sourceType: 'official', why: 'Use for UK commodity codes, duties, measures, and import document checks.', searchHint: 'UK trade tariff import documents commodity code' },
    { id: 'us-cbp', title: 'US Customs and Border Protection import guidance', url: 'https://www.cbp.gov/trade/basic-import-export', sourceType: 'official', why: 'Use for US import process, document, customs, and compliance review.', searchHint: 'US CBP import documents customs guidance' },
    { id: 'icegate', title: 'India ICEGATE customs portal', url: 'https://www.icegate.gov.in/', sourceType: 'official', why: 'Use for India customs references and import/export document checks.', searchHint: 'India customs export import documents ICEGATE' },
  ],
  margin_benchmark: [
    { id: 'trade-gov-ccg', title: 'Trade.gov Country Commercial Guides', url: 'https://www.trade.gov/ccg-landing-page', sourceType: 'trade_reference', why: 'Use for market structure, channel, distribution, and commercial environment context.', searchHint: 'country commercial guide distribution market channel margin' },
    { id: 'itc-trade-map', title: 'International Trade Centre Trade Map', url: 'https://www.intracen.org/resources/tools/trade-map', sourceType: 'market_reference', why: 'Use for trade flow context before deciding whether a margin benchmark is reasonable.', searchHint: 'trade map import export flows market benchmark' },
    { id: 'world-bank-data', title: 'World Bank Data', url: 'https://data.worldbank.org/', sourceType: 'market_reference', why: 'Use for macro market context that may affect landed-cost and channel assumptions.', searchHint: 'world bank data market macro logistics cost' },
    { id: 'internal-pricing', title: 'SETU Flow pricing defaults and quote history', url: 'internal:setu-flow-pricing-defaults', sourceType: 'internal_review', why: 'Use internal organization defaults and prior quote context before saving any new margin assumption.', searchHint: 'internal pricing defaults quote history margin' },
  ],
};

function compactText(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function queryTerms(input: SetuGuruSourceSearchInput) {
  return [input.product, input.country, input.question]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 3)
    .slice(0, 12);
}

function findBestExcerpt(text: string, terms: string[]) {
  if (!text) return 'Source did not return readable preview text. Open the source to verify the latest official details.';
  const lower = text.toLowerCase();
  const index = terms.map((term) => lower.indexOf(term)).filter((item) => item >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, index - 120);
  return text.slice(start, start + MAX_EXCERPT_LENGTH).trim() || text.slice(0, MAX_EXCERPT_LENGTH).trim();
}

function sourceConfidence(status: FetchStatus, excerpt: string) {
  if (status === 'fetched' && !excerpt.startsWith('Source did not return')) return 'medium' as const;
  if (status === 'internal_review_only') return 'medium' as const;
  return 'low' as const;
}

function buildSearchUrl(source: SetuGuruTrustedSource, input: SetuGuruSourceSearchInput) {
  if (source.url.startsWith('internal:')) return source.url;
  const subject = [input.product, input.country, source.searchHint].filter(Boolean).join(' ');
  const query = encodeURIComponent(subject || input.question || source.searchHint);
  return `${source.url}${source.url.includes('?') ? '&' : '?'}setu_guru_query=${query}`;
}

async function fetchSource(source: SetuGuruTrustedSource, input: SetuGuruSourceSearchInput): Promise<SetuGuruSourceSearchResult> {
  const fetchedAt = new Date().toISOString();
  const searchUrl = buildSearchUrl(source, input);
  if (source.url.startsWith('internal:')) {
    const excerpt = 'Internal review source. Use organization pricing defaults, quote history, and approved CRM records before saving new margin assumptions.';
    return { ...source, fetchedAt, fetchStatus: 'internal_review_only', confidence: sourceConfidence('internal_review_only', excerpt), excerpt, searchUrl };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
      cache: 'no-store',
      signal: controller.signal,
    });
    const rawText = await response.text();
    const readable = compactText(rawText).slice(0, 6000);
    const excerpt = response.ok
      ? findBestExcerpt(readable, queryTerms(input))
      : `Source returned HTTP ${response.status}. Open the source directly and verify current details before using this guidance.`;
    const fetchStatus: FetchStatus = response.ok ? 'fetched' : 'unavailable';
    return { ...source, fetchedAt, fetchStatus, confidence: sourceConfidence(fetchStatus, excerpt), excerpt, searchUrl };
  } catch {
    const excerpt = 'Source preview could not be fetched in time. Open the source directly and treat the answer as a draft until reviewed.';
    return { ...source, fetchedAt, fetchStatus: 'unavailable', confidence: 'low', excerpt, searchUrl };
  } finally {
    clearTimeout(timeout);
  }
}

export function getSetuGuruTrustedSources(mode: SetuGuruLiveResearchMode) {
  return TRUSTED_SOURCES[mode] ?? [];
}

export async function runSetuGuruSourceSearch(input: SetuGuruSourceSearchInput) {
  const sources = getSetuGuruTrustedSources(input.mode);
  const results = await Promise.all(sources.map((source) => fetchSource(source, input)));
  return {
    researchStatus: 'live_source_search',
    requiresHumanApproval: true,
    query: [input.product, input.country, input.question].filter(Boolean).join(' · '),
    fetchedAt: new Date().toISOString(),
    results,
    warnings: [
      'Source previews are draft research aids, not final compliance decisions.',
      'Human approval is required before HS/HSN, duty, document, margin, compliance, or quote/order write-back.',
    ],
  };
}
