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

export type AIWorkspaceSnapshot = {
  leadPriorities: LeadPrioritySummary[];
  quoteRisks: QuoteRiskSummary[];
  dailyInsights: DailyInsightSummary[];
};
