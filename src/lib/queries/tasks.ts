export type { TasksWorkspaceData } from '@/lib/queries/data';

export async function getTasksWorkspaceData(organizationId: string) {
  const queryModule = await import('@/lib/queries/data');
  return queryModule.getTasksWorkspaceData(organizationId);
}
