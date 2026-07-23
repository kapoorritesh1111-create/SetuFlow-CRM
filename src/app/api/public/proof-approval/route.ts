import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';
import { getPackagingProofByToken } from '@/lib/packaging/queries';

/**
 * S27-STARK-D3 — Public proof approve/reject. No authentication — access is
 * gated entirely by possession of the long random approval_token, which is
 * the ONLY value used to locate the row. Every write is scoped by an exact
 * .eq('approval_token', token) match against the admin client; there is no
 * broader query anywhere in this path. Rate-limited per IP to slow abuse.
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

  const comment = String(body.comment ?? '').slice(0, 2000);
  const { error } = await admin
    .from('packaging_proofs')
    .update({ status: decision, reviewed_at: new Date().toISOString(), review_comment: comment || null })
    .eq('approval_token', token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // S27-STARK-RETEST-05 fix: the Design Queue reads a static
  // input_snapshot_json.input.artwork_status field, not the proof's own
  // approval state — the two were never kept in sync, so an approved proof
  // never removed its job from the queue. Only do this on approval, and
  // only advance forward (never regress a status the team already set to
  // something further along, e.g. if they'd manually marked it beyond
  // print_ready already for an unrelated reason).
  if (decision === 'approved') {
    const { data: line } = await admin
      .from('quote_line_items')
      .select('id, input_snapshot_json')
      .eq('id', proof.quote_line_item_id)
      .eq('organization_id', proof.organization_id)
      .maybeSingle();
    if (line) {
      const snapshot = line.input_snapshot_json ?? {};
      const input = snapshot.input ?? {};
      if (input.artwork_status !== 'print_ready') {
        await admin
          .from('quote_line_items')
          .update({ input_snapshot_json: { ...snapshot, input: { ...input, artwork_status: 'print_ready' } } })
          .eq('id', proof.quote_line_item_id)
          .eq('organization_id', proof.organization_id);
      }
    }
  }

  return NextResponse.json({ ok: true, status: decision });
}
