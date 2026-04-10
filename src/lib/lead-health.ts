export type LeadHealth = 'fresh' | 'overdue' | 'stalled' | 'at_risk';

export type LeadHealthInput = {
  created_at?: string | null;
  updated_at?: string | null;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
  lastActivityAt?: string | null;
  lastStageChangeAt?: string | null;
  stageSortOrder?: number | null;
  stageCount?: number | null;
  isClosedStage?: boolean | null;
  now?: Date;
};

export const LEAD_HEALTH_PRIORITY: Record<LeadHealth, number> = {
  at_risk: 0,
  stalled: 1,
  overdue: 2,
  fresh: 3,
};

export function getLeadHealthLabel(health: LeadHealth) {
  switch (health) {
    case 'at_risk':
      return 'At Risk';
    case 'stalled':
      return 'Stalled';
    case 'overdue':
      return 'Overdue';
    default:
      return 'Fresh';
  }
}

export function getLeadHealthBadgeClasses(health: LeadHealth) {
  switch (health) {
    case 'at_risk':
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    case 'stalled':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'overdue':
      return 'bg-orange-100 text-orange-700 border border-orange-200';
    default:
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  }
}

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLatestDate(values: Array<string | null | undefined>) {
  return values
    .map((value) => toDate(value))
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

function getDaysSince(date: Date | null, now: Date) {
  if (!date) return Number.POSITIVE_INFINITY;
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function isAdvancedStage(stageSortOrder?: number | null, stageCount?: number | null) {
  if (!stageCount || stageCount < 3 || stageSortOrder === null || stageSortOrder === undefined) return false;
  return stageSortOrder >= Math.max(2, Math.ceil(stageCount * 0.6));
}

export function computeLeadHealth(input: LeadHealthInput): LeadHealth {
  const now = input.now ?? new Date();
  const latestActivity = getLatestDate([
    input.lastActivityAt,
    input.lastStageChangeAt,
    input.last_contacted_at,
    input.updated_at,
    input.created_at,
  ]);

  const activityDays = getDaysSince(latestActivity, now);
  const stageDays = getDaysSince(toDate(input.lastStageChangeAt), now);
  const dueFollowUpDate = toDate(input.next_follow_up_at);
  const followUpOverdueDays = dueFollowUpDate ? getDaysSince(dueFollowUpDate, now) : Number.NEGATIVE_INFINITY;

  if (input.isClosedStage) return 'fresh';

  const advanced = isAdvancedStage(input.stageSortOrder, input.stageCount);
  if (activityDays > 14 || followUpOverdueDays > 14 || (advanced && (activityDays > 7 || followUpOverdueDays > 7))) {
    return 'at_risk';
  }

  if (activityDays > 10 || stageDays > 10) {
    return 'stalled';
  }

  if (activityDays > 5 || followUpOverdueDays > 0) {
    return 'overdue';
  }

  return 'fresh';
}

export function compareLeadHealthPriority(left: LeadHealth, right: LeadHealth) {
  return LEAD_HEALTH_PRIORITY[left] - LEAD_HEALTH_PRIORITY[right];
}
