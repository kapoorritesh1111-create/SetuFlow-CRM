import { normalizeImportEmail, normalizeImportOptionalText, normalizeImportText } from '@/lib/import-normalization';

export type LeadRecord = {
  id: string;
  company_name: string;
  contact_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  website: string | null;
  social_handle: string | null;
  lead_type: 'buyer' | 'supplier';
  country: string | null;
  country_id: string | null;
  source_type: string | null;
  source_label: string | null;
  next_follow_up_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_contacted_at: string | null;
  stage_id: string | null;
  next_step_id: string | null;
  owner_user_id: string | null;
  trade_event_id: string | null;
  notes: string | null;
  pipeline_id: string | null;
  intro_sent: boolean;
  deal_value: number | null;
  deal_currency: string | null;
  phone_country_code: string | null;
  phone_secondary_country_code: string | null;
};

export type ActionState = {
  error?: string;
  success?: string;
  lead?: LeadRecord;
  selectedMarketIds?: string[];
  selectedProductIds?: string[];
  followUpId?: string;
  importIssue?: import('@/lib/import-issues').ImportIssuePayload;
};

export type QuoteDraftActionState = {
  error?: string;
  success?: string;
  quoteId?: string;
};

export function normalizeLeadInputText(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportText(value);
}

export function normalizeLeadOptionalText(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportOptionalText(value);
}

export function normalizeLeadEmail(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportEmail(value);
}
