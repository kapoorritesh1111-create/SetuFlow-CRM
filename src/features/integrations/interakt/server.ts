'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

import { fetchInteraktContacts } from '@/features/integrations/interakt/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const INBOUND_PATH = '/leads';
const SOURCE_PROVIDER = 'interakt';
const SOURCE_ACCOUNT = 'stark-packmate';
const TERMINAL_INBOUND_STATUSES = new Set(['qualified', 'duplicate', 'existing_customer', 'not_relevant', 'ignored']);
const ALLOWED_INTAKE_STATUSES = new Set([
  'new',
  'staged',
  'reviewed',
  'needs_info',
  'ready_to_qualify',
  'nurture',
  'not_relevant',
  'qualified',
  'duplicate',
  'existing_customer',
  'ignored',
]);

type ExistingIntakeRow = {
  external_contact_id: string;
  intake_status: string | null;
  source_created_at: string | null;
  source_modified_at: string | null;
};

async function requireStarkPackmateAdmin() {
  const workspace = await requireAdminWorkspace();
  const org = workspace.organization;
  const isStark = org?.id === STARK_PACKMATE_ORG_ID || String(org?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark) throw new Error('This Interakt connector is restricted to the Stark Packmate organization.');
  return workspace;
}

function newestSourceWatermark(rows: ExistingIntakeRow[]) {
  let newest: string | null = null;
  let newestMs = 0;
  for (const row of rows) {
    for (const candidate of [row.source_modified_at, row.source_created_at]) {
      if (!candidate) continue;
      const ms = new Date(candidate).getTime();
      if (!Number.isNaN(ms) && ms > newestMs) {
        newestMs = ms;
        newest = new Date(ms).toISOString();
      }
    }
  }
  return newest;
}

async function readExistingIntakeSnapshot(admin: any, organizationId: string) {
  const { data, error } = await admin
    .from('lead_intake_staging')
    .select('external_contact_id, intake_status, source_created_at, source_modified_at')
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .limit(5000);

  if (error) {
    if (String(error.code ?? '') === '42P01') return { rows: [] as ExistingIntakeRow[], tableReady: false };
    throw new Error(`Unable to read Interakt staging state: ${String(error.message ?? 'unknown database error')}`);
  }

  return { rows: (data ?? []) as ExistingIntakeRow[], tableReady: true };
}

export async function previewStarkInteraktContacts(input?: { createdAfter?: string | null; limit?: number }) {
  await requireStarkPackmateAdmin();
  return fetchInteraktContacts({
    offset: 0,
    limit: Math.min(Math.max(input?.limit ?? 25, 1), 100),
    createdAfter: input?.createdAfter ?? null,
  });
}

/**
 * Refresh Interakt into the isolated staging table.
 *
 * Important behavior:
 * - The page itself never needs to re-fetch all Interakt history.
 * - We use the newest staged source timestamp as an incremental watermark.
 * - The unique key (organization, provider, external_contact_id) prevents duplicate rows.
 * - Existing workflow statuses are preserved so qualified/duplicate/ignored records cannot be reactivated by a later sync.
 * - This function has no public.leads read/write path.
 */
export async function refreshStarkInteraktStaging(): Promise<void> {
  const workspace = await requireStarkPackmateAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error('Supabase service role is required for the isolated staging write.');

  const organizationId = workspace.organization!.id;
  const snapshot = await readExistingIntakeSnapshot(admin as any, organizationId);
  if (!snapshot.tableReady) {
    throw new Error('The lead_intake_staging migration has not been applied to this database. No lead data was written.');
  }

  const existingStatus = new Map(snapshot.rows.map((row) => [row.external_contact_id, row.intake_status || 'new']));
  const watermark = newestSourceWatermark(snapshot.rows);
  const contacts = [] as Awaited<ReturnType<typeof fetchInteraktContacts>>['contacts'];

  let offset = 0;
  for (let page = 0; page < 10; page += 1) {
    const result = await fetchInteraktContacts({
      offset,
      limit: 100,
      modifiedAfter: watermark,
    });
    contacts.push(...result.contacts);
    if (!result.hasNextPage || result.contacts.length === 0) break;
    offset += result.contacts.length;
  }

  if (contacts.length === 0) {
    revalidatePath(INBOUND_PATH);
    return;
  }

  const batchId = randomUUID();
  const now = new Date().toISOString();
  const rows = contacts.map((contact) => ({
    organization_id: organizationId,
    source_provider: SOURCE_PROVIDER,
    source_account: SOURCE_ACCOUNT,
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
    intake_status: existingStatus.get(contact.externalContactId) ?? 'new',
    sync_batch_id: batchId,
    fetched_at: now,
    updated_at: now,
  }));

  const { error } = await (admin as any)
    .from('lead_intake_staging')
    .upsert(rows, { onConflict: 'organization_id,source_provider,external_contact_id' });

  if (error) {
    if (String(error.code ?? '') === '42P01') {
      throw new Error('The lead_intake_staging migration has not been applied to this database. No lead data was written.');
    }
    throw new Error(`Interakt staging write failed: ${String(error.message ?? 'unknown database error')}`);
  }

  revalidatePath(INBOUND_PATH);
}

// Backward-compatible action name retained while the old test URL redirects into Leads > Inbound.
export async function stageStarkInteraktContacts(): Promise<void> {
  await refreshStarkInteraktStaging();
}

export async function updateStarkInteraktIntakeStatus(formData: FormData): Promise<void> {
  const workspace = await requireStarkPackmateAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) throw new Error('Supabase service role is required for the isolated staging update.');

  const rowId = String(formData.get('rowId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!rowId) throw new Error('Inbound staging row is required.');
  if (!ALLOWED_INTAKE_STATUSES.has(status)) throw new Error('Unsupported inbound status.');

  const now = new Date().toISOString();
  const { error } = await (admin as any)
    .from('lead_intake_staging')
    .update({ intake_status: status, updated_at: now })
    .eq('id', rowId)
    .eq('organization_id', workspace.organization!.id)
    .eq('source_provider', SOURCE_PROVIDER);

  if (error) throw new Error(`Unable to update inbound status: ${String(error.message ?? 'unknown database error')}`);
  revalidatePath(INBOUND_PATH);
}

export async function readStagedStarkInteraktContacts(limit = 200, activeOnly = true) {
  const workspace = await requireStarkPackmateAdmin();
  const db: any = await createClient();
  const { data, error } = await db
    .from('lead_intake_staging')
    .select('id, external_contact_id, external_user_id, contact_name, email, phone_number, country_code, full_phone_number, whatsapp_opted_in, source_created_at, source_modified_at, source_created_via, traits, raw_payload, intake_status, sync_batch_id, fetched_at, updated_at')
    .eq('organization_id', workspace.organization!.id)
    .eq('source_provider', SOURCE_PROVIDER)
    .order('source_created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (error) {
    if (String(error.code ?? '') === '42P01') return { rows: [], tableReady: false, error: null };
    return { rows: [], tableReady: true, error: String(error.message ?? 'Unable to read Interakt staging data.') };
  }

  const rows = (data ?? []).filter((row: any) => !activeOnly || !TERMINAL_INBOUND_STATUSES.has(String(row.intake_status ?? 'new')));
  return { rows, tableReady: true, error: null };
}
