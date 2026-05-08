import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { hasSupabaseEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
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

function hasMoney(value: unknown) {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) && number > 0;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const quoteId = clean(payload.quoteId);
  const quoteNumber = clean(payload.quoteNumber);
  if (!quoteId && !quoteNumber) return NextResponse.json({ error: 'quoteId or quoteNumber is required.' }, { status: 400 });

  const organizationId = workspace.organization.id;
  const supabase = await createClient();
  const mutationDb = (createAdminSupabaseClient() ?? supabase) as any;

  let quoteQuery = (supabase as any)
    .from('quotes')
    .select('id, quote_number, lead_id, current_version_id, approved_at, approval_required, status')
    .eq('organization_id', organizationId)
    .limit(1);
  quoteQuery = quoteId ? quoteQuery.eq('id', quoteId) : quoteQuery.eq('quote_number', quoteNumber);
  const quoteResult = await quoteQuery;
  if (quoteResult.error) return NextResponse.json({ error: quoteResult.error.message }, { status: 500 });
  const quote = Array.isArray(quoteResult.data) ? quoteResult.data[0] : null;
  if (!quote?.id || !quote?.lead_id) return NextResponse.json({ error: 'Quote not found in this organization.' }, { status: 404 });

  const [quoteDocsResult, leadDocsResult, complianceResult, versionResult, lineResult] = await Promise.all([
    (supabase as any).from('documents').select('id, status, requirement_code, doc_type').eq('organization_id', organizationId).eq('linked_quote_id', quote.id),
    (supabase as any).from('documents').select('id, status, requirement_code, doc_type').eq('organization_id', organizationId).eq('related_entity', 'lead').eq('related_id', quote.lead_id).eq('requirement_code', 'quote_review_document'),
    (supabase as any).from('lead_compliance_items').select('id, status, severity').eq('organization_id', organizationId).eq('lead_id', quote.lead_id),
    quote.current_version_id
      ? (supabase as any).from('quote_versions').select('id, approved_at, status, total_line_count').eq('id', quote.current_version_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    (supabase as any).from('quote_line_items').select('id, product_id, unit_price, catalog_price_amount').eq('quote_id', quote.id),
  ]);

  for (const result of [quoteDocsResult, leadDocsResult, complianceResult, versionResult, lineResult]) {
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const docs = [...(quoteDocsResult.data ?? []), ...(leadDocsResult.data ?? [])];
  const hasClearQuoteDocument = docs.some((document: any) => {
    const code = normalize(document.requirement_code);
    const type = normalize(document.doc_type);
    return CLEAR_DOCUMENT_STATUSES.has(normalize(document.status))
      && (code === 'quote_review_document' || ['waiver', 'quote_waiver', 'dispatch_defer', 'quote_review_evidence'].includes(type));
  });
  const openCompliance = (complianceResult.data ?? []).filter((item: any) => OPEN_COMPLIANCE_STATUSES.has(normalize(item.status)) || normalize(item.severity) === 'high');
  const lines = Array.isArray(lineResult.data) ? lineResult.data : [];
  const pricedLines = lines.filter((line: any) => line.product_id && (hasMoney(line.unit_price) || hasMoney(line.catalog_price_amount)));
  const pricingComplete = lines.length > 0 && pricedLines.length === lines.length;
  const approvalCleared = quote.approval_required === false || Boolean(quote.approved_at || versionResult.data?.approved_at);
  const complianceClear = hasClearQuoteDocument && openCompliance.length === 0;
  const sendReady = pricingComplete && approvalCleared && complianceClear && lines.length > 0;

  if (sendReady && quote.current_version_id) {
    const now = new Date().toISOString();
    const { error: versionUpdateError } = await mutationDb
      .from('quote_versions')
      .update({ total_line_count: lines.length, approved_at: versionResult.data?.approved_at ?? now })
      .eq('id', quote.current_version_id);
    if (versionUpdateError) return NextResponse.json({ error: versionUpdateError.message }, { status: 500 });
    await mutationDb.from('quotes').update({ approved_at: quote.approved_at ?? now, updated_at: now }).eq('organization_id', organizationId).eq('id', quote.id);
    revalidatePath('/leads');
    revalidatePath(`/leads/${quote.lead_id}`);
  }

  return NextResponse.json({
    ok: true,
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    sendReady,
    pricingComplete,
    approvalCleared,
    complianceClear,
    lineCount: lines.length,
    pricedLineCount: pricedLines.length,
    openComplianceCount: openCompliance.length,
    hasClearQuoteDocument,
  });
}
