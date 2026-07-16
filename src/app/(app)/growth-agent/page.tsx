import { GrowthCenter } from '@/features/setu-guru/growth-center';
import { getSetuGuruAuditHistory } from '@/lib/setu-guru/audit-history';
import { getGrowthCenterRecommendations } from '@/lib/setu-guru/recommendations';
import { listTopFitOpportunities } from '@/lib/setu-guru/opportunity-finder';
import { listExternalDiscovery } from '@/lib/setu-guru/external-discovery';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function GrowthAgentPage() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return <GrowthCenter organizationName={workspace.organization?.name} recommendations={[]} history={[]} opportunities={[]} icpConfigured={false} tradeEvents={[]} auditItems={[]} discoveryCampaigns={[]} externalOpportunities={[]} />;
  }

  const supabase = await createClient();
  const client = supabase as any;

  const [recommendations, opportunityResult, tradeEventsResult, auditHistory, discovery] = await Promise.all([
    getGrowthCenterRecommendations(organizationId),
    listTopFitOpportunities(organizationId, 1000),
    client.from('trade_events').select('id,name,starts_on,ends_on').eq('organization_id', organizationId).order('starts_on', { ascending: false }).limit(5),
    getSetuGuruAuditHistory(organizationId),
    listExternalDiscovery(organizationId).catch(() => ({ campaigns: [], opportunities: [] })),
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
    />
  );
}
