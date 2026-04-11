export type { AISuggestionsData } from '@/lib/queries/data';

export async function getAISuggestionsData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getAISuggestionsData(organizationId);
}
