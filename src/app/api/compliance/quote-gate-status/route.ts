import { NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const CLEAR_DOCUMENT_STATUSES = new Set(['approved', 'complete', 'completed', 'ready', 'waived']);
const OPEN_COMPLIANCE_STATUSES = new Set(['blocked', 'missing', 'rejected', 'overdue', 'pending', 'submitted', 'in_review', 'pending_review', 'revision_requested']);

type QuoteGateRow = {
  id: string;
  quote_number: string | null;
  lead_id: string | null;
  approved_at: string | null;
  current_version_id: string | null;
};

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const organizationId = workspace.organization.id;
  const { searchParams } = new URL(request.url);
  const quoteId = clean(searchParams.get('quoteId'));
  const quoteNumber = clean(searchParams.get('quoteNumber'));

  if (!quoteId && !quoteNumber) return NextResponse.json({ error: 'quoteId or quoteNumber is required.' }, { status: 400 });

  const supabase = await createClient();
  let quoteQuery = (supabase as any)
    .from('quotes')
    .select('id, quote_number, lead_id, approved_at, current_version_id')
    .eq('organization_id', organizationId)
    .limit(1);

  quoteQuery = quoteId ? quoteQuery.eq('id', quoteId) : quoteQuery.eq('quote_number', quoteNumber);
  const quoteResult = await quoteQuery;
  if (quoteResult.error) return NextResponse.json({ error: quoteResult.error.message }, { status: 500 });
  const quote = ((Array.isArray(quoteResult.data) ? quoteResult.data[0] : null) ?? null) as QuoteGateRow | null;
  if (!quote?.id || !quote?.lead_id) return NextResponse.json({ error: 'Quote not found in this organization.' }, { status: 404 });

  const [quoteDocsResult, leadDocsResult, complianceResult, versionResult] = await Promise.all([
    (supabase as any)
      .from('documents')
      .select('id, status, requirement_code, doc_type, linked_quote_id, related_entity, related_id, reviewed_at')
      .eq('organization_id', organizationId)
      .eq('linked_quote_id', quote.id),
    (supabase as any)
      .from('documents')
      .select('id, status, requirement_code, doc_type, linked_quote_id, related_entity, related_id, reviewed_at')
      .eq('organization_id', organizationId)
      .eq('related_entity', 'lead')
      .eq('related_id', quote.lead_id)
      .eq('requirement_code', 'quote_review_document'),
    (supabase as any)
      .from('lead_compliance_items')
      .select('id, status, severity')
      .eq('organization_id', organizationId)
      .eq('lead_id', quote.lead_id),
    quote.current_version_id
      ? (supabase as any)
          .from('quote_versions')
          .select('id, status, approved_at')
          .eq('id', quote.current_version_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  for (const result of [quoteDocsResult, leadDocsResult, complianceResult, versionResult]) {
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const documents = [...(quoteDocsResult.data ?? []), ...(leadDocsResult.data ?? [])];
  const quoteReviewDocuments = documents.filter((document: any) => {
    const requirementCode = normalize(document.requirement_code);
    const docType = normalize(document.doc_type);
    return requirementCode === 'quote_review_document'
      || ['waiver', 'quote_waiver', 'dispatch_defer', 'quote_review_evidence'].includes(docType);
  });

  const hasClearQuoteReviewDocument = quoteReviewDocuments.some((document: any) => CLEAR_DOCUMENT_STATUSES.has(normalize(document.status)));
  const openComplianceItems = (complianceResult.data ?? []).filter((item: any) => {
    const status = normalize(item.status);
    const severity = normalize(item.severity);
    return OPEN_COMPLIANCE_STATUSES.has(status) || severity === 'high';
  });
  const quoteReviewApproved = Boolean(quote.approved_at || versionResult.data?.approved_at);
  const clear = hasClearQuoteReviewDocument && openComplianceItems.length === 0;

  return NextResponse.json({
    ok: true,
    clear,
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    leadId: quote.lead_id,
    hasClearQuoteReviewDocument,
    quoteReviewApproved,
    openComplianceCount: openComplianceItems.length,
    quoteReviewDocumentCount: quoteReviewDocuments.length,
  });
}
