import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const SUPPORTED_INBOUND_PROVIDERS = ['interakt', 'indiamart'];

const clean = (value: unknown) => String(value ?? '').trim();
const digits = (value: unknown) => clean(value).replace(/[^0-9]/g, '');

function normalizedPhone(row: any) {
  const full = digits(row?.full_phone_number);
  if (full) return full;
  const local = digits(row?.phone_number);
  if (!local) return '';
  if (local.length === 10) return `91${local}`;
  return local;
}

function normalizeIndiaMartMessage(value: unknown) {
  return clean(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/\r/g, '')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function messageTimestamp(message: any) {
  const value = message?.received_at || message?.sent_at || message?.created_at;
  const timestamp = value ? new Date(String(value)).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function readSharedInboundConversation(intakeId: string) {
  const workspace = await requireWorkspace();
  const organization = workspace.organization;
  const isStark = organization?.id === STARK_PACKMATE_ORG_ID || String(organization?.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !organization) throw new Error('This inbound connector is restricted to Stark Packmate.');

  const db: any = await createClient();
  const { data: selected, error: selectedError } = await db
    .from('lead_intake_staging')
    .select('id,organization_id,source_provider,full_phone_number,phone_number,person_name,contact_name,first_inquiry_at,source_created_at,traits')
    .eq('organization_id', organization.id)
    .eq('id', intakeId)
    .in('source_provider', SUPPORTED_INBOUND_PROVIDERS)
    .maybeSingle();

  if (selectedError || !selected?.id) {
    return { messages: [], answers: [], error: selectedError?.message ?? 'Inbound inquiry not found.' };
  }

  const selectedPhone = normalizedPhone(selected);
  let relatedRows: any[] = [selected];
  if (selectedPhone) {
    const { data } = await db
      .from('lead_intake_staging')
      .select('id,source_provider,full_phone_number,phone_number')
      .eq('organization_id', organization.id)
      .in('source_provider', SUPPORTED_INBOUND_PROVIDERS)
      .limit(2000);
    relatedRows = (data ?? []).filter((row: any) => normalizedPhone(row) === selectedPhone);
    if (!relatedRows.some((row: any) => row.id === selected.id)) relatedRows.push(selected);
  }

  const intakeIds = [...new Set(relatedRows.map((row: any) => String(row.id)).filter(Boolean))];
  const [messagesResult, answersResult] = await Promise.all([
    db.from('lead_intake_messages').select('*').eq('organization_id', organization.id).in('intake_id', intakeIds).order('created_at', { ascending: true }).limit(500),
    db.from('lead_intake_workflow_answers').select('*').eq('organization_id', organization.id).in('intake_id', intakeIds).order('answered_at', { ascending: true }).limit(500),
  ]);

  const messages = [...(messagesResult.data ?? [])];

  // Interakt workflow webhooks historically stored the customer answer but not the bot prompt.
  // Reconstruct those prompts so the sales view shows the actual back-and-forth conversation.
  const existingWorkflowPromptIds = new Set(
    messages
      .filter((message: any) => message.event_type === 'workflow_prompt')
      .map((message: any) => String(message.external_message_id ?? ''))
  );
  for (const answer of answersResult.data ?? []) {
    const payload = answer?.raw_payload && typeof answer.raw_payload === 'object' ? answer.raw_payload as Record<string, any> : {};
    const question = payload.question && typeof payload.question === 'object' ? payload.question as Record<string, any> : {};
    const questionId = clean(question.id || answer.question_id);
    const questionText = clean(question.message || answer.question_text);
    if (!questionId || !questionText) continue;
    const externalId = `workflow-question:${questionId}`;
    if (existingWorkflowPromptIds.has(externalId)) continue;
    const sentAt = clean(question.created_at_utc) || answer.answered_at || selected.first_inquiry_at || selected.source_created_at;
    messages.push({
      id: `synthetic:${externalId}`,
      intake_id: answer.intake_id,
      provider: 'interakt',
      external_message_id: externalId,
      event_type: 'workflow_prompt',
      direction: 'outbound',
      actor_type: 'bot',
      actor_name: 'Stark Packmate Bot',
      message_type: clean(question.message_type) || 'WorkflowPrompt',
      message_text: questionText,
      media_url: null,
      intelligence: null,
      received_at: null,
      sent_at: sentAt,
      status: 'sent',
      created_at: sentAt,
    });
    existingWorkflowPromptIds.add(externalId);
  }

  if (String(selected.source_provider).toLowerCase() === 'indiamart') {
    const traits = selected.traits && typeof selected.traits === 'object' ? selected.traits as Record<string, unknown> : {};
    const inquiryText = normalizeIndiaMartMessage(traits.query_message);
    const hasSynthetic = messages.some((message: any) => message.event_type === 'indiamart_enquiry' && message.intake_id === selected.id);
    if (inquiryText && !hasSynthetic) {
      messages.push({
        id: `indiamart:${selected.id}:enquiry`,
        intake_id: selected.id,
        provider: 'indiamart',
        event_type: 'indiamart_enquiry',
        direction: 'inbound',
        actor_type: 'customer',
        actor_name: selected.person_name || selected.contact_name || 'Customer',
        message_type: 'Inquiry',
        message_text: inquiryText,
        media_url: null,
        intelligence: null,
        received_at: selected.first_inquiry_at || selected.source_created_at,
        sent_at: null,
        status: 'received',
        created_at: selected.first_inquiry_at || selected.source_created_at,
      });
    }
  }

  messages.sort((a: any, b: any) => messageTimestamp(a) - messageTimestamp(b));
  return {
    messages,
    answers: answersResult.data ?? [],
    error: messagesResult.error?.message ?? answersResult.error?.message ?? null,
  };
}
