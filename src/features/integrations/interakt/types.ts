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
  traits?: InteraktTrait[] | Record<string, unknown> | null;
  [key: string]: unknown;
};

export type InteraktUsersResponse = {
  result?: InteraktContact[];
  users?: InteraktContact[];
  data?: InteraktContact[] | { users?: InteraktContact[]; result?: InteraktContact[] };
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
  traits: Record<string, unknown>;
  rawPayload: InteraktContact;
};
