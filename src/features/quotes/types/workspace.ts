export type QuoteWorkspaceNextStep = {
  label: string;
  detail: string;
  href: string;
  tone: 'quote' | 'approval' | 'orders' | 'follow_up';
};

export type QuoteWorkspaceLineItem = {
  id: string;
  quoteId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number | null;
  currency: string | null;
  catalogPriceAmount: number | null;
  catalogPriceCurrency: string | null;
  isPriceOverridden: boolean;
  overrideReason: string | null;
  notes: string | null;
};

export type QuoteWorkspaceFxLock = {
  sourceCurrency: string;
  quoteCurrency: string;
  fxRate: number;
  fxWeekStart: string;
  fxValidUntil: string;
  provider?: string | null;
  effectiveAt?: string | null;
};

export type QuoteWorkspaceListItem = {
  id: string;
  leadId: string;
  leadType: 'buyer' | 'supplier' | 'mixed';
  companyName: string;
  contactName: string | null;
  status: string;
  currency: string | null;
  quoteNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string | null;
  totalVersions: number;
  negotiationCount: number;
  historyCount: number;
  hasAcceptedContract: boolean;
  nextStep: QuoteWorkspaceNextStep;
  contract: {
    id: string;
    status: string | null;
    commercial_lock_state?: string | null;
    commercial_snapshot?: unknown;
  } | null;
  lastNegotiationMessage: string | null;
  lineItems: QuoteWorkspaceLineItem[];
  subtotal: number;
  fxLock: QuoteWorkspaceFxLock | null;
  hasPriceOverride: boolean;
  latestApprovedAt: string | null;
  latestSentAt: string | null;
};

export type QuoteHistoryItem = {
  id: string;
  label: string;
  detail: string;
  happenedAt: string | null;
};

export type QuoteWorkspaceSummary = {
  totalQuotes: number;
  activeQuotes: number;
  acceptedQuotes: number;
  contractReadyQuotes: number;
};

export type QuotesWorkspaceViewModel = {
  items: QuoteWorkspaceListItem[];
  selectedItem: QuoteWorkspaceListItem | null;
  selectedHistory: QuoteHistoryItem[];
  summary: QuoteWorkspaceSummary;
};
