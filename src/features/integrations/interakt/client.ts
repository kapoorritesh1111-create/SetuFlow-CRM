import 'server-only';

import type {
  InteraktContact,
  InteraktFetchFilters,
  InteraktUsersResponse,
  NormalizedInteraktContact,
} from '@/features/integrations/interakt/types';

const INTERAKT_USERS_URL = 'https://api.interakt.ai/v1/public/apis/users/';
const INTERAKT_BASELINE_CREATED_AFTER = '2000-01-01T00:00:00.000Z';

type InteraktFilter = {
  trait: 'created_at_utc' | 'modified_at_utc';
  op: 'gt' | 'lt';
  val: string;
  supr_op?: 'and';
};

function getApiKey() {
  const key = process.env.INTERAKT_STARK_PACKMATE_API_KEY?.trim();
  if (!key) throw new Error('INTERAKT_STARK_PACKMATE_API_KEY is not configured.');
  return key;
}

function toTraitsObject(value: InteraktContact['traits']): Record<string, unknown> {
  if (!value) return {};
  if (!Array.isArray(value)) return value;
  return value.reduce<Record<string, unknown>>((acc, item) => {
    const name = String(item?.name ?? '').trim();
    if (name) acc[name] = item?.value ?? null;
    return acc;
  }, {});
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => {
    if (typeof item === 'string') return item.trim();
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      return String(row.name ?? row.tag ?? row.label ?? row.value ?? '').trim();
    }
    return '';
  }).filter(Boolean)));
}

function asContacts(payload: InteraktUsersResponse): InteraktContact[] {
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && !Array.isArray(payload.data)) {
    if (Array.isArray(payload.data.customers)) return payload.data.customers;
    if (Array.isArray(payload.data.users)) return payload.data.users;
    if (Array.isArray(payload.data.result)) return payload.data.result;
  }
  return [];
}

function cleanPhonePart(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function normalizeDate(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toUtc(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid Interakt date filter: ${value}`);
  return date.toISOString();
}

function buildFilters(filters: InteraktFetchFilters): InteraktFilter[] {
  const items: InteraktFilter[] = [];
  const push = (trait: InteraktFilter['trait'], op: InteraktFilter['op'], value: string | null | undefined) => {
    if (!value) return;
    items.push({ trait, op, val: toUtc(value), ...(items.length > 0 ? { supr_op: 'and' as const } : {}) });
  };
  push('created_at_utc', 'gt', filters.createdAfter);
  push('created_at_utc', 'lt', filters.createdBefore);
  push('modified_at_utc', 'gt', filters.modifiedAfter);
  push('modified_at_utc', 'lt', filters.modifiedBefore);

  if (items.length === 0) {
    items.push({ trait: 'created_at_utc', op: 'gt', val: INTERAKT_BASELINE_CREATED_AFTER });
  }

  return items;
}

export function normalizeInteraktContact(contact: InteraktContact, index: number): NormalizedInteraktContact {
  const traits = toTraitsObject(contact.traits);
  const countryCode = cleanPhonePart(contact.country_code);
  const phoneNumber = cleanPhonePart(contact.phone_number);
  const fullPhoneNumber = cleanPhonePart(contact.full_phone_number)
    ?? (countryCode || phoneNumber ? `${countryCode ?? ''}${phoneNumber ?? ''}` : null);
  const externalContactId = String(contact.id ?? contact.user_id ?? fullPhoneNumber ?? `interakt-row-${index}`).trim();
  const traitName = String(traits.name ?? '').trim() || null;
  const traitEmail = String(traits.email ?? '').trim() || null;
  const traitOptIn = typeof traits.whatsapp_opted_in === 'boolean' ? traits.whatsapp_opted_in : null;
  const raw = contact as Record<string, unknown>;
  const tags = normalizeTags(contact.tags ?? raw.customer_tags ?? raw.contact_tags ?? traits.tags);

  return {
    externalContactId,
    externalUserId: String(contact.user_id ?? '').trim() || null,
    phoneNumber,
    countryCode,
    fullPhoneNumber,
    contactName: String(contact.name ?? '').trim() || traitName,
    email: String(contact.email ?? '').trim() || traitEmail,
    whatsappOptedIn: typeof contact.opt_in === 'boolean'
      ? contact.opt_in
      : typeof contact.opted_in === 'boolean'
        ? contact.opted_in
        : traitOptIn,
    sourceCreatedAt: normalizeDate(contact.created_at_utc),
    sourceModifiedAt: normalizeDate(contact.modified_at_utc),
    sourceCreatedVia: String(contact.customer_created_at_source ?? contact.created_via ?? '').trim() || null,
    tags,
    traits,
    rawPayload: contact,
  };
}

export async function fetchInteraktContacts(filters: InteraktFetchFilters = {}) {
  const limit = Math.max(1, Math.min(filters.limit ?? 25, 100));
  const offset = Math.max(0, filters.offset ?? 0);
  const url = new URL(INTERAKT_USERS_URL);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filters: buildFilters(filters) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  const text = await response.text();
  let payload: InteraktUsersResponse = {};
  try {
    payload = text ? JSON.parse(text) as InteraktUsersResponse : {};
  } catch {
    throw new Error(`Interakt returned a non-JSON response (${response.status}).`);
  }

  if (!response.ok || payload.result === false) {
    const safeMessage = typeof payload.message === 'string'
      ? payload.message
      : typeof payload.detail === 'string'
        ? payload.detail
        : `Interakt API request failed with status ${response.status}.`;
    throw new Error(safeMessage);
  }

  const nestedHasNextPage = payload.data && !Array.isArray(payload.data) ? payload.data.has_next_page : undefined;
  return {
    contacts: asContacts(payload).map(normalizeInteraktContact),
    offset,
    limit,
    hasNextPage: Boolean(nestedHasNextPage ?? payload.has_next_page),
  };
}
