import type { AttentionItem, DashboardStatusTag } from '@/features/dashboard/types';

export type DashboardPriorityBucketId = 'blocked' | 'delayed' | 'today' | 'risk';

export type DashboardPriorityBucket = {
  id: DashboardPriorityBucketId;
  label: string;
  count: number;
  tone: 'danger' | 'warning' | 'info' | 'neutral';
  description: string;
  topItem?: AttentionItem;
};

const STATUS_TO_BUCKET: Partial<Record<DashboardStatusTag, DashboardPriorityBucketId>> = {
  blocked: 'blocked',
  overdue: 'delayed',
  'at-risk': 'risk',
};

export function buildDashboardPriorityBuckets(items: AttentionItem[]): DashboardPriorityBucket[] {
  const blocked = items.filter((item) => STATUS_TO_BUCKET[item.statusTag ?? 'active'] === 'blocked');
  const delayed = items.filter((item) => STATUS_TO_BUCKET[item.statusTag ?? 'active'] === 'delayed' || item.type === 'overdue-task');
  const risk = items.filter((item) => STATUS_TO_BUCKET[item.statusTag ?? 'active'] === 'risk' || item.type === 'quote-risk');
  const today = items.filter((item) => item.severity === 'critical' || item.severity === 'high');

  return [
    {
      id: 'blocked',
      label: 'Blocked work',
      count: blocked.length,
      tone: blocked.length ? 'danger' : 'neutral',
      description: blocked.length ? 'Commercial or execution movement is blocked and needs intervention.' : 'No blocked work is stopping movement right now.',
      topItem: blocked[0],
    },
    {
      id: 'delayed',
      label: 'Delayed work',
      count: delayed.length,
      tone: delayed.length ? 'warning' : 'neutral',
      description: delayed.length ? 'Follow-ups or workflow steps have slipped past their target date.' : 'No delayed work is currently visible.',
      topItem: delayed[0],
    },
    {
      id: 'today',
      label: 'Needs action today',
      count: today.length,
      tone: today.length ? 'info' : 'neutral',
      description: today.length ? 'High-priority actions should be picked up during the current operating cycle.' : 'No urgent same-day actions are currently surfaced.',
      topItem: today[0],
    },
    {
      id: 'risk',
      label: 'Quote / order risk',
      count: risk.length,
      tone: risk.length ? 'warning' : 'neutral',
      description: risk.length ? 'Commercial value is exposed unless the next action is taken.' : 'No major quote or execution risk is currently exposed.',
      topItem: risk[0],
    },
  ];
}
