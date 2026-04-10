export type FollowUpVisualState = 'overdue' | 'today' | 'upcoming' | 'completed' | 'unscheduled';

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getFollowUpVisualState(scheduledAt?: string | null, status?: string | null): FollowUpVisualState {
  if (status === 'completed') return 'completed';
  if (!scheduledAt) return 'unscheduled';

  const target = new Date(scheduledAt);
  if (Number.isNaN(target.getTime())) return 'unscheduled';

  const today = startOfDay(new Date());
  const targetDay = startOfDay(target);

  if (targetDay.getTime() < today.getTime()) return 'overdue';
  if (targetDay.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

export function isLeadAtRisk(nextFollowUpAt?: string | null) {
  return getFollowUpVisualState(nextFollowUpAt) === 'overdue';
}

export function getFollowUpBadgeClasses(state: FollowUpVisualState) {
  switch (state) {
    case 'overdue':
      return 'bg-rose-100 text-rose-700';
    case 'today':
      return 'bg-amber-100 text-amber-800';
    case 'upcoming':
      return 'bg-emerald-100 text-emerald-700';
    case 'completed':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
}

export function getFollowUpLabel(state: FollowUpVisualState) {
  switch (state) {
    case 'overdue':
      return 'Overdue';
    case 'today':
      return 'Today';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    default:
      return 'Not scheduled';
  }
}
