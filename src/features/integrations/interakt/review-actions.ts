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
