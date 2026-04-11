export type { TradeEventsData } from '@/lib/queries/data';

export async function getTradeEventsData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getTradeEventsData(organizationId);
}
