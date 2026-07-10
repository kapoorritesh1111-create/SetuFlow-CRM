import { GrowthCenter } from '@/features/setu-guru/growth-center';
import { getGrowthCenterRecommendations } from '@/lib/setu-guru/recommendations';
import { listTopFitOpportunities } from '@/lib/setu-guru/opportunity-finder';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function GrowthAgentPage() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return (
      <GrowthCenter
        organizationName={workspace.organization?.name}
        recommendations={[]}
        history={[]}
        opportunities={[]}
        icpConfigured={false}
        tradeEvents={[]}
      />
    );
  }

  const supabase = await createClient();
  const client = supabase as any;

  const [recommendations, opportunityResult, tradeEventsResult] = await Promise.all([
    getGrowthCenterRecommendations(organizationId),
    listTopFitOpportunities(organizationId),
    client
      .from('trade_events')
      .select('id,name,starts_on,ends_on')
      .eq('organization_id', organizationId)
      .order('starts_on', { ascending: false })
      .limit(5),
  ]);

  return (
    <GrowthCenter
      organizationName={workspace.organization?.name}
      recommendations={recommendations.open}
      history={recommendations.history}
      opportunities={opportunityResult.opportunities}
      icpConfigured={opportunityResult.icpConfigured}
      tradeEvents={tradeEventsResult.data ?? []}
    />
  );
}
