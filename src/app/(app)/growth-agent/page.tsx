import { GrowthCenter } from '@/components/setu-guru/growth-center';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function GrowthAgentPage() {
  const workspace = await requireWorkspace();

  return <GrowthCenter organizationName={workspace.organization?.name} />;
}
