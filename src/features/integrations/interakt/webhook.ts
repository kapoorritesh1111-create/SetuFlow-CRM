import 'server-only';

import crypto from 'crypto';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { analyzeInteraktCustomerImage, extractExplicitCompanyFromText } from '@/features/integrations/interakt/intelligence';
import type { InteraktCompanyIntelligence } from '@/features/integrations/interakt/intelligence';
import type { InteraktWebhookPayload } from '@/features/integrations/interakt/types';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const SOURCE_PROVIDER = 'interakt';

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text || null;
}

function iso(value: unknown) {
  const text = clean(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePhone(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;
  return `+${raw.replace(/[^0-9]/g, '')}`;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function recursiveFindString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = recursiveFindString(item, keys);
      if (found) return found;
    }
    return null;
  }
  const row = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = clean(row[key]);
    if (candidate) return candidate;
  }
  for (const candidate of Object.values(row)) {
    const found = recursiveFindString(candidate, keys);
    if (found) return found;
  }
  return null;
}

function findSocialUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const match = value.match(/https?:\/\/[^\s"']+/i);
    if (match && /(instagram\.com|facebook\.com|fb\.me)/i.test(match[0])) return match[0].replace(/[)\],.]+$/, '');
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const values = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const item of values) {
    const found = findSocialUrl(item);
    if (found) return found;
  }
  return null;
}

function attributionFromPayload(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload).toLowerCase();
  const adUrl = findSocialUrl(payload);
  const hasCtwa = serialized.includes('ctwa') || serialized.includes('click-to-whatsapp') || serialized.includes('click to whatsapp') || Boolean(adUrl);
  const platform = adUrl?.includes('instagram.com') || serialized.includes('instagram')
    ? 'instagram'
    : adUrl?.includes('facebook.com') || serialized.includes('facebook')
      ? 'facebook'
      : null;
  return {
    channel_source: 'whatsapp',
    acquisition_type: hasCtwa ? 'ctwa' : 'organic',
    ad_network: hasCtwa ? 'meta' : null,
    ad_platform: platform,
    ad_url: adUrl,
    meta_campaign_id: recursiveFindString(payload, ['campaign_id', 'campaignId', 'meta_campaign_id']),
    meta_adset_id: recursiveFindString(payload, ['adset_id', 'ad_set_id', 'adsetId', 'meta_adset_id']),
    meta_ad_id: recursiveFindString(payload, ['ad_id', 'adId', 'meta_ad_id']),
  };
}

function qualificationPatchFromAnswer(question: string, answer: string) {
  const q = question.toLowerCase();
  if (/company|business name|organisation|organization/.test(q)) return { company_name: answer };
  if (/brand/.test(q)) return { brand_name: answer };
  if (/packaging type|packaging category/.test(q)) return { packaging_type: answer };
  if (/what type of pouch|pouch type/.test(q)) return { pouch_type: answer };
  if (/quantity|moq/.test(q)) return { quantity_text: answer };
  if (/dimension|size|print|printing|finish|colour|color/.test(q)) return { dimensions_print: answer };
  if (/deliver|destination|location|city|country|ship/.test(q)) return { delivery_location: answer };
  if (/timeline|when.*need|required by|delivery date|buying/.test(q)) return { buying_timeline: answer };
  if (/industry|business type|segment/.test(q)) return { industry: answer };
  return {};
}

function identityQuestion(question: string) {
  const q = question.toLowerCase();
  if (/company|business name|organisation|organization/.test(q)) return 'company' as const;
  if (/brand/.test(q)) return 'brand' as const;
  return null;
}

function evidenceEntry(intelligence: InteraktCompanyIntelligence, input: { messageId?: string | null; mediaUrl?: string | null; question?: string | null; at?: string | null }) {
  return {
    source: intelligence.source,
    company_name: intelligence.companyName,
    brand_name: intelligence.brandName,
    confidence: intelligence.confidence,
    evidence: intelligence.evidence,
    model: intelligence.model,
    message_id: input.messageId ?? null,
    media_url: input.mediaUrl ?? null,
    question: input.question ?? null,
    observed_at: input.at ?? new Date().toISOString(),
  };
}

function mergeEvidence(existing: unknown, next: Record<string, unknown>) {
  const current = safeObject(existing);
  const history = Array.isArray(current.history) ? current.history.slice(-19) : [];
  return { latest: next, history: [...history, next] };
}

async function findOrCreateIntake(db: any, input: {
  customerId?: string | null;
  phone?: string | null;
  name?: string | null;
  email?: string | null;
  sourcePayload?: Record<string, unknown>;
}) {
  let row: any = null;
  if (input.customerId) {
    const result = await db
      .from('lead_intake_staging')
      .select('*')
      .eq('organization_id', STARK_PACKMATE_ORG_ID)
      .eq('source_provider', SOURCE_PROVIDER)
      .eq('external_contact_id', input.customerId)
      .maybeSingle();
    row = result.data;
  }
  if (!row && input.phone) {
    const result = await db
      .from('lead_intake_staging')
      .select('*')
      .eq('organization_id', STARK_PACKMATE_ORG_ID)
      .eq('source_provider', SOURCE_PROVIDER)
      .eq('full_phone_number', input.phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    row = result.data;
  }
  if (row?.id) return row;

  const attribution = attributionFromPayload(input.sourcePayload ?? {});
  const externalContactId = input.customerId || input.phone || crypto.randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('lead_intake_staging')
    .insert({
      organization_id: STARK_PACKMATE_ORG_ID,
      source_provider: SOURCE_PROVIDER,
      source_account: 'stark-packmate',
      external_contact_id: externalContactId,
      external_user_id: input.customerId ?? null,
      full_phone_number: input.phone,
      contact_name: input.name,
      person_name: input.name,
      email: input.email,
      source_created_at: now,
      source_modified_at: now,
      source_created_via: 'webhook',
      intake_status: 'new',
      fetched_at: now,
      updated_at: now,
      raw_payload: input.sourcePayload ?? {},
      traits: {},
      ...attribution,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function processWorkflowResponse(db: any, payload: InteraktWebhookPayload) {
  const data = safeObject(payload.data);
  const customerId = clean(data.customer_id);
  const phone = normalizePhone(data.customer_number);
  const customerName = clean(data.customer_name);
  const intake = await findOrCreateIntake(db, { customerId, phone, name: customerName, sourcePayload: data });
  const responses = Array.isArray(data.data) ? data.data : [];
  const patch: Record<string, unknown> = {};
  let latestInboundAt: string | null = intake.last_inbound_at ?? null;
  let companyEvidence = intake.company_evidence ?? {};
  let companyIntelligenceUpdatedAt: string | null = intake.company_intelligence_updated_at ?? null;

  for (const item of responses) {
    const row = safeObject(item);
    const question = safeObject(row.question);
    const answer = safeObject(row.answer);
    const questionText = clean(question.message) ?? 'Workflow question';
    const answerText = clean(answer.message);
    const answeredAt = iso(answer.received_at_utc ?? answer.created_at_utc);
    const evidenceKey = clean(answer.id) || `${clean(data.id) ?? 'workflow'}:${clean(question.id) ?? questionText}:${answerText ?? ''}`;
    const now = new Date().toISOString();

    await db.from('lead_intake_workflow_answers').upsert({
      organization_id: STARK_PACKMATE_ORG_ID,
      intake_id: intake.id,
      provider: SOURCE_PROVIDER,
      workflow_id: clean(data.workflow_id),
      workflow_run_id: clean(data.id),
      question_id: clean(question.id),
      question_text: questionText,
      answer_text: answerText,
      response_type: clean(answer.message_content_type),
      answered_at: answeredAt,
      evidence_key: evidenceKey,
      raw_payload: row,
      updated_at: now,
    }, { onConflict: 'organization_id,provider,intake_id,evidence_key' });

    if (answerText) {
      Object.assign(patch, qualificationPatchFromAnswer(questionText, answerText));
      const identityKind = identityQuestion(questionText);
      if (identityKind) {
        const intelligence: InteraktCompanyIntelligence = {
          companyName: identityKind === 'company' ? answerText : null,
          brandName: identityKind === 'brand' ? answerText : null,
          confidence: 1,
          evidence: `${questionText}: ${answerText}`,
          source: 'message_text',
          model: null,
        };
        const entry = evidenceEntry(intelligence, { question: questionText, at: answeredAt ?? now });
        companyEvidence = mergeEvidence(companyEvidence, entry);
        companyIntelligenceUpdatedAt = now;
      }
    }
    if (answeredAt && (!latestInboundAt || answeredAt > latestInboundAt)) latestInboundAt = answeredAt;
  }

  const attribution = attributionFromPayload(data);
  await db.from('lead_intake_staging').update({
    ...patch,
    person_name: intake.person_name ?? customerName,
    first_inquiry_at: intake.first_inquiry_at ?? latestInboundAt,
    last_inbound_at: latestInboundAt,
    source_modified_at: iso(data.modified_at_utc) ?? new Date().toISOString(),
    company_evidence: companyEvidence,
    company_intelligence_updated_at: companyIntelligenceUpdatedAt,
    updated_at: new Date().toISOString(),
    ...attribution,
  }).eq('id', intake.id).eq('organization_id', STARK_PACKMATE_ORG_ID);
}

function messageText(message: Record<string, unknown>) {
  if (typeof message.message === 'string') return message.message;
  return recursiveFindString(message.message, ['text', 'caption', 'message']) ?? '';
}

function messageMediaUrl(message: Record<string, unknown>) {
  const url = recursiveFindString(message, ['media_url', 'mediaUrl']);
  return url && /^https:\/\//i.test(url) ? url : null;
}

function isImageMessage(message: Record<string, unknown>, mediaUrl: string | null) {
  if (!mediaUrl) return false;
  const type = clean(message.message_content_type ?? message.chat_message_type)?.toLowerCase() ?? '';
  return type.includes('image') || /\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(mediaUrl);
}

async function processMessageEvent(db: any, payload: InteraktWebhookPayload) {
  const data = safeObject(payload.data);
  const customer = safeObject(data.customer);
  const message = safeObject(data.message);
  const traits = safeObject(customer.traits);
  const customerId = clean(customer.id);
  const phone = normalizePhone(customer.channel_phone_number);
  const name = clean(traits.name);
  const email = clean(traits.email);
  const messageId = clean(message.id);
  if (!messageId) return;

  const intake = await findOrCreateIntake(db, { customerId, phone, name, email, sourcePayload: data });
  const eventType = clean(payload.type) ?? 'message_received';
  const incoming = eventType === 'message_received';
  const receivedAt = iso(message.received_at_utc);
  const deliveredAt = iso(message.delivered_at_utc);
  const readAt = iso(message.seen_at_utc);
  const status = incoming
    ? 'received'
    : eventType.endsWith('_read') ? 'read'
      : eventType.endsWith('_delivered') ? 'delivered'
        : eventType.endsWith('_failed') ? 'failed'
          : 'sent';
  const callbackData = recursiveFindString(message.meta_data, ['callback_data']);
  const text = messageText(message);
  const mediaUrl = messageMediaUrl(message);
  const now = new Date().toISOString();

  const textIntelligence = incoming ? extractExplicitCompanyFromText(text) : null;
  const imageIntelligence = incoming && isImageMessage(message, mediaUrl)
    ? await analyzeInteraktCustomerImage(mediaUrl, text)
    : null;
  const intelligence = textIntelligence ?? imageIntelligence;

  await db.from('lead_intake_messages').upsert({
    organization_id: STARK_PACKMATE_ORG_ID,
    intake_id: intake.id,
    provider: SOURCE_PROVIDER,
    external_message_id: messageId,
    event_type: eventType,
    direction: incoming ? 'inbound' : 'outbound',
    actor_type: incoming ? 'customer' : 'agent',
    actor_name: incoming ? name : null,
    message_type: clean(message.message_content_type ?? message.chat_message_type),
    message_text: text || (mediaUrl ? '[Customer media]' : ''),
    message_payload: message,
    media_url: mediaUrl,
    intelligence: intelligence ?? {},
    received_at: incoming ? receivedAt : null,
    sent_at: incoming ? null : receivedAt,
    delivered_at: deliveredAt,
    read_at: readAt,
    failed_at: status === 'failed' ? now : null,
    status,
    callback_data: callbackData,
    updated_at: now,
  }, { onConflict: 'organization_id,provider,external_message_id' });

  const attribution = attributionFromPayload(data);
  const identityPatch: Record<string, unknown> = {};
  if (textIntelligence?.companyName && !intake.company_name) identityPatch.company_name = textIntelligence.companyName;
  if (textIntelligence?.brandName && !intake.brand_name) identityPatch.brand_name = textIntelligence.brandName;
  if (imageIntelligence?.companyName && !intake.company_name) identityPatch.proposed_company_name = imageIntelligence.companyName;
  if (imageIntelligence?.brandName && !intake.brand_name) identityPatch.proposed_brand_name = imageIntelligence.brandName;

  let companyEvidence = intake.company_evidence ?? {};
  if (textIntelligence) companyEvidence = mergeEvidence(companyEvidence, evidenceEntry(textIntelligence, { messageId, mediaUrl, at: receivedAt ?? now }));
  if (imageIntelligence) companyEvidence = mergeEvidence(companyEvidence, evidenceEntry(imageIntelligence, { messageId, mediaUrl, at: receivedAt ?? now }));

  await db.from('lead_intake_staging').update({
    contact_name: intake.contact_name ?? name,
    person_name: intake.person_name ?? name,
    email: intake.email ?? email,
    full_phone_number: intake.full_phone_number ?? phone,
    first_inquiry_at: incoming ? (intake.first_inquiry_at ?? receivedAt) : intake.first_inquiry_at,
    last_inbound_at: incoming ? receivedAt : intake.last_inbound_at,
    source_modified_at: now,
    raw_payload: data,
    company_evidence: companyEvidence,
    company_intelligence_updated_at: intelligence ? now : intake.company_intelligence_updated_at,
    updated_at: now,
    ...identityPatch,
    ...attribution,
  }).eq('id', intake.id).eq('organization_id', STARK_PACKMATE_ORG_ID);
}

export function verifyInteraktSignature(rawBody: string, signature: string | null) {
  const secret = process.env.INTERAKT_STARK_PACKMATE_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function webhookEventKey(eventType: string, data: Record<string, unknown>, rawBody: string) {
  const messageId = clean(safeObject(data.message).id);
  if (messageId && eventType !== 'workflow_response_update') return `${eventType}:${messageId}`;
  // Interakt workflow_response_update payloads are cumulative and reuse the same workflow-run id.
  // Hash the complete payload so later answers in the same workflow are processed, while exact retries remain idempotent.
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  return `${eventType}:${clean(data.id) ?? 'event'}:${bodyHash}`;
}

export async function processInteraktWebhook(rawBody: string, signature: string | null) {
  const valid = verifyInteraktSignature(rawBody, signature);
  if (!valid) return { ok: false as const, status: 401, error: 'Invalid Interakt signature.' };

  let payload: InteraktWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InteraktWebhookPayload;
  } catch {
    return { ok: false as const, status: 400, error: 'Invalid JSON.' };
  }

  const db = createAdminSupabaseClient() as any;
  if (!db) return { ok: false as const, status: 503, error: 'Database admin client unavailable.' };

  const eventType = clean(payload.type) ?? 'unknown';
  const data = safeObject(payload.data);
  const eventKey = webhookEventKey(eventType, data, rawBody);

  const { data: existing } = await db
    .from('lead_intake_webhook_events')
    .select('id, processed_at')
    .eq('organization_id', STARK_PACKMATE_ORG_ID)
    .eq('provider', SOURCE_PROVIDER)
    .eq('event_key', eventKey)
    .maybeSingle();
  if (existing?.processed_at) return { ok: true as const, duplicate: true };

  await db.from('lead_intake_webhook_events').upsert({
    organization_id: STARK_PACKMATE_ORG_ID,
    provider: SOURCE_PROVIDER,
    event_key: eventKey,
    event_type: eventType,
    signature_valid: true,
    payload,
  }, { onConflict: 'organization_id,provider,event_key' });

  try {
    if (eventType === 'workflow_response_update') await processWorkflowResponse(db, payload);
    else if (eventType === 'message_received' || eventType.startsWith('message_api_') || eventType.startsWith('message_campaign_')) await processMessageEvent(db, payload);

    await db.from('lead_intake_webhook_events').update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq('organization_id', STARK_PACKMATE_ORG_ID).eq('provider', SOURCE_PROVIDER).eq('event_key', eventKey);
    return { ok: true as const, duplicate: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed.';
    await db.from('lead_intake_webhook_events').update({ processing_error: errorMessage })
      .eq('organization_id', STARK_PACKMATE_ORG_ID).eq('provider', SOURCE_PROVIDER).eq('event_key', eventKey);
    return { ok: false as const, status: 500, error: errorMessage };
  }
}
