import { parseRfqWorkflow } from '@/lib/rfqWorkflow';
import { parseQuoteWorkflow } from '@/lib/quoteWorkflow';
import { getSuggestionFamilyLabel, getSuggestionLabel, normalizeSuggestionType } from '@/lib/ai/suggestion-types';
export type ActivityEventType =
  | 'lead_created'
  | 'lead_updated'
  | 'stage_changed'
  | 'rfq_created'
  | 'rfq_updated'
  | 'rfq_submitted'
  | 'rfq_sent_to_suppliers'
  | 'supplier_response_received'
  | 'supplier_response_declined'
  | 'quote_created'
  | 'quote_updated'
  | 'quote_submitted_for_approval'
  | 'quote_approved'
  | 'quote_sent'
  | 'quote_revised'
  | 'compliance_requested'
  | 'compliance_submitted'
  | 'compliance_approved'
  | 'document_uploaded'
  | 'document_reviewed'
  | 'note_updated'
  | 'follow_up_scheduled'
  | 'follow_up_completed'
  | 'communication_logged'
  | 'activity_logged';

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  entity_type: 'lead' | 'rfq' | 'quote' | 'compliance' | 'follow_up' | 'activity' | 'document' | 'communication';
  entity_id: string;
  actor: string | null;
  timestamp: string;
  title: string;
  metadata?: Record<string, string | null | undefined>;
};

type LeadTimelineSources = {
  lead: {
    id: string;
    company_name: string;
    created_at?: string | null;
    updated_at?: string | null;
    notes?: string | null;
  } | null;
  activities?: Array<{ id: string; lead_id: string; kind: string; message: string; occurred_at: string }>;
  followUps?: Array<{ id: string; lead_id: string | null; scheduled_at: string | null; status: string; created_at?: string | null; completed_at?: string | null; notes?: string | null }>;
  stageHistory?: Array<{ id: string; from_stage_id: string | null; to_stage_id: string | null; changed_at: string; note?: string | null }>;
  rfqs?: Array<{ id: string; lead_id: string | null; status: string; created_at: string | null; updated_at: string | null; currency?: string | null; validity_date?: string | null; notes?: string | null }>;
  quotes?: Array<{ id: string; lead_id: string; rfq_id?: string | null; status: string; created_at: string; updated_at: string; currency?: string | null; notes?: string | null; quote_number?: string | null }>;
  complianceItems?: Array<{ id: string; lead_id: string; compliance_item_id: string; status: string; created_at: string; submitted_at: string | null; approved_at: string | null; reviewed_at?: string | null; review_notes?: string | null; reviewer_name?: string | null }>;
  complianceDefinitions?: Array<{ id: string; code: string; description: string }>;
  documents?: Array<{ id: string; file_name: string; status: string | null; uploaded_at: string; reviewed_at: string | null; expires_at: string | null; doc_type: string | null; review_notes?: string | null; uploaded_by_name?: string | null; reviewer_name?: string | null }>;
  communications?: Array<{ id: string; lead_id: string | null; quote_id?: string | null; related_entity?: string | null; related_id?: string | null; communication_type: string; channel?: string | null; subject?: string | null; summary?: string | null; status?: string | null; draft_source?: string | null; created_at: string; sent_at?: string | null; scheduled_at?: string | null; metadata?: unknown | null }>;
  stageNameMap?: Map<string, string>;
};

function sortEvents(events: ActivityEvent[]) {
  return [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function buildLeadActivityTimeline({
  lead,
  activities = [],
  followUps = [],
  stageHistory = [],
  rfqs = [],
  quotes = [],
  complianceItems = [],
  complianceDefinitions = [],
  documents = [],
  communications = [],
  stageNameMap = new Map<string, string>(),
}: LeadTimelineSources): ActivityEvent[] {
  if (!lead) return [];

  const complianceDefinitionMap = new Map(complianceDefinitions.map((item) => [item.id, item]));
  const events: ActivityEvent[] = [];

  if (lead.created_at) {
    events.push({
      id: `lead-created-${lead.id}`,
      type: 'lead_created',
      entity_type: 'lead',
      entity_id: lead.id,
      actor: null,
      timestamp: lead.created_at,
      title: 'Lead created',
      metadata: { company: lead.company_name },
    });
  }

  if (lead.updated_at && lead.created_at && lead.updated_at !== lead.created_at) {
    events.push({
      id: `lead-updated-${lead.id}`,
      type: 'lead_updated',
      entity_type: 'lead',
      entity_id: lead.id,
      actor: null,
      timestamp: lead.updated_at,
      title: 'Lead updated',
    });
  }

  if (lead.notes && lead.updated_at) {
    events.push({
      id: `lead-notes-${lead.id}`,
      type: 'note_updated',
      entity_type: 'lead',
      entity_id: lead.id,
      actor: null,
      timestamp: lead.updated_at,
      title: 'Notes updated',
      metadata: { preview: lead.notes.slice(0, 120) },
    });
  }

  for (const item of activities) {
    events.push({
      id: `activity-${item.id}`,
      type: item.kind === 'follow_up_completed' ? 'follow_up_completed' : item.kind === 'follow_up_scheduled' ? 'follow_up_scheduled' : item.kind === 'stage_changed' ? 'stage_changed' : 'activity_logged',
      entity_type: 'activity',
      entity_id: item.id,
      actor: null,
      timestamp: item.occurred_at,
      title: item.message,
      metadata: { kind: item.kind },
    });
  }

  for (const item of followUps) {
    if (item.created_at) {
      events.push({
        id: `followup-created-${item.id}`,
        type: 'follow_up_scheduled',
        entity_type: 'follow_up',
        entity_id: item.id,
        actor: null,
        timestamp: item.created_at,
        title: 'Follow-up scheduled',
        metadata: {
          scheduled_for: item.scheduled_at,
          status: item.status,
          notes: item.notes,
        },
      });
    }

    if (item.completed_at) {
      events.push({
        id: `followup-completed-${item.id}`,
        type: 'follow_up_completed',
        entity_type: 'follow_up',
        entity_id: item.id,
        actor: null,
        timestamp: item.completed_at,
        title: 'Follow-up completed',
        metadata: { status: item.status, notes: item.notes },
      });
    }
  }

  for (const item of stageHistory) {
    events.push({
      id: `stage-${item.id}`,
      type: 'stage_changed',
      entity_type: 'lead',
      entity_id: lead.id,
      actor: null,
      timestamp: item.changed_at,
      title: 'Stage moved',
      metadata: {
        from: item.from_stage_id ? stageNameMap.get(item.from_stage_id) ?? 'Unknown stage' : 'No stage',
        to: item.to_stage_id ? stageNameMap.get(item.to_stage_id) ?? 'Unknown stage' : 'No stage',
        note: item.note,
      },
    });
  }

  for (const item of rfqs) {
    if (item.created_at) {
      events.push({
        id: `rfq-created-${item.id}`,
        type: 'rfq_created',
        entity_type: 'rfq',
        entity_id: item.id,
        actor: null,
        timestamp: item.created_at,
        title: 'RFQ created',
        metadata: { status: item.status, currency: item.currency, validity_date: item.validity_date },
      });
    }

    if (item.updated_at && item.created_at && item.updated_at !== item.created_at) {
      events.push({
        id: `rfq-updated-${item.id}`,
        type: 'rfq_updated',
        entity_type: 'rfq',
        entity_id: item.id,
        actor: null,
        timestamp: item.updated_at,
        title: 'RFQ updated',
        metadata: { status: item.status, currency: item.currency, validity_date: item.validity_date },
      });
    }

    const parsed = parseRfqWorkflow(item.notes);
    const supplierResponses = parsed.meta.supplierResponses ?? [];
    if (item.status === 'submitted' && item.updated_at) {
      events.push({
        id: `rfq-submitted-${item.id}`,
        type: 'rfq_submitted',
        entity_type: 'rfq',
        entity_id: item.id,
        actor: null,
        timestamp: item.updated_at,
        title: 'RFQ submitted',
        metadata: { status: item.status },
      });
    }
    if ((item.status === 'sent_to_suppliers' || item.status === 'supplier_responses_pending') && item.updated_at) {
      events.push({
        id: `rfq-sent-${item.id}`,
        type: 'rfq_sent_to_suppliers',
        entity_type: 'rfq',
        entity_id: item.id,
        actor: null,
        timestamp: item.updated_at,
        title: 'RFQ sent to suppliers',
        metadata: { status: item.status },
      });
    }
    for (const response of supplierResponses) {
      if (response.respondedAt) {
        events.push({
          id: `supplier-responded-${item.id}-${response.id}`,
          type: 'supplier_response_received',
          entity_type: 'rfq',
          entity_id: item.id,
          actor: response.supplierName,
          timestamp: response.respondedAt,
          title: 'Supplier response received',
          metadata: { supplier: response.supplierName, status: response.status, notes: response.notes },
        });
      }
      if (response.status === 'declined' && (response.respondedAt || response.contactedAt)) {
        events.push({
          id: `supplier-declined-${item.id}-${response.id}`,
          type: 'supplier_response_declined',
          entity_type: 'rfq',
          entity_id: item.id,
          actor: response.supplierName,
          timestamp: response.respondedAt ?? response.contactedAt ?? item.updated_at ?? item.created_at ?? new Date().toISOString(),
          title: 'Supplier declined RFQ',
          metadata: { supplier: response.supplierName, notes: response.notes },
        });
      }
    }
  }

  for (const item of quotes) {
    events.push({
      id: `quote-created-${item.id}`,
      type: 'quote_created',
      entity_type: 'quote',
      entity_id: item.id,
      actor: null,
      timestamp: item.created_at,
      title: item.quote_number ? `Quote created · ${item.quote_number}` : 'Quote created',
      metadata: { status: item.status, currency: item.currency, rfq_id: item.rfq_id ?? undefined },
    });

    if (item.updated_at !== item.created_at) {
      events.push({
        id: `quote-updated-${item.id}`,
        type: 'quote_updated',
        entity_type: 'quote',
        entity_id: item.id,
        actor: null,
        timestamp: item.updated_at,
        title: item.quote_number ? `Quote updated · ${item.quote_number}` : 'Quote updated',
        metadata: { status: item.status, currency: item.currency, rfq_id: item.rfq_id ?? undefined },
      });
    }

    const quoteMeta = parseQuoteWorkflow(item.notes);
    const approvalState = quoteMeta.meta.approval?.state;
    if (approvalState === 'pending' && item.updated_at) {
      events.push({ id: `quote-pending-approval-${item.id}`, type: 'quote_submitted_for_approval', entity_type: 'quote', entity_id: item.id, actor: null, timestamp: item.updated_at, title: 'Quote submitted for approval', metadata: { status: item.status } });
    }
    if (approvalState === 'approved' && quoteMeta.meta.approval?.actedAt) {
      events.push({ id: `quote-approved-${item.id}`, type: 'quote_approved', entity_type: 'quote', entity_id: item.id, actor: quoteMeta.meta.approval?.actorName ?? null, timestamp: quoteMeta.meta.approval.actedAt, title: 'Quote approved', metadata: { status: item.status } });
    }
    if (item.status === 'sent' && item.updated_at) {
      events.push({ id: `quote-sent-${item.id}`, type: 'quote_sent', entity_type: 'quote', entity_id: item.id, actor: null, timestamp: item.updated_at, title: item.quote_number ? `Quote sent · ${item.quote_number}` : 'Quote sent', metadata: { currency: item.currency } });
    }
    if (item.status === 'revised' && item.updated_at) {
      events.push({ id: `quote-revised-${item.id}`, type: 'quote_revised', entity_type: 'quote', entity_id: item.id, actor: null, timestamp: item.updated_at, title: item.quote_number ? `Quote revised · ${item.quote_number}` : 'Quote revised', metadata: { currency: item.currency } });
    }
  }


  for (const item of communications) {
    const metadata = item.metadata && typeof item.metadata === 'object'
      ? item.metadata as Record<string, unknown>
      : null;
    const operatorNote = typeof metadata?.operator_notes === 'string' && metadata.operator_notes.trim()
      ? metadata.operator_notes.trim()
      : undefined;
    const aiSuggestionType = typeof metadata?.ai_suggestion_type === 'string' && metadata.ai_suggestion_type.trim()
      ? normalizeSuggestionType(metadata.ai_suggestion_type.trim())
      : undefined;
    const workflowFamily = typeof metadata?.workflow_family === 'string' && metadata.workflow_family.trim()
      ? metadata.workflow_family.trim()
      : undefined;
    const quoteLabel = item.quote_id ? quotes.find((quote) => quote.id === item.quote_id)?.quote_number ?? `Quote ${item.quote_id.slice(0, 8)}` : undefined;
    const timestamp = item.sent_at ?? item.scheduled_at ?? item.created_at;
    events.push({
      id: `communication-${item.id}`,
      type: 'communication_logged',
      entity_type: 'communication',
      entity_id: item.id,
      actor: null,
      timestamp,
      title: item.subject || item.summary || (item.draft_source === 'ai' ? `${getSuggestionFamilyLabel(aiSuggestionType)} draft` : 'Communication logged'),
      metadata: {
        status: item.status ?? undefined,
        channel: item.channel ?? undefined,
        communication_type: item.communication_type,
        source: item.draft_source === 'ai' ? (workflowFamily ? `${workflowFamily} ai` : 'ai-assisted') : item.draft_source ?? undefined,
        quote: quoteLabel,
        note: operatorNote,
        ai_suggestion_type: aiSuggestionType ? getSuggestionLabel(aiSuggestionType) : undefined,
        workflow_family: workflowFamily, 
      },
    });
  }

  for (const item of documents) {
    events.push({
      id: `document-uploaded-${item.id}`,
      type: 'document_uploaded',
      entity_type: 'document',
      entity_id: item.id,
      actor: item.uploaded_by_name ?? null,
      timestamp: item.uploaded_at,
      title: 'Document uploaded',
      metadata: { file_name: item.file_name, status: item.status ?? undefined, doc_type: item.doc_type ?? undefined, expires_at: item.expires_at ?? undefined },
    });

    if (item.reviewed_at) {
      events.push({
        id: `document-reviewed-${item.id}`,
        type: 'document_reviewed',
        entity_type: 'document',
        entity_id: item.id,
        actor: item.reviewer_name ?? null,
        timestamp: item.reviewed_at,
        title: 'Document reviewed',
        metadata: { file_name: item.file_name, status: item.status ?? undefined, review_notes: item.review_notes ?? undefined },
      });
    }
  }

  for (const item of complianceItems) {
    const definition = complianceDefinitionMap.get(item.compliance_item_id);
    events.push({
      id: `compliance-created-${item.id}`,
      type: 'compliance_requested',
      entity_type: 'compliance',
      entity_id: item.id,
      actor: null,
      timestamp: item.created_at,
      title: 'Compliance action requested',
      metadata: { status: item.status, code: definition?.code, description: definition?.description },
    });

    if (item.submitted_at) {
      events.push({
        id: `compliance-submitted-${item.id}`,
        type: 'compliance_submitted',
        entity_type: 'compliance',
        entity_id: item.id,
        actor: item.reviewer_name ?? null,
        timestamp: item.submitted_at,
        title: 'Compliance submitted',
        metadata: { status: item.status, code: definition?.code, description: definition?.description },
      });
    }

    if (item.reviewed_at && !item.approved_at) {
      events.push({
        id: `compliance-reviewed-${item.id}`,
        type: 'compliance_submitted',
        entity_type: 'compliance',
        entity_id: item.id,
        actor: item.reviewer_name ?? null,
        timestamp: item.reviewed_at,
        title: 'Compliance reviewed',
        metadata: { status: item.status, code: definition?.code, description: definition?.description, review_notes: item.review_notes ?? undefined },
      });
    }

    if (item.approved_at) {
      events.push({
        id: `compliance-approved-${item.id}`,
        type: 'compliance_approved',
        entity_type: 'compliance',
        entity_id: item.id,
        actor: item.reviewer_name ?? null,
        timestamp: item.approved_at,
        title: 'Compliance approved',
        metadata: { status: item.status, code: definition?.code, description: definition?.description, review_notes: item.review_notes ?? undefined },
      });
    }
  }

  return sortEvents(events);
}
