export {};

declare module '@/lib/setu-guru/discovery-providers' {
  export function getDiscoveryProvider(key: string): {
    key: string;
    label: string;
    capabilities: string[];
    configured: boolean;
    search(input: any): Promise<ProviderSearchResult>;
  };
}
