import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) };
  const supabase = (await createClient()) as any;
  const { data: grant } = await supabase.from('org_module_grants').select('enabled').eq('organization_id', workspace.organization.id).eq('module_key', 'setu_mail').maybeSingle();
  if (!grant?.enabled) return { error: NextResponse.json({ error: 'Setu Communications is not enabled for this organization.' }, { status: 403 }) };
  return { workspace, supabase };
}

export async function GET(req: NextRequest) {
  const ctx = await context(); if ('error' in ctx) return ctx.error;
  const { workspace, supabase } = ctx;
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  let query = supabase.from('calendar_events').select('*,calendar_attendees(*),calendar_reminders(*),calendar_event_links(*)').eq('organization_id', workspace.organization!.id).order('starts_at');
  if (from) query = query.gte('starts_at', from);
  if (to) query = query.lt('starts_at', to);
  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: 'Unable to load calendar.' }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const ctx = await context(); if ('error' in ctx) return ctx.error;
  const { workspace, supabase } = ctx;
  const body = await req.json();
  const title = String(body.title ?? '').trim();
  const startsAt = new Date(body.startsAt); const endsAt = new Date(body.endsAt);
  if (!title || Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt <= startsAt) return NextResponse.json({ error: 'Add a title and valid start/end time.' }, { status: 400 });
  const organizationId = workspace.organization!.id; const userId = workspace.user!.id;
  const provider = ['zoom','custom','in_person','none'].includes(body.meetingProvider) ? body.meetingProvider : 'none';
  const { data: event, error } = await supabase.from('calendar_events').insert({ organization_id: organizationId, owner_user_id: userId, created_by: userId, title, description: body.description || null, location: body.location || null, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), timezone: body.timezone || 'UTC', is_all_day: Boolean(body.isAllDay), meeting_provider: provider, meeting_url: provider === 'custom' ? body.meetingUrl || null : null }).select('*').single();
  if (error || !event) return NextResponse.json({ error: 'Unable to create event.' }, { status: 500 });
  const attendees = Array.isArray(body.attendees) ? body.attendees.map((a: any) => ({ organization_id: organizationId, event_id: event.id, email: String(a.email ?? a).trim().toLowerCase(), name: a.name || null })).filter((a: any) => a.email.includes('@')) : [];
  if (attendees.length) await supabase.from('calendar_attendees').insert(attendees);
  await supabase.from('calendar_reminders').insert({ organization_id: organizationId, event_id: event.id, channel: 'in_app', minutes_before: Number(body.reminderMinutes ?? 15) });
  return NextResponse.json({ event }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const ctx = await context(); if ('error' in ctx) return ctx.error;
  const { workspace, supabase } = ctx; const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.description !== undefined) patch.description = body.description || null;
  if (body.location !== undefined) patch.location = body.location || null;
  if (body.startsAt) patch.starts_at = new Date(body.startsAt).toISOString();
  if (body.endsAt) patch.ends_at = new Date(body.endsAt).toISOString();
  if (body.status) patch.status = body.status;
  if (body.meetingProvider) patch.meeting_provider = body.meetingProvider;
  if (body.meetingUrl !== undefined) patch.meeting_url = body.meetingUrl || null;
  const { data, error } = await supabase.from('calendar_events').update(patch).eq('id', body.id).eq('organization_id', workspace.organization!.id).select('*').single();
  if (error) return NextResponse.json({ error: 'Unable to update event.' }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest) {
  const ctx = await context(); if ('error' in ctx) return ctx.error;
  const id = req.nextUrl.searchParams.get('id'); if (!id) return NextResponse.json({ error: 'Event id required.' }, { status: 400 });
  const { error } = await ctx.supabase.from('calendar_events').delete().eq('id', id).eq('organization_id', ctx.workspace.organization!.id);
  if (error) return NextResponse.json({ error: 'Unable to delete event.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}