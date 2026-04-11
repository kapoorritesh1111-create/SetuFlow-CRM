import { getLeadsPageData } from './data';

export async function getPipelinePageData(
  ...args: Parameters<typeof getLeadsPageData>
) {
  return getLeadsPageData(...args);
}