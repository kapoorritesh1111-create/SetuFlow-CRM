import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export async function GET(request: NextRequest, { params }: { params: { token: string; attachmentId: string } }) {
  const limit = await checkRateLimit(publicRateLimitKey('design-attachment', request), 60, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

  const token = String(params.token || '').trim();
  const attachmentId = String(params.attachmentId || '').trim();
  if (!token || !attachmentId) return NextResponse.json({ error: 'Attachment link is invalid.' }, { status: 400 });

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return NextResponse.json({ error: 'Service unavailable.' }, { status: 500 });

  const { data: lines } = await admin
    .from('quote_line_items')
    .select('id,quote_id')
    .contains('input_snapshot_json', { design_request: { customer_review_token: token } })
    .limit(1);
  const line = lines?.[0];
  if (!line?.quote_id) return NextResponse.json({ error: 'Design review link not found.' }, { status: 404 });

  const { data: quote } = await admin
    .from('quotes')
    .select('organization_id,lead_id')
    .eq('id', line.quote_id)
    .maybeSingle();
  if (!quote?.lead_id) return NextResponse.json({ error: 'Design review link not found.' }, { status: 404 });

  const { data: attachment, error } = await admin
    .from('lead_attachments')
    .select('id,storage_path,file_name,mime_type,legacy_file_url,attachment_type')
    .eq('id', attachmentId)
    .eq('organization_id', quote.organization_id)
    .eq('lead_id', quote.lead_id)
    .in('attachment_type', ['customer_artwork','design_in_progress'])
    .maybeSingle();
  if (error || !attachment?.id) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 });

  const legacyUrl = String(attachment.legacy_file_url || '').trim();
  if (legacyUrl.startsWith('https://') || legacyUrl.startsWith('http://')) return NextResponse.redirect(legacyUrl, 302);
  if (legacyUrl.startsWith('/')) return NextResponse.redirect(new URL(legacyUrl, request.nextUrl.origin), 302);

  if (attachment.storage_path) {
    const { data, error: signError } = await admin.storage.from('lead-attachments').createSignedUrl(attachment.storage_path, 60 * 10);
    if (signError || !data?.signedUrl) return NextResponse.json({ error: 'Could not open this attachment.' }, { status: 500 });
    return NextResponse.redirect(data.signedUrl, 302);
  }

  return NextResponse.json({ error: 'This attachment does not have an accessible file.' }, { status: 404 });
}
