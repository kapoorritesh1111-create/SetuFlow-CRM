import type { DashboardData } from '@/lib/queries/data';
import { leadTypeMatchesMode } from './mode';
import type { TodayCounts, TodayFilterKey, TodayLayerState, TodayLeadSignal, WorkspaceMode } from './types';

type TodayLeadRecord = {
  id: string;
  company_name: string;
  lead_type: 'buyer' | 'supplier';
  stage_id?: string | null;
  next_follow_up_at?: string | null;
  owner_user_id?: string | null;
  deal_value?: number | null;
  deal_currency?: string | null;
  updated_at?: string | null;
  last_contacted_at?: string | null;
};

type TodayActivityRecord = {
  lead_id: string;
  kind?: string | null;
  occurred_at?: string | null;
};

type TodayComplianceRecord = {
  lead_id: string;
  status?: string | null;
};

type BuildTodayLayerInput = {
  mode: WorkspaceMode;
  activeFilter?: TodayFilterKey;
  nowIso: string;
  leads: TodayLeadRecord[];
  activities?: TodayActivityRecord[];
  complianceItems?: TodayComplianceRecord[];
  highValueThreshold?: number;
};

function isSameUtcDay(leftIso?: string | null, rightIso?: string | null) {
  if (!leftIso || !rightIso) return false;
  const left = new Date(leftIso);
  const right = new Date(rightIso);
  return left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth() && left.getUTCDate() === right.getUTCDate();
}

function getCounts(items: TodayLeadSignal[]): TodayCounts {
  return {
    allOpen: items.length,
    overdue: items.filter((item) => item.flags.overdue).length,
    dueToday: items.filter((item) => item.flags.dueToday).length,
    waiting: items.filter((item) => item.flags.waiting).length,
    blocked: items.filter((item) => item.flags.blocked).length,
    highValue: items.filter((item) => item.flags.highValue).length,
    needsReply: items.filter((item) => item.flags.needsReply).length,
  };
}

export function filterTodayItems(items: TodayLeadSignal[], filter: TodayFilterKey): TodayLeadSignal[] {
  switch (filter) {
    case 'overdue':
      return items.filter((item) => item.flags.overdue);
    case 'due-today':
      return items.filter((item) => item.flags.dueToday);
    case 'waiting':
      return items.filter((item) => item.flags.waiting);
    case 'blocked':
      return items.filter((item) => item.flags.blocked);
    case 'high-value':
      return items.filter((item) => item.flags.highValue);
    case 'needs-reply':
      return items.filter((item) => item.flags.needsReply);
    case 'all-open':
    default:
      return items;
  }
}

export function buildTodayLayerState({
  mode,
  activeFilter = 'all-open',
  nowIso,
  leads,
  activities = [],
  complianceItems = [],
  highValueThreshold = 10000,
}: BuildTodayLayerInput): TodayLayerState {
  const now = new Date(nowIso).getTime();
  const lastActivityByLead = new Map<string, string>();
  for (const item of activities) {
    if (!item.lead_id || !item.occurred_at) continue;
    const current = lastActivityByLead.get(item.lead_id);
    if (!current || item.occurred_at > current) lastActivityByLead.set(item.lead_id, item.occurred_at);
  }

  const blockerByLead = new Map<string, string>();
  for (const item of complianceItems) {
    const status = String(item.status ?? '').toLowerCase();
    if (!item.lead_id || !status) continue;
    if (['approved', 'completed', 'clear', 'resolved'].includes(status)) continue;
    blockerByLead.set(item.lead_id, status.replaceAll('_', ' '));
  }

  const scopedItems = leads
    .filter((lead) => leadTypeMatchesMode(lead.lead_type, mode))
    .map((lead) => {
      const dueAt = lead.next_follow_up_at;
      const dueTime = dueAt ? new Date(dueAt).getTime() : null;
      const lastActivityAt = lastActivityByLead.get(lead.id) ?? lead.last_contacted_at ?? lead.updated_at ?? null;
      const waiting = lastActivityAt ? now - new Date(lastActivityAt).getTime() > 3 * 86400000 : false;
      const blockedReason = blockerByLead.get(lead.id) ?? null;
      const overdue = Boolean(dueAt && dueTime != null && dueTime < now && !isSameUtcDay(dueAt, nowIso));
      const dueToday = Boolean(dueAt && isSameUtcDay(dueAt, nowIso) && !overdue);
      const needsReply = activities.some((item) => item.lead_id === lead.id && String(item.kind ?? '').toLowerCase().includes('inbound'));
      const highValue = typeof lead.deal_value === 'number' && lead.deal_value >= highValueThreshold;
      return {
        leadId: lead.id,
        companyName: lead.company_name,
        mode: lead.lead_type === 'buyer' ? 'buyers' : 'suppliers',
        stageId: lead.stage_id ?? null,
        nextActionLabel: dueAt ? 'Follow up' : 'Review next action',
        nextActionAt: dueAt ?? null,
        waitingSince: lastActivityAt,
        blockedReason,
        ownerUserId: lead.owner_user_id ?? null,
        dealValue: lead.deal_value ?? null,
        dealCurrency: lead.deal_currency ?? null,
        urgency: blockedReason ? 'blocked' : overdue ? 'overdue' : dueToday ? 'today' : 'normal',
        flags: {
          overdue,
          dueToday,
          waiting: waiting && !overdue,
          blocked: Boolean(blockedReason),
          highValue,
          needsReply,
        },
      } satisfies TodayLeadSignal;
    })
    .sort((left, right) => {
      const urgencyOrder = { blocked: 0, overdue: 1, today: 2, normal: 3 } as const;
      if (urgencyOrder[left.urgency] !== urgencyOrder[right.urgency]) return urgencyOrder[left.urgency] - urgencyOrder[right.urgency];
      return (left.nextActionAt ?? '9999').localeCompare(right.nextActionAt ?? '9999');
    });

  const filteredItems = filterTodayItems(scopedItems, activeFilter);
  return {
    mode,
    activeFilter,
    counts: getCounts(scopedItems),
    items: scopedItems,
    filteredLeadIds: filteredItems.map((item) => item.leadId),
    focusedLeadId: filteredItems[0]?.leadId ?? scopedItems[0]?.leadId ?? null,
    updatedAtIso: nowIso,
  };
}

export function buildTodayLayerStateFromDashboardData(
  data: DashboardData,
  mode: WorkspaceMode,
  activeFilter: TodayFilterKey = 'all-open',
  nowIso = new Date().toISOString(),
): TodayLayerState {
  const countById = new Map(data.kpis.map((item) => [item.id, item.rawValue]));
  const items: TodayLeadSignal[] = data.attentionItems.map((item) => ({
    leadId: item.leadId ?? item.id,
    companyName: item.companyName ?? item.title,
    mode,
    nextActionLabel: item.ctaLabel,
    nextActionAt: item.dueAt ?? null,
    blockedReason: item.type === 'compliance-blocker' ? item.reason : null,
    urgency: item.type === 'compliance-blocker' ? 'blocked' : item.type === 'overdue-task' ? 'overdue' : 'today',
    flags: {
      overdue: item.type === 'overdue-task',
      dueToday: Boolean(item.dueAt && isSameUtcDay(item.dueAt, nowIso)),
      waiting: item.type === 'stalled-lead',
      blocked: item.type === 'compliance-blocker',
      highValue: item.type === 'quote-risk',
      needsReply: false,
    },
  }));
  const counts: TodayCounts = {
    allOpen: countById.get('open-leads') ?? items.length,
    overdue: countById.get('overdue-followups') ?? items.filter((item) => item.flags.overdue).length,
    dueToday: items.filter((item) => item.flags.dueToday).length,
    waiting: items.filter((item) => item.flags.waiting).length,
    blocked: countById.get('compliance-blockers') ?? items.filter((item) => item.flags.blocked).length,
    highValue: items.filter((item) => item.flags.highValue).length,
    needsReply: 0,
  };
  const filtered = filterTodayItems(items, activeFilter);
  return {
    mode,
    activeFilter,
    counts,
    items,
    filteredLeadIds: filtered.map((item) => item.leadId),
    focusedLeadId: filtered[0]?.leadId ?? items[0]?.leadId ?? null,
    updatedAtIso: nowIso,
  };
}
