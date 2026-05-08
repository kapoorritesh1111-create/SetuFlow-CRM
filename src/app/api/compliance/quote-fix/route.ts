import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

const CLEAR_STATUSES = new Set(['approved', 'complete', 'completed', 'ready', 'waived']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function toStringSet(rows: any[], key: string) {
  return new Set<string>(rows.map((row: any) => clean(row?.[key])).filter((value: string) => value.length > 0));
}

function ruleApplies(rule: any, lead: any, marketIds: Set<string>, productIds: Set<string>) {
  if (rule?.is_active === false || rule?.is_mandatory !== true) return false;
  const scope = normalize(rule?.progression_scope || 'general');
  if (!(scope === 'general' || scope === 'quote_send')) return false;
  if (rule?.lead_type && normalize(rule.lead_type) !== normalize(lead?.lead_type)) return false;
  if (rule?.market_id && !marketIds.has(String(rule.market_id))) return false;
  if (rule?.product_id && !productIds.has(String(rule.product_id))) return false;
  return Boolean(clean(rule?.requirement_code));
}

async function getMissingQuoteRequirementCodes(db: any, organizationId: string, lead: any) {
  const [leadMarketsResult, leadProductsResult, rulesResult, documentsResult] = await Promise.all([
    db.from('lead_markets').select('market_id').eq('organization_id', organizationId).eq('lead_id', lead.id),
    db.from('lead_product_interests').select('product_id').eq('organization_id', organizationId).eq('lead_id', lead.id),
    db.from('document_requirement_rules').select('id, market_id, product_id, lead_type, progression_scope, requirement_code, is_mandatory, is_active').eq('organization_id', organizationId).eq('is_active', true),
    db.from('documents').select('id, requirement_code, status, expires_at').eq('organization_id', organizationId).eq('related_entity', 'lead').eq('related_id', lead.id),
  ]);

  for (const result of [leadMarketsResult, leadProductsResult, rulesResult, documentsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const marketIds = toStringSet(leadMarketsResult.data ?? [], 'market_id');
  const productIds = toStringSet(leadProductsResult.data ?? [], 'product_id');
  const rules = (rulesResult.data ?? []).filter((rule: any) => ruleApplies(rule, lead, marketIds, productIds));
  const documents = documentsResult.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const codes: string[] = [];

  for (const rule of rules) {
    const code = clean(rule.requirement_code);
    if (!code || codes.includes(code)) continue;
    const approved = documents.some((document: any) => {
      const sameCode = clean(document.requirement_code) === code;
      const current = !document.expires_at || String(document.expires_at) >= today;
      return sameCode && current && CLEAR_STATUSES.has(normalize(document.status));
    });
    if (!approved) codes.push(code);
  }
  return codes;
}

type DocumentLookup = {
  organization_id: string;
  related_entity: string;
  related_id: string;
  linked_quote_id: string;
  requirement_code: string;
  doc_type?: string;
};

async function saveDocumentIdempotently(db: any, lookup: DocumentLookup, payload: Record<string, unknown>) {
  let findQuery = db.from('documents').select('id');
  for (const [key, value] of Object.entries(lookup)) {
    if (value != null) findQuery = findQuery.eq(key, value);
  }
  const { data: existingRows, error: findError } = await findQuery.order('uploaded_at', { ascending: false }).limit(1);
  if (findError) throw new Error(findError.message);
  const existingId = Array.isArray(existingRows) ? existingRows[0]?.id : null;

  if (existingId) {
    const { data, error } = await db.from('documents').update(payload).eq('id', existingId).select('id').single();
    if (error) throw new Error(error.message);
    return { id: data?.id ?? existingId, created: false };
  }

  const { data, error } = await db.from('documents').insert(payload).select('id').single();
  if (error) throw new Error(error.message);
  return { id: data?.id ?? null, created: true };
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const organizationId = workspace.organization.id;
  const actorUserId = workspace.user.id;
  const payload = await request.json().catch(() => ({}));
  const quoteId = clean(payload.quoteId);
  const action = clean(payload.action).toLowerCase();
  const fileNameInput = clean(payload.fileName);
  const notes = clean(payload.notes);

  if (!quoteId) return NextResponse.json({ error: 'Quote id is required.' }, { status: 400 });
  if (!['attach', 'waive', 'defer'].includes(action)) return NextResponse.json({ error: 'Unsupported compliance action.' }, { status: 400 });
  if (action === 'attach' && !fileNameInput) return NextResponse.json({ error: 'Enter a document/evidence name before attaching.' }, { status: 400 });
  if ((action === 'waive' || action === 'defer') && notes.length < 8) return NextResponse.json({ error: 'Add a clear reviewer reason before saving this decision.' }, { status: 400 });
  if ((action === 'waive' || action === 'defer') && !hasWorkspaceCapability(workspace.currentRoles, 'compliance.review')) {
    return NextResponse.json({ error: getReadOnlyWorkspaceMessage(workspace.currentRoles, 'compliance.review') ?? 'Your role cannot record compliance decisions.' }, { status: 403 });
  }

  const supabase = await createClient();
  const mutationDb = (createAdminSupabaseClient() ?? supabase) as any;
  const db = supabase as any;

  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select('id, quote_number, lead_id, notes_internal, current_version_id')
    .eq('organization_id', organizationId)
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found in this organization.' }, { status: 404 });

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, lead_type, company_name')
    .eq('organization_id', organizationId)
    .eq('id', quote.lead_id)
    .maybeSingle();
  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  if (!lead?.id) return NextResponse.json({ error: 'Quote lead was not found.' }, { status: 404 });

  const now = new Date().toISOString();
  const quoteLabel = quote.quote_number ?? quote.id.slice(0, 8);
  const docType = action === 'attach' ? 'quote_review_evidence' : action === 'waive' ? 'waiver' : 'dispatch_defer';
  const status = action === 'attach' ? 'submitted' : 'approved';
  const fileName = action === 'attach' ? fileNameInput : action === 'waive' ? `Quote waiver - ${quoteLabel}` : `Dispatch deferral - ${quoteLabel}`;

  const quoteDocumentPayload: Record<string, unknown> = {
    organization_id: organizationId,
    related_entity: 'quote',
    related_id: quote.id,
    linked_quote_id: quote.id,
    file_name: fileName,
    file_url: action === 'attach'
      ? `workspace-quote-fix://${quote.id}/${Date.now()}/${encodeURIComponent(fileName)}`
      : `workspace-quote-fix://${quote.id}/${encodeURIComponent(docType)}`,
    doc_type: docType,
    uploaded_by: actorUserId,
    uploaded_at: now,
    version: 1,
    status,
    owner_user_id: actorUserId,
    requirement_code: 'quote_review_document',
    review_notes: notes || null,
    version_label: action === 'attach' ? 'quote-review-upload' : action === 'waive' ? 'quote-waiver' : 'dispatch-deferral',
  };
  if (action !== 'attach') {
    quoteDocumentPayload.reviewer_user_id = actorUserId;
    quoteDocumentPayload.reviewed_at = now;
  }

  let quoteDocument: { id: string | null; created: boolean };
  try {
    if (action === 'attach') {
      const { data, error } = await mutationDb.from('documents').insert(quoteDocumentPayload).select('id').single();
      if (error) throw new Error(error.message);
      quoteDocument = { id: data?.id ?? null, created: true };
    } else {
      quoteDocument = await saveDocumentIdempotently(mutationDb, {
        organization_id: organizationId,
        related_entity: 'quote',
        related_id: quote.id,
        linked_quote_id: quote.id,
        requirement_code: 'quote_review_document',
        doc_type: docType,
      }, quoteDocumentPayload);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save quote document.' }, { status: 500 });
  }

  let approvedLeadRequirements = 0;
  let updatedLeadRequirements = 0;
  let clearedComplianceItems = 0;
  let supersededQuoteReviewDocuments = 0;
  let quoteReviewApproved = false;
  let quoteLineCount = 0;

  if (action === 'waive' || action === 'defer') {
    const missingCodes = await getMissingQuoteRequirementCodes(db, organizationId, lead);
    const leadRequirementCodes = Array.from(new Set(['quote_review_document', ...missingCodes]));

    for (const code of leadRequirementCodes) {
      try {
        const result = await saveDocumentIdempotently(mutationDb, {
          organization_id: organizationId,
          related_entity: 'lead',
          related_id: lead.id,
          linked_quote_id: quote.id,
          requirement_code: code,
        }, {
          organization_id: organizationId,
          related_entity: 'lead',
          related_id: lead.id,
          linked_quote_id: quote.id,
          file_name: `${fileName} - ${code}`,
          file_url: `workspace-quote-fix://${quote.id}/${encodeURIComponent(code)}`,
          doc_type: docType,
          uploaded_by: actorUserId,
          uploaded_at: now,
          version: 1,
          status: 'approved',
          owner_user_id: actorUserId,
          reviewer_user_id: actorUserId,
          reviewed_at: now,
          requirement_code: code,
          review_notes: notes,
          version_label: code === 'quote_review_document'
            ? (action === 'waive' ? 'quote-waiver-gate-clearance' : 'dispatch-deferral-gate-clearance')
            : (action === 'waive' ? 'quote-waiver-requirement' : 'dispatch-deferral-requirement'),
        });
        if (result.created) approvedLeadRequirements += 1;
        else updatedLeadRequirements += 1;
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not save lead requirement clearance.' }, { status: 500 });
      }
    }

    const { data: pendingQuoteReviewDocuments, error: pendingQuoteReviewError } = await db
      .from('documents')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('linked_quote_id', quote.id)
      .eq('requirement_code', 'quote_review_document');
    if (pendingQuoteReviewError) return NextResponse.json({ error: pendingQuoteReviewError.message }, { status: 500 });

    const pendingQuoteReviewIds = (pendingQuoteReviewDocuments ?? [])
      .filter((document: any) => !CLEAR_STATUSES.has(normalize(document.status)))
      .map((document: any) => document.id)
      .filter(Boolean);

    if (pendingQuoteReviewIds.length) {
      const { error: supersedeError } = await mutationDb
        .from('documents')
        .update({ status: 'approved', reviewer_user_id: actorUserId, reviewed_at: now, review_notes: `${action} decision cleared quote review: ${notes}` })
        .in('id', pendingQuoteReviewIds)
        .eq('organization_id', organizationId);
      if (supersedeError) return NextResponse.json({ error: supersedeError.message }, { status: 500 });
      supersededQuoteReviewDocuments = pendingQuoteReviewIds.length;
    }

    const { data: quoteLines, error: quoteLinesError } = await db.from('quote_line_items').select('id').eq('quote_id', quote.id);
    if (quoteLinesError) return NextResponse.json({ error: quoteLinesError.message }, { status: 500 });
    quoteLineCount = Array.isArray(quoteLines) ? quoteLines.length : 0;

    const { error: quoteUpdateError } = await mutationDb
      .from('quotes')
      .update({
        approved_at: now,
        approved_by: actorUserId,
        notes_internal: `${clean(quote.notes_internal)}\n[quote_review_gate_clearance] ${action} approved by ${actorUserId} at ${now}: ${notes}`.trim(),
        updated_at: now,
      })
      .eq('organization_id', organizationId)
      .eq('id', quote.id);
    if (quoteUpdateError) return NextResponse.json({ error: quoteUpdateError.message }, { status: 500 });
    quoteReviewApproved = true;

    const quoteVersionUpdate: Record<string, unknown> = { approved_at: now, approved_by: actorUserId, updated_at: now };
    if (quoteLineCount > 0) quoteVersionUpdate.total_line_count = quoteLineCount;
    let quoteVersionQuery = mutationDb.from('quote_versions').update(quoteVersionUpdate).eq('quote_id', quote.id);
    if (quote.current_version_id) quoteVersionQuery = quoteVersionQuery.eq('id', quote.current_version_id);
    const { error: quoteVersionUpdateError } = await quoteVersionQuery;
    if (quoteVersionUpdateError) return NextResponse.json({ error: quoteVersionUpdateError.message }, { status: 500 });

    const { data: openItems, error: openItemsError } = await db
      .from('lead_compliance_items')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('lead_id', lead.id);
    if (openItemsError) return NextResponse.json({ error: openItemsError.message }, { status: 500 });

    const openItemIds = (openItems ?? [])
      .filter((item: any) => !CLEAR_STATUSES.has(normalize(item.status)))
      .map((item: any) => item.id)
      .filter(Boolean);

    if (openItemIds.length) {
      const { error: clearError } = await mutationDb
        .from('lead_compliance_items')
        .update({ status: 'approved', submitted_at: now, approved_at: now, reviewer_user_id: actorUserId, reviewed_at: now, review_notes: notes })
        .in('id', openItemIds)
        .eq('organization_id', organizationId);
      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
      clearedComplianceItems = openItemIds.length;
    }
  }

  await mutationDb.from('audit_logs').insert({
    organization_id: organizationId,
    actor_user_id: actorUserId,
    action: action === 'attach' ? 'quote_compliance_evidence_attached' : action === 'waive' ? 'quote_compliance_waived' : 'quote_compliance_deferred_to_dispatch',
    entity_type: 'document',
    entity_id: quoteDocument?.id ?? null,
    payload: {
      previous: null,
      new: { quote_id: quote.id, lead_id: lead.id, action, status, file_name: fileName, notes, quote_document_created: quoteDocument.created, approved_lead_requirements: approvedLeadRequirements, updated_lead_requirements: updatedLeadRequirements, cleared_compliance_items: clearedComplianceItems, superseded_quote_review_documents: supersededQuoteReviewDocuments, quote_review_approved: quoteReviewApproved, quote_line_count: quoteLineCount },
      metadata: { source: 'quote_review_gate_fix', idempotent_decision: action !== 'attach' }
    },
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath('/compliance');

  const actionMessage = action === 'attach'
    ? 'Evidence attached to this quote. Refresh draft preview after review approval.'
    : action === 'waive'
      ? `Quote waiver saved. ${approvedLeadRequirements} gate document${approvedLeadRequirements === 1 ? '' : 's'} created, ${updatedLeadRequirements} updated, and quote version refreshed with ${quoteLineCount} line${quoteLineCount === 1 ? '' : 's'}.`
      : `Dispatch deferral saved. ${approvedLeadRequirements} gate document${approvedLeadRequirements === 1 ? '' : 's'} created, ${updatedLeadRequirements} updated, and quote version refreshed with ${quoteLineCount} line${quoteLineCount === 1 ? '' : 's'}.`;

  return NextResponse.json({ ok: true, quoteDocumentCreated: quoteDocument.created, approvedLeadRequirements, updatedLeadRequirements, clearedComplianceItems, supersededQuoteReviewDocuments, quoteReviewApproved, quoteLineCount, message: actionMessage });
}
