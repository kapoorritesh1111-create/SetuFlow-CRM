import { GrowthCenter } from '@/features/setu-guru/growth-center';
import { getSetuGuruAuditHistory } from '@/lib/setu-guru/audit-history';
import { getGrowthCenterRecommendations } from '@/lib/setu-guru/recommendations';
import { listTopFitOpportunities } from '@/lib/setu-guru/opportunity-finder';
import { listExternalDiscovery } from '@/lib/setu-guru/external-discovery';
import { listCrmMatchCampaigns } from '@/lib/setu-guru/crm-match-campaigns';
import { listIcpProfiles } from '@/lib/setu-guru/icp';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function GrowthAgentPage({ searchParams }: { searchParams?: { profile_id?: string } }) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return <GrowthCenter organizationName={workspace.organization?.name} recommendations={[]} history={[]} opportunities={[]} icpConfigured={false} tradeEvents={[]} auditItems={[]} discoveryCampaigns={[]} externalOpportunities={[]} />;
  }

  const supabase = await createClient();
  const client = supabase as any;

  const [recommendations, opportunityResult, tradeEventsResult, auditHistory, discovery, icpProfiles, crmMatchCampaigns] = await Promise.all([
    getGrowthCenterRecommendations(organizationId),
    listTopFitOpportunities(organizationId, 1000, searchParams?.profile_id ?? null),
    client.from('trade_events').select('id,name,starts_on,ends_on').eq('organization_id', organizationId).order('starts_on', { ascending: false }).limit(5),
    getSetuGuruAuditHistory(organizationId),
    listExternalDiscovery(organizationId).catch(() => ({ campaigns: [], opportunities: [] })),
    listIcpProfiles(organizationId).catch(() => []),
    listCrmMatchCampaigns(organizationId).catch(() => []),
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
    />
  );
}
