'use server';

import { revalidatePath } from 'next/cache';

import { sendInteraktTemplate } from '@/features/integrations/interakt/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const INBOUND_PATH = '/leads/inbound';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);

const SALES_MESSAGE_PRESETS = {
  qualification_follow_up: {
    templateName: 'qualification_follow_up',
    languageCode: 'en',
  },
} as const;

type PresetKey = keyof typeof SALES_MESSAGE_PRESETS;

function clean(value: unknown) {
  return String(value ?? '').trim();
}

async function requireStarkSalesAccess() {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID
    || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !workspace.user || !organization) throw new Error('This Interakt connector is restricted to Stark Packmate.');
  if (!workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) throw new Error('Sales permission is required to message this customer.');
  return workspace;
}

function salesFollowUpContext(row: any) {
  const blockers = [
    !clean(row.company_name) ? 'Company' : null,
    !(clean(row.packaging_type) || clean(row.pouch_type)) ? 'Product / pouch type' : null,
  ].filter(Boolean) as string[];

  if (blockers.length) return blockers.join(', ');
  const requirement = [row.pouch_type || row.packaging_type, row.quantity_text].map(clean).filter(Boolean).join(' · ');
  return requirement || 'Follow-up';
}

export async function sendStarkInteraktSalesFollowUp(formData: FormData): Promise<void> {
  const workspace = await requireStarkSalesAccess();
  const organizationId = workspace.organization!.id;
  const rowId = clean(formData.get('rowId'));
  const requestedPreset = clean(formData.get('messagePreset')) as PresetKey;
  const preset = SALES_MESSAGE_PRESETS[requestedPreset] ?? SALES_MESSAGE_PRESETS.qualification_follow_up;
  if (!rowId) throw new Error('Inbound inquiry is required.');

  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');

  const { data: row, error } = await db.from('lead_intake_staging').select('*')
    .eq('id', rowId)
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .maybeSingle();
  if (error || !row?.id) throw new Error('Inbound inquiry not found.');
  if (!row.phone_number || !row.country_code) throw new Error('This customer does not have a complete WhatsApp number in Interakt.');

  const customerName = clean(row.person_name || row.contact_name) || 'Customer';
  const context = salesFollowUpContext(row);
  const callbackData = JSON.stringify({
    source: 'setu_flow_inbound_sales',
    intake_id: row.id,
    actor_user_id: workspace.user!.id,
    preset: requestedPreset || 'qualification_follow_up',
  });

  const result = await sendInteraktTemplate({
    countryCode: String(row.country_code),
    phoneNumber: String(row.phone_number),
    templateName: preset.templateName,
    languageCode: preset.languageCode,
    bodyValues: [customerName, context],
    callbackData,
  });

  const now = new Date().toISOString();
  const { error: messageError } = await db.from('lead_intake_messages').upsert({
    organization_id: organizationId,
    intake_id: row.id,
    provider: SOURCE_PROVIDER,
    external_message_id: result.id,
    event_type: 'message_api_send_requested',
    direction: 'outbound',
    actor_type: 'agent',
    actor_name: workspace.profile?.full_name ?? workspace.user?.email ?? 'Setu Flow user',
    message_type: 'Template',
    message_text: 'WhatsApp qualification follow-up',
    message_payload: {
      preset: 'qualification_follow_up',
      templateName: preset.templateName,
      languageCode: preset.languageCode,
      bodyValues: [customerName, context],
    },
    sent_at: now,
    status: 'sent',
    callback_data: callbackData,
    updated_at: now,
  }, { onConflict: 'organization_id,provider,external_message_id' });
  if (messageError) throw new Error(`WhatsApp sent but the Setu Flow conversation log could not be updated: ${String(messageError.message ?? 'unknown database error')}`);

  await db.from('lead_intake_staging').update({
    last_outbound_at: now,
    needs_reply: false,
    updated_at: now,
  }).eq('id', row.id).eq('organization_id', organizationId);

  revalidatePath(INBOUND_PATH);
}
