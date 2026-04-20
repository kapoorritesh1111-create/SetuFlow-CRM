import { inferOrderTradeWorkflow, inferQuoteTradeWorkflow } from '@/features/trade-workflow/logic';
import type { AISuggestionsData } from '@/lib/queries/data';
import type { AIInsightLevel, AIWorkspaceSnapshot, DailyInsightSummary, LeadPrioritySummary, OrderDelayPrediction, QuoteRiskSummary } from '@/features/ai/types/intelligence';

function daysSince(value: string | null | undefined) {
  if (!value) return 999;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 999;
  return Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24));
}

function levelForScore(score: number): AIInsightLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function labelFor(kind: 'lead' | 'quote' | 'order', level: AIInsightLevel) {
  if (kind === 'lead') {
    if (level === 'critical') return 'Critical lead priority';
    if (level === 'high') return 'High lead priority';
    if (level === 'medium') return 'Monitor soon';
    return 'Healthy lead posture';
  }
  if (kind === 'quote') {
    if (level === 'critical') return 'Quote at immediate risk';
    if (level === 'high') return 'Quote needs operator attention';
    if (level === 'medium') return 'Quote risk is building';
    return 'Quote posture is stable';
  }
  if (level === 'critical') return 'Delay risk is immediate';
  if (level === 'high') return 'Delay risk is elevated';
  if (level === 'medium') return 'Delay risk is watchlist';
  return 'Execution posture is stable';
}

export function scoreLeadPriority(input: {
  companyName: string;
  leadId: string;
  leadType?: string | null;
  updatedAt?: string | null;
  ownerLabel?: string;
  overdueFollowUps: number;
  openCompliance: number;
  rfqCount: number;
  quoteCount: number;
  pendingTasks: number;
}): LeadPrioritySummary {
  let score = 0;
  const reasons: string[] = [];
  if (input.overdueFollowUps > 0) {
    score += 35 + Math.min(20, input.overdueFollowUps * 5);
    reasons.push(`${input.overdueFollowUps} overdue follow-up item${input.overdueFollowUps === 1 ? '' : 's'}`);
  }
  if (input.openCompliance > 0) {
    score += 20 + Math.min(15, input.openCompliance * 4);
    reasons.push(`${input.openCompliance} open compliance blocker${input.openCompliance === 1 ? '' : 's'}`);
  }
  if (input.rfqCount > 0 && input.quoteCount === 0) {
    score += 18;
    reasons.push('RFQ exists without a quote');
  }
  if (input.pendingTasks > 0) {
    score += Math.min(12, input.pendingTasks * 3);
    reasons.push(`${input.pendingTasks} pending task${input.pendingTasks === 1 ? '' : 's'}`);
  }
  const staleDays = daysSince(input.updatedAt);
  if (staleDays >= 10) {
    score += 14;
    reasons.push(`Lead stale for ${staleDays} days`);
  }
  if (input.leadType === 'buyer' || input.leadType === 'supplier') {
    score += 4;
    reasons.push(`${input.leadType} mode is explicit`);
  }
  const bounded = Math.min(100, score);
  const level = levelForScore(bounded);
  return {
    leadId: input.leadId,
    companyName: input.companyName,
    ownerLabel: input.ownerLabel,
    score: bounded,
    level,
    label: labelFor('lead', level),
    reasons: reasons.slice(0, 4),
  };
}

export function scoreQuoteRisk(input: {
  quoteId: string;
  companyName: string;
  status: string;
  updatedAt?: string | null;
  notes?: string | null;
  leadType?: string | null;
  totalVersions?: number;
  negotiationCount?: number;
  hasAcceptedContract?: boolean;
  communicationCount?: number;
  documentBlockers?: number;
}): QuoteRiskSummary {
  const trade = inferQuoteTradeWorkflow({ leadType: input.leadType, notes: input.notes, hasAcceptedContract: input.hasAcceptedContract });
  let score = 0;
  const reasons: string[] = [];
  const staleDays = daysSince(input.updatedAt);
  if (trade.incotermLabel === 'Not set') {
    score += 22;
    reasons.push('Incoterm posture is not explicit');
  }
  if (['draft', 'review', 'pending_approval', 'approved', 'sent', 'negotiating'].includes(input.status) && staleDays >= 7) {
    score += Math.min(22, 10 + staleDays);
    reasons.push(`Quote has been idle for ${staleDays} days`);
  }
  if ((input.totalVersions ?? 0) >= 3) {
    score += 10;
    reasons.push(`${input.totalVersions} recorded versions`);
  }
  if ((input.negotiationCount ?? 0) >= 3) {
    score += 10;
    reasons.push('Negotiation churn is increasing');
  }
  if ((input.communicationCount ?? 0) === 0 && ['approved', 'sent', 'negotiating'].includes(input.status)) {
    score += 12;
    reasons.push('No communication trail is visible');
  }
  if ((input.documentBlockers ?? 0) > 0) {
    score += 8 + Math.min(10, input.documentBlockers ?? 0);
    reasons.push(`${input.documentBlockers} linked document blocker${input.documentBlockers === 1 ? '' : 's'}`);
  }
  if (input.status === 'accepted' && !input.hasAcceptedContract) {
    score += 14;
    reasons.push('Accepted commercial work lacks a visible handoff contract');
  }
  const bounded = Math.min(100, score);
  const level = levelForScore(bounded);
  return {
    quoteId: input.quoteId,
    companyName: input.companyName,
    status: input.status,
    score: bounded,
    level,
    label: labelFor('quote', level),
    reasons: reasons.slice(0, 4),
  };
}

export function predictOrderDelay(input: {
  quoteId: string;
  companyName: string;
  leadType?: string | null;
  quoteStatus: string;
  updatedAt?: string | null;
  documentBlockers: number;
  complianceBlockers: number;
  hasContract: boolean;
}): OrderDelayPrediction {
  const workflow = inferOrderTradeWorkflow({
    leadType: input.leadType,
    documentBlockers: input.documentBlockers,
    complianceBlockers: input.complianceBlockers,
    hasContract: input.hasContract,
    quoteStatus: input.quoteStatus,
  });
  let score = 0;
  const reasons: string[] = [];
  if (workflow.freightReadiness.tone !== 'success') {
    score += workflow.freightReadiness.tone === 'danger' ? 28 : 18;
    reasons.push(workflow.freightReadiness.detail);
  }
  if (workflow.complianceReadiness.tone !== 'success') {
    score += workflow.complianceReadiness.tone === 'danger' ? 24 : 14;
    reasons.push(workflow.complianceReadiness.detail);
  }
  if (workflow.dispatchReadiness.tone !== 'success') {
    score += workflow.dispatchReadiness.tone === 'danger' ? 24 : 14;
    reasons.push(workflow.dispatchReadiness.detail);
  }
  if (workflow.handoffVisibility.tone !== 'success') {
    score += workflow.handoffVisibility.tone === 'danger' ? 18 : 10;
    reasons.push(workflow.handoffVisibility.detail);
  }
  const staleDays = daysSince(input.updatedAt);
  if (staleDays >= 5) {
    score += Math.min(16, staleDays * 2);
    reasons.push(`Order record stale for ${staleDays} days`);
  }
  const bounded = Math.min(100, score);
  const level = levelForScore(bounded);
  return {
    quoteId: input.quoteId,
    companyName: input.companyName,
    score: bounded,
    level,
    label: labelFor('order', level),
    reasons: reasons.slice(0, 4),
  };
}

function ownerLabel(userId: string | null | undefined, profiles: AISuggestionsData['profiles']) {
  if (!userId) return 'Unassigned';
  const profile = profiles.find((item) => item.id === userId);
  return profile?.full_name || profile?.username || 'Assigned';
}

export function buildAIWorkspaceSnapshot(data: AISuggestionsData): AIWorkspaceSnapshot {
  const followUpsByLead = new Map<string, AISuggestionsData['followUps']>();
  const complianceByLead = new Map<string, AISuggestionsData['complianceItems']>();
  const quotesByLead = new Map<string, AISuggestionsData['quotes']>();
  const rfqsByLead = new Map<string, AISuggestionsData['rfqs']>();
  const tasksByLead = new Map<string, AISuggestionsData['tasks']>();
  const documentsByQuote = new Map<string, AISuggestionsData['documents']>();
  const communicationsByQuote = new Map<string, AISuggestionsData['communications']>();

  data.followUps.forEach((item) => {
    if (!item.lead_id) return;
    const bucket = followUpsByLead.get(item.lead_id) ?? [];
    bucket.push(item);
    followUpsByLead.set(item.lead_id, bucket);
  });
  data.complianceItems.forEach((item) => {
    const bucket = complianceByLead.get(item.lead_id) ?? [];
    bucket.push(item);
    complianceByLead.set(item.lead_id, bucket);
  });
  data.quotes.forEach((item) => {
    const bucket = quotesByLead.get(item.lead_id) ?? [];
    bucket.push(item);
    quotesByLead.set(item.lead_id, bucket);
  });
  data.rfqs.forEach((item) => {
    if (!item.lead_id) return;
    const bucket = rfqsByLead.get(item.lead_id) ?? [];
    bucket.push(item);
    rfqsByLead.set(item.lead_id, bucket);
  });
  data.tasks.forEach((item) => {
    if (!item.lead_id) return;
    const bucket = tasksByLead.get(item.lead_id) ?? [];
    bucket.push(item);
    tasksByLead.set(item.lead_id, bucket);
  });
  data.documents.forEach((item) => {
    if (!item.related_id) return;
    const bucket = documentsByQuote.get(item.related_id) ?? [];
    bucket.push(item);
    documentsByQuote.set(item.related_id, bucket);
  });
  data.communications.forEach((item) => {
    if (!(item as { quote_id?: string | null }).quote_id) return;
    const key = String((item as { quote_id?: string | null }).quote_id);
    const bucket = communicationsByQuote.get(key) ?? [];
    bucket.push(item);
    communicationsByQuote.set(key, bucket);
  });

  const leadPriorities = data.leads
    .map((lead) => scoreLeadPriority({
      leadId: lead.id,
      companyName: lead.company_name,
      leadType: lead.lead_type,
      updatedAt: lead.updated_at,
      ownerLabel: ownerLabel(lead.owner_user_id, data.profiles),
      overdueFollowUps: (followUpsByLead.get(lead.id) ?? []).filter((item) => item.status !== 'completed' && item.scheduled_at && Date.parse(item.scheduled_at) < Date.now()).length,
      openCompliance: (complianceByLead.get(lead.id) ?? []).filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status).toLowerCase())).length,
      rfqCount: (rfqsByLead.get(lead.id) ?? []).length,
      quoteCount: (quotesByLead.get(lead.id) ?? []).length,
      pendingTasks: (tasksByLead.get(lead.id) ?? []).filter((item) => item.status !== 'completed').length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const leadNameById = new Map(data.leads.map((lead) => [lead.id, lead.company_name]));
  const leadTypeById = new Map(data.leads.map((lead) => [lead.id, lead.lead_type]));
  const quoteRisks = data.quotes
    .map((quote) => scoreQuoteRisk({
      quoteId: quote.id,
      companyName: leadNameById.get(quote.lead_id) ?? 'Unknown company',
      status: String(quote.status ?? 'draft').toLowerCase(),
      updatedAt: quote.updated_at,
      leadType: leadTypeById.get(quote.lead_id) ?? null,
      communicationCount: (communicationsByQuote.get(quote.id) ?? []).length,
      documentBlockers: (documentsByQuote.get(quote.id) ?? []).filter((doc) => !['approved', 'complete', 'completed', 'ready'].includes(String(doc.status).toLowerCase())).length,
      hasAcceptedContract: false,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const dailyInsights: DailyInsightSummary[] = [];
  const criticalLead = leadPriorities[0];
  if (criticalLead && criticalLead.score >= 55) {
    dailyInsights.push({
      title: `${criticalLead.companyName} is the top lead priority`,
      detail: criticalLead.reasons.join(' • '),
      level: criticalLead.level === 'critical' ? 'critical' : 'high',
    });
  }
  const criticalQuote = quoteRisks[0];
  if (criticalQuote && criticalQuote.score >= 55) {
    dailyInsights.push({
      title: `${criticalQuote.companyName} quote risk is elevated`,
      detail: criticalQuote.reasons.join(' • '),
      level: criticalQuote.level === 'critical' ? 'critical' : 'high',
    });
  }
  const complianceBacklog = data.complianceItems.filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status).toLowerCase())).length;
  if (complianceBacklog > 0) {
    dailyInsights.push({
      title: `${complianceBacklog} compliance blockers need operator review`,
      detail: 'Daily insight ranking now treats open compliance posture as operational risk, not background admin work.',
      level: complianceBacklog > 4 ? 'critical' : 'high',
    });
  }

  return { leadPriorities, quoteRisks, dailyInsights: dailyInsights.slice(0, 4) };
}
