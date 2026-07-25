// S48/S50 provider-agnostic external research orchestration.
// Provider output is evidence-only: no company, contact, country, or need is inferred unless
// the provider returns a source URL and supporting text. CRM conversion remains a separate
// explicit human action.

export type DiscoverySearchInput = {
  countries: string[];
  products: string[];
  buyerTypes: string[];
  verticalProfile?: Record<string, unknown>;
};

export type ProviderCandidate = {
  companyName: string;
  country?: string | null;
  companyType?: string | null;
  websiteUrl?: string | null;
  sourceLabel: string;
  sourceUrl?: string | null;
  evidence?: Record<string, unknown>[];
  contacts?: Array<{ fullName?: string; title?: string; email?: string; phone?: string; sourceUrl?: string; confidence?: number }>;
};

export type ProviderSearchResult = {
  candidates: ProviderCandidate[];
  providerCostAmount: number;
  providerCostCurrency: string;
  disabled: boolean;
  message: string;
};

export type ExternalDiscoveryProvider = {
  key: string;
  label: string;
  capabilities: string[];
  configured: boolean;
  search(input: DiscoverySearchInput): Promise<ProviderSearchResult>;
};

const manualProvider: ExternalDiscoveryProvider = {
  key: 'manual', label: 'Manual research', capabilities: ['manual_intake'], configured: true,
  async search() { return { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: true, message: 'No licensed external discovery provider is configured. No companies were generated. Configure EXA_API_KEY or continue with human-reviewed manual research.' }; },
};

function profileList(profile: Record<string, unknown> | undefined, key: string) { const value = profile?.[key]; return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
function buildPackagingSearchQuery(input: DiscoverySearchInput) {
  const profile = input.verticalProfile ?? {}; const families = profileList(profile, 'packaging_families'); const sectors = profileList(profile, 'end_use_sectors'); const services = profileList(profile, 'services');
  const markets = input.countries.length ? `in ${input.countries.slice(0, 6).join(', ')}` : ''; const targets = input.buyerTypes.length ? input.buyerTypes.slice(0, 8).join(', ') : 'brand owners and manufacturers';
  const needs = [...input.products, ...families, ...services].filter(Boolean).slice(0, 12).join(', '); const sectorText = sectors.length ? ` serving ${sectors.slice(0, 8).join(', ')}` : '';
  return `Find real companies ${markets} that are ${targets}${sectorText} and have evidence of buying, launching, sourcing, or using ${needs || 'printed packaging, labels, pouches, roll stock, or packaging design services'}. Prefer official company pages, product launch pages, exhibitor directories, procurement notices, and trade associations. Return only source-backed organizations.`;
}
function pageTitleToCompany(title: unknown, url: unknown) { const clean = String(title ?? '').split(/[|–—-]/)[0]?.trim(); if (clean && clean.length >= 2 && clean.length <= 160) return clean; try { return new URL(String(url)).hostname.replace(/^www\./, '').split('.')[0]?.replace(/[-_]/g, ' ') || ''; } catch { return ''; } }

const exaProvider: ExternalDiscoveryProvider = {
  key: 'exa', label: 'Exa licensed web discovery', capabilities: ['web_search', 'source_evidence', 'packaging_market_signals', 'official_pages'], configured: Boolean(process.env.EXA_API_KEY),
  async search(input) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return { candidates: [], providerCostAmount: 0, providerCostCurrency: 'USD', disabled: true, message: 'Exa is available but EXA_API_KEY is not configured. No research was run.' };
    const query = buildPackagingSearchQuery(input);
    const response = await fetch('https://api.exa.ai/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ query, type: 'auto', numResults: 25, contents: { text: { maxCharacters: 1800 }, highlights: { numSentences: 4 } } }), cache: 'no-store' });
    if (!response.ok) throw new Error(`Licensed discovery provider returned HTTP ${response.status}.`);
    const payload = await response.json() as { results?: Array<Record<string, unknown>>; costDollars?: { total?: number } }; const candidates: ProviderCandidate[] = []; const seenDomains = new Set<string>();
    for (const result of payload.results ?? []) {
      const sourceUrl = String(result.url ?? '').trim(); if (!sourceUrl) continue; let domain = ''; try { domain = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase(); } catch { continue; }
      if (!domain || seenDomains.has(domain)) continue; seenDomains.add(domain); const companyName = pageTitleToCompany(result.title, sourceUrl); if (!companyName) continue;
      const bodyText = String(result.text ?? '').slice(0, 1800); const highlights = Array.isArray(result.highlights) ? result.highlights.map(String).slice(0, 6) : [];
      candidates.push({ companyName, country: null, companyType: null, websiteUrl: `https://${domain}`, sourceLabel: 'Exa licensed web discovery', sourceUrl, evidence: [{ type: 'provider_search_result', title: result.title ?? companyName, url: sourceUrl, text: bodyText, highlights, query, provider: 'exa', fetched_at: new Date().toISOString() }], contacts: [] });
    }
    return { candidates, providerCostAmount: Number(payload.costDollars?.total ?? 0), providerCostCurrency: 'USD', disabled: false, message: `Exa returned ${candidates.length} source-backed candidate${candidates.length === 1 ? '' : 's'}. Every result still requires human verification before CRM conversion or outreach.` };
  },
};

const registry = new Map<string, ExternalDiscoveryProvider>([[manualProvider.key, manualProvider], [exaProvider.key, exaProvider]]);
export function registerDiscoveryProvider(provider: ExternalDiscoveryProvider) { registry.set(provider.key, provider); }
export function getDefaultDiscoveryProvider(): ExternalDiscoveryProvider { return Array.from(registry.values()).find((provider) => provider.key !== 'manual' && provider.configured) ?? manualProvider; }
export function getDiscoveryProvider(key: string): ExternalDiscoveryProvider {
  // Existing clients historically submit "manual". Prefer the licensed provider when configured,
  // while preserving the truthful manual/disabled result when no credential exists.
  if ((key === 'manual' || key === 'auto') && getDefaultDiscoveryProvider().key !== 'manual') return getDefaultDiscoveryProvider();
  return registry.get(key) ?? manualProvider;
}
export function listDiscoveryProviders(): ExternalDiscoveryProvider[] { return Array.from(registry.values()); }
