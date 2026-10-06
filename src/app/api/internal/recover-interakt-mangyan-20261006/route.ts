import { NextResponse } from 'next/server';

import { fetchInteraktContacts } from '@/features/integrations/interakt/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TARGET_LAST10 = '6398645297';

function digits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function matchesTarget(value: unknown) {
  return digits(value).endsWith(TARGET_LAST10);
}

function deepFind(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFind(item, keys);
      if (found) return found;
    }
    return null;
  }
  const row = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = String(row[key] ?? '').trim();
    if (candidate) return candidate;
  }
  for (const child of Object.values(row)) {
    const found = deepFind(child, keys);
    if (found) return found;
  }
  return null;
}

function payloadContainsTarget(payload: unknown) {
  return JSON.stringify(payload ?? {}).replace(/\D/g, '').includes(TARGET_LAST10);
}

function normalizePhone(value: unknown) {
  const d = digits(value);
  if (!d) return null;
  return `+${d}`;
}

export async function GET() {
  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 500 });

  const { data: existingRows, error: existingError } = await db
    .from('lead_intake_staging')
    .select('id,external_contact_id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id,last_inbound_at,source_modified_at')
    .eq('organization_id', ORG_ID)
    .eq('source_provider', 'interakt')
    .limit(5000);
  if (existingError) return NextResponse.json({ ok: false, error: 'staging_read_failed' }, { status: 500 });

  const existing = (existingRows ?? []).find((row: any) => matchesTarget(row.phone_number) || matchesTarget(row.full_phone_number)) ?? null;

  if (existing?.id) {
    const { data: updated, error: updateError } = await db
      .from('lead_intake_staging')
      .update({
        sales_queue_suppressed: false,
        sales_queue_suppressed_reason: null,
        intake_status: 'new',
        qualified_lead_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('organization_id', ORG_ID)
      .select('id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id')
      .single();

    if (updateError || !updated?.id) return NextResponse.json({ ok: false, error: 'existing_update_failed' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      present: true,
      recovered: false,
      source: 'existing_staging',
      row: updated,
    });
  }

  // First try the Interakt users API with both created and modified recovery windows.
  const windowStart = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  let foundContact: any = null;
  for (const mode of ['createdAfter', 'modifiedAfter'] as const) {
    let offset = 0;
    for (let page = 0; page < 30 && !foundContact; page += 1) {
      const result = await fetchInteraktContacts({ offset, limit: 100, [mode]: windowStart });
      foundContact = result.contacts.find((contact) => matchesTarget(contact.phoneNumber) || matchesTarget(contact.fullPhoneNumber)) ?? null;
      if (!result.hasNextPage || result.contacts.length === 0) break;
      offset += result.contacts.length;
    }
    if (foundContact) break;
  }

  let source = 'interakt_users_api';
  let externalContactId = foundContact?.externalContactId ?? null;
  let externalUserId = foundContact?.externalUserId ?? null;
  let phoneNumber = foundContact?.phoneNumber ?? null;
  let countryCode = foundContact?.countryCode ?? null;
  let fullPhoneNumber = foundContact?.fullPhoneNumber ?? null;
  let contactName = foundContact?.contactName ?? null;
  let email = foundContact?.email ?? null;
  let whatsappOptedIn = foundContact?.whatsappOptedIn ?? null;
  let sourceCreatedAt = foundContact?.sourceCreatedAt ?? null;
  let sourceModifiedAt = foundContact?.sourceModifiedAt ?? null;
  let sourceCreatedVia = foundContact?.sourceCreatedVia ?? null;
  let traits = foundContact?.traits ?? {};
  let rawPayload = foundContact?.rawPayload ?? {};

  // If the Users API still misses it, recover from the durable webhook audit log.
  if (!foundContact) {
    source = 'webhook_event_history';
    let matchedEvent: any = null;

    for (let page = 0; page < 30 && !matchedEvent; page += 1) {
      const from = page * 1000;
      const to = from + 999;
      const { data: events, error: eventError } = await db
        .from('lead_intake_webhook_events')
        .select('id,event_type,payload,created_at,processed_at,processing_error')
        .eq('organization_id', ORG_ID)
        .eq('provider', 'interakt')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (eventError) return NextResponse.json({ ok: false, error: 'webhook_history_read_failed' }, { status: 500 });

      matchedEvent = (events ?? []).find((event: any) => payloadContainsTarget(event.payload)) ?? null;
      if ((events ?? []).length < 1000) break;
    }

    if (!matchedEvent) {
      return NextResponse.json({ ok: false, present: false, error: 'not_found_in_interakt_or_webhook_history' }, { status: 404 });
    }

    const payload = matchedEvent.payload ?? {};
    const rawPhone = deepFind(payload, ['customer_number', 'phone_number', 'full_phone_number', 'phone', 'mobile']);
    const rawCountry = deepFind(payload, ['country_code', 'countryCode']);
    const rawName = deepFind(payload, ['customer_name', 'contact_name', 'name']);
    const rawEmail = deepFind(payload, ['email']);
    const customerId = deepFind(payload, ['customer_id', 'contact_id', 'user_id', 'id']);

    const normalized = normalizePhone(rawPhone);
    fullPhoneNumber = normalized && matchesTarget(normalized) ? normalized : `+${TARGET_LAST10}`;
    phoneNumber = rawPhone ? String(rawPhone).trim() : TARGET_LAST10;
    countryCode = rawCountry ? String(rawCountry).trim() : null;
    contactName = rawName ? String(rawName).trim() : 'MANGYAN ENTERPRISES';
    email = rawEmail ? String(rawEmail).trim() : null;
    externalContactId = customerId ? String(customerId).trim() : `recovered-${TARGET_LAST10}`;
    externalUserId = customerId ? String(customerId).trim() : null;
    sourceCreatedAt = matchedEvent.created_at;
    sourceModifiedAt = matchedEvent.created_at;
    sourceCreatedVia = 'webhook_history_recovery';
    rawPayload = payload;
    traits = {
      recovered_from_webhook_event_id: matchedEvent.id,
      recovered_event_type: matchedEvent.event_type,
      recovered_processed_at: matchedEvent.processed_at,
      recovered_processing_error: matchedEvent.processing_error,
    };
  }

  const now = new Date().toISOString();
  const row = {
    organization_id: ORG_ID,
    source_provider: 'interakt',
    source_account: 'stark-packmate',
    external_contact_id: externalContactId || `recovered-${TARGET_LAST10}`,
    external_user_id: externalUserId,
    phone_number: phoneNumber || TARGET_LAST10,
    country_code: countryCode,
    full_phone_number: fullPhoneNumber || `+${TARGET_LAST10}`,
    contact_name: contactName || 'MANGYAN ENTERPRISES',
    person_name: contactName || 'MANGYAN ENTERPRISES',
    email,
    whatsapp_opted_in: whatsappOptedIn,
    source_created_at: sourceCreatedAt || now,
    source_modified_at: sourceModifiedAt || now,
    source_created_via: sourceCreatedVia || 'recovery',
    traits,
    raw_payload: rawPayload,
    intake_status: 'new',
    sales_queue_suppressed: false,
    sales_queue_suppressed_reason: null,
    qualified_lead_id: null,
    fetched_at: now,
    updated_at: now,
  };

  const { data: upserted, error: upsertError } = await db
    .from('lead_intake_staging')
    .upsert(row, { onConflict: 'organization_id,source_provider,external_contact_id' })
    .select('id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id,last_inbound_at,source_modified_at')
    .single();

  if (upsertError || !upserted?.id) {
    return NextResponse.json({ ok: false, error: 'staging_upsert_failed', detail: String(upsertError?.message ?? '') }, { status: 500 });
  }

  const visible = upserted.intake_status === 'new' && upserted.sales_queue_suppressed === false && !upserted.qualified_lead_id;
  return NextResponse.json({
    ok: visible,
    present: true,
    recovered: true,
    source,
    visible_in_inbound: visible,
    row: upserted,
  }, { status: visible ? 200 : 500 });
}
