/*
 * Audit event label helpers.
 *
 * Provide human-readable labels and summaries for audit events. When
 * rendering audit logs in the UI this mapping can be used to display
 * concise descriptions for each event type.
 */

import type { AuditEventRecord, AuditEventType } from './auditLog';

const EVENT_LABELS: Record<AuditEventType, string> = {
  invitation_created: 'Invitation created',
  invitation_sent: 'Invitation sent',
  invitation_resent: 'Invitation resent',
  invitation_updated: 'Invitation updated',
  invitation_revoked: 'Invitation revoked',
  invitation_accepted: 'Invitation accepted',
  invitation_failed: 'Invitation failed',
  role_changed: 'Role changed',
  saved_view_created: 'Saved view created',
  saved_view_updated: 'Saved view updated',
  saved_view_shared: 'Saved view shared',
  default_view_set: 'Default view set',
  settings_list_item_saved: 'Settings list item saved',
  settings_list_item_deleted: 'Settings list item deleted',
  lead_created: 'Lead created',
  lead_updated: 'Lead updated',
  lead_stage_changed: 'Lead stage changed',
  lead_follow_up_scheduled: 'Lead follow-up scheduled',
  lead_follow_up_completed: 'Lead follow-up completed',
  lead_qualification_updated: 'Lead qualification updated',
  lead_note_added: 'Lead note added',
  rfq_created: 'RFQ created',
  rfq_updated: 'RFQ updated',
  quote_approved: 'Quote approved',
  quote_rejected: 'Quote rejected',
  rfq_status_changed: 'RFQ status changed',
  pricing_shared: 'Pricing shared',
  pricing_sent: 'Pricing sent',
  pricing_exported: 'Pricing exported',
  product_created: 'Product created',
  product_updated: 'Product updated',
  product_deleted: 'Product deleted',
  password_reset_requested: 'Password reset requested',
  membership_reactivated: 'Membership reactivated',
  membership_deactivated: 'Membership deactivated',
  membership_removed: 'Membership removed',
  document_status_changed: 'Document status changed',
  compliance_status_changed: 'Compliance status changed',
  document_reviewed: 'Document reviewed',
  document_revision_requested: 'Document revision requested',
  document_approved: 'Document approved',
  document_rejected: 'Document rejected',
  compliance_item_updated: 'Compliance item updated',
  integration_replay_requested: 'Integration replay requested',
  trade_event_created: 'Trade event created',
  trade_event_updated: 'Trade event updated',
  trade_event_deleted: 'Trade event deleted',
  trade_event_entry_captured: 'Trade event entry captured',
  trade_event_entry_converted: 'Trade event entry converted',
  scheduled_task_created: 'Scheduled task created',
  scheduled_task_updated: 'Scheduled task updated',
  scheduled_task_completed: 'Scheduled task completed',
  scheduled_task_reopened: 'Scheduled task reopened',
  mobile_field_note_captured: 'Mobile field note captured',
  mobile_field_document_captured: 'Mobile field document captured',
  ai_suggestion_generated: 'AI suggestion generated',
  ai_suggestion_reviewed: 'AI suggestion reviewed',
  ai_suggestion_approved: 'AI suggestion approved',
  ai_suggestion_dismissed: 'AI suggestion dismissed',
  ai_suggestion_applied: 'AI suggestion applied',
  quote_created: 'Quote created',
  quote_updated: 'Quote updated',
  quote_sent: 'Quote sent',
  quote_send_blocked: 'Quote send blocked',
  contract_progressed: 'Contract progressed',
  contract_updated: 'Contract updated',
  pricing_quote_approval_requested: 'Pricing quote approval requested',
  pricing_quote_approved: 'Pricing quote approved',
  pricing_quote_rejected: 'Pricing quote rejected',
  pricing_quote_version_sent: 'Pricing quote version sent',
  pricing_quote_version_superseded: 'Pricing quote version superseded',
  pricing_quote_revision_cloned: 'Pricing quote revision cloned',
  pricing_quote_override_requested: 'Pricing quote override requested',
  pricing_quote_override_applied: 'Pricing quote override applied',
  quote_document_stored: 'Quote document stored',
  quote_negotiation_event_recorded: 'Quote negotiation event recorded',
};

function readNestedRecord(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toHumanLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatId(value: unknown, prefix?: string) {
  const raw = readString(value);
  if (!raw) return null;
  const short = raw.length > 8 ? raw.slice(0, 8) : raw;
  return prefix ? `${prefix}: ${short}` : short;
}

function summarizeTarget(entityType: unknown, entityId: unknown) {
  const type = readString(entityType);
  const id = formatId(entityId);
  if (!type && !id) return null;
  return [type ? `Target: ${toHumanLabel(type)}` : null, id].filter(Boolean).join(' · ');
}

export function getAuditEventLabel(type: AuditEventType | string): string {
  const mapped = EVENT_LABELS[type as AuditEventType];
  return mapped ?? toHumanLabel(type);
}

export function getAuditEventTone(type: string) {
  if (type.includes('failed') || type.includes('revoked') || type.includes('rejected')) return 'danger' as const;
  if (type.includes('accepted') || type.includes('approved') || type.includes('reactivated') || type.includes('applied')) return 'success' as const;
  if (type.includes('sent') || type.includes('shared') || type.includes('created') || type.includes('updated')) return 'info' as const;
  if (type.includes('password') || type.includes('default') || type.includes('role') || type.includes('dismissed') || type.includes('requested')) return 'warning' as const;
  return 'neutral' as const;
}

export function getAuditEventCategory(type: string) {
  if (type.startsWith('invitation_') || type.startsWith('membership_') || type === 'role_changed' || type === 'password_reset_requested') {
    return 'Access';
  }
  if (type.startsWith('saved_view_') || type === 'default_view_set') {
    return 'Workspace';
  }
  if (type.startsWith('settings_list_')) {
    return 'Workspace';
  }
  if (type.startsWith('lead_') || type.startsWith('trade_event_') || type.startsWith('scheduled_task_') || type.startsWith('mobile_field_')) {
    return 'Operations';
  }
  if (type.startsWith('quote_') || type.startsWith('rfq_') || type.startsWith('pricing_') || type.startsWith('product_') || type.startsWith('contract_')) {
    return 'Commercial';
  }
  if (type.startsWith('document_') || type.startsWith('compliance_') || type.startsWith('integration_')) {
    return type.startsWith('integration_') ? 'Integrations' : 'Operations';
  }
  if (type.startsWith('ai_suggestion_')) {
    return 'AI Assist';
  }
  return 'General';
}

export function getAuditEventSummary(event: AuditEventRecord) {
  const previousValue = readNestedRecord(event.payload, 'previous');
  const newValue = readNestedRecord(event.payload, 'new');
  const metadata = readNestedRecord(event.payload, 'metadata');
  const flatPayload = event.payload ?? {};

  switch (event.event_type) {
    case 'invitation_created':
    case 'invitation_sent':
    case 'invitation_resent':
    case 'invitation_updated':
    case 'invitation_accepted':
    case 'invitation_failed':
    case 'invitation_revoked': {
      const email = readString(newValue?.email) ?? readString(metadata?.email) ?? readString(previousValue?.email);
      const role = readString(newValue?.role_name) ?? readString(newValue?.role) ?? readString(metadata?.role_name);
      const pieces = [email, role ? `Role: ${role}` : null].filter(Boolean);
      return pieces.join(' · ') || 'Invitation lifecycle updated.';
    }
    case 'role_changed': {
      const role = readString(newValue?.role_name) ?? readString(newValue?.role) ?? readString(metadata?.role_name);
      return role ? `Assigned role: ${role}` : 'A member role assignment changed.';
    }
    case 'membership_reactivated':
      return 'A previously disabled membership was restored.';
    case 'membership_deactivated':
      return 'An active membership was deactivated.';
    case 'membership_removed':
      return 'A membership was removed from active access.';
    case 'password_reset_requested':
      return 'An administrative password reset request was triggered.';
    case 'saved_view_created':
    case 'saved_view_updated':
    case 'saved_view_shared':
    case 'default_view_set': {
      const name = readString(newValue?.name) ?? readString(metadata?.name) ?? readString(newValue?.view_id) ?? readString(metadata?.view_id);
      return name ? `Workspace view: ${name}` : 'Workspace view preferences changed.';
    }
    case 'settings_list_item_saved':
    case 'settings_list_item_deleted': {
      const table = readString(metadata?.table);
      const operation = readString(metadata?.operation);
      const name = readString(newValue?.name) ?? readString(previousValue?.name) ?? readString(metadata?.name);
      return [table ? `Table: ${toHumanLabel(table)}` : null, name, operation ? `Mode: ${toHumanLabel(operation)}` : null].filter(Boolean).join(' · ') || 'A workspace settings list item changed.';
    }
    case 'lead_created':
    case 'lead_updated': {
      const name = readString(newValue?.company_name) ?? readString(previousValue?.company_name) ?? readString(metadata?.company_name);
      const leadType = readString(newValue?.lead_type) ?? readString(metadata?.lead_type);
      return [name, leadType ? `Type: ${toHumanLabel(leadType)}` : null].filter(Boolean).join(' · ') || 'Lead details changed.';
    }
    case 'lead_stage_changed': {
      const from = readString(previousValue?.stage_id) ?? readString(metadata?.from_stage_id);
      const to = readString(newValue?.stage_id) ?? readString(metadata?.to_stage_id);
      const count = readString(metadata?.lead_count);
      return [from || to ? `Stage ${from ?? 'unknown'} → ${to ?? 'unknown'}` : null, count ? `Leads: ${count}` : null].filter(Boolean).join(' · ') || 'Lead stage changed.';
    }
    case 'lead_follow_up_scheduled': {
      const when = readString(newValue?.next_follow_up_at) ?? readString(metadata?.scheduled_at);
      const count = readString(metadata?.lead_count);
      return [when ? `Scheduled: ${when}` : null, count ? `Leads: ${count}` : null].filter(Boolean).join(' · ') || 'Lead follow-up was scheduled.';
    }
    case 'lead_follow_up_completed':
      return 'A lead follow-up was completed.';
    case 'lead_qualification_updated': {
      const from = readString(previousValue?.qualification_status);
      const to = readString(newValue?.qualification_status) ?? readString(metadata?.qualification_status);
      return from || to ? `Qualification ${from ?? 'unknown'} → ${to ?? 'unknown'}` : 'Lead qualification changed.';
    }
    case 'lead_note_added': {
      const name = readString(metadata?.company_name);
      return name ? `Lead: ${name}` : 'A lead note was added.';
    }
    case 'rfq_created':
    case 'rfq_updated': {
      const status = readString(newValue?.status) ?? readString(metadata?.status);
      const supplierCount = readString(metadata?.supplier_response_count);
      return [status ? `Status: ${toHumanLabel(status)}` : null, supplierCount ? `Suppliers: ${supplierCount}` : null].filter(Boolean).join(' · ') || 'RFQ details changed.';
    }
    case 'quote_approved':
    case 'quote_rejected':
    case 'quote_created':
    case 'quote_updated':
    case 'quote_sent':
    case 'quote_send_blocked': {
      const status = readString(newValue?.status) ?? readString(metadata?.status);
      const reason = readString(metadata?.reason);
      const pieces = [status ? `Quote status: ${status}` : null, reason].filter(Boolean);
      return pieces.join(' · ') || 'Quote lifecycle activity was recorded.';
    }
    case 'rfq_status_changed': {
      const from = readString(previousValue?.status);
      const to = readString(newValue?.status) ?? readString(metadata?.status);
      if (from || to) return `Status ${from ?? 'unknown'} → ${to ?? 'unknown'}`;
      return 'RFQ workflow status changed.';
    }
    case 'pricing_shared':
    case 'pricing_sent':
    case 'pricing_exported': {
      const productCount = readString(metadata?.product_count);
      const audience = readString(metadata?.audience);
      const delivery = readString(metadata?.delivery);
      const pieces = [productCount ? `${productCount} products` : null, audience, delivery].filter(Boolean);
      return pieces.join(' · ') || 'Catalog pricing distribution workflow updated.';
    }
    case 'product_created':
    case 'product_updated':
    case 'product_deleted': {
      const name = readString(newValue?.name) ?? readString(previousValue?.name) ?? readString(metadata?.product_name);
      const changedFields = readString(metadata?.changed_fields);
      const pieces = [name, changedFields ? `Changed: ${changedFields}` : null].filter(Boolean);
      return pieces.join(' · ') || 'Catalog product revision recorded.';
    }
    case 'document_status_changed':
    case 'document_reviewed':
    case 'document_revision_requested':
    case 'document_approved':
    case 'document_rejected': {
      const from = readString(previousValue?.status);
      const to = readString(newValue?.status) ?? readString(metadata?.status);
      const related = readString(metadata?.related_entity);
      const statusText = from || to ? `Status ${from ?? 'unknown'} → ${to ?? 'unknown'}` : null;
      return [statusText, related ? `Linked to ${related}` : null].filter(Boolean).join(' · ') || 'Document workflow changed.';
    }
    case 'compliance_status_changed':
    case 'compliance_item_updated': {
      const from = readString(previousValue?.status);
      const to = readString(newValue?.status) ?? readString(metadata?.status);
      if (from || to) return `Compliance status ${from ?? 'unknown'} → ${to ?? 'unknown'}`;
      return 'Compliance workflow changed.';
    }
    case 'integration_replay_requested': {
      const provider = readString(metadata?.provider);
      const reason = readString(metadata?.reason);
      return [provider ? `Provider: ${provider}` : null, reason].filter(Boolean).join(' · ') || 'An integration replay request was logged.';
    }
    case 'trade_event_created':
    case 'trade_event_updated':
    case 'trade_event_deleted': {
      const name = readString(newValue?.name) ?? readString(previousValue?.name) ?? readString(metadata?.name);
      const location = [readString(newValue?.city) ?? readString(previousValue?.city), readString(newValue?.country) ?? readString(previousValue?.country)].filter(Boolean).join(', ');
      return [name, location || null].filter(Boolean).join(' · ') || 'Trade event details changed.';
    }
    case 'trade_event_entry_captured': {
      const company = readString(newValue?.captured_company_name) ?? readString(metadata?.captured_company_name);
      return company ? `Company: ${company}` : 'A trade event entry was captured.';
    }
    case 'trade_event_entry_converted': {
      const company = readString(metadata?.company_name);
      const leadId = formatId(metadata?.lead_id, 'Lead');
      return [company, leadId].filter(Boolean).join(' · ') || 'A trade event entry was converted into a lead.';
    }
    case 'scheduled_task_created':
    case 'scheduled_task_updated':
    case 'scheduled_task_completed':
    case 'scheduled_task_reopened': {
      const taskType = readString(newValue?.task_type) ?? readString(previousValue?.task_type) ?? readString(metadata?.task_type);
      const scheduledFor = readString(newValue?.scheduled_for) ?? readString(metadata?.scheduled_for);
      return [taskType ? `Task: ${toHumanLabel(taskType)}` : null, scheduledFor ? `Scheduled: ${scheduledFor}` : null].filter(Boolean).join(' · ') || 'Scheduled task activity was recorded.';
    }
    case 'mobile_field_note_captured':
      return 'A mobile field note was captured for a lead.';
    case 'mobile_field_document_captured': {
      const fileName = readString(metadata?.file_name);
      const docType = readString(metadata?.doc_type);
      return [fileName, docType ? `Type: ${toHumanLabel(docType)}` : null].filter(Boolean).join(' · ') || 'A mobile field document was captured.';
    }
    case 'contract_progressed':
    case 'contract_updated': {
      const status = readString(newValue?.status) ?? readString(metadata?.status);
      const from = readString(previousValue?.status);
      const note = readString(metadata?.note);
      const statusText = from || status ? `Status ${from ?? 'unknown'} → ${status ?? 'unknown'}` : null;
      return [statusText, note].filter(Boolean).join(' · ') || 'Contract lifecycle activity was recorded.';
    }
    case 'ai_suggestion_generated':
    case 'ai_suggestion_reviewed':
    case 'ai_suggestion_approved':
    case 'ai_suggestion_dismissed':
    case 'ai_suggestion_applied': {
      const suggestionType = readString(flatPayload.suggestionType);
      const status = readString(flatPayload.status);
      const decisionOutcome = readString(flatPayload.decisionOutcome);
      const appliedCommunicationId = formatId(flatPayload.appliedCommunicationId, 'Communication');
      const target = summarizeTarget(flatPayload.targetEntityType, flatPayload.targetEntityId);
      return [
        suggestionType ? `Type: ${toHumanLabel(suggestionType)}` : null,
        status ? `Status: ${toHumanLabel(status)}` : null,
        decisionOutcome ? `Decision: ${toHumanLabel(decisionOutcome)}` : null,
        target,
        appliedCommunicationId,
      ].filter(Boolean).join(' · ') || 'AI suggestion activity was recorded.';
    }
    case 'pricing_quote_approval_requested':
    case 'pricing_quote_approved':
    case 'pricing_quote_rejected':
    case 'pricing_quote_version_sent':
    case 'pricing_quote_version_superseded':
    case 'pricing_quote_revision_cloned':
    case 'pricing_quote_override_requested':
    case 'pricing_quote_override_applied': {
      const quoteId = formatId(flatPayload.quoteId, 'Quote');
      const quoteVersionId = formatId(flatPayload.quoteVersionId ?? flatPayload.newVersionId ?? flatPayload.parentVersionId, 'Version');
      const reason = readString(flatPayload.reason);
      const percentDelta = readString(flatPayload.percentDelta);
      return [quoteId, quoteVersionId, percentDelta ? `Delta: ${percentDelta}%` : null, reason].filter(Boolean).join(' · ') || 'Pricing quote activity was recorded.';
    }
    case 'quote_document_stored': {
      const fileName = readString(flatPayload.fileName);
      const documentId = formatId(flatPayload.documentId, 'Document');
      const mimeType = readString(flatPayload.mimeType);
      return [fileName, documentId, mimeType].filter(Boolean).join(' · ') || 'A quote document was stored.';
    }
    case 'quote_negotiation_event_recorded': {
      const eventType = readString(flatPayload.eventType);
      const message = readString(flatPayload.message);
      const quoteId = formatId(flatPayload.quoteId, 'Quote');
      const quoteVersionId = formatId(flatPayload.quoteVersionId, 'Version');
      return [
        eventType ? `Event: ${toHumanLabel(eventType)}` : null,
        quoteId,
        quoteVersionId,
        message,
      ].filter(Boolean).join(' · ') || 'A quote negotiation event was recorded.';
    }
    default:
      return `${getAuditEventCategory(event.event_type)} activity was recorded.`;
  }
}
