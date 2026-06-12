/**
 * S24-ADMUX-31 — Live sidebar status dots per the Admin UX V2 design contract:
 *   markets:    red when zero (blocks pipelines), green otherwise
 *   pipelines:  green only when pipelines AND stages exist
 *   categories: green when categories exist (Catalog)
 *   trade-events: green when at least one event exists
 *   pricing-engine: green only when approval threshold is set
 * Returns a dot map consumed by AdminSettingsShell's navDots prop, plus the raw
 * counts so pages can reuse them for chips without re-querying.
 */
export type AdminNavSignals = {
  dots: Partial<Record<string, 'ok' | 'warn' | 'danger'>>;
  counts: {
    markets: number;
    countries: number;
    pipelines: number;
    stages: number;
    categories: number;
    products: number;
    events: number;
    threshold: number | null;
  };
};

type CountCapableClient = { from: (table: string) => any };

export async function getAdminNavSignals(
  supabase: CountCapableClient,
  organizationId: string,
  approvalThresholdPct: number | null | undefined,
): Promise<AdminNavSignals> {
  const [marketsRes, countriesRes, pipelinesRes, stagesRes, categoriesRes, productsRes, eventsRes] = await Promise.all([
    supabase.from('markets').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('countries').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('pipelines').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('pipeline_stages')
      .select('id, pipelines!inner(organization_id)', { count: 'exact', head: true })
      .eq('pipelines.organization_id', organizationId),
    supabase.from('product_categories').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('trade_events').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
  ]);

  const counts = {
    markets: marketsRes.count ?? 0,
    countries: countriesRes.count ?? 0,
    pipelines: pipelinesRes.count ?? 0,
    stages: stagesRes.count ?? 0,
    categories: categoriesRes.count ?? 0,
    products: productsRes.count ?? 0,
    events: eventsRes.count ?? 0,
    threshold: typeof approvalThresholdPct === 'number' ? approvalThresholdPct : null,
  };

  const dots: AdminNavSignals['dots'] = {
    markets: counts.markets === 0 ? 'danger' : 'ok',
    pipelines: counts.pipelines > 0 && counts.stages > 0 ? 'ok' : 'warn',
    categories: counts.categories > 0 ? 'ok' : 'warn',
    'trade-events': counts.events > 0 ? 'ok' : 'warn',
    'pricing-engine': counts.threshold != null ? 'ok' : 'warn',
  };

  return { dots, counts };
}
