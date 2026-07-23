// S48-GROWTH-013: provider-agnostic external research orchestration.
//
// This registry keeps provider-specific logic out of UI components and API routes.
// Every provider implements the same narrow contract so Setu Flow can add or replace
// external research sources without rewriting the campaign/job workflow.
//
// IMPORTANT: no production trade-data, registry, or enrichment provider is configured
// in this environment (no provider secret exists in .env.production.example). Rather
// than fabricate results, the registry exposes a single honest "manual" provider that
// returns zero candidates and a clear disabled message. This satisfies the requirement
// that Setu Flow never claim external research happened when it did not.

export type DiscoverySearchInput = {
  countries: string[];
  products: string[];
  buyerTypes: string[];
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

/**
 * Safe disabled-state provider. Returns no candidates and never fabricates a company,
 * evidence, or contact. Used whenever no licensed/production provider is configured.
 */
const manualProvider: ExternalDiscoveryProvider = {
  key: 'manual',
  label: 'Manual research (no provider configured)',
  capabilities: ['manual_intake'],
  configured: true,
  async search() {
    return {
      candidates: [],
      providerCostAmount: 0,
      providerCostCurrency: 'USD',
      disabled: true,
      message:
        'No production external discovery provider is configured for this organization. Run this campaign manually — add companies through Save to CRM after your own research — or connect a licensed provider before running an automated job.',
    };
  },
};

const registry = new Map<string, ExternalDiscoveryProvider>([[manualProvider.key, manualProvider]]);

export function registerDiscoveryProvider(provider: ExternalDiscoveryProvider) {
  registry.set(provider.key, provider);
}

export function getDiscoveryProvider(key: string): ExternalDiscoveryProvider {
  return registry.get(key) ?? manualProvider;
}

export function listDiscoveryProviders(): ExternalDiscoveryProvider[] {
  return Array.from(registry.values());
}
