export type LeadImportRow = {
  contactName: string;
  company?: string;
  mobile: string;
  email?: string;
  city?: string;
  requirement?: string;
  notes?: string;
  assignedTo?: string;
  source?: string;
};

export type LeadImportAssignee = {
  userId: string;
  name: string;
  email: string | null;
  roles: string[];
};

export type LeadImportRowPreview = LeadImportRow & {
  rowNumber: number;
  status: 'ready' | 'duplicate' | 'error';
  errors: string[];
  warnings: string[];
  duplicateLeadId?: string | null;
  resolvedOwnerUserId?: string | null;
  resolvedOwnerName?: string | null;
};

export type LeadImportPreviewResponse = {
  ok: boolean;
  error?: string;
  summary?: {
    found: number;
    ready: number;
    duplicates: number;
    corrections: number;
  };
  rows?: LeadImportRowPreview[];
  assignees?: LeadImportAssignee[];
  currentUserId?: string | null;
  fieldSales?: boolean;
};
