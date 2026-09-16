import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import { getPackagingProofByToken } from '@/lib/packaging/queries';
import { sendWebPushToUsers } from '@/lib/notifications/web-push';

/**
 * Public proof approve/reject endpoint.
 *
 * Possession of the long random approval token is the credential. A superseded
 * proof cannot be approved after a newer version has been uploaded. Quote-line
 * ownership is checked through the parent quote because quote_line_items does
 * not carry organization_id directly.
 */
export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('proof-approval', request), 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Service is not configured.' }, { status: 500 });

  let body: { token?: string; decision?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const token = String(body.token ?? '').trim();
  const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null;
  if (!token || !decision) return NextResponse.json({ error: 'Missing token or decision.' }, { status: 400 });

  const proof = await getPackagingProofByToken(token, admin);
  if (!proof) return NextResponse.json({ error: 'Approval link not found.' }, { status: 404 });
  if (new Date(proof.token_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This approval link has expired. Ask your contact to send a new one.' }, { status: 410 });
  }

  const { data: latestProof, error: latestError } = await admin
    .from('packaging_proofs')
    .select('id, version')
    .eq('organization_id', proof.organization_id)
    .eq('quote_line_item_id', proof.quote_line_item_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return NextResponse.json({ error: latestError.message }, { status: 500 });
  if (latestProof?.id && latestProof.id !== proof.id) {
    return NextResponse.json({ error: 'A newer design version is available. Use the latest approval link.' }, { status: 409 });
  }

  const { data: line, error: lineError } = await admin
    .from('quote_line_items')
    .select('id, quote_id, input_snapshot_json')
    .eq('id', proof.quote_line_item_id)
    .maybeSingle();
  if (lineError) return NextResponse.json({ error: lineError.message }, { status: 500 });
  if (!line?.id) return NextResponse.json({ error: 'The linked quote line no longer exists.' }, { status: 404 });

  const { data: quote, error: quoteError } = await admin
    .from('quotes')
    .select('id, lead_id, quote_number')
    .eq('id', line.quote_id)
    .eq('organization_id', proof.organization_id)
    .maybeSingle();
  if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 500 });
  if (!quote?.id) return NextResponse.json({ error: 'The linked quote is not available.' }, { status: 404 });

  const { data: lead } = quote.lead_id
    ? await admin.from('leads').select('company_name').eq('id', quote.lead_id).eq('organization_id', proof.organization_id).maybeSingle()
    : { data: null };

  const comment = String(body.comment ?? '').slice(0, 2000);
  const now = new Date().toISOString();
  const { error } = await admin
    .from('packaging_proofs')
    .update({ status: decision, reviewed_at: now, review_comment: comment || null })
    .eq('id', proof.id)
    .eq('approval_token', token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const snapshot = line.input_snapshot_json ?? {};
  const input = snapshot.input ?? {};
  const designRequest = snapshot.design_request ?? {};
  const assignedDesignerId = String(designRequest.assigned_to ?? '').trim() || null;
  const nextSnapshot = {
    ...snapshot,
    input: decision === 'approved' ? { ...input, artwork_status: 'print_ready' } : input,
    design_request: {
      ...designRequest,
      status: decision === 'approved' ? 'approved' : 'changes_requested',
      customer_reviewed_at: now,
      customer_review_comment: comment || null,
      customer_review_decision: decision,
    },
  };
  await admin.from('quote_line_items').update({ input_snapshot_json: nextSnapshot }).eq('id', line.id).eq('quote_id', quote.id);

  if (assignedDesignerId) {
    const title = decision === 'approved' ? 'Design approved by customer' : 'Customer requested design changes';
    const company = lead?.company_name || 'Customer';
    const bodyText = decision === 'approved'
      ? `${company} approved proof v${proof.version}${quote.quote_number ? ` for ${quote.quote_number}` : ''}. The approved artwork can move toward production.`
      : `${company} requested changes to proof v${proof.version}${comment ? `: ${comment}` : '.'}`;
    const actionUrl = `/design-queue?lineId=${line.id}`;
    const { error: notificationError } = await admin.from('notifications').insert({
      organization_id: proof.organization_id,
      user_id: assignedDesignerId,
      type: 'approval_request',
      title,
      body: bodyText,
      icon: decision === 'approved' ? 'badge-check' : 'rotate-ccw',
      priority: 'high',
      entity_type: 'approval',
      entity_id: proof.id,
      entity_ref: quote.quote_number || `Proof v${proof.version}`,
      action_url: actionUrl,
      channels_sent: ['in_app', 'push'],
    });
    if (!notificationError) {
      try {
        await sendWebPushToUsers(admin, [assignedDesignerId], { title, body: bodyText, action_url: actionUrl, priority: 'high', type: 'approval_request' }, proof.organization_id);
      } catch {
        // In-app notification remains authoritative if push is unavailable.
      }
    }
  }

  revalidatePath('/design-queue');
  revalidatePath('/dispatch-board');
  revalidatePath('/orders');
  if (quote.lead_id) revalidatePath(`/leads/${quote.lead_id}/quote`);

  return NextResponse.json({ ok: true, status: decision, designerNotified: Boolean(assignedDesignerId) });
}
