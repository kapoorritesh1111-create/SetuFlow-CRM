import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { deliverCalendarInvitations, type InviteAction } from '@/lib/calendar/invite-delivery';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Active workspace required.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || '').trim();
  const action = (['request', 'update', 'cancel'].includes(body.action) ? body.action : 'request') as InviteAction;
  if (!eventId) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });

  const db = (await createClient()) as any;
  const { data: event, error } = await db
    .from('calendar_events')
    .select('*,calendar_attendees(*)')
    .eq('id', eventId)
    .eq('organization_id', workspace.organization.id)
    .single();
  if (error || !event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const organizerEmail = String(workspace.profile?.email ?? workspace.user.email ?? '').trim();
  const organizerName = String(workspace.profile?.full_name ?? workspace.profile?.username ?? 'Setu Flow').trim();
  if (!organizerEmail) return NextResponse.json({ error: 'Organizer email is unavailable.' }, { status: 400 });

  const result = await deliverCalendarInvitations({
    db,
    event,
    organizerEmail,
    organizerName,
    origin: req.nextUrl.origin,
    action,
    force: body.force === true,
  });
  if (!result.ok && !result.partial) return NextResponse.json({ error: result.error || 'Unable to send calendar invitations.', ...result }, { status: result.error?.includes('Zoom') ? 409 : 502 });
  return NextResponse.json(result, { status: result.partial ? 207 : 200 });
}
