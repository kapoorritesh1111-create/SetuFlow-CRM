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

  const now = new Date().toISOString();
  const docType = action === 'attach' ? 'quote_review_evidence' : action === 'waive' ? 'quote_waiver' : 'dispatch_defer';
  const status = action === 'attach' ? 'submitted' : 'approved';
  const fileName = action === 'attach'
    ? fileNameInput
    : action === 'waive'
      ? `Quote waiver - ${quote.quote_number ?? quote.id.slice(0, 8)}`
      : `Dispatch deferral - ${quote.quote_number ?? quote.id.slice(0, 8)}`;

  const insertPayload: Record<string, unknown> = {
    organization_id: workspace.organization.id,
    related_entity: 'quote',
    related_id: quote.id,
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
    insertPayload.reviewer_user_id = workspace.user.id;
    insertPayload.reviewed_at = now;
  }

  const { data: document, error: insertError } = await mutationDb.from('documents').insert(insertPayload).select('id').single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await mutationDb.from('audit_logs').insert({
    organization_id: workspace.organization.id,
    actor_user_id: workspace.user.id,
    action: action === 'attach' ? 'quote_compliance_evidence_attached' : action === 'waive' ? 'quote_compliance_waived' : 'quote_compliance_deferred_to_dispatch',
    entity_type: 'document',
    entity_id: document?.id ?? null,
    payload: { previous: null, new: { quote_id: quote.id, lead_id: quote.lead_id, action, status, file_name: fileName, notes }, metadata: { source: 'inline_quote_review_fix' } },
  });

  revalidatePath('/leads');
  if (quote.lead_id) revalidatePath(`/leads/${quote.lead_id}`);
  revalidatePath('/compliance');

  return NextResponse.json({
    ok: true,
    message: action === 'attach'
      ? 'Evidence attached to this quote. Stay on Review and refresh/create draft preview again.'
      : action === 'waive'
        ? 'Quote waiver saved on this quote. Stay on Review and refresh/create draft preview again.'
        : 'Dispatch deferral saved on this quote. Stay on Review and refresh/create draft preview again.',
  });
}
