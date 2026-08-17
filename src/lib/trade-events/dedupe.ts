import { classifyTradeEventMatch, type TradeEventIdentity } from './identity';

export type TradeEventDuplicateGroup<T extends TradeEventIdentity> = {
  event: T;
  duplicates: T[];
  possibleMatches: T[];
};

function eventSortTime(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

export function collapseTradeEventDuplicates<T extends TradeEventIdentity>(events: T[]) {
  const groups: Array<TradeEventDuplicateGroup<T>> = [];
  const ordered = [...events].sort((left, right) => {
    const startDiff = eventSortTime(left.starts_on) - eventSortTime(right.starts_on);
    if (startDiff !== 0) return startDiff;
    return String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });

  for (const event of ordered) {
    const exactGroup = groups.find((candidate) => classifyTradeEventMatch(candidate.event, event) === 'exact');
    if (exactGroup) {
      exactGroup.duplicates.push(event);
      continue;
    }

    const group: TradeEventDuplicateGroup<T> = { event, duplicates: [], possibleMatches: [] };
    for (const candidate of groups) {
      if (classifyTradeEventMatch(candidate.event, event) === 'possible') {
        candidate.possibleMatches.push(event);
        group.possibleMatches.push(candidate.event);
      }
    }
    groups.push(group);
  }

  return groups;
}
