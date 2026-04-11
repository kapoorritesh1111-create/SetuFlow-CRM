export type { ReportsData } from '@/lib/queries/data';

export async function getReportsData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getReportsData(organizationId);
}
