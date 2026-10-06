import { GrowthCenter } from '@/features/setu-guru/growth-center';
import { getSetuGuruAuditHistory } from '@/lib/setu-guru/audit-history';
import { getGrowthCenterRecommendations } from '@/lib/setu-guru/recommendations';
import { generateRecommendationsForOrganization } from '@/lib/setu-guru/recommendation-generator';
import { listTopFitOpportunities } from '@/lib/setu-guru/opportunity-finder';
import { listGuidedExternalDiscovery } from '@/lib/setu-guru/external-discovery-campaigns';
import { listCrmMatchCampaigns } from '@/lib/setu-guru/crm-match-campaigns';
import { listIcpProfiles } from '@/lib/setu-guru/icp';
import { isPackagingOrganization } from '@/lib/verticals/capability';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import type { PackagingPricingIntelligenceData } from '@/features/setu-guru/packaging-pricing-intelligence-workspace';

export const dynamic = 'force-dynamic';

async function loadPackagingPricingIntelligence(client:any, organizationId:string): Promise<PackagingPricingIntelligenceData | null> {
  const familiesResult = await client.from('packaging_service_families')
    .select('id,name,slug,is_quoteable,pricing_engine_type,is_active,sort_order')
    .eq('organization_id', organizationId).eq('is_active', true).order('sort_order');
  if (familiesResult.error) return null;
  const families = familiesResult.data ?? [];
  const familyIds = families.map((item:any)=>String(item.id));
  const templatesResult = familyIds.length ? await client.from('packaging_pricing_templates')
    .select('id,family_id,status,is_active,calculation_version,calculation_engine_key,published_at,created_at')
    .eq('organization_id',organizationId).in('family_id',familyIds).eq('calculation_version',5)
    .order('created_at',{ascending:false}) : {data:[],error:null};
  const templates = templatesResult.data ?? [];
  const publishedByFamily = new Map<string,number>();
  for (const row of templates) if(row.status==='published' && row.is_active) publishedByFamily.set(String(row.family_id),(publishedByFamily.get(String(row.family_id))??0)+1);
  const familyRows = families.map((f:any)=>({
    name:String(f.name),slug:String(f.slug),is_quoteable:Boolean(f.is_quoteable),pricing_engine_type:f.pricing_engine_type?String(f.pricing_engine_type):null,
    published_templates:publishedByFamily.get(String(f.id))??0,
  }));

  const supFamily = families.find((f:any)=>String(f.slug)==='standup-pouches');
  const currentSupTemplate = supFamily ? templates.find((t:any)=>String(t.family_id)===String(supFamily.id) && t.status==='published' && t.is_active && t.calculation_engine_key==='sup_formula_v5') : null;

  let currentSup:PackagingPricingIntelligenceData['currentSup']=null;
  let bucketMap:PackagingPricingIntelligenceData['bucketMap']=[];
  if(currentSupTemplate?.id){
    const templateId=String(currentSupTemplate.id);
    const [sizes,constructions,bands,costRates,chargeRates,chargeLinks,charges] = await Promise.all([
      client.from('packaging_size_profiles_v5').select('name,pricing_bucket,is_active,is_quoteable,sort_order').eq('organization_id',organizationId).eq('template_id',templateId).eq('is_active',true).order('sort_order'),
      client.from('packaging_constructions_v5').select('id,is_active,is_quoteable').eq('organization_id',organizationId).eq('template_id',templateId).eq('is_active',true),
      client.from('packaging_pricing_commercial_bands_v5').select('id').eq('organization_id',organizationId).eq('template_id',templateId),
      client.from('packaging_pricing_cost_rates_v5').select('current_rate').eq('organization_id',organizationId).eq('template_id',templateId),
      client.from('packaging_pricing_charge_rates_v5').select('charge_master_item_id,current_rate').eq('organization_id',organizationId).eq('template_id',templateId),
      client.from('packaging_charge_master_family_links').select('charge_master_item_id').eq('organization_id',organizationId).eq('family_id',String(supFamily.id)),
      client.from('packaging_charge_master_items').select('id,is_active').eq('organization_id',organizationId).eq('is_active',true),
    ]);
    const linkedIds=new Set((chargeLinks.data??[]).map((x:any)=>String(x.charge_master_item_id)));
    const activeLinked=new Set((charges.data??[]).filter((x:any)=>linkedIds.has(String(x.id))).map((x:any)=>String(x.id)));
    const rateMap=new Map((chargeRates.data??[]).map((x:any)=>[String(x.charge_master_item_id),x.current_rate]));
    const missingChargeRates=Array.from(activeLinked).filter(id=>!rateMap.has(id)||rateMap.get(id)==null).length;
    currentSup={
      templateId,publishedAt:currentSupTemplate.published_at??null,
      sizes:(sizes.data??[]).filter((x:any)=>x.is_quoteable).length,
      constructions:(constructions.data??[]).filter((x:any)=>x.is_quoteable).length,
      bands:(bands.data??[]).length,costRates:(costRates.data??[]).length,chargeRates:(chargeRates.data??[]).length,missingChargeRates,
    };
    const grouped=new Map<number,string[]>();
    for(const row of (sizes.data??[]).filter((x:any)=>x.is_quoteable)){
      const key=Number(row.pricing_bucket); const list=grouped.get(key)??[]; list.push(String(row.name)); grouped.set(key,list);
    }
    bucketMap=Array.from(grouped.entries()).sort((a,b)=>a[0]-b[0]).map(([bucket,sizes])=>({bucket,sizes}));
  }

  const [quotesResult,ordersResult,benchmarksResult] = await Promise.all([
    client.from('quotes').select('id,approved_at,status').eq('organization_id',organizationId),
    client.from('orders').select('id').eq('organization_id',organizationId),
    client.from('packaging_pricing_competitor_benchmarks_v5').select('id,competitor_name').eq('organization_id',organizationId),
  ]);
  const quoteIds=(quotesResult.data??[]).map((x:any)=>String(x.id));
  const discountLinesResult=quoteIds.length
    ? await client.from('quote_line_items').select('id').in('quote_id',quoteIds).eq('is_price_overridden',true)
    : {data:[],error:null};
  const discountCount=(discountLinesResult.data??[]).length;
  const benchmarkNames=(benchmarksResult.data??[]).map((x:any)=>String(x.competitor_name??'').trim()).filter(Boolean);
  const trackedCompetitors=Array.from(new Set(['Swiss Pac','Trigon Digipack','Spectal Pack','Hora Art Centre',...benchmarkNames]));

  return {
    families:familyRows,
    activeFamilyCount:familyRows.length,
    setupFamilyCount:familyRows.filter((x:any)=>x.published_templates===0).length,
    currentSup,
    quoteCount:(quotesResult.data??[]).length,
    approvedQuoteCount:(quotesResult.data??[]).filter((x:any)=>x.approved_at || String(x.status).toLowerCase()==='approved').length,
    orderCount:(ordersResult.data??[]).length,
    discountCount,
    benchmarkCount:(benchmarksResult.data??[]).length,
    trackedCompetitors,
    bucketMap,
  };
}

export default async function GrowthAgentPage({ searchParams }: { searchParams?: { profile_id?: string } }) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return <GrowthCenter organizationName={workspace.organization?.name} recommendations={[]} history={[]} opportunities={[]} icpConfigured={false} tradeEvents={[]} auditItems={[]} discoveryCampaigns={[]} externalOpportunities={[]} packagingEnabled={false} />;
  }

  const supabase = await createClient();
  const client = supabase as any;
  const packagingEnabled = await isPackagingOrganization(organizationId, supabase);

  // Recommendations are deterministic and idempotent. Refreshing Growth Center reconciles
  // open work with live organization state so Packaging clients do not see an empty queue
  // while quote, proof, production, or dispatch blockers already exist.
  await generateRecommendationsForOrganization(organizationId).catch((error) => {
    console.error('[growth-agent] recommendation reconciliation failed', { organizationId, error });
  });

  const [recommendations, opportunityResult, tradeEventsResult, auditHistory, discovery, icpProfiles, crmMatchCampaigns, packagingPricingIntelligence] = await Promise.all([
    getGrowthCenterRecommendations(organizationId),
    listTopFitOpportunities(organizationId, 1000, searchParams?.profile_id ?? null),
    client.from('trade_events').select('id,name,starts_on,ends_on').eq('organization_id', organizationId).order('starts_on', { ascending: false }).limit(5),
    getSetuGuruAuditHistory(organizationId),
    listGuidedExternalDiscovery(organizationId).catch(() => ({ campaigns: [], opportunities: [] })),
    listIcpProfiles(organizationId).catch(() => []),
    listCrmMatchCampaigns(organizationId).catch(() => []),
    packagingEnabled ? loadPackagingPricingIntelligence(client, organizationId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <GrowthCenter
      organizationName={workspace.organization?.name}
      recommendations={recommendations.open}
      history={recommendations.history}
      opportunities={opportunityResult.opportunities}
      icpConfigured={opportunityResult.icpConfigured}
      tradeEvents={tradeEventsResult.data ?? []}
      auditItems={auditHistory}
      discoveryCampaigns={discovery.campaigns}
      externalOpportunities={discovery.opportunities}
      currentUserId={workspace.profile?.id ?? null}
      icpProfiles={icpProfiles}
      crmMatchCampaigns={crmMatchCampaigns}
      packagingEnabled={packagingEnabled}
      packagingPricingIntelligence={packagingPricingIntelligence}
    />
  );
}
