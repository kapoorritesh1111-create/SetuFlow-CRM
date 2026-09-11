import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

type ContextItem = { type: string; id: string; label: string; subtitle?: string | null; href: string };

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const { data: event, error } = await db
    .from('calendar_events')
    .select('id,title,description,location,starts_at,ends_at,timezone,status,meeting_provider,meeting_url,meeting_metadata,calendar_attendees(email,name,attendee_type,rsvp_status),calendar_event_links(entity_type,entity_id,label)')
    .eq('organization_id', organizationId)
    .eq('id', params.id)
    .maybeSingle();
  if (error || !event) return NextResponse.json({ error: 'Calendar event not found.' }, { status: 404 });

  const links = Array.isArray(event.calendar_event_links) ? event.calendar_event_links : [];
  const context: ContextItem[] = [];
  const leadIds = links.filter((link: any) => link.entity_type === 'lead').map((link: any) => link.entity_id);
  const quoteIds = links.filter((link: any) => link.entity_type === 'quote').map((link: any) => link.entity_id);
  const orderIds = links.filter((link: any) => link.entity_type === 'order').map((link: any) => link.entity_id);
  const threadIds = links.filter((link: any) => link.entity_type === 'mail_thread').map((link: any) => link.entity_id);

  const [leadResult, quoteResult, orderResult, threadResult] = await Promise.all([
    leadIds.length ? db.from('leads').select('id,lead_type,company_name,contact_name,email').eq('organization_id', organizationId).in('id', leadIds) : Promise.resolve({ data: [] }),
    quoteIds.length ? db.from('quotes').select('id,quote_number,status').eq('organization_id', organizationId).in('id', quoteIds) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('orders').select('id,order_number,status').eq('organization_id', organizationId).in('id', orderIds) : Promise.resolve({ data: [] }),
    threadIds.length ? db.from('mail_threads').select('id,subject,participants').eq('organization_id', organizationId).in('id', threadIds) : Promise.resolve({ data: [] }),
  ]);

  for (const lead of leadResult.data ?? []) context.push({ type: 'lead', id: lead.id, label: lead.company_name || lead.contact_name || lead.email || 'CRM record', subtitle: lead.lead_type ? `${String(lead.lead_type).replace('_', ' ')} · ${lead.contact_name || lead.email || ''}`.replace(/ · $/, '') : lead.contact_name || lead.email || null, href: `/leads/${lead.id}` });
  for (const quote of quoteResult.data ?? []) context.push({ type: 'quote', id: quote.id, label: quote.quote_number ? `Quote ${quote.quote_number}` : 'Quote', subtitle: quote.status || null, href: '/quotes' });
  for (const order of orderResult.data ?? []) context.push({ type: 'order', id: order.id, label: order.order_number ? `Order ${order.order_number}` : 'Order', subtitle: order.status || null, href: '/orders' });
  for (const thread of threadResult.data ?? []) context.push({ type: 'mail_thread', id: thread.id, label: thread.subject || 'Related Mail conversation', subtitle: Array.isArray(thread.participants) ? thread.participants.slice(0, 3).join(', ') : null, href: '/mail' });

  for (const link of links) {
    if (context.some(item => item.type === link.entity_type && item.id === link.entity_id)) continue;
    const href = link.entity_type === 'task' ? '/tasks' : link.entity_type === 'trade_event' ? '/trade-events' : '/dashboard';
    context.push({ type: link.entity_type, id: link.entity_id, label: link.label || String(link.entity_type).replace('_', ' '), href });
  }

  const metadata = event.meeting_metadata && typeof event.meeting_metadata === 'object' && !Array.isArray(event.meeting_metadata) ? event.meeting_metadata : {};
  return NextResponse.json({
    event,
    context,
    outcome: metadata.outcome_notes ? { notes: metadata.outcome_notes, signals: metadata.outcome_signals ?? [], capturedAt: metadata.captured_at ?? null } : null,
    autonomousActions: false,
  });
}
