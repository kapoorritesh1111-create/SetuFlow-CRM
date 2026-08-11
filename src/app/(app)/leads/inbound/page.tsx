import Link from 'next/link';

import { WorkspaceState } from '@/components/ui/workspace-state';
import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import { logStarkInteraktCall } from '@/features/integrations/interakt/review-actions';
import {
  acceptStarkInteraktCompanySuggestion,
  qualifyStarkInteraktAsLead,
  readStagedStarkInteraktContacts,
  readStarkInteraktConversation,
  refreshStarkInteraktStaging,
  saveStarkInteraktQualification,
  sendStarkInteraktTemplate,
  updateStarkInteraktIntakeStatus,
} from '@/features/integrations/interakt/server';
import type { InteraktInquiryEvidence, NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);

type SearchParams = { review?: string };
type CompanyEvidenceEntry = {
  company_name?: string | null;
  brand_name?: string | null;
  confidence?: number;
  evidence?: string;
  source?: string;
};
type StagedRow = {
  id: string;
  external_contact_id: string;
  external_user_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone_number: string | null;
  country_code: string | null;
  full_phone_number: string | null;
  whatsapp_opted_in: boolean | null;
  source_created_at: string | null;
  source_modified_at: string | null;
  source_created_via: string | null;
  traits: Record<string, unknown> | null;
  raw_payload: Record<string, unknown> | null;
  intake_status: string | null;
  person_name: string | null;
  company_name: string | null;
  brand_name: string | null;
  proposed_company_name: string | null;
  proposed_brand_name: string | null;
  company_evidence: { latest?: CompanyEvidenceEntry; history?: CompanyEvidenceEntry[] } | null;
  packaging_type: string | null;
  pouch_type: string | null;
  quantity_text: string | null;
  dimensions_print: string | null;
  delivery_location: string | null;
  buying_timeline: string | null;
  industry: string | null;
  first_inquiry_at: string | null;
  last_inbound_at: string | null;
  channel_source: string | null;
  acquisition_type: string | null;
  ad_network: string | null;
  ad_platform: string | null;
  ad_url: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  interakt_assignee_name: string | null;
  qualification_score: number | null;
  qualification_notes: string | null;
};
type ConversationMessage = {
  id: string;
  direction: 'inbound' | 'outbound' | 'system';
  actor_type: string;
  actor_name: string | null;
  message_type: string | null;
  message_text: string | null;
  media_url: string | null;
  message_payload?: Record<string, unknown> | null;
  intelligence: {
    companyName?: string | null;
    brandName?: string | null;
    confidence?: number;
    evidence?: string;
  } | null;
  received_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  status: string;
};
type WorkflowAnswer = {
  id: string;
  question_text: string;
  answer_text: string | null;
  response_type: string | null;
  answered_at: string | null;
};

function tagsFrom(value: unknown) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [] as string[];
}

function toContact(row: StagedRow): NormalizedInteraktContact {
  const raw = (row.raw_payload ?? {}) as Record<string, unknown>;
  const traits = (row.traits ?? {}) as Record<string, unknown>;
  return {
    externalContactId: row.external_contact_id,
    externalUserId: row.external_user_id,
    phoneNumber: row.phone_number,
    countryCode: row.country_code,
    fullPhoneNumber: row.full_phone_number,
    contactName: row.contact_name,
    email: row.email,
    whatsappOptedIn: row.whatsapp_opted_in,
    sourceCreatedAt: row.source_created_at,
    sourceModifiedAt: row.source_modified_at,
    sourceCreatedVia: row.source_created_via,
    tags: tagsFrom(raw.tags ?? traits.tags),
    traits,
    rawPayload: raw,
  };
}

function evidenceFromRow(row: StagedRow, messages: ConversationMessage[] = [], answers: WorkflowAnswer[] = []): InteraktInquiryEvidence {
  return {
    personName: row.person_name,
    companyName: row.company_name,
    packagingType: row.packaging_type,
    pouchType: row.pouch_type,
    quantityText: row.quantity_text,
    dimensionsPrint: row.dimensions_print,
    deliveryLocation: row.delivery_location,
    buyingTimeline: row.buying_timeline,
    industry: row.industry,
    firstInquiryAt: row.first_inquiry_at,
    lastInboundAt: row.last_inbound_at,
    channelSource: row.channel_source,
    acquisitionType: row.acquisition_type,
    adNetwork: row.ad_network,
    adPlatform: row.ad_platform,
    adUrl: row.ad_url,
    inboundMessageTexts: messages.filter((item) => item.direction === 'inbound').map((item) => item.message_text ?? '').filter(Boolean),
    workflowAnswerCount: answers.length || [row.packaging_type, row.pouch_type, row.quantity_text, row.industry].filter(Boolean).length,
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(value: string | null) {
  if (!value) return '—';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return '—';
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function scoreClass(score: number) {
  if (score >= 80) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (score >= 70) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function inputClass() {
  return 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
}

function isSafeMediaUrl(value: string | null) {
  return Boolean(value && /^https:\/\//i.test(value));
}

function cleanInteractiveText(message: ConversationMessage) {
  const text = message.message_text ?? '';
  if (!text.startsWith('{')) return text;
  try {
    const parsed = JSON.parse(text) as Record<string, any>;
    return parsed?.list_reply?.title ?? parsed?.button_reply?.title ?? text;
  } catch {
    return text;
  }
}

function usefulWorkflowAnswer(answer: WorkflowAnswer) {
  const q = answer.question_text.toLowerCase();
  const a = String(answer.answer_text ?? '').trim();
  if (!a) return false;
  if (a.toLowerCase() === 'proceed' || a.toLowerCase() === 'just browsing') return false;
  return /company|business name|packaging type|pouch|quantity|moq|industry|dimension|print|delivery|timeline/.test(q);
}

export default async function InboundLeadsPage({ searchParams }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Leads · Inbound" title="Workspace membership needed" description="Sign in to your organization to review inbound inquiries." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const isStark = workspace.organization.id === STARK_PACKMATE_ORG_ID || String(workspace.organization.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark) {
    return <WorkspaceState eyebrow="Leads · Inbound" title="Inbound connector not enabled" description="The Interakt qualification desk is currently enabled for Stark Packmate." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const canWorkInbound = workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)));
  const staged = await readStagedStarkInteraktContacts(250, true);
  const rows = (staged.rows ?? []) as StagedRow[];
  const requestedId = String(searchParams?.review ?? '').trim();
  const selected = rows.find((row) => row.id === requestedId) ?? rows[0] ?? null;
  const conversation = selected ? await readStarkInteraktConversation(selected.id) : { messages: [], answers: [], error: null };
  const messages = (conversation.messages ?? []) as ConversationMessage[];
  const answers = (conversation.answers ?? []) as WorkflowAnswer[];
  const selectedAssessment = selected ? assessInteraktContact(toContact(selected), new Date(), evidenceFromRow(selected, messages, answers)) : null;
  const assessments = rows.map((row) => ({ row, assessment: assessInteraktContact(toContact(row), new Date(), evidenceFromRow(row)) }))
    .sort((a, b) => b.assessment.score - a.assessment.score || String(b.row.last_inbound_at ?? '').localeCompare(String(a.row.last_inbound_at ?? '')));
  const latestEvidence = selected?.company_evidence?.latest;
  const compactAnswers = answers.filter(usefulWorkflowAnswer);
  const callActivities = messages.filter((message) => message.event_type === 'call_logged' || message.message_type === 'Call');

  if (!selected || !selectedAssessment) {
    return <WorkspaceState eyebrow="Leads · Inbound" title="No inbound inquiries yet" description="New Interakt conversations will appear here automatically through the webhook." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Inbound</span><h1 className="text-lg font-bold text-slate-950">Review & Qualify</h1></div>
          <p className="mt-1 text-xs text-slate-500">WhatsApp + Meta CTWA conversations, Setu Guru evidence, messages and calls in one sales workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Lead Queue</Link>
          {canWorkInbound ? <form action={refreshStarkInteraktStaging}><button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">↻ Sync contacts</button></form> : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Inbound inquiries</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{rows.length}</span></div><p className="mt-1 text-[11px] text-slate-400">Priority sorted by Setu Guru</p></div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
            {assessments.map(({ row, assessment }) => {
              const active = row.id === selected.id;
              return <Link key={row.id} href={`/leads/inbound?review=${row.id}`} className={`block border-b border-slate-100 px-4 py-4 transition ${active ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{row.person_name ?? row.contact_name ?? row.company_name ?? 'Unnamed contact'}</p><p className="mt-1 truncate text-[11px] text-slate-500">{assessment.source.label}</p></div><div className="text-right"><p className="text-[10px] font-semibold text-slate-500">{timeAgo(row.last_inbound_at ?? row.first_inquiry_at ?? row.source_created_at)}</p><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${scoreClass(assessment.score)}`}>{assessment.score}</span></div></div>
                <p className="mt-3 truncate text-xs text-slate-600">{row.pouch_type || row.packaging_type || 'Requirement not captured'}{row.quantity_text ? ` · ${row.quantity_text}` : ''}</p>
                <div className="mt-2 flex items-center justify-between"><span className="truncate text-[10px] text-slate-400">{row.company_name || row.brand_name || 'Company not confirmed'}</span><span className="text-[10px] font-bold text-slate-500">{assessment.bandLabel}</span></div>
              </Link>;
            })}
          </div>
        </section>

        <main className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><Link href="/leads/inbound" className="text-[11px] font-bold text-blue-600">← Back to Inbound</Link><div className="mt-2 flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-slate-950">{selected.person_name ?? selected.contact_name ?? 'Unnamed contact'}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${scoreClass(selectedAssessment.score)}`}>{selectedAssessment.score}/100 · {selectedAssessment.bandLabel}</span></div><p className="mt-1 text-xs text-slate-500">{selectedAssessment.source.label}{selected.company_name ? ` · ${selected.company_name}` : ''} · First inquiry {formatDateTime(selected.first_inquiry_at)}</p></div>
              <div className="flex gap-2">{selected.full_phone_number ? <a href={`tel:${selected.full_phone_number}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">☎ Call</a> : null}<a href="#message-customer" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">💬 Message</a></div>
            </div>
            {selected.interakt_assignee_name ? <p className="mt-3 text-[11px] text-slate-500">Assigned in Interakt to <strong className="text-slate-700">{selected.interakt_assignee_name}</strong></p> : null}
          </header>

          <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-5 py-5">
            {conversation.error ? <p className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{conversation.error}</p> : null}
            <div className="space-y-3">
              {messages.map((message) => {
                const call = message.event_type === 'call_logged' || message.message_type === 'Call';
                if (call) return <div key={message.id} className="mx-auto max-w-xl rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-blue-700">☎ Call logged · {message.actor_name || 'Setu Flow user'}</span><span className="text-[10px] text-slate-400">{formatDateTime(message.sent_at ?? message.received_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{message.message_text}</p></div>;
                const inbound = message.direction === 'inbound';
                const text = cleanInteractiveText(message);
                return <div key={message.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[78%] rounded-2xl px-3 py-2.5 ${inbound ? 'bg-slate-100 text-slate-800' : 'bg-emerald-50 text-slate-800'}`}><div className="flex items-center justify-between gap-4"><span className="text-[10px] font-bold text-slate-500">{message.actor_name || (inbound ? 'Customer' : 'Stark Packmate')}</span><span className="text-[10px] text-slate-400">{formatDateTime(message.received_at ?? message.sent_at)}</span></div>{isSafeMediaUrl(message.media_url) ? <a href={message.media_url!} target="_blank" rel="noopener noreferrer" className="mt-2 block overflow-hidden rounded-xl bg-white"><img src={message.media_url!} alt="Customer supplied packaging" className="max-h-72 w-full object-contain" /></a> : null}{text && text !== 'None' ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5">{text}</p> : null}{message.intelligence && (message.intelligence.companyName || message.intelligence.brandName) ? <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-[10px] leading-4 text-violet-800"><strong>✨ Setu Guru</strong><br />{message.intelligence.companyName ? `Possible company: ${message.intelligence.companyName}` : ''}{message.intelligence.companyName && message.intelligence.brandName ? ' · ' : ''}{message.intelligence.brandName ? `Possible brand: ${message.intelligence.brandName}` : ''}{typeof message.intelligence.confidence === 'number' ? ` · ${Math.round(message.intelligence.confidence * 100)}%` : ''}{message.intelligence.evidence ? <div className="mt-1">{message.intelligence.evidence}</div> : null}</div> : null}{!inbound ? <p className="mt-1 text-right text-[10px] font-bold text-emerald-700">{message.read_at ? 'Read' : message.delivered_at ? 'Delivered' : message.status}</p> : null}</div></div>;
              })}
              {!messages.length ? <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">No webhook conversation captured yet.</p> : null}
            </div>

            {compactAnswers.length ? <details className="mt-5 rounded-xl border border-violet-100 bg-violet-50"><summary className="cursor-pointer px-4 py-3 text-xs font-bold text-violet-800">Chatbot capture · {compactAnswers.length} useful answers</summary><div className="grid gap-2 border-t border-violet-100 p-3 sm:grid-cols-2">{compactAnswers.map((answer) => <div key={answer.id} className="rounded-lg bg-white p-3"><p className="text-[10px] font-bold text-violet-600">{answer.question_text}</p><p className="mt-1 text-xs font-semibold text-slate-800">{answer.answer_text}</p></div>)}</div></details> : null}
          </div>

          {canWorkInbound ? <div id="message-customer" className="border-t border-slate-100 bg-slate-50/70 p-4"><div className="grid gap-3 lg:grid-cols-2"><details open className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-900">💬 Send Message</summary><form action={sendStarkInteraktTemplate} className="space-y-3 border-t border-slate-100 p-4"><input type="hidden" name="rowId" value={selected.id} /><p className="text-[11px] leading-5 text-slate-500">Send an approved Interakt WhatsApp template from Setu Flow. The customer will receive it on WhatsApp and delivery/read status will return here.</p><label className="block text-xs font-semibold text-slate-600">Approved message template<input name="templateName" required placeholder="qualification_follow_up" className={inputClass()} /></label><input type="hidden" name="languageCode" value="en" /><label className="block text-xs font-semibold text-slate-600">Message variables<textarea name="bodyValues" rows={3} defaultValue={[selected.person_name || selected.contact_name || 'there', selectedAssessment.missingFields.join(', ')].join('\n')} className={inputClass()} /></label><button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">Send WhatsApp</button></form></details><details className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-slate-900">☎ Log Call</summary><form action={logStarkInteraktCall} className="space-y-3 border-t border-slate-100 p-4"><input type="hidden" name="rowId" value={selected.id} /><label className="block text-xs font-semibold text-slate-600">Outcome<select name="disposition" className={inputClass()} defaultValue="Connected"><option>Connected</option><option>No answer</option><option>Call back requested</option><option>Wrong number</option><option>Not interested</option></select></label><label className="block text-xs font-semibold text-slate-600">Duration<input name="duration" placeholder="e.g. 4 min" className={inputClass()} /></label><label className="block text-xs font-semibold text-slate-600">Call notes<textarea name="notes" rows={3} placeholder="What did the customer say? What is the next step?" className={inputClass()} /></label><button className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Save call activity</button></form></details></div></div> : null}
        </main>

        <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Lead summary</h3><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${scoreClass(selectedAssessment.score)}`}>{selectedAssessment.score}/100</span></div><dl className="mt-4 space-y-3 text-xs">{[['Company', selected.company_name], ['Brand', selected.brand_name], ['Packaging', selected.packaging_type], ['Pouch type', selected.pouch_type], ['Quantity', selected.quantity_text], ['Industry', selected.industry], ['Delivery', selected.delivery_location], ['Timeline', selected.buying_timeline]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className={`text-right font-semibold ${value ? 'text-slate-800' : 'text-amber-600'}`}>{value || 'Missing'}</dd></div>)}</dl><details className="mt-4 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-bold text-blue-700">Edit qualification details</summary><form action={saveStarkInteraktQualification} className="mt-3 space-y-2"><input type="hidden" name="rowId" value={selected.id} /><input name="personName" defaultValue={selected.person_name ?? selected.contact_name ?? ''} className={inputClass()} placeholder="Person" /><input name="companyName" defaultValue={selected.company_name ?? ''} className={inputClass()} placeholder="Company" /><input name="brandName" defaultValue={selected.brand_name ?? ''} className={inputClass()} placeholder="Brand" /><input name="packagingType" defaultValue={selected.packaging_type ?? ''} className={inputClass()} placeholder="Packaging type" /><input name="pouchType" defaultValue={selected.pouch_type ?? ''} className={inputClass()} placeholder="Pouch type" /><input name="quantityText" defaultValue={selected.quantity_text ?? ''} className={inputClass()} placeholder="Quantity / MOQ" /><input name="dimensionsPrint" defaultValue={selected.dimensions_print ?? ''} className={inputClass()} placeholder="Dimensions / print" /><input name="deliveryLocation" defaultValue={selected.delivery_location ?? ''} className={inputClass()} placeholder="Delivery location" /><input name="buyingTimeline" defaultValue={selected.buying_timeline ?? ''} className={inputClass()} placeholder="Buying timeline" /><input name="industry" defaultValue={selected.industry ?? ''} className={inputClass()} placeholder="Industry" /><textarea name="qualificationNotes" defaultValue={selected.qualification_notes ?? ''} className={inputClass()} rows={2} placeholder="Notes" /><div className="grid grid-cols-2 gap-2"><button name="status" value="reviewed" className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold">Save</button><button name="status" value="ready_to_qualify" className="rounded-xl bg-emerald-600 px-2 py-2 text-[11px] font-bold text-white">Save + Ready</button></div></form></details></section>

          {(selected.proposed_company_name || selected.proposed_brand_name) ? <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><h3 className="text-xs font-black text-violet-800">✨ Setu Guru identity evidence</h3>{selected.proposed_company_name ? <div className="mt-3"><p className="text-[10px] text-violet-600">Suggested company</p><p className="text-sm font-bold text-slate-900">{selected.proposed_company_name}</p>{canWorkInbound ? <form action={acceptStarkInteraktCompanySuggestion} className="mt-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="kind" value="company" /><button className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-violet-700">Use this company</button></form> : null}</div> : null}{selected.proposed_brand_name ? <div className="mt-3"><p className="text-[10px] text-violet-600">Suggested brand</p><p className="text-sm font-bold text-slate-900">{selected.proposed_brand_name}</p>{canWorkInbound ? <form action={acceptStarkInteraktCompanySuggestion} className="mt-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="kind" value="brand" /><button className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-violet-700">Use this brand</button></form> : null}</div> : null}{latestEvidence?.evidence ? <p className="mt-3 text-[10px] leading-4 text-violet-700">Evidence: {latestEvidence.evidence}</p> : null}</section> : null}

          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black text-emerald-800">Setu Guru recommendation</h3><span className="text-[10px] font-bold text-emerald-700">{selectedAssessment.bandLabel}</span></div><p className="mt-2 text-xs leading-5 text-emerald-900">{selectedAssessment.nextStep}</p>{selectedAssessment.missingFields.length ? <div className="mt-3 flex flex-wrap gap-1.5">{selectedAssessment.missingFields.map((field) => <span key={field} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700">{field}</span>)}</div> : null}</section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Quick actions</h3><div className="mt-3 space-y-2"><a href="#message-customer" className="block rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-blue-700">💬 Ask for missing details</a>{selected.full_phone_number ? <a href={`tel:${selected.full_phone_number}`} className="block rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700">☎ Call customer</a> : null}{canWorkInbound ? <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="needs_info" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-bold text-slate-700">Mark Needs info</button></form> : null}{canWorkInbound ? <form action={qualifyStarkInteraktAsLead}><input type="hidden" name="rowId" value={selected.id} /><button disabled={selected.intake_status !== 'ready_to_qualify'} className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-left text-xs font-bold text-white disabled:bg-slate-100 disabled:text-slate-400">→ {selected.intake_status === 'ready_to_qualify' ? 'Convert to Lead' : 'Ready to qualify first'}</button></form> : null}</div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Source</h3><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3"><span className="text-slate-500">Channel</span><strong>{selected.channel_source || 'WhatsApp'}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Acquisition</span><strong>{selected.acquisition_type || 'Unknown'}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Platform</span><strong>{selected.ad_platform || '—'}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Owner</span><strong>{selected.interakt_assignee_name || '—'}</strong></div></div>{selected.ad_url ? <a href={selected.ad_url} target="_blank" rel="noopener noreferrer" className="mt-3 block rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">Open Meta ad ↗</a> : null}<details className="mt-3 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-[11px] font-bold text-slate-500">Technical attribution</summary><div className="mt-2 space-y-1 text-[10px] text-slate-500"><p>Campaign: {selected.meta_campaign_id || '—'}</p><p>Ad set: {selected.meta_adset_id || '—'}</p><p>Ad: {selected.meta_ad_id || '—'}</p></div></details></section>

          {callActivities.length ? <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Recent calls</h3><div className="mt-3 space-y-2">{callActivities.slice(-3).reverse().map((call) => <div key={call.id} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] font-bold text-slate-700">{call.actor_name || 'Setu Flow user'} · {formatDateTime(call.sent_at)}</p><p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{call.message_text}</p></div>)}</div></section> : null}
        </aside>
      </div>
    </div>
  );
}
