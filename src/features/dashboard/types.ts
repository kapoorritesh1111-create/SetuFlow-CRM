export type LeadJourney = 'buyer' | 'supplier';
export type DashboardScope = 'all' | 'buyer' | 'supplier';

export type DashboardTrendDirection = 'up' | 'down' | 'neutral';
export type DashboardIntent = 'default' | 'warning' | 'danger' | 'success';

export type DashboardKpi = {
  id: 'open-leads' | 'overdue-followups' | 'active-quotes' | 'compliance-blockers' | 'pipeline-value';
  label: string;
  value: string | number;
  rawValue: number;
  trendLabel?: string;
  trendDirection?: DashboardTrendDirection;
  intent?: DashboardIntent;
  href?: string;
  drillThroughLabel?: string;
};

export type DashboardStageCount = {
  stageId: string;
  stageName: string;
  count: number;
  colorToken?: string;
  isClosed?: boolean;
  isWon?: boolean;
  isLost?: boolean;
};

export type DashboardLeadHealthDatum = {
  id: 'healthy' | 'at-risk' | 'blocked';
  label: string;
  count: number;
  colorToken: string;
};

export type CountryCoverageTopAccount = {
  leadId: string;
  companyName: string;
};

export type CountryCoverageDatum = {
  countryCode: string;
  countryName: string;
  activeLeadCount: number;
  lastActivityAt: string | null;
  openRfqCount: number;
  openQuoteCount: number;
  topAccounts: CountryCoverageTopAccount[];
};

export type CountryInsight = {
  countryCode: string;
  countryName: string;
  activeLeadCount: number;
  openRfqCount: number;
  openQuoteCount: number;
  complianceBlockerCount: number;
  upcomingTradeEvents: Array<{
    id: string;
    name: string;
    city: string | null;
    startsOn: string | null;
  }>;
  topCompanies: Array<{
    leadId: string;
    companyName: string;
    stageName?: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    occurredAt: string | null;
  }>;
};

export type AttentionItemType = 'overdue-task' | 'stalled-lead' | 'compliance-blocker' | 'quote-risk';

export type AttentionItem = {
  id: string;
  type: AttentionItemType;
  title: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ctaLabel: string;
  ctaHref?: string;
  leadId?: string;
  companyName?: string;
  dueAt?: string | null;
};

export type RecentActivityItem = {
  id: string;
  type: 'lead' | 'quote' | 'document' | 'compliance' | 'rfq' | 'task';
  iconKey: string;
  message: string;
  timestamp: string | null;
  href?: string;
  leadId?: string;
  companyName?: string;
};

export type DashboardWidgetDefaults = {
  activeWidgetIds: string[];
  widgetOrder: string[];
  widgetSpans: Record<string, 'compact' | 'standard' | 'wide' | 'full'>;
};

export type DashboardViewData = {
  queryIssues: string[];
  kpis: DashboardKpi[];
  stageCounts: DashboardStageCount[];
  leadHealth: DashboardLeadHealthDatum[];
  countryCoverage: CountryCoverageDatum[];
  countryInsights: CountryInsight[];
  attentionItems: AttentionItem[];
  recentActivity: RecentActivityItem[];
  widgetDefaults: DashboardWidgetDefaults;
};
