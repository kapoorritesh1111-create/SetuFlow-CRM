import { getLeadHealthBadgeClasses, getLeadHealthLabel, type LeadHealth } from '@/lib/lead-health';

export function LeadHealthBadge({ health }: { health: LeadHealth }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLeadHealthBadgeClasses(health)}`}>{getLeadHealthLabel(health)}</span>;
}
