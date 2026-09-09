import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const MANAGEMENT_ROLES = new Set(['owner', 'admin', 'manager']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function routeLeadId(sourcePath: string) {
  const pathname = sourcePath.split('?')[0] || '';
  const match = pathname.match(/^\/leads\/([0-9a-f-]{36})(?:\/|$)/i);
  return match?.[1] ?? null;
}

function routeIntakeId(sourcePath: string) {
  try {
    const parsed = new URL(sourcePath, 'https://setuflow.local');
    const review = parsed.searchParams.get('review');
    return review && /^[0-9a-f-]{36}$/i.test(review) ? review : null;
  } catch {
    return null;
  }
}

async function resolveTargets(db: any, organizationId: string, userId: string, canSeeAll: boolean, phone: string, sourcePath: string) {
  let leadId = routeLeadId(sourcePath);
  let intakeId = sourcePath.includes('/leads/inbound') ? routeIntakeId(sourcePath) : null;

  if (leadId) {
    let query = db.from('leads').select('id, owner_user_id').eq('organization_id', organizationId).eq('id', leadId);
    if (!canSeeAll) query = query.eq('owner_user_id', userId);
    const { data } = await query.maybeSingle();
    leadId = data?.id ?? null;
  }

  if (intakeId) {
    let query = db.from('lead_intake_staging').select('id, setu_assigned_user_id').eq('organization_id', organizationId).eq('id', intakeId);
    if (!canSeeAll) query = query.eq('setu_assigned_user_id', userId);
    const { data } = await query.maybeSingle();
    intakeId = data?.id ?? null;
  }

  if (!leadId && phone) {
    let query = db.from('leads')
      .select('id, owner_user_id')
      .eq('organization_id', organizationId)
      .or(`phone.eq.${phone},whatsapp_number.eq.${phone}`)
      .limit(1);
    if (!canSeeAll) query = query.eq('owner_user_id', userId);
    const { data } = await query.maybeSingle();
    leadId = data?.id ?? null;
  }

  if (!intakeId && phone) {
    let query = db.from('lead_intake_staging')
      .select('id, setu_assigned_user_id')
      .eq('organization_id', organizationId)
      .eq('full_phone_number', phone)
      .order('last_inbound_at', { ascending: false, nullsFirst: false })
      .limit(1);
    if (!canSeeAll) query = query.eq('setu_assigned_user_id', userId);
    const { data } = await query.maybeSingle();
    intakeId = data?.id ?? null;
  }

  return { leadId, intakeId };
}

async function addTimelineEvent(db: any, input: {
  organizationId: string;
  userId: string;
  leadId: string | null;
  intakeId: string | null;
  kind: 'call_started' | 'call_completed';
  message: string;
  payload: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  if (input.leadId) {
    await db.from('lead_activities').insert({
      organization_id: input.organizationId,
      lead_id: input.leadId,
      actor_user_id: input.userId,
      kind: input.kind,
      message: input.message,
      occurred_at: now,
    });
  }
  if (input.intakeId) {
    await db.from('lead_intake_messages').insert({
      organization_id: input.organizationId,
      intake_id: input.intakeId,
      provider: 'setu_flow',
      external_message_id: `setu-call:${randomUUID()}`,
      event_type: input.kind,
      direction: 'system',
      actor_type: 'agent',
      actor_name: null,
      message_type: 'Call',
      message_text: input.message,
      message_payload: input.payload,
      sent_at: now,
      status: 'logged',
      updated_at: now,
    });
  }
}

export async function POST(request: Request) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.user || !workspace.membership) {
    return NextResponse.json({ error: 'Workspace access required.' }, { status: 401 });
  }

  const db: any = createAdminSupabaseClient();
  if (!db) return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 503 });

  const roles = workspace.currentRoles.map((role) => String(role).toLowerCase());
  const canSeeAll = Boolean(workspace.canAccessAdmin) || roles.some((role) => MANAGEMENT_ROLES.has(role));
  const body = await request.json().catch(() => ({}));
  const action = clean(body.action);

  if (action === 'start') {
    const phone = clean(body.phone);
    const dialerHref = clean(body.dialerHref);
    const sourcePath = clean(body.sourcePath);
    if (!phone || !dialerHref.startsWith('tel:')) return NextResponse.json({ error: 'Valid call target required.' }, { status: 400 });

    const { leadId, intakeId } = await resolveTargets(db, workspace.organization.id, workspace.user.id, canSeeAll, phone, sourcePath);
    const startedAt = new Date().toISOString();
    const { data: callLog, error } = await db.from('crm_call_logs').insert({
      organization_id: workspace.organization.id,
      lead_id: leadId,
      intake_id: intakeId,
      actor_user_id: workspace.user.id,
      phone,
      source_path: sourcePath || null,
      dialer_href: dialerHref,
      status: 'initiated',
      started_at: startedAt,
      updated_at: startedAt,
    }).select('id, started_at').single();
    if (error || !callLog?.id) return NextResponse.json({ error: error?.message ?? 'Unable to start call log.' }, { status: 500 });

    await addTimelineEvent(db, {
      organizationId: workspace.organization.id,
      userId: workspace.user.id,
      leadId,
      intakeId,
      kind: 'call_started',
      message: `Call initiated to ${phone}.`,
      payload: { call_log_id: callLog.id, phone, source_path: sourcePath || null },
    });

    return NextResponse.json({ id: callLog.id, startedAt: callLog.started_at, leadId, intakeId });
  }

  if (action === 'complete') {
    const id = clean(body.id);
    const disposition = clean(body.disposition) || 'Completed';
    const durationSeconds = Math.max(0, Math.min(Number(body.durationSeconds ?? 0) || 0, 24 * 60 * 60));
    const notes = clean(body.notes).slice(0, 4000);
    if (!id) return NextResponse.json({ error: 'Call log ID required.' }, { status: 400 });

    const { data: callLog } = await db.from('crm_call_logs')
      .select('id, lead_id, intake_id, phone')
      .eq('id', id)
      .eq('organization_id', workspace.organization.id)
      .eq('actor_user_id', workspace.user.id)
      .maybeSingle();
    if (!callLog?.id) return NextResponse.json({ error: 'Call log not found.' }, { status: 404 });

    const completedAt = new Date().toISOString();
    const { error } = await db.from('crm_call_logs').update({
      status: 'completed',
      disposition,
      duration_seconds: durationSeconds,
      notes: notes || null,
      completed_at: completedAt,
      updated_at: completedAt,
    }).eq('id', id).eq('organization_id', workspace.organization.id).eq('actor_user_id', workspace.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationLabel = `${minutes}:${String(seconds).padStart(2, '0')}`;
    await addTimelineEvent(db, {
      organizationId: workspace.organization.id,
      userId: workspace.user.id,
      leadId: callLog.lead_id ?? null,
      intakeId: callLog.intake_id ?? null,
      kind: 'call_completed',
      message: `Call outcome: ${disposition} · Duration ${durationLabel}${notes ? ` · ${notes}` : ''}`,
      payload: { call_log_id: id, phone: callLog.phone, disposition, duration_seconds: durationSeconds, notes: notes || null },
    });

    if (callLog.lead_id) {
      await db.from('leads').update({ last_contacted_at: completedAt, updated_by: workspace.user.id }).eq('organization_id', workspace.organization.id).eq('id', callLog.lead_id);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}
