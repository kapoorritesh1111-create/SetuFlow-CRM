'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

import { fetchInteraktContacts } from '@/features/integrations/interakt/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const TEST_PATH = '/integrations/interakt-test';

function normalizeOptionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error('The Interakt date filter is invalid.');
  return date.toISOString();
}

async function requireStarkPackmateAdmin() {
  const workspace = await requireAdminWorkspace();
  const org = workspace.organization;
  const isStark = org?.id === STARK_PACKMATE_ORG_ID || String(org?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark) throw new Error('This Interakt test connector is restricted to the Stark Packmate organization.');
  return workspace;
}

export async function previewStarkInteraktContacts(input?: { createdAfter?: string | null; limit?: number }) {
  await requireStarkPackmateAdmin();
  return fetchInteraktContacts({ offset: 0, limit: Math.min(Math.max(input?.limit ?? 25, 1), 100), createdAfter: input?.createdAfter ?? null });
}

export async function stageStarkInteraktContacts(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error('Supabase service role is required for the isolated staging write.');

  const createdAfter = normalizeOptionalDate(formData.get('createdAfter'));
  const requestedLimit = Number(formData.get('limit') ?? 25);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 25;
  const result = await fetchInteraktContacts({ offset: 0, limit, createdAfter });
  if (result.contacts.length === 0) {
    revalidatePath(TEST_PATH);
    return;
  }

  const batchId = randomUUID();
  const now = new Date().toISOString();
  const rows = result.contacts.map((contact) => ({
    organization_id: workspace.organization!.id,
    source_provider: 'interakt',
    source_account: 'stark-packmate',
    external_contact_id: contact.externalContactId,
    external_user_id: contact.externalUserId,
    phone_number: contact.phoneNumber,
    country_code: contact.countryCode,
    full_phone_number: contact.fullPhoneNumber,
    contact_name: contact.contactName,
    email: contact.email,
    whatsapp_opted_in: contact.whatsappOptedIn,
    source_created_at: contact.sourceCreatedAt,
    source_modified_at: contact.sourceModifiedAt,
    source_created_via: contact.sourceCreatedVia,
    traits: contact.traits,
    raw_payload: contact.rawPayload,
    intake_status: 'staged',
    sync_batch_id: batchId,
    fetched_at: now,
    updated_at: now,
  }));

  const { error } = await (admin as any).from('lead_intake_staging').upsert(rows, { onConflict: 'organization_id,source_provider,external_contact_id' });
  if (error) {
    if (String(error.code ?? '') === '42P01') throw new Error('The lead_intake_staging migration has not been applied to this database. No lead data was written.');
    throw new Error(`Interakt staging write failed: ${String(error.message ?? 'unknown database error')}`);
  }
  revalidatePath(TEST_PATH);
}

export async function readStagedStarkInteraktContacts(limit = 50) {
  const workspace = await requireStarkPackmateAdmin();
  const db: any = await createClient();
  const { data, error } = await db
    .from('lead_intake_staging')
    .select('id, external_contact_id, external_user_id, contact_name, email, full_phone_number, whatsapp_opted_in, source_created_at, source_modified_at, source_created_via, traits, intake_status, sync_batch_id, fetched_at')
    .eq('organization_id', workspace.organization!.id)
    .eq('source_provider', 'interakt')
    .order('fetched_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) {
    if (String(error.code ?? '') === '42P01') return { rows: [], tableReady: false, error: null };
    return { rows: [], tableReady: true, error: String(error.message ?? 'Unable to read Interakt staging data.') };
  }
  return { rows: data ?? [], tableReady: true, error: null };
}
