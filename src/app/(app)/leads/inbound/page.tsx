import Link from 'next/link';

import { StatusBadge } from '@/components/ui/status-badge';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
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

type ReviewTab = 'qualification' | 'conversation' | 'source';
type SearchParams = { review?: string; tab?: string };

type CompanyEvidenceEntry = {
  source?: string;
  company_name?: string | null;
  brand_name?: string | null;
  confidence?: number;
  evidence?: string;
  model?: string | null;
  message_id?: string | null;
  media_url?: string | null;
  question?: string | null;
  observed_at?: string | null;
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
  fetched_at: string | null;
  updated_at: string | null;
  person_name: string | null;
  company_name: string | null;
  brand_name: string | null;
  proposed_company_name: string | null;
  proposed_brand_name: string | null;
  company_evidence: { latest?: CompanyEvidenceEntry; history?: CompanyEvidenceEntry[] } | null;
  company_intelligence_updated_at: string | null;
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
  qualified_lead_id: string | null;
};

type ConversationMessage = {
  id: string;
  direction: 'inbound' | 'outbound' | 'system';
  actor_type: string;
  actor_name: string | null;
  message_type: string | null;
  message_text: string | null;
  media_url: string | null;
  intelligence: {
    companyName?: string | null;
    brandName?: string | null;
    confidence?: number;
    evidence?: string;
    source?: string;
  } | null;
  received_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
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
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        return String(row.name ?? row.tag ?? row.label ?? row.value ?? '').trim();
      }
      return '';
    }).filter(Boolean);
  }
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

function timeAgo(value: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB');
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scoreClasses(score: number) {
  if (score >= 80) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (score >= 70) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (score >= 50) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (score >= 30) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function statusLabel(status: string | null) {
  switch (status) {
    case 'needs_info': return 'Needs info';
    case 'ready_to_qualify': return 'Ready to qualify';
    case 'nurture': return 'Nurture';
    case 'reviewed': return 'Reviewed';
    default: return 'New';
  }
}

function statusTone(status: string | null) {
  if (status === 'ready_to_qualify') return 'success' as const;
  if (status === 'needs_info') return 'info' as const;
  return 'neutral' as const;
}

function tabHref(rowId: string, tab: ReviewTab) {
  return `/leads/inbound?review=${encodeURIComponent(rowId)}&tab=${tab}`;
}

function inputClass() {
  return 'mt-1 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
}

function confidenceLabel(value: number | undefined) {
  if (typeof value !== 'number') return null;
  return `${Math.round(value * 100)}% confidence`;
}

function isSafeMediaUrl(value: string | null) {
  return Boolean(value && /^https:\/\//i.test(value));
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
  const selectedId = String(searchParams?.review ?? '').trim();
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const selectedContact = selected ? toContact(selected) : null;
  const tab = ['conversation', 'source'].includes(String(searchParams?.tab)) ? String(searchParams?.tab) as ReviewTab : 'qualification';
  const conversation = selected ? await readStarkInteraktConversation(selected.id) : { messages: [], answers: [], error: null };
  const selectedMessages = (conversation.messages ?? []) as ConversationMessage[];
  const selectedAnswers = (conversation.answers ?? []) as WorkflowAnswer[];
  const selectedEvidence = selected ? evidenceFromRow(selected, selectedMessages, selectedAnswers) : undefined;
  const selectedAssessment = selectedContact ? assessInteraktContact(selectedContact, new Date(), selectedEvidence) : null;

  const assessments = rows.map((row) => {
    const contact = toContact(row);
    const assessment = assessInteraktContact(contact, new Date(), evidenceFromRow(row));
    return { row, contact, assessment };
  });
  const newCount = rows.filter((row) => !row.intake_status || ['new', 'staged'].includes(row.intake_status)).length;
  const readyCount = rows.filter((row) => row.intake_status === 'ready_to_qualify').length;
  const needsInfoCount = rows.filter((row) => row.intake_status === 'needs_info').length;
  const hotCount = assessments.filter(({ assessment }) => assessment.score >= 80).length;
  const latestCompanyEvidence = selected?.company_evidence?.latest ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center border-b border-slate-200 px-5">
          <Link href="/leads" className="border-b-2 border-transparent px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-900">📋 Lead Queue</Link>
          <Link href="/leads/inbound" className="flex items-center gap-2 border-b-2 border-blue-500 px-4 py-3 text-xs font-bold text-slate-900">💬 Inbound <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black text-white">{rows.length}</span></Link>
          <span className="px-4 py-3 text-xs font-bold text-slate-300">🎯 Command Center</span>
          <span className="px-4 py-3 text-xs font-bold text-slate-300">◇ Quote Preview</span>
          <span className="px-4 py-3 text-xs font-bold text-slate-300">✅ Approval Queue</span>
          <Link href="/pipeline" className="ml-auto px-4 py-3 text-xs font-bold text-slate-500 hover:text-blue-700">⊕ View in Pipeline →</Link>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Trade Command Center · Leads</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Inbound Qualification Desk</h1>
              <p className="mt-1 text-sm text-slate-500">Qualify, communicate and preserve Meta/CTWA attribution without leaving Setu Flow.</p>
            </div>
            {canWorkInbound ? <form action={refreshStarkInteraktStaging}><button type="submit" disabled={!staged.tableReady} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">↻ Sync new/changed Interakt</button></form> : <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">View only</span>}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-blue-600">New</p><p className="mt-1 text-2xl font-bold text-slate-950">{newCount}</p><p className="mt-1 text-xs text-slate-500">Unreviewed inquiries</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ready to qualify</p><p className="mt-1 text-2xl font-bold text-slate-950">{readyCount}</p><p className="mt-1 text-xs text-slate-500">Human promotion required</p></div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Needs info</p><p className="mt-1 text-2xl font-bold text-slate-950">{needsInfoCount}</p><p className="mt-1 text-xs text-slate-500">Missing qualification details</p></div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Hot</p><p className="mt-1 text-2xl font-bold text-slate-950">{hotCount}</p><p className="mt-1 text-xs text-slate-500">Intent-backed score ≥80</p></div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-900">ⓘ Setu Guru uses contact data, chatbot answers, customer messages and customer-supplied images. Image-derived company/brand identity always requires human confirmation.</div>
        </div>
      </div>

      {staged.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{staged.error}</div> : null}

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_440px]' : ''}`}>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Setu Guru</th><th className="px-4 py-3">Qualification</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody>
                {assessments.map(({ row, assessment }) => {
                  const active = selected?.id === row.id;
                  const identity = assessment.identity.companyName ? `Company · ${assessment.identity.companyName}` : assessment.identity.personName ? `Person · ${assessment.identity.personName}` : 'Unclear identity';
                  return (
                    <tr key={row.id} className={`border-b border-slate-100 align-middle ${active ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3"><div className="font-bold text-slate-950">{row.person_name ?? row.contact_name ?? row.company_name ?? 'Unnamed contact'}</div><div className="mt-0.5 text-xs text-slate-500">{row.company_name ? `${row.company_name} · ` : ''}{row.brand_name ? `${row.brand_name} · ` : ''}{row.full_phone_number ?? row.email ?? 'No direct contact detail'}</div></td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-700">{assessment.source.label}</div>{row.ad_network === 'meta' ? <div className="mt-1 text-[10px] font-bold text-violet-600">Meta{row.ad_platform ? ` · ${row.ad_platform}` : ''}</div> : null}</td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-700">{timeAgo(row.first_inquiry_at ?? row.source_created_at)}</div><div className="mt-0.5 text-[10px] text-slate-400">{row.first_inquiry_at ? 'First inquiry' : 'Contact created'}</div></td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-800">{identity}</div><div className="mt-0.5 max-w-[220px] text-xs text-slate-500">{row.pouch_type || row.packaging_type || 'Requirement not captured yet'}{row.quantity_text ? ` · ${row.quantity_text}` : ''}</div>{row.proposed_company_name || row.proposed_brand_name ? <div className="mt-1 text-[10px] font-bold text-violet-600">Identity suggestion to review</div> : null}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${scoreClasses(assessment.score)}`}>{assessment.score}/100</span><span className="text-xs font-semibold text-slate-600">{assessment.bandLabel}</span></div><div className="mt-1 max-w-[230px] text-[11px] text-slate-500">{assessment.missingFields.length ? `Missing: ${assessment.missingFields.slice(0, 2).join(', ')}` : 'Core qualification captured'}</div></td>
                      <td className="px-4 py-3"><StatusBadge label={statusLabel(row.intake_status)} tone={statusTone(row.intake_status)} dot={false} /></td>
                      <td className="px-4 py-3 text-right"><Link href={tabHref(row.id, 'qualification')} className="inline-flex rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Review</Link></td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">No active inbound inquiries. Sync Interakt or wait for the webhook to receive new inquiries.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        {selected && selectedContact && selectedAssessment ? (
          <aside className="rounded-3xl border border-slate-200 bg-white shadow-soft xl:sticky xl:top-24 xl:self-start">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Qualification Review</p><h2 className="mt-1 text-lg font-bold text-slate-950">{selected.person_name ?? selected.contact_name ?? selected.company_name ?? 'Unnamed contact'}</h2><p className="mt-1 text-xs text-slate-500">{selected.company_name ? `${selected.company_name} · ` : ''}{selected.brand_name ? `Brand: ${selected.brand_name} · ` : ''}{selected.full_phone_number ?? selected.email ?? 'No direct contact detail'}</p></div>
                <Link href="/leads/inbound" className="text-sm font-bold text-slate-400 hover:text-slate-700">×</Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-600">{selectedAssessment.source.label}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${scoreClasses(selectedAssessment.score)}`}>{selectedAssessment.score}/100 · {selectedAssessment.bandLabel}</span></div>
              <p className="mt-2 text-[11px] text-slate-500">{selected.first_inquiry_at ? `First inquiry ${formatDateTime(selected.first_inquiry_at)}` : 'Exact inquiry time will appear once an inbound webhook is captured.'}</p>
            </div>

            <div className="flex border-y border-slate-100 px-4">
              {(['qualification', 'conversation', 'source'] as ReviewTab[]).map((item) => <Link key={item} href={tabHref(selected.id, item)} className={`px-3 py-3 text-[11px] font-bold capitalize ${tab === item ? 'border-b-2 border-blue-500 text-blue-700' : 'border-b-2 border-transparent text-slate-500'}`}>{item}</Link>)}
            </div>

            {tab === 'qualification' ? (
              <div className="p-5">
                <section><h3 className="text-xs font-black text-slate-900">Setu Guru recommendation</h3><p className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">{selectedAssessment.nextStep}</p></section>

                {(selected.proposed_company_name || selected.proposed_brand_name) ? <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Setu Guru identity suggestion</p><p className="mt-1 text-[11px] leading-5 text-violet-900">Detected from customer-supplied conversation evidence. Review before confirming.</p></div>{latestCompanyEvidence?.confidence !== undefined ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-700">{confidenceLabel(latestCompanyEvidence.confidence)}</span> : null}</div>{selected.proposed_company_name ? <div className="mt-3 rounded-xl bg-white p-3"><p className="text-[10px] text-slate-400">Suggested company</p><p className="mt-1 text-sm font-bold text-slate-900">{selected.proposed_company_name}</p>{canWorkInbound ? <form action={acceptStarkInteraktCompanySuggestion} className="mt-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="kind" value="company" /><button className="rounded-lg border border-violet-200 px-3 py-1.5 text-[10px] font-bold text-violet-700">Confirm company</button></form> : null}</div> : null}{selected.proposed_brand_name ? <div className="mt-2 rounded-xl bg-white p-3"><p className="text-[10px] text-slate-400">Suggested brand</p><p className="mt-1 text-sm font-bold text-slate-900">{selected.proposed_brand_name}</p>{canWorkInbound ? <form action={acceptStarkInteraktCompanySuggestion} className="mt-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="kind" value="brand" /><button className="rounded-lg border border-violet-200 px-3 py-1.5 text-[10px] font-bold text-violet-700">Confirm brand</button></form> : null}</div> : null}{latestCompanyEvidence?.evidence ? <p className="mt-3 text-[11px] leading-5 text-violet-800">Evidence: {latestCompanyEvidence.evidence}</p> : null}</section> : null}

                <section className="mt-5"><h3 className="text-xs font-black text-slate-900">Missing before qualification</h3><div className="mt-3 flex flex-wrap gap-2">{selectedAssessment.missingFields.length ? selectedAssessment.missingFields.map((field) => <span key={field} className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">• {field}</span>) : <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">✓ Core qualification complete</span>}</div></section>

                <form action={saveStarkInteraktQualification} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <input type="hidden" name="rowId" value={selected.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[11px] font-bold text-slate-600">Person<input name="personName" defaultValue={selected.person_name ?? selectedAssessment.identity.personName ?? ''} disabled={!canWorkInbound} className={inputClass()} /></label>
                    <label className="text-[11px] font-bold text-slate-600">Company<input name="companyName" defaultValue={selected.company_name ?? ''} placeholder={selected.proposed_company_name || 'Company name'} disabled={!canWorkInbound} className={inputClass()} /></label>
                  </div>
                  <label className="block text-[11px] font-bold text-slate-600">Brand<input name="brandName" defaultValue={selected.brand_name ?? ''} placeholder={selected.proposed_brand_name || 'Brand name, if different'} disabled={!canWorkInbound} className={inputClass()} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[11px] font-bold text-slate-600">Packaging type<input name="packagingType" defaultValue={selected.packaging_type ?? ''} placeholder="Pouches" disabled={!canWorkInbound} className={inputClass()} /></label>
                    <label className="text-[11px] font-bold text-slate-600">Pouch type<input name="pouchType" defaultValue={selected.pouch_type ?? ''} placeholder="Flat Bottom pouch" disabled={!canWorkInbound} className={inputClass()} /></label>
                  </div>
                  <label className="block text-[11px] font-bold text-slate-600">Quantity / MOQ<input name="quantityText" defaultValue={selected.quantity_text ?? ''} placeholder="1,000–5,000 pcs" disabled={!canWorkInbound} className={inputClass()} /></label>
                  <label className="block text-[11px] font-bold text-slate-600">Dimensions / print<input name="dimensionsPrint" defaultValue={selected.dimensions_print ?? ''} placeholder="250g · matte · 8 colour" disabled={!canWorkInbound} className={inputClass()} /></label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[11px] font-bold text-slate-600">Delivery location<input name="deliveryLocation" defaultValue={selected.delivery_location ?? ''} disabled={!canWorkInbound} className={inputClass()} /></label>
                    <label className="text-[11px] font-bold text-slate-600">Buying timeline<input name="buyingTimeline" defaultValue={selected.buying_timeline ?? ''} disabled={!canWorkInbound} className={inputClass()} /></label>
                  </div>
                  <label className="block text-[11px] font-bold text-slate-600">Industry<input name="industry" defaultValue={selected.industry ?? ''} disabled={!canWorkInbound} className={inputClass()} /></label>
                  <label className="block text-[11px] font-bold text-slate-600">Qualification notes<textarea name="qualificationNotes" defaultValue={selected.qualification_notes ?? ''} disabled={!canWorkInbound} rows={3} className={`${inputClass()} py-2`} /></label>
                  {canWorkInbound ? <div className="grid grid-cols-2 gap-2"><button name="status" value="reviewed" className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700">Save review</button><button name="status" value="ready_to_qualify" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">Save + Ready to qualify</button></div> : null}
                </form>

                {canWorkInbound ? <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                  <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="needs_info" /><button className="w-full rounded-xl border border-blue-200 px-3 py-2.5 text-xs font-bold text-blue-700">Needs info</button></form>
                  <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="nurture" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Nurture</button></form>
                  <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="duplicate" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Duplicate</button></form>
                  <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="existing_customer" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Existing customer</button></form>
                  <form action={updateStarkInteraktIntakeStatus} className="col-span-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="not_relevant" /><button className="w-full rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600">Not relevant</button></form>
                </div> : null}

                {canWorkInbound ? <form action={qualifyStarkInteraktAsLead} className="mt-4"><input type="hidden" name="rowId" value={selected.id} /><button disabled={selected.intake_status !== 'ready_to_qualify'} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">{selected.intake_status === 'ready_to_qualify' ? 'Qualify as Lead →' : 'Mark Ready to qualify first'}</button><p className="mt-2 text-center text-[10px] text-slate-400">A final duplicate check runs before Lead creation.</p></form> : null}
              </div>
            ) : null}

            {tab === 'conversation' ? (
              <div className="p-5">
                {conversation.error ? <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{conversation.error}</p> : null}
                <section><div className="flex items-center justify-between"><h3 className="text-xs font-black text-slate-900">Conversation</h3><span className="text-[10px] text-slate-400">Captured after webhook activation</span></div>
                  <div className="mt-3 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                    {selectedMessages.map((message) => <div key={message.id} className={`rounded-2xl border p-3 ${message.direction === 'inbound' ? 'border-slate-200 bg-slate-50' : 'ml-8 border-emerald-100 bg-emerald-50'}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase text-slate-500">{message.direction === 'inbound' ? message.actor_name || 'Customer' : message.actor_name || 'Stark Packmate'}</span><span className="text-[10px] text-slate-400">{formatDateTime(message.received_at ?? message.sent_at)}</span></div>{isSafeMediaUrl(message.media_url) ? <a href={message.media_url!} target="_blank" rel="noopener noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-white"><img src={message.media_url!} alt="Customer supplied attachment" className="max-h-64 w-full object-contain" /><span className="block px-3 py-2 text-[10px] font-bold text-blue-700">Open customer image ↗</span></a> : null}<p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-800">{message.message_text || `[${message.message_type || 'message'}]`}</p>{message.intelligence && (message.intelligence.companyName || message.intelligence.brandName) ? <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-[10px] text-violet-800"><strong>Setu Guru:</strong> {message.intelligence.companyName ? `possible company ${message.intelligence.companyName}` : ''}{message.intelligence.companyName && message.intelligence.brandName ? ' · ' : ''}{message.intelligence.brandName ? `possible brand ${message.intelligence.brandName}` : ''}{typeof message.intelligence.confidence === 'number' ? ` · ${Math.round(message.intelligence.confidence * 100)}%` : ''}{message.intelligence.evidence ? <div className="mt-1 font-normal">{message.intelligence.evidence}</div> : null}</div> : null}{message.direction === 'outbound' ? <p className="mt-2 text-[10px] font-bold text-emerald-700">{message.read_at ? 'Read' : message.delivered_at ? 'Delivered' : message.status}</p> : null}</div>)}
                    {!selectedMessages.length ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No message webhook history captured yet. Existing Interakt history remains in Interakt; new inbound/outbound events will appear here after webhook configuration.</p> : null}
                  </div>
                </section>

                <section className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-black text-slate-900">Chatbot answers</h3><div className="mt-3 space-y-2">{selectedAnswers.map((answer) => <div key={answer.id} className="rounded-xl border border-violet-100 bg-violet-50 p-3"><p className="text-[10px] font-black text-violet-700">{answer.question_text}</p><p className="mt-1 text-xs font-semibold text-slate-800">{answer.answer_text || '—'}</p><p className="mt-1 text-[10px] text-slate-400">{formatDateTime(answer.answered_at)}</p></div>)}{!selectedAnswers.length ? <p className="text-xs text-slate-500">No structured chatbot answers captured yet.</p> : null}</div></section>

                {canWorkInbound ? <section className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-black text-slate-900">Send WhatsApp via Interakt</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Use an approved Interakt WhatsApp template. Enter template variables one per line in the exact order defined in Interakt.</p><form action={sendStarkInteraktTemplate} className="mt-3 space-y-3"><input type="hidden" name="rowId" value={selected.id} /><label className="block text-[11px] font-bold text-slate-600">Approved template name<input name="templateName" required placeholder="qualification_follow_up" className={inputClass()} /></label><label className="block text-[11px] font-bold text-slate-600">Language code<input name="languageCode" defaultValue="en" className={inputClass()} /></label><label className="block text-[11px] font-bold text-slate-600">Body variables<textarea name="bodyValues" rows={4} defaultValue={[selected.person_name || selected.contact_name || 'there', selectedAssessment.missingFields.join(', ')].join('\n')} className={`${inputClass()} py-2`} /></label><button className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white">Send WhatsApp template</button></form></section> : null}
              </div>
            ) : null}

            {tab === 'source' ? (
              <div className="p-5">
                <h3 className="text-xs font-black text-slate-900">Acquisition attribution</h3>
                <div className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-500">Provider</span><strong>Interakt</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500">Channel</span><strong>{selected.channel_source || 'WhatsApp'}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500">Acquisition</span><strong>{selected.acquisition_type || 'Unknown'}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500">Ad network</span><strong>{selected.ad_network || '—'}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500">Platform</span><strong>{selected.ad_platform || '—'}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-500">First inquiry</span><strong className="text-right">{formatDateTime(selected.first_inquiry_at)}</strong></div>{selected.interakt_assignee_name ? <div className="flex justify-between gap-4"><span className="text-slate-500">Interakt owner</span><strong>{selected.interakt_assignee_name}</strong></div> : null}</div>
                {selected.ad_url ? <a href={selected.ad_url} target="_blank" rel="noopener noreferrer" className="mt-4 block break-all rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs font-semibold text-violet-700">Open Meta ad ↗<br /><span className="font-normal">{selected.ad_url}</span></a> : <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">No ad URL has been captured in a webhook yet.</p>}
                <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-4 text-[11px]"><div><span className="text-slate-400">Campaign ID</span><p className="font-semibold text-slate-700">{selected.meta_campaign_id || '—'}</p></div><div><span className="text-slate-400">Ad set ID</span><p className="font-semibold text-slate-700">{selected.meta_adset_id || '—'}</p></div><div><span className="text-slate-400">Ad ID</span><p className="font-semibold text-slate-700">{selected.meta_ad_id || '—'}</p></div></div>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
