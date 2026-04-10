export type SummaryMetricStage = {
  id: string;
  is_closed?: boolean | null;
  is_lost?: boolean | null;
};

export type SummaryMetricLead = {
  id: string;
  stage_id?: string | null;
  deal_value?: number | string | null;
};

export type SummaryMetricFollowUp = {
  scheduled_at?: string | null;
  status?: string | null;
};

export type SummaryMetricRecord = {
  status?: string | null;
};

export type SummaryMetricComplianceItem = {
  status?: string | null;
  severity?: string | null;
};

export type SummaryMetricTask = {
  scheduled_for?: string | null;
  status?: string | null;
};

export type CommercialSummaryMetrics = {
  openLeadCount: number;
  overdueFollowUpCount: number;
  openQuoteCount: number;
  blockedComplianceCount: number;
  overdueTaskCount: number;
  pipelineValue: number;
};

export function isWorkflowOpenStatus(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.length > 0 && !['done', 'completed', 'approved', 'closed', 'won', 'lost', 'cancelled', 'rejected'].includes(normalized);
}

export function calculateCommercialSummaryMetrics({
  stages,
  leads,
  followUps,
  quotes,
  complianceItems,
  tasks,
  now = Date.now(),
}: {
  stages: SummaryMetricStage[];
  leads: SummaryMetricLead[];
  followUps: SummaryMetricFollowUp[];
  quotes: SummaryMetricRecord[];
  complianceItems: SummaryMetricComplianceItem[];
  tasks?: SummaryMetricTask[];
  now?: number;
}): CommercialSummaryMetrics {
  const stageMap = new Map(stages.map((stage) => [stage.id, stage] as const));

  const openLeads = leads.filter((lead) => {
    const stage = lead.stage_id ? stageMap.get(lead.stage_id) : null;
    return !(stage?.is_closed || stage?.is_lost);
  });

  const overdueFollowUpCount = followUps.filter((item) => {
    const scheduledAt = item.scheduled_at ? new Date(item.scheduled_at).getTime() : Number.NaN;
    return Number.isFinite(scheduledAt) && isWorkflowOpenStatus(item.status) && scheduledAt < now;
  }).length;

  const openQuoteCount = quotes.filter((quote) => isWorkflowOpenStatus(quote.status)).length;
  const blockedComplianceCount = complianceItems.filter((item) => isWorkflowOpenStatus(item.status) && ['high', 'critical'].includes(String(item.severity ?? '').toLowerCase())).length;
  const overdueTaskCount = (tasks ?? []).filter((task) => {
    const scheduledFor = task.scheduled_for ? new Date(task.scheduled_for).getTime() : Number.NaN;
    return Number.isFinite(scheduledFor) && isWorkflowOpenStatus(task.status) && scheduledFor < now;
  }).length;
  const pipelineValue = openLeads.reduce((sum, lead) => sum + Number(lead.deal_value ?? 0), 0);

  return {
    openLeadCount: openLeads.length,
    overdueFollowUpCount,
    openQuoteCount,
    blockedComplianceCount,
    overdueTaskCount,
    pipelineValue,
  };
}
