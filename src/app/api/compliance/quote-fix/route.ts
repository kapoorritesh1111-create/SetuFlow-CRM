import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function ruleApplies(rule: any, lead: any, marketIds: Set<string>, productIds: Set<string>) {
  if (rule?.is_active === false || rule?.is_mandatory !== true) return false;
  const scope = normalize(rule?.progression_scope || 'general');
  if (!(scope === 'general' || scope === 'quote_send')) return false;
  if (rule?.lead_type && normalize(rule.lead_type) !== normalize(lead?.lead_type)) return false;
  if (rule?.market_id && !marketIds.has(rule.market_id)) return false;
  if (rule?.product_id && !productIds.has(rule.product_id)) return false;
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

  const marketIds = new Set((leadMarketsResult.data ?? []).map((row: any) => row.market_id).filter(Boolean));
  const productIds = new Set((leadProductsResult.data ?? []).map((row: any) => row.product_id).filter(Boolean));
  const rules = (rulesResult.data ?? []).filter((rule: any) => ruleApplies(rule, lead, marketIds, productIds));
  const documents = documentsResult.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const approvedStatuses = new Set(['approved', 'complete', 'completed', 'ready', 'waived']);

  const codes: string[] = [];
  for (const rule of rules) {
    const code = clean(rule.requirement_code);
    if (!code || codes.includes(code)) continue;
    const hasApproved = documents.some((document: any) => {
      const sameCode = clean(document.requirement_code) === code;
      const notExpired = !document.expires_at || String(document.expires_at) >= today;
      return sameCode && notExpired && approvedStatuses.has(normalize(document.status));
    });
    if (!hasApproved) codes.push(code);
  }
  return codes;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

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
  const admin = createAdminSupabaseClient();
  const db = supabase as any;
  const mutationDb = (admin ?? supabase) as any;

  const { data: quote, error: quoteError } = await db
    .from('quotes')
    .select('id, quote_number, lead_id')
    .eq('organization_id', workspace.organization.id)
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'Quote not found in this organization.' }, { status: 404 });

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, lead_type, company_name')
    .eq('organization_id', workspace.organization.id)
    .eq('id', quote.lead_id)
    .maybeSingle();
  if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 });
  if (!lead?.id) return NextResponse.json({ error: 'Quote lead was not found.' }, { status: 404 });

  const now = new Date().toISOString();
  const docType = action === 'attach' ? 'quote_review_evidence' : action === 'waive' ? 'quote_waiver' : 'dispatch_defer';
  const status = action === 'attach' ? 'submitted' : 'approved';
  const quoteLabel = quote.quote_number ?? quote.id.slice(0, 8);
  const fileName = action === 'attach'
    ? fileNameInput
    : action === 'waive'
      ? `Quote waiver - ${quoteLabel}`
      : `Dispatch deferral - ${quoteLabel}`;

  const quoteDocumentPayload: Record<string, unknown> = {
    organization_id: workspace.organization.id,
    related_entity: 'quote',
    related_id: quote.id,
    linked_quote_id: quote.id,
    file_name: fileName,
    file_url: `workspace-quote-fix://${quote.id}/${Date.now()}/${encodeURIComponent(fileName)}`,
    doc_type: docType,
    uploaded_by: workspace.user.id,
    uploaded_at: now,
    version: 1,
    status,
    owner_user_id: workspace.user.id,
    requirement_code: 'quote_review_document',
    review_notes: notes || null,
    version_label: action === 'attach' ? 'quote-review-upload' : action === 'waive' ? 'quote-waiver' : 'dispatch-deferral',
  };
  if (action !== 'attach') {
    quoteDocumentPayload.reviewer_user_id = workspace.user.id;
    quoteDocumentPayload.reviewed_at = now;
  }

  const { data: quoteDocument, error: insertError } = await mutationDb.from('documents').insert(quoteDocumentPayload).select('id').single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  let clearedComplianceItems = 0;
  let approvedLeadRequirements = 0;
  if (action === 'waive' || action === 'defer') {
    const missingCodes = await getMissingQuoteRequirementCodes(db, workspace.organization.id, lead);
    if (missingCodes.length) {
      const leadRequirementDocuments = missingCodes.map((code) => ({
        organization_id: workspace.organization.id,
        related_entity: 'lead',
        related_id: lead.id,
        linked_quote_id: quote.id,
        file_name: `${fileName} - ${code}`,
        file_url: `workspace-quote-fix://${quote.id}/${Date.now()}/${encodeURIComponent(code)}`,
        doc_type: docType,
        uploaded_by: workspace.user.id,
        uploaded_at: now,
        version: 1,
        status: 'approved',
        owner_user_id: workspace.user.id,
        reviewer_user_id: workspace.user.id,
        reviewed_at: now,
        requirement_code: code,
        review_notes: notes,
        version_label: action === 'waive' ? 'quote-waiver-requirement' : 'dispatch-deferral-requirement',
      }));
      const { error: leadDocsError } = await mutationDb.from('documents').insert(leadRequirementDocuments);
      if (leadDocsError) return NextResponse.json({ error: leadDocsError.message }, { status: 500 });
      approvedLeadRequirements = leadRequirementDocuments.length;
    }

    const { data: openItems, error: openItemsError } = await db
      .from('lead_compliance_items')
      .select('id, status')
      .eq('organization_id', workspace.organization.id)
      .eq('lead_id', lead.id);
    if (openItemsError) return NextResponse.json({ error: openItemsError.message }, { status: 500 });

    const openItemIds = (openItems ?? [])
      .filter((item: any) => !['approved', 'complete', 'completed', 'ready'].includes(normalize(item.status)))
      .map((item: any) => item.id)
      .filter(Boolean);

    if (openItemIds.length) {
      const { error: clearError } = await mutationDb
        .from('lead_compliance_items')
        .update({ status: 'approved', submitted_at: now, approved_at: now })
        .in('id', openItemIds)
        .eq('organization_id', workspace.organization.id);
      if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
      clearedComplianceItems = openItemIds.length;
    }
  }

  await mutationDb.from('audit_logs').insert({
    organization_id: workspace.organization.id,
    actor_user_id: workspace.user.id,
    action: action === 'attach' ? 'quote_compliance_evidence_attached' : action === 'waive' ? 'quote_compliance_waived' : 'quote_compliance_deferred_to_dispatch',
    entity_type: 'document',
    entity_id: quoteDocument?.id ?? null,
    payload: {
      previous: null,
      new: {
        quote_id: quote.id,
        lead_id: lead.id,
        action,
        status,
        file_name: fileName,
        notes,
        approved_lead_requirements: approvedLeadRequirements,
        cleared_compliance_items: clearedComplianceItems,
        lead_compliance_status: action === 'attach' ? null : 'approved',
      },
      metadata: { source: 'quote_review_gate_fix', quote_gate_clearance: action === 'attach' ? 'document_submitted_for_review' : 'lead_requirements_and_compliance_approved_with_recorded_reason' }
    },
  });

  revalidatePath('/leads');
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath('/compliance');

  const actionMessage = action === 'attach'
    ? 'Evidence attached to this quote. Refresh draft preview after review approval.'
    : action === 'waive'
      ? `Quote waiver recorded. ${approvedLeadRequirements} document requirement${approvedLeadRequirements === 1 ? '' : 's'} and ${clearedComplianceItems} compliance blocker${clearedComplianceItems === 1 ? '' : 's'} were approved for quote send.`
      : `Dispatch deferral recorded. ${approvedLeadRequirements} document requirement${approvedLeadRequirements === 1 ? '' : 's'} and ${clearedComplianceItems} compliance blocker${clearedComplianceItems === 1 ? '' : 's'} were approved for quote send.`;

  return NextResponse.json({ ok: true, approvedLeadRequirements, clearedComplianceItems, message: actionMessage });
}
