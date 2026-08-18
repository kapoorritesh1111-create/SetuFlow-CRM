'use server';

import { writeAuditLog } from '@/lib/auditLog';
import { findEventCaptureIdentityMatch } from '@/lib/trade-events/event-capture-dedupe';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export type TradeEventScanDraft = {
  tradeEventId: string;
  leadType: 'buyer' | 'supplier';
  companyName: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  notes: string;
  sourceLabel: string;
  sourceProfile: string;
  extractionBoundary: string;
};

async function saveInteraction(db: any, organizationId: string, userId: string, draft: TradeEventScanDraft, leadId: string, duplicateOfEntryId: string | null) {
  const capturedAt = new Date().toISOString();
  const normalized = { capture_source: 'contact_scan_review', lead_type: draft.leadType, source_profile: draft.sourceProfile, extraction_boundary: draft.extractionBoundary, product_interest: null };
  const { data: entry, error } = await db.from('trade_event_entries').insert({
    organization_id: organizationId,
    trade_event_id: draft.tradeEventId,
    captured_company_name: draft.companyName || null,
    captured_contact_name: draft.contactName || null,
    captured_job_title: draft.jobTitle || null,
    captured_email: draft.email || null,
    captured_phone: draft.phone || null,
    captured_notes: draft.notes || null,
    source_label: 'contact_scan_review',
    status: duplicateOfEntryId ? 'duplicate' : 'converted',
    duplicate_of_entry_id: duplicateOfEntryId,
    converted_lead_id: leadId,
    converted_at: capturedAt,
    normalized_payload: normalized,
    raw_payload: { source_label: draft.sourceLabel, source_profile: draft.sourceProfile, extraction_boundary: draft.extractionBoundary, captured_at: capturedAt },
    captured_at: capturedAt,
    created_by: userId,
  }).select('id').single();
  if (error) throw new Error(error.message ?? 'Could not save the event scan interaction.');
  await writeAuditLog({ organizationId, actorUserId: userId, action: duplicateOfEntryId ? 'trade_event_repeat_capture' : 'trade_event_scan_linked', entityType: 'trade_event_entry', entityId: entry?.id ?? null, payload: { previous: null, new: normalized, metadata: { trade_event_id: draft.tradeEventId, lead_id: leadId, duplicate_of_entry_id: duplicateOfEntryId } } });
}

export async function findExistingTradeEventScanLead(draft: TradeEventScanDraft) {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return null;
  const db: any = await createClient();
  const match = await findEventCaptureIdentityMatch(db, { organizationId: workspace.organization.id, tradeEventId: draft.tradeEventId, leadType: draft.leadType, company: draft.companyName, contact: draft.contactName, email: draft.email, phone: draft.phone });
  const leadId = String(match.repeatEntry?.converted_lead_id || match.exactLead?.id || '');
  if (!leadId) return null;
  const { data: lead } = await db.from('leads').select('id, company_name, source_label').eq('organization_id', workspace.organization.id).eq('id', leadId).maybeSingle();
  if (!lead?.id) return null;
  await saveInteraction(db, workspace.organization.id, workspace.user.id, draft, leadId, match.repeatEntry?.id ?? null);
  return { leadId, companyName: String(lead.company_name ?? draft.companyName), sourceLabel: lead.source_label ?? null, repeatEntryId: match.repeatEntry?.id ?? null };
}

export async function linkCreatedLeadToTradeEventScan(draft: TradeEventScanDraft, leadId: string) {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return;
  const db: any = await createClient();
  const match = await findEventCaptureIdentityMatch(db, { organizationId: workspace.organization.id, tradeEventId: draft.tradeEventId, leadType: draft.leadType, company: draft.companyName, contact: draft.contactName, email: draft.email, phone: draft.phone });
  await saveInteraction(db, workspace.organization.id, workspace.user.id, draft, leadId, match.repeatEntry?.id ?? null);
  if (match.repeatEntry?.id && !match.repeatEntry.converted_lead_id) {
    await db.from('trade_event_entries').update({ converted_lead_id: leadId, converted_at: new Date().toISOString() }).eq('organization_id', workspace.organization.id).eq('id', match.repeatEntry.id);
  }
}
