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
  lastNegotiationMessage: string | null;
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
