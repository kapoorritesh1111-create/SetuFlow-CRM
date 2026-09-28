'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SUPPORTED_PROVIDERS = ['interakt', 'indiamart'];
const INBOUND_PATH = '/leads/inbound';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales', 'field_sales']);
const MANAGER_ROLES = new Set(['owner', 'admin', 'manager']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

async function requireStarkPackmateSalesAccess() {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const user = workspace.user;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID
    || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !user || !organization) throw new Error('This inbound connector is restricted to Stark Packmate.');
  if (!workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) throw new Error('Sales, Field Sales, Manager, Admin or Owner permission is required.');
  return { workspace, organization, user };
}

export async function logStarkInteraktCall(formData: FormData): Promise<void> {
  const { workspace, organization, user } = await requireStarkPackmateSalesAccess();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const rowId = clean(formData.get('rowId'));
  const disposition = clean(formData.get('disposition')) || 'Called';
  const duration = clean(formData.get('duration'));
  const notes = clean(formData.get('notes'));
  if (!rowId) throw new Error('Inbound inquiry is required.');

  const { data: intake, error: intakeError } = await db.from('lead_intake_staging')
    .select('id, full_phone_number, source_provider')
    .eq('id', rowId)
    .eq('organization_id', organization.id)
    .in('source_provider', SUPPORTED_PROVIDERS)
    .maybeSingle();
  if (intakeError || !intake?.id) throw new Error('Inbound inquiry not found.');

  const now = new Date().toISOString();
  const summary = [disposition, duration ? `Duration: ${duration}` : null, notes || null].filter(Boolean).join('\n');
  const actorName = workspace.profile?.full_name ?? user.email ?? 'Setu Flow user';
  const provider = clean(intake.source_provider).toLowerCase() || 'interakt';

  const { error } = await db.from('lead_intake_messages').insert({
    organization_id: organization.id,
    intake_id: intake.id,
    provider,
    external_message_id: `setu-call:${randomUUID()}`,
    event_type: 'call_logged',
    direction: 'system',
    actor_type: 'agent',
    actor_name: actorName,
    message_type: 'Call',
    message_text: summary,
    message_payload: {
      disposition,
      duration: duration || null,
      notes: notes || null,
      phone: intake.full_phone_number ?? null,
      actor_user_id: user.id,
      source_provider: provider,
    },
    sent_at: now,
    status: 'logged',
    updated_at: now,
  });
  if (error) throw new Error(`Unable to log call: ${String(error.message ?? 'unknown database error')}`);

  await db.from('lead_intake_staging')
    .update({ source_modified_at: now, updated_at: now })
    .eq('id', rowId)
    .eq('organization_id', organization.id)
    .in('source_provider', SUPPORTED_PROVIDERS);

  revalidatePath(INBOUND_PATH);
}


async function requireOwnedInboundRow(db: any, organizationId: string, userId: string, workspace: any, rowId: string) {
  const { data: intake, error } = await db.from('lead_intake_staging')
    .select('id,setu_assigned_user_id,person_name,contact_name,company_name,source_provider')
    .eq('id', rowId)
    .eq('organization_id', organizationId)
    .in('source_provider', SUPPORTED_PROVIDERS)
    .maybeSingle();
  if (error || !intake?.id) throw new Error('Inbound inquiry not found.');
  const canManageAll = workspace.currentRoles.some((role: string) => MANAGER_ROLES.has(clean(role).toLowerCase()));
  if (!canManageAll && clean(intake.setu_assigned_user_id) !== userId) throw new Error('This inbound inquiry is assigned to another Sales user.');
  return intake;
}

async function logFollowUpEvent(db: any, organizationId: string, intake: any, user: any, workspace: any, eventType: string, text: string) {
  const now = new Date().toISOString();
  const actorName = workspace.profile?.full_name ?? user.email ?? 'Setu Flow user';
  await db.from('lead_intake_messages').insert({
    organization_id: organizationId,
    intake_id: intake.id,
    provider: clean(intake.source_provider).toLowerCase() || 'interakt',
    external_message_id: `setu-follow-up:${randomUUID()}`,
    event_type: eventType,
    direction: 'system',
    actor_type: 'agent',
    actor_name: actorName,
    message_type: 'Follow-up',
    message_text: text,
    message_payload: { actor_user_id: user.id },
    sent_at: now,
    status: 'logged',
    updated_at: now,
  });
}

export async function createOrRescheduleInboundFollowUp(formData: FormData): Promise<void> {
  const { workspace, organization, user } = await requireStarkPackmateSalesAccess();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const rowId = clean(formData.get('rowId'));
  const scheduledAtRaw = clean(formData.get('scheduledAt'));
  const reason = clean(formData.get('reason'));
  const notesRaw = clean(formData.get('notes'));
  if (!rowId || !scheduledAtRaw) throw new Error('Follow-up date and time are required.');

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Choose a valid follow-up date and time.');
  if (scheduledAt.getTime() <= Date.now() + 60 * 1000) throw new Error('Follow-up must be scheduled at least 1 minute in the future.');

  const intake = await requireOwnedInboundRow(db, organization.id, user.id, workspace, rowId);
  const notes = [reason, notesRaw].filter(Boolean).join(' — ') || 'Follow up with customer';

  await db.from('inbound_follow_ups')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('organization_id', organization.id)
    .eq('inbound_staging_id', rowId)
    .eq('assigned_user_id', user.id)
    .eq('status', 'scheduled');

  const { error } = await db.from('inbound_follow_ups').insert({
    organization_id: organization.id,
    inbound_staging_id: rowId,
    assigned_user_id: user.id,
    scheduled_at: scheduledAt.toISOString(),
    status: 'scheduled',
    notes,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Unable to schedule follow-up: ${String(error.message ?? 'unknown database error')}`);

  await logFollowUpEvent(
    db,
    organization.id,
    intake,
    user,
    workspace,
    'follow_up_scheduled',
    `Follow-up scheduled for ${scheduledAt.toISOString()}: ${notes}`,
  );

  revalidatePath(INBOUND_PATH);
}

export async function completeInboundFollowUp(formData: FormData): Promise<void> {
  const { workspace, organization, user } = await requireStarkPackmateSalesAccess();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const rowId = clean(formData.get('rowId'));
  const followUpId = clean(formData.get('followUpId'));
  if (!rowId || !followUpId) throw new Error('Follow-up is required.');

  const intake = await requireOwnedInboundRow(db, organization.id, user.id, workspace, rowId);
  const now = new Date().toISOString();
  const { data, error } = await db.from('inbound_follow_ups')
    .update({ status: 'completed', completed_at: now, updated_at: now })
    .eq('id', followUpId)
    .eq('organization_id', organization.id)
    .eq('inbound_staging_id', rowId)
    .eq('assigned_user_id', user.id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle();
  if (error || !data?.id) throw new Error('Unable to complete this follow-up.');

  await logFollowUpEvent(db, organization.id, intake, user, workspace, 'follow_up_completed', 'Follow-up marked completed.');
  revalidatePath(INBOUND_PATH);
}
