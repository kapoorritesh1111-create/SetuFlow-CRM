export type { IntegrationsWorkspaceData } from '@/lib/queries/data';

export async function getIntegrationsWorkspaceData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getIntegrationsWorkspaceData(organizationId);
}
