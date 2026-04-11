export type { ComplianceWorkspaceData } from '@/lib/queries/data';

export async function getComplianceWorkspaceData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getComplianceWorkspaceData(organizationId);
}
