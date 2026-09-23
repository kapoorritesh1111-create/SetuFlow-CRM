import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

const INDIA_MART_ENDPOINT = 'https://mapi.indiamart.com/wservce/crm/crmListing/v2/';
const PROVIDER = 'indiamart';
const DEFAULT_LOOKBACK_MINUTES = 60;
const OVERLAP_MINUTES = 5;
const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type JsonRecord = Record<string, unknown>;
type IndiaMartIntegration = {
  id: string;
  organization_id: string;
  is_active: boolean;
  configuration: Record<string, unknown> | null;
};

type IndiaMartApiResult = {
  ok: boolean;
  code: number | null;
  message: string;
  totalRecords: number;
  records: JsonRecord[];
};

export type IndiaMartSyncResult = {
  ok: boolean;
  organizationId: string;
  integrationId: string;
  fetched: number;
  inserted: number;
  updated: number;
  windowStart: string;
  windowEnd: string;
  message: string;
};

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return null;
}

function safeTimestamp(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function formatIndiaMartTime(date: Date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getUTCDate())}-${months[date.getUTCMonth()]}-${date.getUTCFullYear()}${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function normalizePhone(record: JsonRecord) {
  const mobile = firstValue(record, 'SENDER_MOBILE', 'SENDER_MOBILE_ALT', 'MOBILE');
  if (!mobile) return { phoneNumber: null, countryCode: null, fullPhoneNumber: null };
  const countryIso = firstValue(record, 'SENDER_COUNTRY_ISO', 'COUNTRY_ISO');
  const digits = mobile.replace(/[^0-9+]/g, '');
  const fullPhoneNumber = digits.startsWith('+') ? digits : digits;
  return { phoneNumber: mobile, countryCode: countryIso, fullPhoneNumber };
}

function parseApiPayload(payload: unknown): IndiaMartApiResult {
  const body = payload && typeof payload === 'object' ? (payload as JsonRecord) : {};
  const code = numberValue(body.CODE ?? body.code);
  const message = text(body.MESSAGE ?? body.message) ?? 'IndiaMART response received';
  const response = Array.isArray(body.RESPONSE)
    ? body.RESPONSE
    : Array.isArray(body.DATA)
      ? body.DATA
      : Array.isArray(body.data)
        ? body.data
        : [];
  const records = response.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  const totalRecords = numberValue(body.TOTAL_RECORDS ?? body.total_records ?? body.totalRecords) ?? records.length;
  const noRecords = totalRecords === 0 && /no\s+(record|data|lead|enquir)/i.test(message);
  const ok = code === null ? records.length >= 0 : code === 200 || (code === 204 && noRecords);
  return { ok, code, message, totalRecords, records };
}

function normalizeRecord(organizationId: string, record: JsonRecord, fetchedAt: string) {
  const externalId = firstValue(record, 'UNIQUE_QUERY_ID', 'QUERY_ID', 'QUERYID', 'UNIQUE_ID');
  if (!externalId) return null;

  const senderName = firstValue(record, 'SENDER_NAME', 'NAME');
  const companyName = firstValue(record, 'SENDER_COMPANY', 'COMPANY_NAME', 'COMPANY');
  const email = firstValue(record, 'SENDER_EMAIL', 'EMAIL');
  const queryTime = safeTimestamp(record.QUERY_TIME ?? record.QUERY_DATE ?? record.CREATED_AT);
  const queryProduct = firstValue(record, 'QUERY_PRODUCT_NAME', 'PRODUCT_NAME', 'PRODUCT');
  const queryMessage = firstValue(record, 'QUERY_MESSAGE', 'MESSAGE', 'SUBJECT');
  const queryType = firstValue(record, 'QUERY_TYPE', 'LEAD_TYPE');
  const city = firstValue(record, 'SENDER_CITY', 'CITY');
  const state = firstValue(record, 'SENDER_STATE', 'STATE');
  const country = firstValue(record, 'SENDER_COUNTRY_ISO', 'COUNTRY');
  const pincode = firstValue(record, 'SENDER_PINCODE', 'PINCODE', 'ZIP');
  const address = firstValue(record, 'SENDER_ADDRESS', 'ADDRESS');
  const receiverMobile = firstValue(record, 'RECEIVERMOBILE', 'RECEIVER_MOBILE');
  const mcatName = firstValue(record, 'QUERY_MCAT_NAME', 'MCAT_NAME');
  const { phoneNumber, countryCode, fullPhoneNumber } = normalizePhone(record);
  const location = [city, state, country].filter(Boolean).join(', ') || null;

  return {
    organization_id: organizationId,
    source_provider: PROVIDER,
    source_account: receiverMobile,
    external_contact_id: externalId,
    external_user_id: firstValue(record, 'SENDER_GLUSR_USR_ID', 'SENDER_ID', 'GLUSR_USR_ID'),
    phone_number: phoneNumber,
    country_code: countryCode,
    full_phone_number: fullPhoneNumber,
    contact_name: senderName,
    person_name: senderName,
    company_name: companyName,
    email,
    source_created_at: queryTime,
    source_modified_at: queryTime,
    source_created_via: 'indiamart_pull_v2',
    channel_source: PROVIDER,
    acquisition_type: 'marketplace_inbound',
    delivery_location: location,
    traits: {
      provider: PROVIDER,
      query_product_name: queryProduct,
      query_message: queryMessage,
      query_type: queryType,
      query_mcat_name: mcatName,
      sender_city: city,
      sender_state: state,
      sender_country: country,
      sender_pincode: pincode,
      sender_address: address,
      receiver_mobile: receiverMobile,
    },
    raw_payload: record,
    fetched_at: fetchedAt,
    updated_at: fetchedAt,
    last_inbound_at: queryTime ?? fetchedAt,
    first_inquiry_at: queryTime ?? fetchedAt,
  };
}

async function getCredential(admin: NonNullable<ReturnType<typeof createServiceRoleClient>>, organizationId: string) {
  const { data, error } = await admin.rpc('get_integration_credential_service', {
    p_organization_id: organizationId,
    p_provider: PROVIDER,
    p_credential_type: 'crm_key',
  });
  if (error) throw new Error(`IndiaMART credential read failed: ${error.message}`);
  const credential = text(data);
  if (!credential) throw new Error('IndiaMART CRM credential is not configured.');
  return credential;
}

async function fetchIndiaMart(crmKey: string, windowStart: Date, windowEnd: Date) {
  const url = new URL(INDIA_MART_ENDPOINT);
  url.searchParams.set('glusr_crm_key', crmKey);
  url.searchParams.set('start_time', formatIndiaMartTime(windowStart));
  url.searchParams.set('end_time', formatIndiaMartTime(windowEnd));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'SetuFlow-IndiaMART/1.0' },
      cache: 'no-store',
      signal: controller.signal,
    });
    const rawText = await response.text();
    let payload: unknown = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      throw new Error(`IndiaMART returned non-JSON data (HTTP ${response.status}).`);
    }
    const parsed = parseApiPayload(payload);
    if (!response.ok || !parsed.ok) {
      throw new Error(`IndiaMART API rejected the request (HTTP ${response.status}, code ${parsed.code ?? 'unknown'}): ${parsed.message}`);
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

async function writeEvent(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  integrationId: string,
  eventType: string,
  status: string,
  payload: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  await admin.from('integration_events').insert({
    integration_id: integrationId,
    direction: 'inbound',
    event_type: eventType,
    payload,
    status,
    processed_at: ['success', 'processed'].includes(status) ? now : null,
  });
}

async function loadIntegration(admin: NonNullable<ReturnType<typeof createServiceRoleClient>>, organizationId: string) {
  const { data, error } = await admin
    .from('integrations')
    .select('id,organization_id,is_active,configuration')
    .eq('organization_id', organizationId)
    .eq('provider', PROVIDER)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`IndiaMART integration load failed: ${error.message}`);
  if (!data) throw new Error('IndiaMART integration is not configured for this organization.');
  return data as IndiaMartIntegration;
}

async function readLatestConfiguration(
  admin: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  integrationId: string,
  fallback: Record<string, unknown> | null,
) {
  const { data, error } = await admin.from('integrations').select('configuration').eq('id', integrationId).maybeSingle();
  if (error) throw new Error(`Unable to refresh IndiaMART integration configuration: ${error.message}`);
  return (data?.configuration ?? fallback ?? {}) as Record<string, unknown>;
}

function resolveWindow(configuration: Record<string, unknown> | null, now = new Date(), lookbackMinutes = DEFAULT_LOOKBACK_MINUTES) {
  const configuredLastSync = text(configuration?.last_successful_sync_at);
  const fallbackStart = new Date(now.getTime() - Math.max(lookbackMinutes, 15) * 60_000);
  let start = configuredLastSync ? new Date(configuredLastSync) : fallbackStart;
  if (!Number.isFinite(start.getTime())) start = fallbackStart;
  start = new Date(start.getTime() - OVERLAP_MINUTES * 60_000);
  if (now.getTime() - start.getTime() > MAX_WINDOW_MS) start = new Date(now.getTime() - MAX_WINDOW_MS);
  return { start, end: now };
}

export async function testIndiaMartConnection(organizationId: string) {
  const admin = createServiceRoleClient();
  if (!admin) throw new Error('Service-role database client is unavailable.');
  const integration = await loadIntegration(admin, organizationId);
  const credential = await getCredential(admin, organizationId);
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 60_000);

  try {
    const response = await fetchIndiaMart(credential, start, end);
    const now = new Date().toISOString();
    const latestConfiguration = await readLatestConfiguration(admin, integration.id, integration.configuration);
    const nextConfiguration = {
      ...latestConfiguration,
      mode: 'pull_v2',
      api_version: 'v2',
      credential_type: 'crm_key',
      prepared_for: 'inbound_leads',
      connection_validated_at: now,
      connection_validated: true,
    };
    const { error: integrationUpdateError } = await admin
      .from('integrations')
      .update({ configuration: nextConfiguration, updated_at: now })
      .eq('id', integration.id);
    if (integrationUpdateError) throw new Error(`Unable to persist IndiaMART connection status: ${integrationUpdateError.message}`);
    await writeEvent(admin, integration.id, 'connection_test', 'success', {
      provider: PROVIDER,
      api_code: response.code,
      provider_message: response.message,
      records_seen: response.records.length,
      window_start: start.toISOString(),
      window_end: end.toISOString(),
    });
    return { ok: true, recordsSeen: response.records.length, message: response.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'IndiaMART connection test failed.';
    await writeEvent(admin, integration.id, 'connection_test', 'failed', { provider: PROVIDER, error: message });
    throw error;
  }
}

export async function syncIndiaMartOrganization(
  organizationId: string,
  options: { activateAfterSuccess?: boolean; lookbackMinutes?: number } = {},
): Promise<IndiaMartSyncResult> {
  const admin = createServiceRoleClient();
  if (!admin) throw new Error('Service-role database client is unavailable.');
  const integration = await loadIntegration(admin, organizationId);
  const credential = await getCredential(admin, organizationId);
  const { start, end } = resolveWindow(integration.configuration, new Date(), options.lookbackMinutes);
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetchIndiaMart(credential, start, end);
    const normalized = response.records
      .map((record) => normalizeRecord(organizationId, record, fetchedAt))
      .filter((record): record is NonNullable<typeof record> => Boolean(record));
    const uniqueIds = Array.from(new Set(normalized.map((row) => row.external_contact_id)));

    let existingIds = new Set<string>();
    if (uniqueIds.length) {
      const { data: existing, error: existingError } = await admin
        .from('lead_intake_staging')
        .select('external_contact_id')
        .eq('organization_id', organizationId)
        .eq('source_provider', PROVIDER)
        .in('external_contact_id', uniqueIds);
      if (existingError) throw new Error(`Unable to deduplicate IndiaMART enquiries: ${existingError.message}`);
      existingIds = new Set((existing ?? []).map((row: { external_contact_id: string }) => row.external_contact_id));
    }

    if (normalized.length) {
      const { error: upsertError } = await admin
        .from('lead_intake_staging')
        .upsert(normalized, { onConflict: 'organization_id,source_provider,external_contact_id' });
      if (upsertError) throw new Error(`Unable to stage IndiaMART enquiries: ${upsertError.message}`);
    }

    const inserted = uniqueIds.filter((id) => !existingIds.has(id)).length;
    const updated = uniqueIds.length - inserted;
    const now = new Date().toISOString();
    const latestConfiguration = await readLatestConfiguration(admin, integration.id, integration.configuration);
    const nextConfiguration = {
      ...latestConfiguration,
      mode: 'pull_v2',
      api_version: 'v2',
      credential_type: 'crm_key',
      prepared_for: 'inbound_leads',
      connection_validated: true,
      connection_validated_at: text(latestConfiguration.connection_validated_at) ?? now,
      sync_enabled: options.activateAfterSuccess ? true : Boolean(latestConfiguration.sync_enabled),
      last_successful_sync_at: now,
      last_window_start: start.toISOString(),
      last_window_end: end.toISOString(),
      last_fetched_count: response.records.length,
      last_inserted_count: inserted,
      last_updated_count: updated,
    };

    const { error: integrationUpdateError } = await admin
      .from('integrations')
      .update({
        configuration: nextConfiguration,
        is_active: options.activateAfterSuccess ? true : integration.is_active,
        updated_at: now,
      })
      .eq('id', integration.id);
    if (integrationUpdateError) throw new Error(`Unable to persist IndiaMART sync checkpoint: ${integrationUpdateError.message}`);

    await writeEvent(admin, integration.id, 'lead_pull', 'success', {
      provider: PROVIDER,
      api_code: response.code,
      provider_message: response.message,
      fetched: response.records.length,
      staged: uniqueIds.length,
      inserted,
      updated,
      skipped_without_external_id: response.records.length - normalized.length,
      window_start: start.toISOString(),
      window_end: end.toISOString(),
    });

    return {
      ok: true,
      organizationId,
      integrationId: integration.id,
      fetched: response.records.length,
      inserted,
      updated,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      message: response.message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'IndiaMART synchronization failed.';
    await writeEvent(admin, integration.id, 'lead_pull', 'failed', {
      provider: PROVIDER,
      error: message,
      window_start: start.toISOString(),
      window_end: end.toISOString(),
    });
    throw error;
  }
}
