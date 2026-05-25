import { buildOrderOperationalControlState } from '@/lib/order-operations';
import { evaluateOrderExecution } from '@/lib/order-execution';
import { parseTradeAttributes } from '@/lib/trade-attributes';
import type { AISuggestionsData } from '@/lib/queries/ai-suggestions';
import type { AIInsightLevel, AIGovernedDecision, AIWorkspaceSnapshot, DailyInsightSummary, LeadPrioritySummary, OrderDelayPrediction, QuoteRiskSummary } from '@/features/ai/types/intelligence';

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
  totalVersions?: number;
  negotiationCount?: number;
  hasAcceptedContract?: boolean;
  communicationCount?: number;
  documentBlockers?: number;
  leadType?: string | null;
  notes?: string | null;
}): QuoteRiskSummary {
  let score = 0;
  const reasons: string[] = [];
  const staleDays = daysSince(input.updatedAt);
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
  if ((input.notes ?? '').trim()) {
    score += 4;
    reasons.push('Operator notes indicate live commercial context');
  }
  if (input.leadType === 'buyer' || input.leadType === 'supplier') {
    score += 2;
    reasons.push(`${input.leadType} trade posture is explicit`);
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
  updatedAt?: string | null;
  blockers: string[];
}): OrderDelayPrediction {
  let score = 0;
  const reasons: string[] = [];
  if (input.blockers.length > 0) {
    score += Math.min(70, 18 + input.blockers.length * 10);
    reasons.push(...input.blockers.slice(0, 3));
  }
  const staleDays = daysSince(input.updatedAt);
  if (staleDays >= 5) {
    score += Math.min(16, staleDays * 2);
    reasons.push(`Order record stale for ${staleDays} days`);
  }
  const bounded = Math.min(100, score);
  const level = levelForScore(bounded);
  return { quoteId: input.quoteId, companyName: input.companyName, score: bounded, level, label: labelFor('order', level), reasons: reasons.slice(0, 4) };
}

function ownerLabel(userId: string | null | undefined, profiles: AISuggestionsData['profiles']) {
  if (!userId) return 'Unassigned';
  const profile = profiles.find((item) => item.id === userId);
  return profile?.full_name || profile?.username || 'Assigned';
}

function unique<T>(items: T[]) { return Array.from(new Set(items)); }

function buildGuardrails(entityKind: AIGovernedDecision['entityKind']) {
  const base = [
    'AI does not change record state automatically.',
    'AI does not approve quote overrides or pricing exceptions.',
    'AI does not clear compliance, document, or execution blockers.'
  ];
  if (entityKind === 'order') return [...base, 'AI cannot release, dispatch, or complete an order without operator action.'];
  if (entityKind === 'quote') return [...base, 'AI cannot send or approve commercial terms on its own.'];
  if (entityKind === 'lead') return [...base, 'AI cannot advance stages or mutate qualification state automatically.'];
  return [...base, 'AI only routes the next safe workspace action.'];
}

export function buildAIWorkspaceSnapshot(data: AISuggestionsData): AIWorkspaceSnapshot {
  const followUpsByLead = new Map<string, AISuggestionsData['followUps']>();
  const complianceByLead = new Map<string, AISuggestionsData['complianceItems']>();
  const quotesByLead = new Map<string, AISuggestionsData['quotes']>();
  const rfqsByLead = new Map<string, AISuggestionsData['rfqs']>();
  const tasksByLead = new Map<string, AISuggestionsData['tasks']>();
  const documentsByKey = new Map<string, AISuggestionsData['documents']>();
  const communicationsByQuote = new Map<string, AISuggestionsData['communications']>();
  const marketsByLead = new Map<string, string[]>();
  const productIdsByLead = new Map<string, string[]>();
  const contractByQuoteId = new Map(data.contracts.map((contract) => [contract.quote_id, contract]));
  const contractLineItemsByContractId = new Map<string, AISuggestionsData['contractLineItems']>();
  const variantById = new Map(data.productVariants.map((variant) => [variant.id, variant]));
  const productById = new Map(data.products.map((product) => [product.id, product]));

  data.followUps.forEach((item) => { if (item.lead_id) (followUpsByLead.get(item.lead_id) ?? followUpsByLead.set(item.lead_id, []).get(item.lead_id)!).push(item); });
  data.complianceItems.forEach((item) => { (complianceByLead.get(item.lead_id) ?? complianceByLead.set(item.lead_id, []).get(item.lead_id)!).push(item); });
  data.quotes.forEach((item) => { (quotesByLead.get(item.lead_id) ?? quotesByLead.set(item.lead_id, []).get(item.lead_id)!).push(item); });
  data.rfqs.forEach((item) => { if (item.lead_id) (rfqsByLead.get(item.lead_id) ?? rfqsByLead.set(item.lead_id, []).get(item.lead_id)!).push(item); });
  data.tasks.forEach((item) => { if (item.lead_id) (tasksByLead.get(item.lead_id) ?? tasksByLead.set(item.lead_id, []).get(item.lead_id)!).push(item); });
  data.documents.forEach((item) => {
    const key = `${item.related_entity}:${item.related_id}`;
    (documentsByKey.get(key) ?? documentsByKey.set(key, []).get(key)!).push(item);
  });
  data.communications.forEach((item) => {
    const quoteId = (item.metadata as { quote_id?: string | null } | null)?.quote_id ?? null;
    if (!quoteId) return;
    (communicationsByQuote.get(String(quoteId)) ?? communicationsByQuote.set(String(quoteId), []).get(String(quoteId))!).push(item);
  });
  data.leadMarkets.forEach((item) => { (marketsByLead.get(item.lead_id) ?? marketsByLead.set(item.lead_id, []).get(item.lead_id)!).push(item.market_id); });
  data.leadProductInterests.forEach((item) => { if (item.product_id) (productIdsByLead.get(item.lead_id) ?? productIdsByLead.set(item.lead_id, []).get(item.lead_id)!).push(item.product_id); });
  data.contractLineItems.forEach((item) => { (contractLineItemsByContractId.get(item.contract_id) ?? contractLineItemsByContractId.set(item.contract_id, []).get(item.contract_id)!).push(item); });

  const leadPriorities = data.leads
    .map((lead) => scoreLeadPriority({
      leadId: lead.id, companyName: lead.company_name, leadType: lead.lead_type, updatedAt: lead.updated_at, ownerLabel: ownerLabel(lead.owner_user_id, data.profiles),
      overdueFollowUps: (followUpsByLead.get(lead.id) ?? []).filter((item) => item.status !== 'completed' && item.scheduled_at && Date.parse(item.scheduled_at) < Date.now()).length,
      openCompliance: (complianceByLead.get(lead.id) ?? []).filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status).toLowerCase())).length,
      rfqCount: (rfqsByLead.get(lead.id) ?? []).length, quoteCount: (quotesByLead.get(lead.id) ?? []).length, pendingTasks: (tasksByLead.get(lead.id) ?? []).filter((item) => item.status !== 'completed').length,
    }))
    .sort((a,b)=>b.score-a.score).slice(0,5);

  const leadNameById = new Map(data.leads.map((lead) => [lead.id, lead.company_name]));
  const quoteRisks = data.quotes
    .map((quote) => scoreQuoteRisk({
      quoteId: quote.id, companyName: leadNameById.get(quote.lead_id) ?? 'Unknown company', status: String(quote.status ?? 'draft').toLowerCase(), updatedAt: quote.updated_at,
      communicationCount: (communicationsByQuote.get(quote.id) ?? []).length,
      documentBlockers: (documentsByKey.get(`quote:${quote.id}`) ?? []).filter((doc) => !['approved', 'complete', 'completed', 'ready'].includes(String(doc.status).toLowerCase())).length,
      hasAcceptedContract: Boolean(contractByQuoteId.get(quote.id)),
    }))
    .sort((a,b)=>b.score-a.score).slice(0,5);

  const dailyInsights: DailyInsightSummary[] = [];
  const criticalLead = leadPriorities[0];
  if (criticalLead && criticalLead.score >= 55) dailyInsights.push({ title: `${criticalLead.companyName} is the top lead priority`, detail: criticalLead.reasons.join(' • '), level: criticalLead.level === 'critical' ? 'critical' : 'high' });
  const criticalQuote = quoteRisks[0];
  if (criticalQuote && criticalQuote.score >= 55) dailyInsights.push({ title: `${criticalQuote.companyName} quote risk is elevated`, detail: criticalQuote.reasons.join(' • '), level: criticalQuote.level === 'critical' ? 'critical' : 'high' });

  const governedDecisions: AIGovernedDecision[] = [];

  leadPriorities.filter((item) => item.score >= 30).slice(0, 2).forEach((item) => {
    governedDecisions.push({
      id: `lead-${item.leadId}`, entityKind: 'lead', title: `${item.companyName}: next lead action`, summary: item.label, recommendedAction: 'Open the lead and clear the highest visible follow-up or compliance blocker.', rationale: item.reasons, guardrails: buildGuardrails('lead'), boundedBy: 'Lead follow-ups, compliance posture, pending tasks, and recency already stored in the repo.', href: `/leads/${item.leadId}`, severity: item.level, companyName: item.companyName,
    });
  });

  quoteRisks.filter((item) => item.score >= 30).slice(0, 2).forEach((item) => {
    governedDecisions.push({
      id: `quote-${item.quoteId}`, entityKind: 'quote', title: `${item.companyName}: quote decision support`, summary: item.label, recommendedAction: 'Open the quote workspace and resolve the specific commercial or communication gap before further progression.', rationale: item.reasons, guardrails: buildGuardrails('quote'), boundedBy: 'Quote status, linked documents, communication history, and accepted-contract visibility in the repo.', href: `/quotes`, severity: item.level, companyName: item.companyName,
    });
  });

  const acceptedQuotes = data.quotes.filter((quote) => String(quote.status ?? '').toLowerCase() === 'accepted');
  acceptedQuotes.forEach((quote) => {
    const lead = data.leads.find((item) => item.id === quote.lead_id);
    if (!lead) return;
    const contract = contractByQuoteId.get(quote.id) ?? null;
    const contractDocuments = contract ? (documentsByKey.get(`contract:${contract.id}`) ?? []) : [];
    const lineItems = contract ? (contractLineItemsByContractId.get(contract.id) ?? []).map((line) => {
      const variant = line.product_variant_id ? variantById.get(line.product_variant_id) ?? null : null;
      const trade = parseTradeAttributes(variant?.source_payload ?? null);
      return { countryOfOrigin: trade.countryOfOrigin, exportMetadata: trade.exportMetadata, shipmentNotes: trade.shipmentNotes, productName: line.product_id ? productById.get(line.product_id)?.name ?? null : null };
    }) : [];
    const controls = buildOrderOperationalControlState({
      documents: [...(documentsByKey.get(`quote:${quote.id}`) ?? []), ...(documentsByKey.get(`lead:${lead.id}`) ?? []), ...contractDocuments].map((doc) => ({ id: doc.id, file_name: doc.file_name, doc_type: doc.doc_type ?? 'document', status: doc.status, expires_at: doc.expires_at, related_entity: doc.related_entity, related_id: doc.related_id })),
      complianceItems: (complianceByLead.get(lead.id) ?? []).map((item) => ({ id: item.id, status: item.status, compliance_item_id: item.id })),
      requirementRules: data.documentRequirementRules, leadType: lead.lead_type, marketIds: marketsByLead.get(lead.id) ?? [], productIds: productIdsByLead.get(lead.id) ?? [],
      lines: lineItems.map((line) => ({ countryOfOrigin: line.countryOfOrigin, exportMetadata: line.exportMetadata, shipmentNotes: line.shipmentNotes })),
    });
    const execution = evaluateOrderExecution({
      quoteAccepted: true, hasContract: Boolean(contract), contractStatus: contract?.status, contractSignedAt: contract?.signed_at, commercialLockState: contract?.commercial_lock_state, lineCount: lineItems.length, openDocumentBlockers: 0, openComplianceBlockers: 0, documentRequirementReasons: controls.documentRequirementSummary.blockerReasons, complianceRequirementReasons: controls.complianceSummary.blockerReasons, releaseArtifactReasons: controls.releaseArtifactReasons, dispatchArtifactReasons: controls.dispatchArtifactReasons, completionArtifactReasons: controls.completionArtifactReasons, currentState: contract?.execution_state, releasedAt: contract?.released_at, dispatchedAt: contract?.dispatched_at, completedAt: contract?.completed_at,
    });
    if (execution.blockers.length === 0) return;
    const delay = predictOrderDelay({ quoteId: quote.id, companyName: lead.company_name, updatedAt: quote.updated_at, blockers: execution.blockers });
    governedDecisions.push({
      id: `order-${quote.id}`, entityKind: 'order', title: `${lead.company_name}: execution decision support`, summary: execution.headline, recommendedAction: execution.canAdvance && execution.nextStateLabel ? `Mark the order ${execution.nextStateLabel.toLowerCase()}.` : 'Open the orders workspace and clear the next governed execution blocker.', rationale: execution.blockers.slice(0, 4), guardrails: buildGuardrails('order'), boundedBy: 'Contract lock, document rules, compliance state, and dispatch/completion evidence already enforced in Orders.', href: '/orders', severity: delay.level, companyName: lead.company_name,
    });
  });

  const openLeadDecisions = governedDecisions.filter((item) => item.entityKind === 'lead').length;
  const openQuoteDecisions = governedDecisions.filter((item) => item.entityKind === 'quote').length;
  const openOrderDecisions = governedDecisions.filter((item) => item.entityKind === 'order').length;
  if (openLeadDecisions + openQuoteDecisions + openOrderDecisions > 0) {
    governedDecisions.unshift({
      id: 'dashboard-control', entityKind: 'dashboard', title: 'Dashboard routing should follow governed blockers first', summary: 'AI now routes operators toward the same lead, quote, and order blockers already visible in the governed workspaces.', recommendedAction: 'Use the dashboard to open the top blocker lane, then confirm the action in the destination workspace.', rationale: [`${openLeadDecisions} lead decisions are currently actionable.`, `${openQuoteDecisions} quote decisions are currently actionable.`, `${openOrderDecisions} order decisions are currently actionable.`], guardrails: buildGuardrails('dashboard'), boundedBy: 'Dashboard evidence, attention items, and repo-backed workflow truth.', href: '/dashboard', severity: openOrderDecisions > 0 ? 'critical' : openQuoteDecisions > 0 ? 'high' : 'medium',
    });
  }

  const ranked = governedDecisions
    .sort((a,b)=>['low','medium','high','critical'].indexOf(a.severity)-['low','medium','high','critical'].indexOf(b.severity))
    .reverse()
    .slice(0,8);

  return {
    leadPriorities, quoteRisks, dailyInsights: dailyInsights.slice(0,4), governedDecisions: ranked,
    governanceSummary: { governedDecisions: ranked.length, explainableDecisions: ranked.length, boundedDecisions: ranked.length, actionSafeDecisions: ranked.length },
  };
}
