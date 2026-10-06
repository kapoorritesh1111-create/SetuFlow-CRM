import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const TARGET_PHONE = '6398645297';
const FULL_PHONE = '+916398645297';

function digits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function matchesTarget(value: unknown) {
  return digits(value).endsWith(TARGET_PHONE);
}

export async function GET() {
  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 500 });

  const { data: existingRows, error: readError } = await db
    .from('lead_intake_staging')
    .select('id,external_contact_id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id,last_inbound_at,source_modified_at')
    .eq('organization_id', ORG_ID)
    .eq('source_provider', 'interakt')
    .limit(5000);

  if (readError) return NextResponse.json({ ok: false, error: 'staging_read_failed', detail: readError.message }, { status: 500 });

  const existing = (existingRows ?? []).find((row: any) => matchesTarget(row.phone_number) || matchesTarget(row.full_phone_number)) ?? null;
  const now = new Date().toISOString();

  const base = {
    organization_id: ORG_ID,
    source_provider: 'interakt',
    source_account: 'stark-packmate',
    external_contact_id: existing?.external_contact_id || 'manual-recovery-6398645297',
    external_user_id: null,
    phone_number: TARGET_PHONE,
    country_code: '+91',
    full_phone_number: FULL_PHONE,
    contact_name: 'MANGYAN ENTERPRISES',
    person_name: 'MANGYAN ENTERPRISES',
    company_name: 'MANGYAN ENTERPRISES',
    email: null,
    whatsapp_opted_in: true,
    source_created_at: '2026-09-24T00:00:00.000Z',
    source_modified_at: now,
    source_created_via: 'manual_recovery_from_reported_interakt_screen',
    traits: {
      recovery_reason: 'Interakt inquiry visible to client but missing from Setu staging and unavailable from retained provider/webhook history',
      recovery_verified_from: 'reported_interakt_screen',
      reported_location: 'Roorkee, Uttarakhand',
      reported_requirement: 'Metalized Open Top PET Food Packaging Pouch (250g)',
      reported_quantity: '5000 Piece',
      reported_order_value: 'Rs. 20,000 to 50,000',
      original_display_phone: '06398645297',
      recovered_at: now,
    },
    raw_payload: {
      recovery: true,
      source: 'reported_interakt_screen',
      display_name: 'MANGYAN ENTERPRISES',
      display_phone: '06398645297',
      location: 'Roorkee, Uttarakhand',
      product: 'Metalized Open Top PET Food Packaging Pouch (250g)',
      quantity: '5000 Piece',
      pouch_style: 'Open Top',
      additional_requirements: '5000 Piece of Stand Up Pouch',
      probable_order_value: 'Rs. 20,000 to 50,000',
      inquiry_date: '2026-09-24',
    },
    intake_status: 'new',
    packaging_type: 'Pouches',
    pouch_type: 'Open Top',
    quantity_text: '5000 Piece',
    delivery_location: 'Roorkee, Uttarakhand',
    industry: 'Food Packaging',
    first_inquiry_at: '2026-09-24T00:00:00.000Z',
    last_inbound_at: '2026-09-24T00:00:00.000Z',
    channel_source: 'whatsapp',
    acquisition_type: 'organic',
    needs_reply: true,
    sales_queue_suppressed: false,
    sales_queue_suppressed_reason: null,
    browsing_only: false,
    qualified_lead_id: null,
    historical_backfill_status: 'partial',
    fetched_at: now,
    updated_at: now,
  };

  let result;
  if (existing?.id) {
    result = await db
      .from('lead_intake_staging')
      .update(base)
      .eq('id', existing.id)
      .eq('organization_id', ORG_ID)
      .select('id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id,packaging_type,pouch_type,quantity_text,delivery_location,last_inbound_at')
      .single();
  } else {
    result = await db
      .from('lead_intake_staging')
      .insert(base)
      .select('id,contact_name,person_name,company_name,phone_number,full_phone_number,intake_status,sales_queue_suppressed,qualified_lead_id,packaging_type,pouch_type,quantity_text,delivery_location,last_inbound_at')
      .single();
  }

  if (result.error || !result.data?.id) {
    return NextResponse.json({ ok: false, error: 'recovery_write_failed', detail: String(result.error?.message ?? '') }, { status: 500 });
  }

  const row = result.data;
  const visible = row.intake_status === 'new' && row.sales_queue_suppressed === false && !row.qualified_lead_id;

  return NextResponse.json({
    ok: visible,
    present: true,
    visible_in_inbound: visible,
    recovery: existing ? 'updated_existing' : 'created_missing',
    row,
  }, { status: visible ? 200 : 500 });
}
