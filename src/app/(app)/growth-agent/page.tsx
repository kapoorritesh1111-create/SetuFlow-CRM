import { GrowthCenter } from '@/features/setu-guru/growth-center';
import { getGrowthCenterRecommendations } from '@/lib/setu-guru/recommendations';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function GrowthAgentPage() {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return <GrowthCenter organizationName={workspace.organization?.name} recommendations={[]} history={[]} />;
  }

  const recommendations = await getGrowthCenterRecommendations(organizationId);

  return (
    <GrowthCenter
      organizationName={workspace.organization?.name}
      recommendations={recommendations.open}
      history={recommendations.history}
    />
  );
}
