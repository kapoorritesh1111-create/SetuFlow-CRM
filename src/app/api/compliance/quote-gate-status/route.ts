import { NextResponse } from 'next/server';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const CLEAR_DOCUMENT_STATUSES = new Set(['approved', 'complete', 'completed', 'ready', 'waived']);
const OPEN_COMPLIANCE_STATUSES = new Set(['blocked', 'missing', 'rejected', 'overdue', 'pending', 'submitted', 'in_review', 'pending_review', 'revision_requested']);

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
  let query = supabase
    .from('quotes')
    .select('id, quote_number, lead_id, approved_at, current_version_id')
    .eq('organization_id', organizationId)
    .limit(1);

  query = quoteId ? query.eq('id', quoteId) : query.eq('quote_number', quoteNumber);
  const { data: quoteRows, error: quoteError } = await query;
  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 500 });
  const quote = quoteRows?.[0] ?? null;
  if (!quote?.id || !quote?.lead_id) return NextResponse.json({ error: 'Quote not found in this organization.' }, { status: 404 });

  const [documentsResult, complianceResult, versionResult] = await Promise.all([
    supabase
      .from('documents')
      .select('id, status, requirement_code, doc_type, linked_quote_id, related_entity, related_id, reviewed_at')
      .eq('organization_id', organizationId)
      .or(`linked_quote_id.eq.${quote.id},and(related_entity.eq.quote,related_id.eq.${quote.id}),and(related_entity.eq.lead,related_id.eq.${quote.lead_id},requirement_code.eq.quote_review_document)`),
    supabase
      .from('lead_compliance_items')
      .select('id, status, severity')
      .eq('organization_id', organizationId)
      .eq('lead_id', quote.lead_id),
    quote.current_version_id
      ? supabase
          .from('quote_versions')
          .select('id, status, approved_at')
          .eq('id', quote.current_version_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  if (documentsResult.error) return NextResponse.json({ error: documentsResult.error.message }, { status: 500 });
  if (complianceResult.error) return NextResponse.json({ error: complianceResult.error.message }, { status: 500 });
  if (versionResult.error) return NextResponse.json({ error: versionResult.error.message }, { status: 500 });

  const quoteReviewDocuments = (documentsResult.data ?? []).filter((document: any) => {
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
