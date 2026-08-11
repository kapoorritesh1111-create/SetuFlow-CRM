'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const INBOUND_PATH = '/leads/inbound';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

async function requireStarkPackmateSalesAccess() {
  const workspace = await requireWorkspace();
  const isStark = workspace.organization?.id === STARK_PACKMATE_ORG_ID
    || String(workspace.organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !workspace.user || !workspace.organization) throw new Error('This Interakt connector is restricted to Stark Packmate.');
  if (!workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) throw new Error('Sales, Manager, Admin or Owner permission is required.');
  return workspace;
}

export async function logStarkInteraktCall(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateSalesAccess();
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const rowId = clean(formData.get('rowId'));
  const disposition = clean(formData.get('disposition')) || 'Called';
  const duration = clean(formData.get('duration'));
  const notes = clean(formData.get('notes'));
  if (!rowId) throw new Error('Inbound inquiry is required.');

  const { data: intake, error: intakeError } = await db.from('lead_intake_staging')
    .select('id, full_phone_number')
    .eq('id', rowId)
    .eq('organization_id', workspace.organization.id)
    .eq('source_provider', SOURCE_PROVIDER)
    .maybeSingle();
  if (intakeError || !intake?.id) throw new Error('Inbound inquiry not found.');

  const now = new Date().toISOString();
  const summary = [disposition, duration ? `Duration: ${duration}` : null, notes || null].filter(Boolean).join('\n');
  const actorName = workspace.profile?.full_name ?? workspace.user.email ?? 'Setu Flow user';

  const { error } = await db.from('lead_intake_messages').insert({
    organization_id: workspace.organization.id,
    intake_id: intake.id,
    provider: SOURCE_PROVIDER,
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
      actor_user_id: workspace.user.id,
    },
    sent_at: now,
    status: 'logged',
    updated_at: now,
  });
  if (error) throw new Error(`Unable to log call: ${String(error.message ?? 'unknown database error')}`);

  await db.from('lead_intake_staging')
    .update({ source_modified_at: now, updated_at: now })
    .eq('id', rowId)
    .eq('organization_id', workspace.organization.id)
    .eq('source_provider', SOURCE_PROVIDER);

  revalidatePath(INBOUND_PATH);
}
