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

  const createdAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  let found: any = null;
  let offset = 0;

  for (let page = 0; page < 10 && !found; page += 1) {
    const result = await fetchInteraktContacts({ offset, limit: 100, createdAfter });
    found = result.contacts.find((contact) => matchesTarget(contact.phoneNumber) || matchesTarget(contact.fullPhoneNumber)) ?? null;
    if (!result.hasNextPage || result.contacts.length === 0) break;
    offset += result.contacts.length;
  }

  if (!found && existing) {
    const { error: updateError } = await db
      .from('lead_intake_staging')
      .update({
        sales_queue_suppressed: false,
        sales_queue_suppressed_reason: null,
        intake_status: ['qualified','duplicate','existing_customer','not_relevant','ignored'].includes(String(existing.intake_status ?? ''))
          ? 'new'
          : (existing.intake_status ?? 'new'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('organization_id', ORG_ID);
    if (updateError) return NextResponse.json({ ok: false, error: 'existing_update_failed' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      recovered: false,
      present: true,
      source: 'existing_staging',
      id: existing.id,
      name: existing.person_name || existing.contact_name || existing.company_name || null,
      phone: existing.full_phone_number || existing.phone_number || null,
      intake_status: ['qualified','duplicate','existing_customer','not_relevant','ignored'].includes(String(existing.intake_status ?? '')) ? 'new' : (existing.intake_status ?? 'new'),
      sales_queue_suppressed: false,
    });
  }

  if (!found) {
    return NextResponse.json({ ok: false, present: false, error: 'not_found_in_90_day_interakt_window' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const row = {
    organization_id: ORG_ID,
    source_provider: 'interakt',
    source_account: 'stark-packmate',
    external_contact_id: found.externalContactId,
    external_user_id: found.externalUserId,
    phone_number: found.phoneNumber,
    country_code: found.countryCode,
    full_phone_number: found.fullPhoneNumber,
    contact_name: found.contactName,
    person_name: found.contactName,
    email: found.email,
    whatsapp_opted_in: found.whatsappOptedIn,
    source_created_at: found.sourceCreatedAt,
    source_modified_at: found.sourceModifiedAt,
    source_created_via: found.sourceCreatedVia,
    traits: found.traits,
    raw_payload: found.rawPayload,
    intake_status: existing?.intake_status && !['qualified','duplicate','existing_customer','not_relevant','ignored'].includes(String(existing.intake_status))
      ? existing.intake_status
      : 'new',
    sales_queue_suppressed: false,
    sales_queue_suppressed_reason: null,
    fetched_at: now,
    updated_at: now,
  };

  const { data: upserted, error: upsertError } = await db
    .from('lead_intake_staging')
    .upsert(row, { onConflict: 'organization_id,source_provider,external_contact_id' })
    .select('id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id')
    .single();

  if (upsertError || !upserted?.id) {
    return NextResponse.json({ ok: false, error: 'staging_upsert_failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    recovered: !existing,
    present: true,
    source: 'interakt_recovery',
    id: upserted.id,
    name: upserted.person_name || upserted.contact_name || upserted.company_name || null,
    phone: upserted.full_phone_number || upserted.phone_number || null,
    intake_status: upserted.intake_status,
    sales_queue_suppressed: upserted.sales_queue_suppressed,
    qualified_lead_id: upserted.qualified_lead_id,
  });
}
