import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { createZoomMeetingForEvent, updateZoomMeetingForEvent, cancelZoomMeetingForEvent } from '@/lib/calendar/zoom-lifecycle';

export const dynamic = 'force-dynamic';

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  return { workspace, db: (await createClient()) as any, organizationId: workspace.organization.id, userId: workspace.user.id };
}

async function eventFor(ctx: any, eventId: string) {
  const { data } = await ctx.db.from('calendar_events').select('*').eq('id', eventId).eq('organization_id', ctx.organizationId).maybeSingle();
  return data ?? null;
}

export async function POST(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const { eventId } = await req.json().catch(() => ({}));
  const event = await eventFor(ctx, String(eventId || ''));
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const result = await createZoomMeetingForEvent(ctx.db, ctx.organizationId, ctx.userId, event);
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: result.error?.includes('Connect Zoom') ? 409 : 502 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const { eventId } = await req.json().catch(() => ({}));
  const event = await eventFor(ctx, String(eventId || ''));
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const result = await updateZoomMeetingForEvent(ctx.db, ctx.organizationId, ctx.userId, event);
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 502 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const eventId = req.nextUrl.searchParams.get('eventId') || '';
  const event = await eventFor(ctx, eventId);
  if (!event) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  const result = await cancelZoomMeetingForEvent(ctx.db, ctx.organizationId, ctx.userId, event);
  return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 502 });
}
