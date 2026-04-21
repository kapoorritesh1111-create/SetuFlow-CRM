export type AIInsightLevel = 'critical' | 'high' | 'medium' | 'low';

export type AIInsightScore = {
  score: number;
  level: AIInsightLevel;
  label: string;
  reasons: string[];
};

export type LeadPrioritySummary = AIInsightScore & {
  leadId: string;
  companyName: string;
  ownerLabel?: string;
};

export type QuoteRiskSummary = AIInsightScore & {
  quoteId: string;
  companyName: string;
  status: string;
};

export type OrderDelayPrediction = AIInsightScore & {
  quoteId: string;
  companyName: string;
};

export type DailyInsightSummary = {
  title: string;
  detail: string;
  level: Exclude<AIInsightLevel, 'low'>;
};

export type AIDecisionEntityKind = 'lead' | 'quote' | 'order' | 'dashboard';

export type AIGovernedDecision = {
  id: string;
  entityKind: AIDecisionEntityKind;
  title: string;
  summary: string;
  recommendedAction: string;
  rationale: string[];
  guardrails: string[];
  boundedBy: string;
  href: string;
  severity: AIInsightLevel;
  companyName?: string;
};

export type AIGovernanceSummary = {
  governedDecisions: number;
  explainableDecisions: number;
  boundedDecisions: number;
  actionSafeDecisions: number;
};

export type AIWorkspaceSnapshot = {
  leadPriorities: LeadPrioritySummary[];
  quoteRisks: QuoteRiskSummary[];
  dailyInsights: DailyInsightSummary[];
  governedDecisions: AIGovernedDecision[];
  governanceSummary: AIGovernanceSummary;
};
