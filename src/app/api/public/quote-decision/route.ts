import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import { sendWebPushToUsers } from '@/lib/notifications/web-push';

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('quote-decision', request), 12, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Service is not configured.' }, { status: 500 });

  let body: { token?: string; decision?: string; signerName?: string; comment?: string; acceptedTerms?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

  const token = String(body.token ?? '').trim();
  const decision = body.decision === 'approved' || body.decision === 'revision_requested' ? body.decision : null;
  const signerName = String(body.signerName ?? '').trim().slice(0, 160);
  const comment = String(body.comment ?? '').trim().slice(0, 2500);
  if (!token || !decision) return NextResponse.json({ error: 'Missing quote link or decision.' }, { status: 400 });
  if (decision === 'approved' && (!signerName || body.acceptedTerms !== true)) {
    return NextResponse.json({ error: 'Enter your name and confirm acceptance before signing the quote.' }, { status: 400 });
  }
  if (decision === 'revision_requested' && comment.length < 3) {
    return NextResponse.json({ error: 'Please describe the revision you need.' }, { status: 400 });
  }

  const { data: quotes, error: lookupError } = await admin
    .from('quotes')
    .select('id,organization_id,lead_id,quote_number,status,created_by,current_version_id,sent_version_id,accepted_version_id,industry_metadata')
    .contains('industry_metadata', { customer_review_token: token })
    .limit(1);
  if (lookupError || !quotes?.[0]) return NextResponse.json({ error: 'Quote review link not found.' }, { status: 404 });
  const quote = quotes[0];
  const now = new Date().toISOString();
  const currentMeta = quote.industry_metadata ?? {};

  const nextMeta = {
    ...currentMeta,
    customer_quote_decision: decision,
    customer_quote_decision_at: now,
    customer_quote_signer_name: decision === 'approved' ? signerName : null,
    customer_quote_signed_at: decision === 'approved' ? now : null,
    customer_quote_revision_comment: decision === 'revision_requested' ? comment : null,
    customer_quote_revision_at: decision === 'revision_requested' ? now : null,
  };

  const { error: updateError } = await admin
    .from('quotes')
    .update({ industry_metadata: nextMeta, last_customer_response_at: now, updated_at: now })
    .eq('id', quote.id)
    .eq('organization_id', quote.organization_id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  let handoffCreated = false;
  if (decision === 'approved' && ['sent', 'accepted'].includes(String(quote.status ?? '').toLowerCase()) && quote.created_by && (quote.sent_version_id || quote.current_version_id || quote.accepted_version_id)) {
    const { error: acceptError } = await admin.rpc('app_safe_accept_sent_quote_tx', {
      p_organization_id: quote.organization_id,
      p_quote_id: quote.id,
      p_actor_user_id: quote.created_by,
      p_notes: `Customer signed electronically as ${signerName} at ${now}.`,
    });
    handoffCreated = !acceptError;
  }

  const { data: lead } = quote.lead_id
    ? await admin.from('leads').select('company_name,contact_name').eq('id', quote.lead_id).eq('organization_id', quote.organization_id).maybeSingle()
    : { data: null };
  const customerName = lead?.company_name || lead?.contact_name || 'Customer';
  const title = decision === 'approved' ? 'Customer signed quote' : 'Customer requested quote revision';
  const bodyText = decision === 'approved'
    ? `${customerName} approved and signed ${quote.quote_number || 'the quote'} as ${signerName}.`
    : `${customerName} requested a revision to ${quote.quote_number || 'the quote'}: ${comment}`;
  const actionUrl = quote.lead_id ? `/leads/${quote.lead_id}/quote?quoteId=${quote.id}` : '/quotes';

  if (quote.created_by) {
    const { error: notificationError } = await admin.from('notifications').insert({
      organization_id: quote.organization_id,
      user_id: quote.created_by,
      type: 'approval_request',
      title,
      body: bodyText,
      icon: decision === 'approved' ? 'file-check' : 'file-pen-line',
      priority: 'high',
      entity_type: 'quote',
      entity_id: quote.id,
      entity_ref: quote.quote_number || 'Quote',
      action_url: actionUrl,
      channels_sent: ['in_app', 'push'],
    });
    if (!notificationError) {
      try { await sendWebPushToUsers(admin, [quote.created_by], { title, body: bodyText, action_url: actionUrl, priority: 'high', type: 'approval_request' }, quote.organization_id); } catch {}
    }
  }

  if (quote.lead_id) {
    await admin.from('communications').insert({
      organization_id: quote.organization_id,
      lead_id: quote.lead_id,
      related_entity: 'quote',
      related_id: quote.id,
      communication_type: 'quote_message',
      direction: 'inbound',
      channel: 'web',
      subject: title,
      body: bodyText,
      summary: bodyText,
      draft_source: 'system',
      status: 'received',
      sent_at: now,
      metadata: { decision, signer_name: signerName || null, comment: comment || null, source: 'public_quote_review' },
    });
    revalidatePath(`/leads/${quote.lead_id}/quote`);
  }
  revalidatePath('/quotes');
  revalidatePath('/orders');

  return NextResponse.json({ ok: true, decision, reviewedAt: now, handoffCreated });
}
