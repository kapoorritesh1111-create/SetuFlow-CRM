export type { SettingsListsData } from '@/lib/queries/data';

export async function getSettingsListsData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getSettingsListsData(organizationId);
}
