export type { LeadProfileData, LeadsPageData } from '@/lib/queries/data';

export async function getLeadsPageData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getLeadsPageData(organizationId);
}

export async function getLeadProfileData(organizationId: string, leadId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getLeadProfileData(organizationId, leadId);
}
