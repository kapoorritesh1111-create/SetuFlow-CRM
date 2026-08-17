'use server';

import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/auditLog';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { findEventCaptureIdentityMatch } from '@/lib/trade-events/event-capture-dedupe';
import { requireWorkspace } from '@/lib/workspace/auth';

export type EventQuickCaptureState = { error?: string; success?: string; entryId?: string; linkedLeadId?: string | null; repeatCapture?: boolean; possibleMatches?: number };
const value = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();
const optional = (formData: FormData, key: string) => value(formData, key) || null;

function heatSlaDueAt(heat: string, capturedAt: string) {
  const hours = heat === 'hot' ? 4 : heat === 'interested' ? 24 : 72;
  return new Date(new Date(capturedAt).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function promisedDueAt(timing: string | null, eventEndsOn: string | null, capturedAt: string) {
  if (timing === 'today') return new Date(new Date(capturedAt).getTime() + 4 * 60 * 60 * 1000).toISOString();
  if (timing === 'tomorrow') return new Date(new Date(capturedAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
  if (timing === 'after_event' && eventEndsOn) return new Date(`${eventEndsOn}T10:00:00Z`).toISOString();
  if (timing === 'after_event') return new Date(new Date(capturedAt).getTime() + 72 * 60 * 60 * 1000).toISOString();
  return null;
}

export async function saveEventQuickCapture(_previous: EventQuickCaptureState | undefined, formData: FormData): Promise<EventQuickCaptureState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const tradeEventId = value(formData, 'trade_event_id');
  const leadType = value(formData, 'lead_type').toLowerCase() === 'supplier' ? 'supplier' : 'buyer';
  const company = value(formData, 'company');
  const contact = value(formData, 'contact');
  const email = value(formData, 'email').toLowerCase();
  const phone = value(formData, 'phone');
  if (!tradeEventId) return { error: 'Choose the trade event before saving.' };
  if (!company && !contact && !email && !phone) return { error: 'Add at least a company, contact name, email, or phone.' };

  const db: any = await createClient();
  const { data: event } = await db.from('trade_events').select('id, name, ends_on').eq('organization_id', workspace.organization.id).eq('id', tradeEventId).maybeSingle();
  if (!event?.id) return { error: 'Trade event was not found for this organization.' };

  const match = await findEventCaptureIdentityMatch(db, { organizationId: workspace.organization.id, tradeEventId, leadType, company, contact, email, phone });
  const capturedAt = new Date().toISOString();
  const linkedLeadId = match.repeatEntry?.converted_lead_id || match.exactLead?.id || null;
  const repeatCapture = Boolean(match.repeatEntry?.id);
  const status = repeatCapture ? 'duplicate' : linkedLeadId ? 'converted' : 'new';
  const promise = optional(formData, 'follow_up_promise');
  const promiseTiming = optional(formData, 'follow_up_timing');
  const productInterest = optional(formData, 'product_interest');
  const heat = ['hot', 'interested', 'review_later'].includes(value(formData, 'lead_heat')) ? value(formData, 'lead_heat') : 'review_later';
  const slaDueAt = heatSlaDueAt(heat, capturedAt);
  const promiseDueAt = promise ? promisedDueAt(promiseTiming, event.ends_on ?? null, capturedAt) : null;

  const normalizedPayload = {
    capture_source: 'event_quick_capture', lead_type: leadType, product_interest: productInterest,
    lead_heat: heat, follow_up_sla_due_at: slaDueAt, follow_up_promise: promise, follow_up_timing: promiseTiming, follow_up_promise_due_at: promiseDueAt,
    possible_lead_ids: match.possibleLeadIds,
    packaging: {
      product_type: optional(formData, 'packaging_product_type'), application: optional(formData, 'packaging_application'),
      approximate_quantity: optional(formData, 'approximate_quantity'), dimensions_status: optional(formData, 'dimensions_status'),
      dimensions: optional(formData, 'dimensions'), artwork_status: optional(formData, 'artwork_status'), sample_needed: value(formData, 'sample_needed') === '1',
    },
  };

  const { data: entry, error } = await db.from('trade_event_entries').insert({
    organization_id: workspace.organization.id, trade_event_id: tradeEventId,
    captured_company_name: company || null, captured_contact_name: contact || null, captured_email: email || null, captured_phone: phone || null,
    captured_notes: optional(formData, 'notes'), source_label: 'event_quick_capture', status,
    duplicate_of_entry_id: match.repeatEntry?.id ?? null, converted_lead_id: linkedLeadId, converted_at: linkedLeadId ? capturedAt : null,
    normalized_payload: normalizedPayload, raw_payload: { submitted_fields: Object.fromEntries(formData.entries()), captured_at: capturedAt },
    captured_at: capturedAt, created_by: workspace.user.id,
  }).select('id').single();
  if (error || !entry?.id) return { error: error?.message ?? 'Could not save this event capture.' };

  if (linkedLeadId) {
    const scheduledFor = promiseDueAt || slaDueAt;
    await db.from('scheduled_tasks').insert({
      organization_id: workspace.organization.id, lead_id: linkedLeadId, task_type: 'follow_up', scheduled_for: scheduledFor,
      status: 'pending', created_by: workspace.user.id,
      payload: { source: 'trade_event', trade_event_id: tradeEventId, trade_event_entry_id: entry.id, lead_heat: heat, sla_due_at: slaDueAt, promise, promise_due_at: promiseDueAt },
    });
  }

  await writeAuditLog({ organizationId: workspace.organization.id, actorUserId: workspace.user.id, action: repeatCapture ? 'trade_event_repeat_capture' : 'trade_event_entry_captured', entityType: 'trade_event_entry', entityId: entry.id, payload: { previous: null, new: normalizedPayload, metadata: { trade_event_id: tradeEventId, linked_lead_id: linkedLeadId, duplicate_of_entry_id: match.repeatEntry?.id ?? null } } });
  revalidatePath('/trade-events');
  revalidatePath('/trade-events/capture');

  return { success: repeatCapture ? 'Existing event contact found. The new conversation was saved as another interaction.' : linkedLeadId ? 'Existing CRM contact found. This event conversation was linked without creating a duplicate lead.' : 'Event lead captured. You can enrich the requirements now or review it later.', entryId: entry.id, linkedLeadId, repeatCapture, possibleMatches: match.possibleLeadIds.length };
}
