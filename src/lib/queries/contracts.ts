export type { ContractsWorkspaceData } from '@/lib/queries/data';

export async function getContractsWorkspaceData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getContractsWorkspaceData(organizationId);
}
