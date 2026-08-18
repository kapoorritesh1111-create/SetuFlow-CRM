export type InteraktTrait = {
  name?: string | null;
  value?: unknown;
};

export type InteraktContact = {
  id?: string | null;
  user_id?: string | null;
  phone_number?: string | null;
  country_code?: string | null;
  full_phone_number?: string | null;
  name?: string | null;
  email?: string | null;
  opt_in?: boolean | null;
  opted_in?: boolean | null;
  created_at_utc?: string | null;
  modified_at_utc?: string | null;
  created_via?: string | null;
  customer_created_at_source?: string | null;
  tags?: unknown;
  traits?: InteraktTrait[] | Record<string, unknown> | null;
  [key: string]: unknown;
};

export type InteraktUsersResponse = {
  result?: boolean | InteraktContact[];
  message?: string;
  users?: InteraktContact[];
  data?: InteraktContact[] | {
    users?: InteraktContact[];
    result?: InteraktContact[];
    customers?: InteraktContact[];
    total_customers?: number;
    offset?: number;
    limit?: number;
    has_next_page?: boolean;
  };
  has_next_page?: boolean;
  [key: string]: unknown;
};

export type InteraktFetchFilters = {
  offset?: number;
  limit?: number;
  createdAfter?: string | null;
  createdBefore?: string | null;
  modifiedAfter?: string | null;
  modifiedBefore?: string | null;
};

export type NormalizedInteraktContact = {
  externalContactId: string;
  externalUserId: string | null;
  phoneNumber: string | null;
  countryCode: string | null;
  fullPhoneNumber: string | null;
  contactName: string | null;
  email: string | null;
  whatsappOptedIn: boolean | null;
  sourceCreatedAt: string | null;
  sourceModifiedAt: string | null;
  sourceCreatedVia: string | null;
  tags: string[];
  traits: Record<string, unknown>;
  rawPayload: InteraktContact;
};

export type InteraktTemplateSendInput = {
  countryCode: string;
  phoneNumber: string;
  templateName: string;
  languageCode: string;
  bodyValues?: string[];
  headerValues?: string[];
  buttonValues?: Record<string, string[]>;
  campaignId?: string | null;
  callbackData?: string | null;
};

export type InteraktTemplateSendResult = {
  id: string;
  message: string | null;
};

export type InteraktAttribution = {
  channel: 'whatsapp' | 'instagram' | 'unknown';
  acquisitionType: 'ctwa' | 'organic' | 'unknown';
  adNetwork: 'meta' | null;
  adPlatform: 'instagram' | 'facebook' | null;
  adUrl: string | null;
  metaCampaignId: string | null;
  metaAdsetId: string | null;
  metaAdId: string | null;
  evidence: Record<string, unknown>;
};

export type InteraktInquiryEvidence = {
  personName?: string | null;
  companyName?: string | null;
  packagingType?: string | null;
  pouchType?: string | null;
  quantityText?: string | null;
  dimensionsPrint?: string | null;
  deliveryLocation?: string | null;
  buyingTimeline?: string | null;
  industry?: string | null;
  firstInquiryAt?: string | null;
  lastInboundAt?: string | null;
  channelSource?: string | null;
  acquisitionType?: string | null;
  adNetwork?: string | null;
  adPlatform?: string | null;
  adUrl?: string | null;
  inboundMessageTexts?: string[];
  workflowAnswerCount?: number;
};

export type InteraktWebhookPayload = {
  version?: string;
  timestamp?: string;
  type?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};
