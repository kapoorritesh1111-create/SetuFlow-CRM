import type { Lead, Stage } from '@/features/pipeline/types/board';
import type { LeadJourney } from '@/lib/journey';

export function normalizeLeadTypeParam(value: string | null | undefined): '' | LeadJourney {
  if (value === 'buyer' || value === 'buyers') return 'buyer';
  if (value === 'supplier' || value === 'suppliers') return 'supplier';
  return '';
}

export function getBoardMessageTone(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return 'info' as const;
  if (['updated', 'scheduled', 'added', 'saved'].some((token) => normalized.includes(token))) return 'success' as const;
  if (['blocked', 'cannot', 'missing', 'required', 'failed', 'error', 'not '].some((token) => normalized.includes(token))) return 'error' as const;
  return 'info' as const;
}

export function buildPipelineAiMessage(input: { message: string; overdueCount: number; todayCount: number; filteredLeadCount: number }) {
  if (input.message) return input.message;
  if (input.overdueCount > 0) {
    return `${input.overdueCount} lead${input.overdueCount === 1 ? '' : 's'} need follow-up attention today`;
  }
  if (input.todayCount > 0) {
    return `${input.todayCount} lead${input.todayCount === 1 ? '' : 's'} can be progressed today`;
  }
  return `${input.filteredLeadCount} leads are in view and ready for stage review`;
}

export function buildPipelineLaneSummary(input: {
  filteredStageGroups: Array<{ name: string }>;
  filteredLeads: Lead[];
  getLeadBlockerCount: (leadId: string) => number;
  getFollowUpVisualState: (value?: string | null) => string;
  getStageAccent: (label: string) => string;
  groupHasLead: (groupName: string, lead: Lead) => boolean;
}) {
  return input.filteredStageGroups.map((group) => {
    const stageLeads = input.filteredLeads.filter((lead) => input.groupHasLead(group.name, lead));
    return {
      key: group.name,
      label: group.name,
      count: stageLeads.length,
      overdue: stageLeads.filter((lead) => input.getFollowUpVisualState(lead.next_follow_up_at) === 'overdue').length,
      blocked: stageLeads.reduce((sum, lead) => sum + (input.getLeadBlockerCount(lead.id) ? 1 : 0), 0),
      accent: input.getStageAccent(group.name),
    };
  });
}

export function getPipelineStageActionLabel(stageName: string, blocked: boolean) {
  if (blocked) return 'Clear blockers';
  const normalized = stageName.trim().toLowerCase();
  if (normalized.includes('new')) return 'Qualify lead';
  if (normalized.includes('document')) return 'Request documents';
  if (normalized.includes('sample')) return 'Send sample';
  if (normalized.includes('negoti')) return 'Advance negotiation';
  if (normalized.includes('approv')) return 'Secure approval';
  if (normalized.includes('won') || normalized.includes('complete')) return 'Close out';
  return 'Review next move';
}
