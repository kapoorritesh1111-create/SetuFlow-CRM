"use server";

import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/auditLog';
import { requireWorkspace } from '@/lib/workspace/auth';
import { CANONICAL_SUGGESTION_TYPES, getSuggestionFamily, normalizeSuggestionType } from '@/lib/ai/suggestion-types';
import { runAiTask } from '@/lib/ai/provider';
import { AiTaskType } from '@/lib/ai/contracts';

export type AiDraftRow = {
  id: string;
  organization_id: string | null;
  lead_id: string;
  suggestion_type: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  content: string;
  draft_subject: string | null;
  draft_body: string | null;
  rationale: string | null;
  prompt_context: unknown;
  status: string;
  suggested_by: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_outcome: string | null;
  operator_notes: string | null;
  applied_communication_id: string | null;
  updated_at: string | null;
};

export type AiDraftActionState = {
  error?: string;
  success?: string;
  draft?: AiDraftRow;
  draftId?: string;
};

type LeadContext = {
  id: string;
  company_name: string;
  contact_name: string | null;
  lead_type: string;
  notes: string | null;
  next_follow_up_at: string | null;
  deal_currency: string | null;
};

type QuoteContext = { id: string; status: string; currency: string | null; updated_at: string; quote_number?: string | null; pricing_basis?: string | null; valid_until?: string | null };
type RfqContext = { id: string; status: string; currency: string | null; updated_at: string | null };
type FollowUpContext = { scheduled_at: string | null; status: string; notes: string | null };
type TaskContext = { id?: string; task_type: string; scheduled_for: string; status: string; payload: unknown };
type ComplianceContext = { status: string; severity: string | null; due_at: string | null };
type DocumentContext = { file_name: string; requirement_code: string | null; status: string; expires_at: string | null };

type DraftPayload = {
  subject: string | null;
  body: string;
  rationale: string;
  content: string;
  promptContext: Record<string, unknown>;
};

function buildBlockerSummary(complianceItems: ComplianceContext[], documents: DocumentContext[]) {
  const openCompliance = complianceItems.filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status ?? '').toLowerCase()));
  const pendingDocs = documents.filter((item) => !['approved', 'complete', 'completed', 'ready'].includes(String(item.status ?? '').toLowerCase()));
  const expiredDocs = documents.filter((item) => item.expires_at && new Date(item.expires_at).getTime() < Date.now());
  const parts: string[] = [];
  if (openCompliance.length) parts.push(`${openCompliance.length} compliance blocker${openCompliance.length === 1 ? '' : 's'}`);
  if (pendingDocs.length) parts.push(`${pendingDocs.length} document review item${pendingDocs.length === 1 ? '' : 's'}`);
  if (expiredDocs.length) parts.push(`${expiredDocs.length} expired document${expiredDocs.length === 1 ? '' : 's'}`);
  return parts.length ? parts.join(', ') : 'no active blockers';
}

function buildQuoteCoverNote(lead: LeadContext, quotes: QuoteContext[], rfqs: RfqContext[], blockers: string): DraftPayload {
  const latestQuote = quotes[0];
  const latestRfq = rfqs[0];
  const contact = lead.contact_name?.trim() || 'Team';
  const quoteReference = latestQuote?.quote_number?.trim() || (latestQuote ? `Quote ${latestQuote.id.slice(0, 8)}` : 'the latest quote');
  const subject = `${quoteReference} for ${lead.company_name}`;
  const body = [
    `Hi ${contact},`,
    '',
    `Please find ${quoteReference} prepared for ${lead.company_name}.`,
    latestQuote
      ? `This draft is based on a quote currently in ${latestQuote.status.replace(/_/g, ' ')} state${latestQuote.currency ? ` and displayed in ${latestQuote.currency}` : ''}.`
      : 'A formal quote has been prepared for your review.',
    latestQuote?.pricing_basis ? `Commercial basis for operator verification: ${latestQuote.pricing_basis.replace(/_/g, ' ')}.` : 'Please verify the commercial basis before using this draft.',
    latestQuote?.valid_until ? `Current validity window on the quote is ${new Date(latestQuote.valid_until).toLocaleDateString()}.` : 'Please verify the quote validity date before sending.',
    latestRfq ? `This communication stays aligned to the current RFQ workflow (${latestRfq.status}).` : 'This proposal reflects the latest scoped requirements captured by our team.',
    '',
    'Operator pre-send checks:',
    `- Governance / blocker posture: ${blockers}.`,
    '- Confirm final line-item pricing, terms, and any overrides remain correct.',
    '- Confirm compliance and approval requirements are already satisfied before send.',
    '',
    'Please review and confirm any questions or revisions you would like us to incorporate. Once approved internally, we will proceed with the final send.',
    '',
    'Regards,',
    'SETU Flow operator draft',
  ].join('\n');

  return {
    subject,
    body,
    rationale: 'Quote cover note drafting is the preferred third workflow because it helps operators structure customer-facing quote messages without changing pricing authority, approvals, or compliance outcomes.',
    content: `Subject: ${subject}\n\n${body}`,
    promptContext: {
      lead_id: lead.id,
      lead_name: lead.company_name,
      quote_id: latestQuote?.id ?? null,
      quote_number: latestQuote?.quote_number ?? null,
      latest_quote_status: latestQuote?.status ?? null,
      latest_quote_currency: latestQuote?.currency ?? null,
      pricing_basis: latestQuote?.pricing_basis ?? null,
      valid_until: latestQuote?.valid_until ?? null,
      latest_rfq_status: latestRfq?.status ?? null,
      blockers,
    },
  };
}

function buildFollowUpDraft(lead: LeadContext, followUps: FollowUpContext[], tasks: TaskContext[], blockers: string): DraftPayload {
  const contact = lead.contact_name?.trim() || 'there';
  const nextFollowUp = followUps.find((item) => item.scheduled_at && item.status !== 'completed');
  const nextTask = tasks.find((item) => item.status !== 'completed');
  const subject = `Following up on next steps for ${lead.company_name}`;
  const body = [
    `Hi ${contact},`,
    '',
    `Just checking in on the next steps for ${lead.company_name}.`,
    nextFollowUp?.scheduled_at ? `We had planned a follow-up around ${new Date(nextFollowUp.scheduled_at).toLocaleDateString()}.` : 'We wanted to keep momentum on the current discussion.',
    nextTask ? `Our current internal focus is: ${nextTask.task_type.replace(/_/g, ' ')}.` : 'Our team is ready to move the next action forward.',
    '',
    'Current internal review notes:',
    `- Blocker posture: ${blockers}.`,
    '- Confirm timing, scope, and any required documents before using this draft.',
    '',
    'Please let us know a suitable time to reconnect or any updates you would like us to incorporate.',
    '',
    'Regards,',
    'SETU Flow operator draft',
  ].join('\n');

  return {
    subject,
    body,
    rationale: 'Follow-up drafting is the lowest-risk AI workflow because it uses visible CRM context, preserves operator review, and does not mutate pricing or approvals.',
    content: `Subject: ${subject}\n\n${body}`,
    promptContext: {
      lead_id: lead.id,
      lead_name: lead.company_name,
      next_follow_up_at: nextFollowUp?.scheduled_at ?? lead.next_follow_up_at,
      next_task_type: nextTask?.task_type ?? null,
      blockers,
    },
  };
}

function buildIntroductionDraft(lead: LeadContext, blockers: string): DraftPayload {
  const contact = lead.contact_name?.trim() || 'there';
  const subject = `Introduction from SETU Flow for ${lead.company_name}`;
  const body = [
    `Hi ${contact},`,
    '',
    `I am reaching out from SETU Flow regarding ${lead.company_name}.`,
    'We would like to introduce our team and better understand your current sourcing priorities and next commercial steps.',
    lead.notes?.trim() ? `Internal context for the operator to confirm before using this draft: ${lead.notes.trim()}` : 'Please tailor the final message using the latest lead notes and product context before sending.',
    '',
    `Current internal posture: ${blockers}.`,
    'If helpful, we can schedule a short introduction call and align on the right products, markets, and timeline.',
    '',
    'Regards,',
    'SETU Flow operator draft',
  ].join('\n');

  return {
    subject,
    body,
    rationale: 'Intro Assistant is prepared as the second workflow. It should stay review-only and be used only as a structured first-touch draft, never as an autonomous outreach flow.',
    content: `Subject: ${subject}\n\n${body}`,
    promptContext: {
      lead_id: lead.id,
      lead_name: lead.company_name,
      lead_type: lead.lead_type,
      blockers,
      has_notes: Boolean(lead.notes?.trim()),
    },
  };
}

function buildComplianceNextStepDraft(lead: LeadContext, complianceItems: ComplianceContext[], documents: DocumentContext[], blockers: string): DraftPayload {
  const nextAction = documents.some((item) => ['rejected', 'expired', 'needs_revision'].includes(String(item.status ?? '').toLowerCase()))
    ? 'request a refreshed or corrected compliance document'
    : complianceItems.some((item) => ['high', 'critical'].includes(String(item.severity ?? '').toLowerCase()))
      ? 'clarify the missing compliance information urgently'
      : 'follow up on the next compliance submission';
  const subject = `Compliance next step for ${lead.company_name}`;
  const body = [
    `Hi ${lead.contact_name?.trim() || 'Team'},`,
    '',
    `We are reviewing the current compliance readiness for ${lead.company_name}.`,
    `The clearest next step is to ${nextAction}.`,
    '',
    'Please review the outstanding compliance requirements and share the missing information or supporting file at your earliest convenience.',
    '',
    'Operator checks before use:',
    `- Current blocker posture: ${blockers}.`,
    '- Do not treat this draft as a status change or approval.',
    '- Confirm the exact missing item or document before sending.',
    '',
    'Regards,',
    'SETU Flow operator draft',
  ].join('\n');

  return {
    subject,
    body,
    rationale: 'Compliance Next-Step Assistant recommends the clearest operator-reviewed message when compliance blockers or pending documents are holding progression.',
    content: `Subject: ${subject}\n\n${body}`,
    promptContext: {
      lead_id: lead.id,
      lead_name: lead.company_name,
      next_action: nextAction,
      open_compliance_count: complianceItems.filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status ?? '').toLowerCase())).length,
      pending_document_count: documents.filter((item) => !['approved', 'complete', 'completed', 'ready'].includes(String(item.status ?? '').toLowerCase())).length,
      blockers,
    },
  };
}

function buildComplianceEvidenceDraft(lead: LeadContext, complianceItems: ComplianceContext[], documents: DocumentContext[], blockers: string): DraftPayload {
  const subject = `Evidence request for compliance review · ${lead.company_name}`;
  const missingDocs = documents
    .filter((item) => !['approved', 'complete', 'completed', 'ready'].includes(String(item.status ?? '').toLowerCase()))
    .map((item) => item.file_name || item.requirement_code || 'supporting document')
    .slice(0, 3);
  const body = [
    `Hi ${lead.contact_name?.trim() || 'Team'},`,
    '',
    `To continue the compliance review for ${lead.company_name}, we need additional evidence or refreshed documentation.`,
    missingDocs.length ? `Please share the following where available: ${missingDocs.join(', ')}.` : 'Please share the supporting evidence required for the currently open compliance checks.',
    '',
    'This request is review-only and does not change compliance status or approve any document.',
    '',
    'Operator checks before use:',
    `- Current blocker posture: ${blockers}.`,
    `- Open compliance items: ${complianceItems.filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status ?? '').toLowerCase())).length}.`,
    '- Verify the exact evidence requirement before sending.',
    '',
    'Regards,',
    'SETU Flow operator draft',
  ].join('\n');

  return {
    subject,
    body,
    rationale: 'Compliance Evidence Assistant helps operators request the missing proof or document refresh needed to continue compliance review without automating approvals or status movement.',
    content: `Subject: ${subject}\n\n${body}`,
    promptContext: {
      lead_id: lead.id,
      lead_name: lead.company_name,
      requested_evidence: missingDocs,
      open_compliance_count: complianceItems.filter((item) => !['approved', 'completed', 'complete', 'waived'].includes(String(item.status ?? '').toLowerCase())).length,
      blockers,
    },
  };
}

function buildInternalSummary(lead: LeadContext, quotes: QuoteContext[], rfqs: RfqContext[], tasks: TaskContext[], blockers: string): DraftPayload {
  const body = [
    `Lead: ${lead.company_name}`,
    `Contact: ${lead.contact_name || 'Not set'}`,
    `Lead type: ${lead.lead_type}`,
    `Next follow-up: ${lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : 'Not scheduled'}`,
    `Quotes in motion: ${quotes.length}`,
    `RFQs in motion: ${rfqs.length}`,
    `Open tasks: ${tasks.filter((item) => item.status !== 'completed').length}`,
    `Blocker posture: ${blockers}`,
    '',
    'Operator summary:',
    lead.notes?.trim() || 'No narrative notes currently stored on the lead.',
    '',
    'Recommended next action:',
    quotes.length ? 'Confirm send-readiness on the latest quote and close blockers before external communication.' : rfqs.length ? 'Convert the current RFQ into a reviewed quote draft.' : 'Schedule the next customer touchpoint and confirm product/pricing readiness.',
  ].join('\n');

  return {
    subject: null,
    body,
    rationale: 'Internal summaries should stay inside operator review flows and should never become external communication without deliberate rewriting.',
    content: body,
    promptContext: {
      lead_id: lead.id,
      lead_name: lead.company_name,
      quote_count: quotes.length,
      rfq_count: rfqs.length,
      open_task_count: tasks.filter((item) => item.status !== 'completed').length,
      blockers,
    },
  };
}

function buildDraftPayload(type: string, lead: LeadContext, input: {
  quotes: QuoteContext[];
  rfqs: RfqContext[];
  followUps: FollowUpContext[];
  tasks: TaskContext[];
  complianceItems: ComplianceContext[];
  documents: DocumentContext[];
}): DraftPayload {
  const blockers = buildBlockerSummary(input.complianceItems, input.documents);
  switch (type) {
    case CANONICAL_SUGGESTION_TYPES.QUOTE_COVER:
      return buildQuoteCoverNote(lead, input.quotes, input.rfqs, blockers);
    case CANONICAL_SUGGESTION_TYPES.INTERNAL_SUMMARY:
      return buildInternalSummary(lead, input.quotes, input.rfqs, input.tasks, blockers);
    case CANONICAL_SUGGESTION_TYPES.INTRO:
      return buildIntroductionDraft(lead, blockers);
    case CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP:
      return buildComplianceNextStepDraft(lead, input.complianceItems, input.documents, blockers);
    case CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE:
      return buildComplianceEvidenceDraft(lead, input.complianceItems, input.documents, blockers);
    case CANONICAL_SUGGESTION_TYPES.FOLLOW_UP:
    default:
      return buildFollowUpDraft(lead, input.followUps, input.tasks, blockers);
  }
}

function mapSuggestionToCommunicationType(type: string) {
  switch (normalizeSuggestionType(type)) {
    case CANONICAL_SUGGESTION_TYPES.INTRO:
      return 'introduction';
    case CANONICAL_SUGGESTION_TYPES.QUOTE_COVER:
      return 'quote_message';
    case CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP:
    case CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE:
      return 'compliance_request';
    case CANONICAL_SUGGESTION_TYPES.FOLLOW_UP:
    default:
      return 'follow_up';
  }
}

function canCreateCommunicationDraft(type: string) {
  return ([
    CANONICAL_SUGGESTION_TYPES.FOLLOW_UP,
    CANONICAL_SUGGESTION_TYPES.INTRO,
    CANONICAL_SUGGESTION_TYPES.QUOTE_COVER,
    CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP,
    CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE,
  ] as string[]).includes(normalizeSuggestionType(type));
}


async function logAiSuggestionAudit(input: {
  organizationId: string;
  actorUserId: string;
  action: 'ai_suggestion_generated' | 'ai_suggestion_reviewed' | 'ai_suggestion_approved' | 'ai_suggestion_dismissed' | 'ai_suggestion_applied';
  draft: Pick<AiDraftRow, 'id' | 'lead_id' | 'suggestion_type' | 'target_entity_type' | 'target_entity_id' | 'status' | 'decision_outcome' | 'applied_communication_id'>;
  operatorNotes?: string | null;
}) {
  await writeAuditLog({
    organizationId: input.organizationId,
    action: input.action,
    entityType: 'ai_suggestion',
    entityId: input.draft.id,
    actorUserId: input.actorUserId,
    payload: {
      leadId: input.draft.lead_id,
      suggestionType: normalizeSuggestionType(input.draft.suggestion_type),
      targetEntityType: input.draft.target_entity_type,
      targetEntityId: input.draft.target_entity_id,
      status: input.draft.status,
      decisionOutcome: input.draft.decision_outcome,
      appliedCommunicationId: input.draft.applied_communication_id,
      operatorNotes: input.operatorNotes ?? null,
    },
  });
}

function revalidateAiSurfaces(leadId: string, targetEntityType?: string | null, targetEntityId?: string | null) {
  revalidatePath('/ai-suggestions');
  revalidatePath('/dashboard');
  revalidatePath('/leads');
  revalidatePath('/pipeline');
  revalidatePath('/tasks');
  revalidatePath('/quotes');
  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/quote`);
  if (targetEntityType === 'quote' && targetEntityId) {
    revalidatePath(`/leads/${leadId}/quote`);
  }
}

export async function generateAiDraft(_: AiDraftActionState | undefined, formData: FormData): Promise<AiDraftActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const leadId = String(formData.get('lead_id') ?? '').trim();
  const suggestionType = normalizeSuggestionType(String(formData.get('suggestion_type') ?? '').trim() || CANONICAL_SUGGESTION_TYPES.FOLLOW_UP);
  const targetEntityType = String(formData.get('target_entity_type') ?? 'lead').trim() || 'lead';
  const targetEntityId = String(formData.get('target_entity_id') ?? leadId).trim() || leadId;
  if (!leadId) return { error: 'Lead is required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, company_name, contact_name, lead_type, notes, next_follow_up_at, deal_currency')
    .eq('organization_id', workspace.organization.id)
    .eq('id', leadId)
    .maybeSingle();
  if (leadError) return { error: leadError.message };
  if (!lead?.id) return { error: 'Lead not found in the active organization.' };

  const [quotes, rfqs, followUps, tasks, complianceItems, documents] = await Promise.all([
    (() => {
      let query = db.from('quotes').select('id, status, currency, updated_at, quote_number, pricing_basis, valid_until').eq('organization_id', workspace.organization.id).eq('lead_id', leadId);
      if (normalizeSuggestionType(suggestionType) === CANONICAL_SUGGESTION_TYPES.QUOTE_COVER && targetEntityType === 'quote' && targetEntityId) query = query.eq('id', targetEntityId);
      return query.order('updated_at', { ascending: false }).limit(8);
    })(),
    db.from('rfqs').select('id, status, currency, updated_at').eq('organization_id', workspace.organization.id).eq('lead_id', leadId).order('updated_at', { ascending: false }).limit(8),
    db.from('lead_follow_ups').select('scheduled_at, status, notes').eq('organization_id', workspace.organization.id).eq('lead_id', leadId).order('scheduled_at', { ascending: true }).limit(8),
    db.from('scheduled_tasks').select('id, task_type, scheduled_for, status, payload').eq('organization_id', workspace.organization.id).eq('lead_id', leadId).order('scheduled_for', { ascending: true }).limit(8),
    db.from('lead_compliance_items').select('status, severity, due_at').eq('organization_id', workspace.organization.id).eq('lead_id', leadId).order('created_at', { ascending: false }).limit(12),
    db.from('documents').select('file_name, requirement_code, status, expires_at').eq('organization_id', workspace.organization.id).eq('related_entity', 'lead').eq('related_id', leadId).order('uploaded_at', { ascending: false }).limit(12),
  ]);

  const draft = buildDraftPayload(suggestionType, lead as LeadContext, {
    quotes: (quotes.data ?? []) as QuoteContext[],
    rfqs: (rfqs.data ?? []) as RfqContext[],
    followUps: (followUps.data ?? []) as FollowUpContext[],
    tasks: (tasks.data ?? []) as TaskContext[],
    complianceItems: (complianceItems.data ?? []) as ComplianceContext[],
    documents: (documents.data ?? []) as DocumentContext[],
  });

  // Sprint 5 Batch 1 — wire real LLM generation.
  // Pass the template draft as context so the model refines it with the
  // real CRM data already embedded. Fall back to the template if the
  // provider is not configured or the API call fails — the operator
  // always gets something reviewable regardless.
  let finalContent = draft.content;
  let finalBody = draft.body;
  let finalSubject = draft.subject;

  const aiResult = await runAiTask<string>(AiTaskType.DraftGeneration, {
    prompt: draft.content,
    content: draft.content,
    suggestionType,
    leadName: (lead as { company_name?: string }).company_name ?? '',
  });

  if (aiResult.ok && typeof aiResult.data === 'string' && aiResult.data.trim()) {
    const improved = aiResult.data.trim();
    // Split subject from body if the model returned "Subject: ...\n\nBody"
    const subjectMatch = improved.match(/^Subject:\s*(.+?)(?:\n\n|\n)([\s\S]+)$/i);
    if (subjectMatch) {
      finalSubject = subjectMatch[1].trim() || draft.subject;
      finalBody = subjectMatch[2].trim() || draft.body;
      finalContent = `Subject: ${finalSubject}\n\n${finalBody}`;
    } else {
      finalBody = improved;
      finalContent = draft.subject ? `Subject: ${draft.subject}\n\n${improved}` : improved;
    }
  }
  // If aiResult.ok is false we silently fall through to the template draft.

  const { data: inserted, error: insertError } = await db
    .from('ai_suggestions')
    .insert({
      organization_id: workspace.organization.id,
      lead_id: leadId,
      suggestion_type: suggestionType,
      target_entity_type: targetEntityType,
      target_entity_id: targetEntityId,
      content: finalContent,
      draft_subject: finalSubject,
      draft_body: finalBody,
      rationale: draft.rationale,
      prompt_context: draft.promptContext,
      status: 'generated',
      suggested_by: workspace.user.id,
    })
    .select('id, organization_id, lead_id, suggestion_type, target_entity_type, target_entity_id, content, draft_subject, draft_body, rationale, prompt_context, status, suggested_by, created_at, reviewed_by, reviewed_at, decided_by, decided_at, decision_outcome, operator_notes, applied_communication_id, updated_at')
    .single();
  if (insertError) return { error: insertError.message };

  await logAiSuggestionAudit({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: 'ai_suggestion_generated',
    draft: inserted as AiDraftRow,
  });

  revalidateAiSurfaces(leadId, targetEntityType, targetEntityId);
  return { success: suggestionType === CANONICAL_SUGGESTION_TYPES.INTRO ? 'Intro draft prepared for operator review.' : 'AI draft generated for review.', draft: inserted as AiDraftRow };
}

export async function updateAiDraftReview(_: AiDraftActionState | undefined, formData: FormData): Promise<AiDraftActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const draftId = String(formData.get('draft_id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim().toLowerCase();
  const operatorNotes = String(formData.get('operator_notes') ?? '').trim() || null;
  if (!draftId) return { error: 'Draft id is required.' };
  if (!['reviewed', 'approved', 'dismissed'].includes(decision)) return { error: 'Invalid AI draft decision.' };

  const supabase = await createClient();
  const db = supabase as any;
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: decision,
    operator_notes: operatorNotes,
    reviewed_by: workspace.user.id,
    reviewed_at: now,
    updated_at: now,
  };

  if (decision === 'approved' || decision === 'dismissed') {
    updatePayload.decided_by = workspace.user.id;
    updatePayload.decided_at = now;
    updatePayload.decision_outcome = decision === 'approved' ? 'operator_approved' : 'operator_dismissed';
  } else {
    updatePayload.decision_outcome = 'operator_reviewed';
  }

  const { data: updated, error } = await db
    .from('ai_suggestions')
    .update(updatePayload)
    .eq('organization_id', workspace.organization.id)
    .eq('id', draftId)
    .select('id, organization_id, lead_id, suggestion_type, target_entity_type, target_entity_id, content, draft_subject, draft_body, rationale, prompt_context, status, suggested_by, created_at, reviewed_by, reviewed_at, decided_by, decided_at, decision_outcome, operator_notes, applied_communication_id, updated_at')
    .single();
  if (error) return { error: error.message };

  await logAiSuggestionAudit({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: decision === 'approved' ? 'ai_suggestion_approved' : decision === 'dismissed' ? 'ai_suggestion_dismissed' : 'ai_suggestion_reviewed',
    draft: updated as AiDraftRow,
    operatorNotes,
  });

  revalidateAiSurfaces(String(updated.lead_id), String(updated.target_entity_type ?? ''), String(updated.target_entity_id ?? ''));
  const message = decision === 'approved' ? 'Draft approved for operator use.' : decision === 'dismissed' ? 'Draft dismissed from the active queue.' : 'Draft marked as reviewed.';
  return { success: message, draft: updated as AiDraftRow, draftId };
}

export async function applyAiDraftToCommunication(_: AiDraftActionState | undefined, formData: FormData): Promise<AiDraftActionState> {
  if (!hasSupabaseEnv) return { error: 'Missing Supabase environment variables.' };
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };

  const draftId = String(formData.get('draft_id') ?? '').trim();
  const operatorNotes = String(formData.get('operator_notes') ?? '').trim() || null;
  if (!draftId) return { error: 'Draft id is required.' };

  const supabase = await createClient();
  const db = supabase as any;

  const { data: draft, error: draftError } = await db
    .from('ai_suggestions')
    .select('id, organization_id, lead_id, suggestion_type, target_entity_type, target_entity_id, content, draft_subject, draft_body, rationale, status')
    .eq('organization_id', workspace.organization.id)
    .eq('id', draftId)
    .maybeSingle();
  if (draftError) return { error: draftError.message };
  if (!draft?.id) return { error: 'AI draft not found.' };
  if (!canCreateCommunicationDraft(String(draft.suggestion_type ?? ''))) return { error: 'This suggestion type cannot be applied to the communications timeline.' };

  const subject = typeof draft.draft_subject === 'string' && draft.draft_subject.trim() ? draft.draft_subject.trim() : null;
  const body = typeof draft.draft_body === 'string' && draft.draft_body.trim() ? draft.draft_body.trim() : String(draft.content ?? '').trim();
  if (!body) return { error: 'Draft body is empty.' };

  const normalizedType = normalizeSuggestionType(String(draft.suggestion_type ?? CANONICAL_SUGGESTION_TYPES.FOLLOW_UP));
  const workflowFamily = getSuggestionFamily(normalizedType);
  const relatedEntity = draft.target_entity_type === 'quote' && draft.target_entity_id ? 'quote' : 'lead';
  const relatedId = draft.target_entity_type === 'quote' && draft.target_entity_id ? draft.target_entity_id : draft.lead_id;
  const communicationPayload = {
      organization_id: workspace.organization.id,
      lead_id: draft.lead_id,
      quote_id: relatedEntity === 'quote' ? draft.target_entity_id : null,
      related_entity: relatedEntity,
      related_id: relatedId,
      communication_type: mapSuggestionToCommunicationType(normalizedType),
      direction: 'outbound',
      channel: 'email',
      subject,
      body,
      summary: draft.rationale,
      draft_source: 'ai',
      status: 'draft',
      created_by: workspace.user.id,
      metadata: {
        ai_suggestion_id: draft.id,
        ai_suggestion_type: normalizedType,
        target_entity_type: draft.target_entity_type,
        target_entity_id: draft.target_entity_id,
        operator_notes: operatorNotes,
        provenance: 'ai_assisted_draft',
        workflow_family: workflowFamily,
      },
    };

  const { data: communication, error: communicationError } = await db
    .from('communications')
    .insert(communicationPayload)
    .select('id')
    .single();
  if (communicationError) return { error: communicationError.message };

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db
    .from('ai_suggestions')
    .update({
      status: 'applied',
      reviewed_by: workspace.user.id,
      reviewed_at: now,
      decided_by: workspace.user.id,
      decided_at: now,
      operator_notes: operatorNotes,
      decision_outcome: 'communication_draft_created',
      applied_communication_id: communication.id,
      updated_at: now,
    })
    .eq('organization_id', workspace.organization.id)
    .eq('id', draftId)
    .select('id, organization_id, lead_id, suggestion_type, target_entity_type, target_entity_id, content, draft_subject, draft_body, rationale, prompt_context, status, suggested_by, created_at, reviewed_by, reviewed_at, decided_by, decided_at, decision_outcome, operator_notes, applied_communication_id, updated_at')
    .single();
  if (updateError) return { error: updateError.message };

  await logAiSuggestionAudit({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: 'ai_suggestion_applied',
    draft: updated as AiDraftRow,
    operatorNotes,
  });

  revalidateAiSurfaces(String(updated.lead_id), String(updated.target_entity_type ?? ''), String(updated.target_entity_id ?? ''));
  return { success: 'Communication draft linked to the lead timeline. No send action was triggered.', draft: updated as AiDraftRow, draftId };
}

export const decideAiDraft = updateAiDraftReview;
