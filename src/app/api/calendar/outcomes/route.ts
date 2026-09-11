import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

type Signal = { key: string; label: string };
type SuggestedAction = { key: string; label: string; href: string };

const RULES: Array<[string, RegExp, string]> = [
  ['quote', /\b(quote|pricing|price|revised price)\b/i, 'Review quote'],
  ['sample', /\b(sample|samples|prototype|proof)\b/i, 'Create sample follow-up'],
  ['follow_up', /\b(follow up|follow-up|call back|email them|send them|next step)\b/i, 'Create follow-up'],
  ['order', /\b(order|po|purchase order)\b/i, 'Review order'],
];

function actionsFor(signals: Signal[], links: any[]): SuggestedAction[] {
  const lead = links.find(link => link.entity_type === 'lead');
  const quote = links.find(link => link.entity_type === 'quote');
  const order = links.find(link => link.entity_type === 'order');
  const thread = links.find(link => link.entity_type === 'mail_thread');
  const actions: SuggestedAction[] = [];

  if (signals.some(signal => signal.key === 'follow_up' || signal.key === 'sample')) {
    actions.push({ key: 'schedule_follow_up', label: 'Schedule follow-up', href: `/calendar?compose=1${lead?.entity_id ? `&lead=${encodeURIComponent(lead.entity_id)}` : ''}` });
  }
  if (signals.some(signal => signal.key === 'quote')) actions.push({ key: 'review_quote', label: 'Review quote', href: quote?.entity_id ? '/quotes' : lead?.entity_id ? `/leads/${lead.entity_id}` : '/quotes' });
  if (signals.some(signal => signal.key === 'order')) actions.push({ key: 'review_order', label: 'Review order', href: order?.entity_id ? '/orders' : lead?.entity_id ? `/leads/${lead.entity_id}` : '/orders' });
  if (thread?.entity_id) actions.push({ key: 'open_mail', label: 'Open related Mail', href: '/mail' });
  if (lead?.entity_id && !actions.some(action => action.href === `/leads/${lead.entity_id}`)) actions.push({ key: 'open_customer', label: 'Open CRM record', href: `/leads/${lead.entity_id}` });
  return actions.slice(0, 4);
}

export async function POST(req: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || '').trim();
  const notes = String(body.notes ?? '').trim().slice(0, 4000);
  if (!eventId || !notes) return NextResponse.json({ error: 'Meeting and notes are required.' }, { status: 400 });

  const db = (await createClient()) as any;
  const { data: event, error: readError } = await db
    .from('calendar_events')
    .select('id,title,description,status,owner_user_id,created_by,meeting_metadata,calendar_event_links(entity_type,entity_id,label)')
    .eq('id', eventId)
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();
  if (readError || !event) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
  if (event.owner_user_id !== workspace.user.id && event.created_by !== workspace.user.id) return NextResponse.json({ error: 'Only the meeting organizer can capture the outcome.' }, { status: 403 });
  if (event.status === 'cancelled') return NextResponse.json({ error: 'A cancelled meeting cannot be completed.' }, { status: 409 });

  const signals: Signal[] = [];
  for (const [key, expression, label] of RULES) if (expression.test(notes)) signals.push({ key, label });
  const capturedAt = new Date().toISOString();
  const existingMetadata = event.meeting_metadata && typeof event.meeting_metadata === 'object' && !Array.isArray(event.meeting_metadata) ? event.meeting_metadata : {};
  const meetingMetadata = {
    ...existingMetadata,
    outcome_notes: notes,
    outcome_signals: signals,
    captured_at: capturedAt,
    outcome_captured_by: workspace.user.id,
  };

  const { error: updateError } = await db.from('calendar_events').update({
    description: [event.description, `Meeting outcome: ${notes}`].filter(Boolean).join('\n\n'),
    status: 'completed',
    meeting_metadata: meetingMetadata,
    updated_at: capturedAt,
  }).eq('id', event.id).eq('organization_id', workspace.organization.id);
  if (updateError) return NextResponse.json({ error: 'Unable to save meeting outcome.' }, { status: 500 });

  const links = Array.isArray(event.calendar_event_links) ? event.calendar_event_links : [];
  return NextResponse.json({
    ok: true,
    signals,
    suggestedActions: actionsFor(signals, links),
    autonomousActions: false,
    message: 'Outcome saved. Review any suggested next action before applying it.',
  });
}
