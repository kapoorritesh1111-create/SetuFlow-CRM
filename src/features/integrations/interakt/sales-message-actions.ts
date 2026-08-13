'use server';

import { revalidatePath } from 'next/cache';

import { createCatalogBrochureShare } from '@/features/catalog-brochures/server';
import { sendInteraktTemplate, sendInteraktText } from '@/features/integrations/interakt/client';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SOURCE_PROVIDER = 'interakt';
const INBOUND_PATH = '/leads/inbound';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);
const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

const SALES_MESSAGE_PRESETS = {
  qualification_follow_up: {
    templateName: 'qualification_follow_up',
    languageCode: 'en',
  },
} as const;

type PresetKey = keyof typeof SALES_MESSAGE_PRESETS;
type SalesMessageActionResult = { ok: true; message: string } | { ok: false; message: string };

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function phoneDigits(value: unknown) {
  return clean(value).replace(/[^0-9]/g, '');
}

function replyWindowOpen(value: unknown) {
  const timestamp = new Date(clean(value)).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const elapsed = Date.now() - timestamp;
  return elapsed >= 0 && elapsed <= WHATSAPP_REPLY_WINDOW_MS;
}

function safeSalesError(error: unknown) {
  const message = error instanceof Error ? error.message : 'The message could not be sent.';
  if (/complete WhatsApp number|valid WhatsApp country code|phone number are required/i.test(message)) {
    return 'This inquiry does not have a usable WhatsApp number yet. Refresh the contact from Interakt or add a valid number before sending.';
  }
  if (/INTERAKT_STARK_PACKMATE_API_KEY|connector is restricted/i.test(message)) {
    return 'WhatsApp messaging is not available right now. Ask an administrator to check the Interakt connection in Integrations & API.';
  }
  if (/Database admin client unavailable/i.test(message)) {
    return 'Setu Flow could not prepare this message. Please try again.';
  }
  return message;
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

function resolveWhatsAppRecipient(row: any) {
  const raw = safeObject(row.raw_payload);
  const customer = safeObject(raw.customer);
  let countryCode = clean(row.country_code) || clean(customer.country_code);
  let phoneNumber = clean(row.phone_number) || clean(customer.phone_number);
  const fullPhone = clean(row.full_phone_number) || clean(customer.channel_phone_number);

  const fullDigits = phoneDigits(fullPhone);
  const countryDigits = phoneDigits(countryCode);
  const localDigits = phoneDigits(phoneNumber);

  if (!phoneNumber && countryDigits && fullDigits.startsWith(countryDigits) && fullDigits.length > countryDigits.length) {
    phoneNumber = fullDigits.slice(countryDigits.length);
  }
  if (!countryCode && localDigits && fullDigits.endsWith(localDigits) && fullDigits.length > localDigits.length) {
    const prefix = fullDigits.slice(0, fullDigits.length - localDigits.length);
    if (prefix.length >= 1 && prefix.length <= 3) countryCode = `+${prefix}`;
  }

  // Stark Packmate's current Interakt account primarily receives Indian E.164 numbers.
  // Keep this as a last-resort compatibility fallback; webhook payload fields above remain preferred.
  if (!countryCode && !phoneNumber && fullDigits.length === 12 && fullDigits.startsWith('91')) {
    countryCode = '+91';
    phoneNumber = fullDigits.slice(2);
  }

  if (!countryCode || !phoneNumber) throw new Error('This customer does not have a complete WhatsApp number in Interakt.');
  return { countryCode, phoneNumber };
}

async function loadInboundRow(db: any, organizationId: string, rowId: string) {
  const { data: row, error } = await db.from('lead_intake_staging').select('*')
    .eq('id', rowId)
    .eq('organization_id', organizationId)
    .eq('source_provider', SOURCE_PROVIDER)
    .maybeSingle();
  if (error || !row?.id) throw new Error('Inbound inquiry not found.');
  return row;
}

async function persistResolvedRecipient(db: any, organizationId: string, row: any, recipient: { countryCode: string; phoneNumber: string }) {
  if (clean(row.country_code) && clean(row.phone_number)) return;
  await db.from('lead_intake_staging')
    .update({
      country_code: clean(row.country_code) || recipient.countryCode,
      phone_number: clean(row.phone_number) || recipient.phoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('organization_id', organizationId);
}

async function discardUnsentBrochureShare(db: any, organizationId: string, shareId: string | null | undefined) {
  if (!shareId) return;
  await db.from('catalog_brochure_shares')
    .delete()
    .eq('id', shareId)
    .eq('organization_id', organizationId);
}

async function recordOutboundMessage({ db, workspace, row, result, messageType, messageText, callbackData, payload }: {
  db: any;
  workspace: Awaited<ReturnType<typeof requireStarkSalesAccess>>;
  row: any;
  result: { id: string; message: string | null };
  messageType: 'Text' | 'Template';
  messageText: string;
  callbackData: string;
  payload: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const { error: messageError } = await db.from('lead_intake_messages').upsert({
    organization_id: workspace.organization!.id,
    intake_id: row.id,
    provider: SOURCE_PROVIDER,
    external_message_id: result.id,
    event_type: 'message_api_send_requested',
    direction: 'outbound',
    actor_type: 'agent',
    actor_name: workspace.profile?.full_name ?? workspace.user?.email ?? 'Setu Flow user',
    message_type: messageType,
    message_text: messageText,
    message_payload: payload,
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
  }).eq('id', row.id).eq('organization_id', workspace.organization!.id);
}

async function performStarkInteraktSalesText(formData: FormData): Promise<void> {
  const workspace = await requireStarkSalesAccess();
  const organizationId = workspace.organization!.id;
  const rowId = clean(formData.get('rowId'));
  const originalMessage = clean(formData.get('message'));
  const brochureId = clean(formData.get('brochureId'));
  if (!rowId) throw new Error('Inbound inquiry is required.');
  if (!originalMessage) throw new Error('Type a WhatsApp message before sending.');

  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const row = await loadInboundRow(db, organizationId, rowId);
  const recipient = resolveWhatsAppRecipient(row);
  await persistResolvedRecipient(db, organizationId, row, recipient);
  if (!replyWindowOpen(row.last_inbound_at)) {
    throw new Error('The 24-hour WhatsApp reply window has closed. Use an approved follow-up template instead.');
  }

  let message = originalMessage;
  let brochureShare: { id: string; url: string; brochureName: string } | null = null;
  if (brochureId) {
    brochureShare = await createCatalogBrochureShare({ brochureId, intakeId: row.id, channel: 'whatsapp' });
    message = `${originalMessage}\n\nView our ${brochureShare.brochureName} catalog: ${brochureShare.url}`;
  }
  if (message.length > 4096) {
    await discardUnsentBrochureShare(db, organizationId, brochureShare?.id);
    throw new Error('This message is too long after adding the brochure link. Shorten the message and try again.');
  }

  const callbackData = JSON.stringify({
    source: 'setu_flow_inbound_sales',
    intake_id: row.id,
    actor_user_id: workspace.user!.id,
    mode: 'free_text',
    brochure_share_id: brochureShare?.id ?? null,
  });

  let result: { id: string; message: string | null };
  try {
    result = await sendInteraktText({
      countryCode: recipient.countryCode,
      phoneNumber: recipient.phoneNumber,
      message,
      callbackData,
    });
  } catch (error) {
    await discardUnsentBrochureShare(db, organizationId, brochureShare?.id);
    throw error;
  }

  await recordOutboundMessage({
    db,
    workspace,
    row,
    result,
    messageType: 'Text',
    messageText: message,
    callbackData,
    payload: { mode: 'free_text', message, brochure_id: brochureId || null, brochure_share_id: brochureShare?.id ?? null, brochure_url: brochureShare?.url ?? null },
  });
  revalidatePath(INBOUND_PATH);
}

export async function sendStarkInteraktSalesText(formData: FormData): Promise<SalesMessageActionResult> {
  try {
    const hasBrochure = Boolean(clean(formData.get('brochureId')));
    await performStarkInteraktSalesText(formData);
    return { ok: true, message: hasBrochure ? 'WhatsApp message and brochure sent.' : 'WhatsApp message sent.' };
  } catch (error) {
    return { ok: false, message: safeSalesError(error) };
  }
}

async function performStarkInteraktSalesFollowUp(formData: FormData): Promise<void> {
  const workspace = await requireStarkSalesAccess();
  const organizationId = workspace.organization!.id;
  const rowId = clean(formData.get('rowId'));
  const requestedPreset = clean(formData.get('messagePreset')) as PresetKey;
  const preset = SALES_MESSAGE_PRESETS[requestedPreset] ?? SALES_MESSAGE_PRESETS.qualification_follow_up;
  if (!rowId) throw new Error('Inbound inquiry is required.');

  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database admin client unavailable.');
  const row = await loadInboundRow(db, organizationId, rowId);
  const recipient = resolveWhatsAppRecipient(row);
  await persistResolvedRecipient(db, organizationId, row, recipient);

  const customerName = clean(row.person_name || row.contact_name) || 'Customer';
  const context = salesFollowUpContext(row);
  const callbackData = JSON.stringify({
    source: 'setu_flow_inbound_sales',
    intake_id: row.id,
    actor_user_id: workspace.user!.id,
    preset: requestedPreset || 'qualification_follow_up',
  });

  const result = await sendInteraktTemplate({
    countryCode: recipient.countryCode,
    phoneNumber: recipient.phoneNumber,
    templateName: preset.templateName,
    languageCode: preset.languageCode,
    bodyValues: [customerName, context],
    callbackData,
  });

  await recordOutboundMessage({
    db,
    workspace,
    row,
    result,
    messageType: 'Template',
    messageText: 'WhatsApp qualification follow-up',
    callbackData,
    payload: {
      preset: 'qualification_follow_up',
      templateName: preset.templateName,
      languageCode: preset.languageCode,
      bodyValues: [customerName, context],
    },
  });
  revalidatePath(INBOUND_PATH);
}

export async function sendStarkInteraktSalesFollowUp(formData: FormData): Promise<SalesMessageActionResult> {
  try {
    await performStarkInteraktSalesFollowUp(formData);
    return { ok: true, message: 'Approved WhatsApp follow-up sent.' };
  } catch (error) {
    return { ok: false, message: safeSalesError(error) };
  }
}
