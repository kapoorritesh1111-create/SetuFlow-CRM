import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

type Intent = { key: string; label: string; confidence: 'high' | 'medium'; suggestedAction: string };

function detectIntent(subject: string, text: string): Intent[] {
  const value = `${subject}\n${text}`.toLowerCase();
  const results: Intent[] = [];
  const add = (key: string, label: string, confidence: 'high' | 'medium', suggestedAction: string) => {
    if (!results.some((item) => item.key === key)) results.push({ key, label, confidence, suggestedAction });
  };
  if (/\b(rfq|request for quote|quotation|please quote|price for|pricing for)\b/.test(value)) add('rfq', 'RFQ / pricing request', 'high', 'Review and create a quote');
  if (/\b(purchase order|\bpo\b|attached po|po number|order confirmation)\b/.test(value)) add('purchase_order', 'Purchase order', 'high', 'Review against the related quote or order');
  if (/\b(approved|accept(?:ed)?|proceed|go ahead|confirmed)\b/.test(value) && /\b(quote|quotation|proposal|price)\b/.test(value)) add('quote_acceptance', 'Quote acceptance', 'high', 'Review before converting the quote to an order');
  if (/\b(follow up|following up|checking in|any update|status update|haven't heard|have not heard)\b/.test(value)) add('follow_up', 'Follow-up signal', 'medium', 'Review the conversation and plan the next follow-up');
  if (/\b(delay|delayed|late|postpone|cannot meet|can't meet|shortage|issue with production)\b/.test(value)) add('execution_risk', 'Execution risk', 'high', 'Review the order or execution timeline');
  if (/\b(sample|samples|send sample|sample order)\b/.test(value)) add('sample_request', 'Sample request', 'medium', 'Review lead and sample requirements');
  return results.slice(0, 4);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const supabase = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const [{ data: grant }, { data: mailbox }] = await Promise.all([
    supabase.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    supabase.from('mail_mailboxes').select('id,address').eq('organization_id', organizationId).eq('user_id', workspace.user.id).eq('status', 'active').limit(1).maybeSingle(),
  ]);
  if (!grant?.enabled) return NextResponse.json({ error: 'Setu Mail is not enabled for this organization.' }, { status: 403 });
  if (!mailbox) return NextResponse.json({ error: 'Mailbox not found.' }, { status: 404 });

  const { data: message } = await supabase.from('mail_messages')
    .select('id,direction,from_address,to_addresses,subject,text_body')
    .eq('id', params.id)
    .eq('mailbox_id', mailbox.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const peerAddress = String(message.direction === 'inbound' ? message.from_address : message.to_addresses?.[0] ?? '').trim().toLowerCase();
  let crmMatch = null;
  if (peerAddress) {
    const { data: lead } = await supabase.from('leads')
      .select('id,lead_type,company_name,contact_name,email,stage_id,owner_user_id')
      .eq('organization_id', organizationId)
      .ilike('email', peerAddress)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lead) crmMatch = { type: 'lead', ...lead, href: `/leads/${lead.id}` };
  }

  return NextResponse.json({
    messageId: message.id,
    peerAddress,
    crmMatch,
    intents: detectIntent(String(message.subject ?? ''), String(message.text_body ?? '')),
    autonomousActions: false,
  });
}
