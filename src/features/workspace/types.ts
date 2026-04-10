export type WorkspaceMode = 'all' | 'buyers' | 'suppliers';

export type TodayFilterKey =
  | 'all-open'
  | 'overdue'
  | 'due-today'
  | 'waiting'
  | 'blocked'
  | 'high-value'
  | 'needs-reply';

export type TodayCounts = {
  allOpen: number;
  overdue: number;
  dueToday: number;
  waiting: number;
  blocked: number;
  highValue: number;
  needsReply: number;
};

export type TodayLeadSignal = {
  leadId: string;
  companyName: string;
  mode: WorkspaceMode;
  stageId?: string | null;
  stageName?: string | null;
  nextActionLabel?: string | null;
  nextActionAt?: string | null;
  waitingSince?: string | null;
  blockedReason?: string | null;
  ownerUserId?: string | null;
  ownerLabel?: string | null;
  dealValue?: number | null;
  dealCurrency?: string | null;
  urgency: 'normal' | 'today' | 'overdue' | 'blocked';
  flags: {
    overdue: boolean;
    dueToday: boolean;
    waiting: boolean;
    blocked: boolean;
    highValue: boolean;
    needsReply: boolean;
  };
};

export type TodayLayerState = {
  mode: WorkspaceMode;
  activeFilter: TodayFilterKey;
  counts: TodayCounts;
  items: TodayLeadSignal[];
  filteredLeadIds: string[];
  focusedLeadId?: string | null;
  updatedAtIso: string;
};

export type WorkspaceQuickAction = {
  id: string;
  label: string;
  tone?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};
