'use server';

import type { ActionState, LeadRecord } from './shared';
import { saveLead as saveCanonicalLead } from './lead-capture-save-action';
import { writeAuditLog } from '@/lib/auditLog';
import { createClient } from '@/lib/supabase/server';
import { findEventCaptureIdentityMatch } from '@/lib/trade-events/event-capture-dedupe';
import { requireWorkspace } from '@/lib/workspace/auth';

const clean = (value: unknown) => String(value ?? '').trim();
const LEAD_RECORD_COLUMNS = [
  'id',
  'company_name',
  'contact_name',
  'job_title',
  'email',
  'phone',
  'whatsapp_number',
  'phone_secondary',
  'website',
  'social_handle',
  'lead_type',
  'country',
  'country_id',
  'source_type',
  'source_label',
  'next_follow_up_at',
  'created_at',
  'updated_at',
  'last_contacted_at',
  'stage_id',
  'next_step_id',
  'owner_user_id',
  'trade_event_id',
  'notes',
  'pipeline_id',
  'intro_sent',
  'deal_value',
  'deal_currency',
  'phone_country_code',
  'phone_secondary_country_code',
].join(', ');

type EventContext = {
  id: string;
  name: string;
};

type EventInteractionInput = {
  organizationId: string;
  actorUserId: string;
  event: EventContext;
  leadId: string;
  leadType: 'buyer' | 'supplier';
  companyName: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  country: string;
  notes: string;
  nextFollowUpAt: string;
  duplicateOfEntryId: string | null;
  possibleLeadIds: string[];
  clientCaptureId: string;
};

async function loadLeadRecord(db: any, organizationId: string, leadId: string): Promise<LeadRecord | null> {
  const { data, error } = await db
    .from('leads')
    .select(LEAD_RECORD_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('id', leadId)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data as LeadRecord;
}

async function findSyncedOfflineCapture(db: any, organizationId: string, eventId: string, clientCaptureId: string) {
  if (!clientCaptureId) return null;
  const { data, error } = await db
    .from('trade_event_entries')
    .select('id, converted_lead_id')
    .eq('organization_id', organizationId)
    .eq('trade_event_id', eventId)
    .eq('source_scan_ref', `offline:${clientCaptureId}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ? data : null;
}

async function saveEventInteraction(db: any, input: EventInteractionInput) {
  const capturedAt = new Date().toISOString();
  const normalizedPayload = {
    capture_source: input.clientCaptureId ? 'offline_quick_lead_sync' : 'quick_lead',
    lead_type: input.leadType,
    source_event_name: input.event.name,
    next_follow_up_at: input.nextFollowUpAt || null,
    possible_lead_ids: input.possibleLeadIds,
    client_capture_id: input.clientCaptureId || null,
  };

  const { data: entry, error } = await db
    .from('trade_event_entries')
    .insert({
      organization_id: input.organizationId,
      trade_event_id: input.event.id,
      captured_company_name: input.companyName || null,
      captured_contact_name: input.contactName || null,
      captured_job_title: input.jobTitle || null,
      captured_email: input.email || null,
      captured_phone: input.phone || null,
      captured_country: input.country || null,
      captured_notes: input.notes || null,
      source_label: input.event.name,
      source_scan_ref: input.clientCaptureId ? `offline:${input.clientCaptureId}` : null,
      status: input.duplicateOfEntryId ? 'duplicate' : 'converted',
      duplicate_of_entry_id: input.duplicateOfEntryId,
      converted_lead_id: input.leadId,
      converted_at: capturedAt,
      normalized_payload: normalizedPayload,
      raw_payload: {
        source_type: 'trade_show',
        source_label: input.event.name,
        captured_at: capturedAt,
        client_capture_id: input.clientCaptureId || null,
      },
      captured_at: capturedAt,
      created_by: input.actorUserId,
    })
    .select('id')
    .single();

  if (error) throw error;

  if (input.duplicateOfEntryId) {
    await db
      .from('trade_event_entries')
      .update({ converted_lead_id: input.leadId, converted_at: capturedAt })
      .eq('organization_id', input.organizationId)
      .eq('id', input.duplicateOfEntryId)
      .is('converted_lead_id', null);
  }

  await writeAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.duplicateOfEntryId ? 'trade_event_repeat_capture' : 'trade_event_quick_lead_linked',
    entityType: 'trade_event_entry',
    entityId: entry?.id ?? null,
    payload: {
      previous: null,
      new: normalizedPayload,
      metadata: {
        trade_event_id: input.event.id,
        lead_id: input.leadId,
        duplicate_of_entry_id: input.duplicateOfEntryId,
        client_capture_id: input.clientCaptureId || null,
      },
    },
  });

  return entry?.id ? String(entry.id) : null;
}

async function ensureEventFollowUpTask(db: any, input: EventInteractionInput, entryId: string | null) {
  if (!input.nextFollowUpAt) return;
  const { data: existing } = await db
    .from('scheduled_tasks')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('lead_id', input.leadId)
    .eq('scheduled_for', input.nextFollowUpAt)
    .eq('task_type', 'follow_up')
    .limit(1)
    .maybeSingle();
  if (existing?.id) return;

  await db.from('scheduled_tasks').insert({
    organization_id: input.organizationId,
    lead_id: input.leadId,
    task_type: 'follow_up',
    scheduled_for: input.nextFollowUpAt,
    status: 'pending',
    created_by: input.actorUserId,
    payload: {
      source: 'trade_event_quick_lead',
      trade_event_id: input.event.id,
      trade_event_entry_id: entryId,
      source_label: input.event.name,
      client_capture_id: input.clientCaptureId || null,
    },
  });
}

export async function saveLead(previousState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const tradeEventId = clean(formData.get('trade_event_id'));
  if (!tradeEventId) return saveCanonicalLead(previousState, formData);

  let workspace: Awaited<ReturnType<typeof requireWorkspace>>;
  let db: any;
  try {
    workspace = await requireWorkspace();
    if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
    db = await createClient();
  } catch {
    return saveCanonicalLead(previousState, formData);
  }

  const { data: event, error: eventError } = await db
    .from('trade_events')
    .select('id, name')
    .eq('organization_id', workspace.organization.id)
    .eq('id', tradeEventId)
    .maybeSingle();
  if (eventError || !event?.id) return { error: 'The selected trade event is not available in this organization.' };

  const clientCaptureId = clean(formData.get('client_capture_id'));
  if (clientCaptureId) {
    try {
      const alreadySynced = await findSyncedOfflineCapture(db, workspace.organization.id, tradeEventId, clientCaptureId);
      const syncedLeadId = clean(alreadySynced?.converted_lead_id);
      if (syncedLeadId) {
        const syncedLead = await loadLeadRecord(db, workspace.organization.id, syncedLeadId);
        if (syncedLead) {
          return {
            success: `${event.name} offline capture already synced. No duplicate lead was created.`,
            lead: syncedLead,
          };
        }
      }
    } catch (error) {
      console.error('[trade-event-offline-sync] idempotency lookup failed', error);
    }
  }

  const originalSourceType = clean(formData.get('source_type'));
  const dedicatedContactScan = originalSourceType === 'contact_scan_review';

  // The event is acquisition context; camera/file scan is only the capture method.
  // Enforce the same source regardless of how the Quick Lead fields were populated.
  formData.set('source_type', 'trade_show');
  formData.set('source_label', String(event.name));

  const leadType: 'buyer' | 'supplier' = clean(formData.get('lead_type')).toLowerCase() === 'supplier' ? 'supplier' : 'buyer';
  const companyName = clean(formData.get('company_name'));
  const contactName = clean(formData.get('contact_name'));
  const jobTitle = clean(formData.get('job_title'));
  const email = clean(formData.get('email')).toLowerCase();
  const phone = clean(formData.get('phone')) || clean(formData.get('whatsapp_number'));
  const country = clean(formData.get('country'));
  const notes = clean(formData.get('notes'));
  const nextFollowUpAt = clean(formData.get('next_follow_up_at'));
  const editingLeadId = clean(formData.get('lead_id'));

  if (!editingLeadId && !dedicatedContactScan) {
    const match = await findEventCaptureIdentityMatch(db, {
      organizationId: workspace.organization.id,
      tradeEventId,
      leadType,
      company: companyName,
      contact: contactName,
      email,
      phone,
    });
    const existingLeadId = clean(match.repeatEntry?.converted_lead_id || match.exactLead?.id);
    if (existingLeadId) {
      const interaction: EventInteractionInput = {
        organizationId: workspace.organization.id,
        actorUserId: workspace.user.id,
        event: { id: String(event.id), name: String(event.name) },
        leadId: existingLeadId,
        leadType,
        companyName,
        contactName,
        jobTitle,
        email,
        phone,
        country,
        notes,
        nextFollowUpAt,
        duplicateOfEntryId: match.repeatEntry?.id ?? null,
        possibleLeadIds: match.possibleLeadIds,
        clientCaptureId,
      };
      const entryId = await saveEventInteraction(db, interaction);
      await ensureEventFollowUpTask(db, interaction, entryId);
      const existingLead = await loadLeadRecord(db, workspace.organization.id, existingLeadId);
      if (!existingLead) return { error: 'Existing CRM contact was matched, but the lead could not be reloaded.' };
      return {
        success: `${event.name} interaction recorded on the existing CRM lead. No duplicate lead was created.`,
        lead: existingLead,
      };
    }
  }

  const result = await saveCanonicalLead(previousState, formData);
  if (!result?.success || !result.lead?.id || dedicatedContactScan) return result;

  try {
    const match = await findEventCaptureIdentityMatch(db, {
      organizationId: workspace.organization.id,
      tradeEventId,
      leadType,
      company: companyName,
      contact: contactName,
      email,
      phone,
    });
    const interaction: EventInteractionInput = {
      organizationId: workspace.organization.id,
      actorUserId: workspace.user.id,
      event: { id: String(event.id), name: String(event.name) },
      leadId: result.lead.id,
      leadType,
      companyName,
      contactName,
      jobTitle,
      email,
      phone,
      country,
      notes,
      nextFollowUpAt,
      duplicateOfEntryId: match.repeatEntry?.id ?? null,
      possibleLeadIds: match.possibleLeadIds.filter((id) => id !== result.lead?.id),
      clientCaptureId,
    };
    const entryId = await saveEventInteraction(db, interaction);
    await ensureEventFollowUpTask(db, interaction, entryId);
  } catch (error) {
    console.error('[trade-event-quick-lead] lead saved but event interaction fanout failed', error);
  }

  return result;
}
