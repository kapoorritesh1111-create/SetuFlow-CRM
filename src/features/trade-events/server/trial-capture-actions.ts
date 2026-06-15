"use server";

import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/auditLog';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { buildReusableCaptureTermPayload, type SavedCaptureTerm } from '@/features/trade-events/server/capture-terms';

export type TrialCaptureSource = 'type' | 'dictate' | 'scan';

export type TrialCaptureActionState = {
  error?: string;
  success?: string;
};

type DbError = { message?: string } | null;

type TradeEventLookupRow = {
  id: string;
  name: string | null;
  organization_id: string;
};

type CreatedEntryRow = {
  id: string;
};

type EntryPayload = {
  organization_id: string;
  trade_event_id: string;
  captured_company_name: string;
  captured_contact_name: string | null;
  captured_job_title: string | null;
  captured_email: string | null;
  captured_phone: string | null;
  captured_country: string | null;
  captured_notes: string | null;
  source_label: TrialCaptureSource;
  source_scan_ref: string | null;
  status: 'new';
  normalized_payload: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
  captured_at: string;
  created_by: string;
};

type ReusableTermPayload = {
  organization_id: string;
  trade_event_id: string;
  kind: 'product' | 'category';
  normalized_key: string;
  display_term: string;
  usage_count: number;
  last_used_at: string;
  created_by: string;
};

type TradeEventQueryBuilder = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: TradeEventLookupRow | null; error: DbError }>;
      };
    };
  };
};

type TradeEventEntryInsertBuilder = {
  insert: (payload: EntryPayload) => {
    select: (columns: string) => {
      single: () => Promise<{ data: CreatedEntryRow | null; error: DbError }>;
    };
  };
};

type TradeEventTermUpsertBuilder = {
  upsert: (payload: ReusableTermPayload[], options: { onConflict: string }) => Promise<{ error: DbError }>;
};

type TrialCaptureDb = {
  from: (table: 'trade_events') => TradeEventQueryBuilder;
} & {
  from: (table: 'trade_event_entries') => TradeEventEntryInsertBuilder;
} & {
  from: (table: 'trade_event_terms') => TradeEventTermUpsertBuilder;
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function normalizeCaptureSource(value: string): TrialCaptureSource | null {
  if (value === 'type' || value === 'dictate' || value === 'scan') return value;
  return null;
}

function appendTranscriptToNotes(notes: string, transcript: string) {
  if (!transcript) return notes || null;
  const prefix = notes ? `${notes}\n\n` : '';
  return `${prefix}Dictation transcript: ${transcript}`;
}

export async function saveTrialTradeEventCapture(
  _previousState: TrialCaptureActionState | undefined,
  formData: FormData,
): Promise<TrialCaptureActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };

  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const captureSource = normalizeCaptureSource(getText(formData, 'capture_source'));
  if (!captureSource) return { error: 'Choose Type, Dictate, or Scan before saving.' };

  const tradeEventId = getText(formData, 'trade_event_id');
  if (!tradeEventId) return { error: 'Trade event is required.' };

  const company = getText(formData, 'captured_company_name');
  const contact = getText(formData, 'captured_contact_name');
  const email = getText(formData, 'captured_email');
  const phone = getText(formData, 'captured_phone');
  const productInterest = getText(formData, 'product_interest');
  const typedCategory = getText(formData, 'typed_category');
  const notes = getText(formData, 'captured_notes');
  const transcript = getText(formData, 'raw_transcript');
  const scanPayload = getText(formData, 'raw_scan_payload');
  const sourceScanRef = getText(formData, 'source_scan_ref');

  if (!company) return { error: 'Company name is required before saving the capture.' };
  if (captureSource === 'dictate' && !transcript) return { error: 'Dictation transcript is required so the raw input is retained.' };
  if (captureSource === 'scan' && !scanPayload && !sourceScanRef) return { error: 'Scan, QR, badge, or card payload is required so the raw input is retained.' };

  const supabase = await createClient();
  const db = supabase as unknown as TrialCaptureDb;
  const { data: eventRow, error: eventError } = await db
    .from('trade_events')
    .select('id, name, organization_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', tradeEventId)
    .maybeSingle();

  if (eventError) return { error: eventError.message ?? 'Could not verify the trade event.' };
  if (!eventRow?.id) return { error: 'Trade event was not found for this organization.' };

  const capturedAt = new Date().toISOString();
  const productTerm = buildReusableCaptureTermPayload({ organizationId: workspace.organization.id, tradeEventId, userId: workspace.user.id, kind: 'product', term: productInterest, usedAt: capturedAt });
  const categoryTerm = buildReusableCaptureTermPayload({ organizationId: workspace.organization.id, tradeEventId, userId: workspace.user.id, kind: 'category', term: typedCategory, usedAt: capturedAt });
  const termPayloads = [productTerm, categoryTerm].filter((term): term is ReusableTermPayload => Boolean(term));
  const savedTerms: SavedCaptureTerm[] = termPayloads.map((term) => ({ kind: term.kind, key: term.normalized_key }));

  if (termPayloads.length) {
    const { error: termError } = await db
      .from('trade_event_terms')
      .upsert(termPayloads, { onConflict: 'organization_id,kind,normalized_key' });
    if (termError) return { error: termError.message ?? 'Could not save reusable quick-pick terms.' };
  }

  const capturedNotes = captureSource === 'dictate' ? appendTranscriptToNotes(notes, transcript) : (notes || null);
  const normalizedPayload = {
    capture_source: captureSource,
    company,
    contact: contact || null,
    email: email || null,
    phone: phone || null,
    product_interest: productInterest || null,
    typed_category: typedCategory || null,
    reusable_terms: savedTerms,
    notes: capturedNotes,
    trade_event_name: eventRow.name,
  };
  const rawPayload = {
    capture_source: captureSource,
    transcript: transcript || null,
    scan_payload: scanPayload || null,
    source_scan_ref: sourceScanRef || null,
    submitted_fields: {
      company,
      contact: contact || null,
      email: email || null,
      phone: phone || null,
      product_interest: productInterest || null,
      typed_category: typedCategory || null,
      notes: notes || null,
    },
    captured_by: workspace.user.id,
    captured_at: capturedAt,
    reusable_terms_saved: savedTerms,
    trial_capture_boundary: 'event_entry_only_no_crm_lead_conversion',
  };

  const payload: EntryPayload = {
    organization_id: workspace.organization.id,
    trade_event_id: tradeEventId,
    captured_company_name: company,
    captured_contact_name: contact || null,
    captured_job_title: null,
    captured_email: email || null,
    captured_phone: phone || null,
    captured_country: null,
    captured_notes: capturedNotes,
    source_label: captureSource,
    source_scan_ref: sourceScanRef || null,
    status: 'new',
    normalized_payload: normalizedPayload,
    raw_payload: rawPayload,
    captured_at: capturedAt,
    created_by: workspace.user.id,
  };

  const { data: createdEntry, error } = await db
    .from('trade_event_entries')
    .insert(payload)
    .select('id')
    .single();

  if (error) return { error: error.message ?? 'Could not save the trade event capture.' };

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: 'trade_event_entry_captured',
    entityType: 'trade_event_entry',
    entityId: createdEntry?.id ?? null,
    actorUserId: workspace.user.id,
    payload: {
      previous: null,
      new: normalizedPayload,
      metadata: {
        capture_source: captureSource,
        trade_event_id: tradeEventId,
        raw_input_retained: true,
        reusable_terms_saved: savedTerms.length,
        lead_conversion_created: false,
      },
    },
  });

  revalidatePath('/trade-events');
  revalidatePath('/trade-events/capture');

  const termSuffix = savedTerms.length ? ` ${savedTerms.length} reusable quick-pick term${savedTerms.length === 1 ? '' : 's'} updated.` : '';
  return { success: `${captureSource === 'type' ? 'Typed' : captureSource === 'dictate' ? 'Dictated' : 'Scanned'} event entry saved for ${company}.${termSuffix}` };
}
