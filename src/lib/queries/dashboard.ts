export type { DashboardData } from '@/lib/queries/data';

export async function getDashboardData(
  organizationId: string,
  scope?: import('@/features/dashboard/types').DashboardScope,
) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getDashboardData(organizationId, scope);
}
