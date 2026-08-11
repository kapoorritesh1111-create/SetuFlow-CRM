import Link from 'next/link';

import { WorkspaceState } from '@/components/ui/workspace-state';
import { InboundViewControls } from '@/features/integrations/interakt/components/inbound-view-controls';
import { PendingSubmitButton } from '@/features/integrations/interakt/components/pending-submit-button';
import { SalesMessageComposer } from '@/features/integrations/interakt/components/sales-message-composer';
import { logStarkInteraktCall } from '@/features/integrations/interakt/review-actions';
import {
  acceptStarkInteraktCompanySuggestion,
  readStarkInteraktConversation,
  refreshStarkInteraktStaging,
  saveStarkInteraktQualification,
  updateStarkInteraktIntakeStatus,
} from '@/features/integrations/interakt/server';
import {
  createStarkInteraktLeadOverride,
  evaluateStarkInteraktPage,
  readInboundWorkspaceV2,
} from '@/features/integrations/interakt/workspace-v2';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);
const DEFAULT_LIST_COLUMNS = ['contact', 'phone', 'company', 'requirement', 'source', 'guru', 'score', 'last_activity'];

type SearchParams = {
  review?: string;
  page?: string;
  q?: string;
  status?: string;
  guru?: string;
  source?: string;
  owner?: string;
  sort?: string;
  view?: string;
  columns?: string;
};

type ConversationMessage = {
  id: string;
  event_type: string | null;
  direction: 'inbound' | 'outbound' | 'system';
  actor_type: string;
  actor_name: string | null;
  message_type: string | null;
  message_text: string | null;
  media_url: string | null;
  intelligence: { companyName?: string | null; brandName?: string | null; confidence?: number; evidence?: string } | null;
  received_at: string | null;
  sent_at: string | null;
  status: string;
};

type WorkflowAnswer = { id: string; question_text: string; answer_text: string | null; answered_at: string | null };
type CompanyEvidenceEntry = { company_name?: string | null; brand_name?: string | null; confidence?: number; evidence?: string };
type NormalizedAnswer = WorkflowAnswer & { key: string; label: string };

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(value: string | null | undefined) {
  if (!value) return 'History pending';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return '—';
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function withinWhatsAppReplyWindow(value: string | null | undefined) {
  if (!value) return false;
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return false;
  const elapsed = Date.now() - at;
  return elapsed >= 0 && elapsed <= 24 * 60 * 60 * 1000;
}

function scoreClass(score: number) {
  if (score >= 80) return 'border-rose-200 bg-rose-50 text-rose-700';
  if (score >= 70) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (score >= 50) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

function guruLabel(status: string | null | undefined) {
  if (status === 'evaluated') return { label: 'Guru evaluated', className: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: '✓' };
  if (status === 'new_evidence') return { label: 'New evidence', className: 'text-violet-700 bg-violet-50 border-violet-200', icon: '●' };
  if (status === 'partial_history') return { label: 'History pending', className: 'text-amber-700 bg-amber-50 border-amber-200', icon: '◐' };
  return { label: 'Guru pending', className: 'text-slate-600 bg-slate-50 border-slate-200', icon: '○' };
}

function cleanInteractiveText(message: ConversationMessage) {
  const text = message.message_text ?? '';
  if (!text.startsWith('{')) return text;
  try {
    const parsed = JSON.parse(text) as Record<string, any>;
    const visible = parsed?.list_reply?.title ?? parsed?.button_reply?.title;
    if (visible) return String(visible);
    if (parsed?.type === 'nfm_reply' || parsed?.nfm_reply || text.includes('response_json') || text.includes('flow_token')) return '';
    return '';
  } catch {
    return text;
  }
}

function workflowCategory(question: string) {
  const q = question.toLowerCase();
  if (/company|business name|organisation|organization/.test(q)) return { key: 'company', label: 'Company' };
  if (/packaging type|packaging category/.test(q)) return { key: 'packaging', label: 'Packaging type' };
  if (/what type of pouch|pouch type/.test(q)) return { key: 'pouch', label: 'Pouch type' };
  if (/quantity|moq/.test(q)) return { key: 'quantity', label: 'Quantity' };
  if (/industry|business type|segment/.test(q)) return { key: 'industry', label: 'Industry' };
  if (/dimension|size|print|printing|finish|colour|color/.test(q)) return { key: 'dimensions', label: 'Dimensions / print' };
  if (/deliver|destination|location|city|country|ship/.test(q)) return { key: 'delivery', label: 'Delivery location' };
  if (/timeline|when.*need|required by|delivery date|buying/.test(q)) return { key: 'timeline', label: 'Buying timeline' };
  return null;
}

function normalizeWorkflowAnswers(answers: WorkflowAnswer[]) {
  const byKey = new Map<string, NormalizedAnswer>();
  for (const answer of answers) {
    const category = workflowCategory(answer.question_text);
    const text = String(answer.answer_text ?? '').trim();
    const lower = text.toLowerCase();
    if (!category || !text || lower === 'proceed' || lower === 'just browsing') continue;
    if (text.startsWith('{') && (/nfm_reply|response_json|flow_token/i.test(text))) continue;
    byKey.set(category.key, { ...answer, ...category });
  }
  return [...byKey.values()];
}

function paramsHref(searchParams: SearchParams, patch: Partial<SearchParams>) {
  const params = new URLSearchParams();
  const merged = { ...searchParams, ...patch };
  Object.entries(merged).forEach(([key, value]) => {
    if (value && value !== 'all') params.set(key, value);
  });
  const query = params.toString();
  return `/leads/inbound${query ? `?${query}` : ''}`;
}

function missingLabel(value: string) {
  const labels: Record<string, string> = {
    company: 'Company', person_company_split: 'Company/contact split', product: 'Product / pouch type',
    quantity: 'Quantity / requirement size', dimensions: 'Dimensions / print', destination: 'Delivery location', timeline: 'Buying timeline',
  };
  return labels[value] ?? value;
}

function summaryValue(value: unknown, required = false) {
  const text = String(value ?? '').trim();
  if (text) return { text, className: 'text-slate-800' };
  return required
    ? { text: 'Needed for Lead', className: 'text-amber-700' }
    : { text: 'Collect later', className: 'text-slate-400' };
}

function selectedColumns(raw: string | undefined) {
  const columns = String(raw ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  return new Set(columns.length ? columns : DEFAULT_LIST_COLUMNS);
}

export default async function InboundLeadsPage({ searchParams = {} }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return <WorkspaceState eyebrow="Leads · Inbound" title="Workspace membership needed" description="Sign in to your organization to review inbound inquiries." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  const isStark = workspace.organization.id === STARK_PACKMATE_ORG_ID || String(workspace.organization.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark) return <WorkspaceState eyebrow="Leads · Inbound" title="Inbound connector not enabled" description="The Interakt qualification workspace is currently enabled for Stark Packmate." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;

  const canWorkInbound = workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)));
  const view = searchParams.view === 'list' ? 'list' : 'review';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const workspaceData = await readInboundWorkspaceV2({ page, pageSize: view === 'list' ? 30 : 15, q: searchParams.q, status: searchParams.status, guru: searchParams.guru, source: searchParams.source, owner: searchParams.owner, sort: searchParams.sort });
  const rows = workspaceData.rows as any[];

  if (view === 'list') {
    return <div className="space-y-3 pb-8">
      <Header canWorkInbound={canWorkInbound} />
      <Kpis kpis={workspaceData.kpis} searchParams={searchParams} />
      <FilterBar searchParams={searchParams} />
      <ListView rows={rows} workspaceData={workspaceData} searchParams={searchParams} canWorkInbound={canWorkInbound} />
    </div>;
  }

  const requestedId = String(searchParams.review ?? '').trim();
  const selected = rows.find((row) => row.id === requestedId) ?? rows[0] ?? null;
  const conversation = selected ? await readStarkInteraktConversation(selected.id) : { messages: [], answers: [], error: null };
  const messages = (conversation.messages ?? []) as ConversationMessage[];
  const compactAnswers = normalizeWorkflowAnswers((conversation.answers ?? []) as WorkflowAnswer[]);
  const latestEvidence = selected?.company_evidence?.latest as CompanyEvidenceEntry | undefined;
  const currentGuru = selected ? guruLabel(selected.guru_evaluation_status) : guruLabel(null);

  if (!selected) return <div className="space-y-4"><Header canWorkInbound={canWorkInbound} /><Kpis kpis={workspaceData.kpis} searchParams={searchParams} /><FilterBar searchParams={searchParams} /><WorkspaceState eyebrow="Leads · Inbound" title="No matching inbound records" description="Try changing the current filters or sync Interakt contacts." primaryActionHref="/leads/inbound" primaryActionLabel="Clear filters" /></div>;

  const leadBlockers = (selected.lead_blockers ?? selected.missing_fields ?? []) as string[];
  const laterEnrichment = (selected.later_enrichment ?? []) as string[];
  const whatsappReplyWindowOpen = withinWhatsAppReplyWindow(selected.last_inbound_at);
  const customerName = selected.person_name || selected.contact_name || 'Customer';
  const summaryRows: Array<[string, unknown, boolean]> = [
    ['Company', selected.company_name, true],
    ['Brand', selected.brand_name, false],
    ['Packaging', selected.packaging_type, !selected.pouch_type],
    ['Pouch type', selected.pouch_type, !selected.packaging_type],
    ['Quantity', selected.quantity_text, false],
    ['Industry', selected.industry, false],
    ['Dimensions / print', selected.dimensions_print, false],
    ['Delivery', selected.delivery_location, false],
    ['Timeline', selected.buying_timeline, false],
  ];

  return <div className="space-y-3 pb-8">
    <Header canWorkInbound={canWorkInbound} />
    <Kpis kpis={workspaceData.kpis} searchParams={searchParams} />
    <FilterBar searchParams={searchParams} />

    <div className="grid items-start gap-3 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
      <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div><h2 className="text-sm font-bold text-slate-950">Inbound queue</h2><p className="mt-0.5 text-[11px] text-slate-500">{workspaceData.count.toLocaleString()} actionable records</p></div>
            {canWorkInbound && rows.length ? <form action={evaluateStarkInteraktPage}><input type="hidden" name="rowIds" value={rows.map((row) => row.id).join(',')} /><PendingSubmitButton idleLabel="✨ Evaluate page" pendingLabel="Evaluating…" pendingDetail={`Reviewing ${rows.length} inquiries on this page`} className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700" /></form> : null}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((row) => {
            const active = row.id === selected.id;
            const guru = guruLabel(row.guru_evaluation_status);
            const historyPending = !row.first_inquiry_at && !row.last_inbound_at;
            return <Link key={row.id} href={paramsHref(searchParams, { review: row.id })} className={`block px-4 py-3.5 transition ${active ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{row.person_name || row.contact_name || row.company_name || 'Unnamed contact'}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{row.company_name || row.brand_name || (historyPending ? 'Historical conversation not backfilled yet' : 'Company not confirmed')}</p></div>
                <div className="shrink-0 text-right"><p className="text-[10px] font-semibold text-slate-500">{timeAgo(row.last_inbound_at || row.first_inquiry_at || row.source_modified_at)}</p><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${scoreClass(Number(row.computed_score ?? 0))}`}>{row.computed_score ?? 0}</span></div>
              </div>
              <p className="mt-2 truncate text-xs font-medium text-slate-700">{row.pouch_type || row.packaging_type || (historyPending ? 'Contact synced · history pending' : 'Requirement not captured')}{row.quantity_text ? ` · ${row.quantity_text}` : ''}</p>
              <div className="mt-2 flex items-center justify-between gap-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${guru.className}`}>{guru.icon} {guru.label}</span>{row.needs_reply ? <span className="text-[9px] font-black uppercase text-rose-600">Needs reply</span> : null}</div>
            </Link>;
          })}
        </div>
        <Pagination page={workspaceData.page} totalPages={workspaceData.totalPages} count={workspaceData.count} pageSize={workspaceData.pageSize} searchParams={searchParams} />
      </aside>

      <main className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="sticky top-0 z-10 rounded-t-2xl border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black text-slate-950">{selected.person_name || selected.contact_name || 'Unnamed contact'}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${scoreClass(Number(selected.computed_score ?? 0))}`}>{selected.computed_score ?? 0}/100 · {selected.computed_band}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${currentGuru.className}`}>{currentGuru.icon} {currentGuru.label}</span></div>
              <p className="mt-1 text-xs text-slate-500">{selected.computed_source}{selected.company_name ? ` · ${selected.company_name}` : ''}{selected.first_inquiry_at ? ` · First inquiry ${formatDateTime(selected.first_inquiry_at)}` : ' · Historical chat backfill pending'}</p>
              {selected.interakt_assignee_name ? <p className="mt-1 text-[11px] text-slate-500">Assigned in Interakt to <strong className="text-slate-700">{selected.interakt_assignee_name}</strong></p> : null}
            </div>
            <div className="flex flex-wrap gap-2">{selected.full_phone_number ? <a href={`tel:${selected.full_phone_number}`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">☎ Call</a> : null}<a href="#message-customer" className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">💬 Message</a><a href="#create-lead" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">＋ Create Lead</a></div>
          </div>
        </header>

        <div className="space-y-4 px-5 py-5">
          {!selected.first_inquiry_at ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-bold text-amber-900">Historical conversation is not backfilled yet</p><p className="mt-1 text-[11px] leading-5 text-amber-800">This contact may have rich history in Interakt. Setu Flow is not treating missing historical evidence as a negative qualification decision.</p></div> : null}
          {conversation.error ? <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{conversation.error}</p> : null}

          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Conversation</h3><span className="text-[10px] text-slate-400">{messages.length} activities</span></div>
            <div className="space-y-3">
              {messages.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-500">No conversation has been imported for this contact yet.</div> : messages.map((message) => {
                const isCall = message.event_type === 'call_logged' || message.message_type === 'Call';
                if (isCall) return <div key={message.id} className="mx-auto max-w-xl rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase text-blue-700">☎ Call logged · {message.actor_name || 'Setu Flow user'}</span><span className="text-[10px] text-slate-400">{formatDateTime(message.sent_at || message.received_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{message.message_text}</p></div>;
                const inbound = message.direction === 'inbound';
                const text = cleanInteractiveText(message);
                const intelligence = message.intelligence;
                return <div key={message.id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[82%] rounded-2xl px-3.5 py-3 ${inbound ? 'bg-slate-100' : 'bg-emerald-50'}`}><div className="flex items-center justify-between gap-4"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{inbound ? message.actor_name || selected.person_name || selected.contact_name || 'Customer' : message.actor_name || 'Setu Flow'}</span><span className="text-[9px] text-slate-400">{formatDateTime(message.received_at || message.sent_at)}</span></div>{message.media_url && /^https:\/\//i.test(message.media_url) ? <div className="mt-2"><img src={message.media_url} alt="Customer supplied attachment" className="max-h-72 rounded-xl border border-white object-contain" /><a href={message.media_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[10px] font-bold text-blue-600">Open image ↗</a></div> : null}{text ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-800">{text}</p> : null}{intelligence && (intelligence.companyName || intelligence.brandName) ? <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-[10px] leading-4 text-violet-800">✨ Setu Guru: {intelligence.companyName ? `Possible company ${intelligence.companyName}. ` : ''}{intelligence.brandName ? `Possible brand ${intelligence.brandName}. ` : ''}{typeof intelligence.confidence === 'number' ? `${Math.round(intelligence.confidence * 100)}% confidence.` : ''}{intelligence.evidence ? ` ${intelligence.evidence}` : ''}</div> : null}</div></div>;
              })}
            </div>
          </section>

          {compactAnswers.length ? <details className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3" open><summary className="cursor-pointer text-xs font-bold text-violet-800">💬 Chatbot capture · {compactAnswers.length} useful answers</summary><div className="mt-3 grid gap-2 md:grid-cols-2">{compactAnswers.map((answer) => <div key={answer.key} className="rounded-xl bg-white px-3 py-2"><p className="text-[9px] font-bold uppercase text-violet-500">{answer.label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{answer.answer_text || '—'}</p></div>)}</div></details> : null}

          <section id="message-customer" className="grid gap-3 lg:grid-cols-2">
            <details className="rounded-xl border border-slate-200 bg-white p-4" open>
              <summary className="cursor-pointer text-xs font-black text-slate-800">💬 Message customer</summary>
              <div className="mt-4"><SalesMessageComposer rowId={selected.id} customerName={customerName} companyName={selected.company_name} packagingType={selected.packaging_type} pouchType={selected.pouch_type} quantityText={selected.quantity_text} replyWindowOpen={whatsappReplyWindowOpen} canSend={canWorkInbound} /></div>
            </details>
            <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-xs font-black text-slate-800">☎ Log a call</summary><form action={logStarkInteraktCall} className="mt-4 space-y-3"><input type="hidden" name="rowId" value={selected.id} /><div className="grid grid-cols-2 gap-2"><select name="disposition" className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option>Connected</option><option>No answer</option><option>Call back requested</option><option>Wrong number</option></select><input name="duration" placeholder="Duration, e.g. 4 min" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" /></div><textarea name="notes" rows={4} placeholder="Call notes" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" /><PendingSubmitButton disabled={!canWorkInbound} idleLabel="Log call" pendingLabel="Saving call…" className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white" /></form></details>
          </section>
        </div>
      </main>

      <aside className="sticky top-3 space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Lead summary</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${scoreClass(Number(selected.computed_score ?? 0))}`}>{selected.computed_score ?? 0}/100</span></div>
          <div className="mt-3 space-y-2 text-xs">{summaryRows.map(([label, value, required]) => { const display = summaryValue(value, required); return <div key={label} className="flex items-start justify-between gap-3"><span className="text-slate-500">{label}</span><span className={`max-w-[170px] text-right font-semibold ${display.className}`}>{display.text}</span></div>; })}</div>
          {selected.quantity_text ? <p className="mt-3 rounded-lg bg-blue-50 px-2.5 py-2 text-[10px] leading-4 text-blue-700">Quantity is sales context, not a gate. Small runs can be samples/prototypes; Sales decides whether to proceed.</p> : null}
          <details className="mt-3 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-[11px] font-bold text-blue-600">Edit qualification details</summary><form action={saveStarkInteraktQualification} className="mt-3 space-y-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="reviewed" />{[['companyName','Company',selected.company_name],['brandName','Brand',selected.brand_name],['packagingType','Packaging',selected.packaging_type],['pouchType','Pouch type',selected.pouch_type],['quantityText','Quantity / requirement size',selected.quantity_text],['dimensionsPrint','Dimensions / print',selected.dimensions_print],['deliveryLocation','Delivery location',selected.delivery_location],['buyingTimeline','Buying timeline',selected.buying_timeline],['industry','Industry',selected.industry]].map(([name,label,value]) => <label key={name} className="block text-[9px] font-bold uppercase text-slate-500">{label}<input name={name} defaultValue={value || ''} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs normal-case text-slate-800" /></label>)}<input type="hidden" name="personName" value={selected.person_name || selected.contact_name || ''} /><textarea name="qualificationNotes" defaultValue={selected.qualification_notes || ''} placeholder="Qualification notes" rows={3} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" /><PendingSubmitButton disabled={!canWorkInbound} idleLabel="Save details" pendingLabel="Saving…" className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white" /></form></details>
        </section>

        {(selected.proposed_company_name || selected.proposed_brand_name || latestEvidence) ? <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm"><h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">✨ Setu Guru identity evidence</h3>{selected.proposed_company_name ? <div className="mt-3"><p className="text-[10px] text-violet-600">Suggested company</p><p className="text-sm font-black text-violet-950">{selected.proposed_company_name}</p>{canWorkInbound ? <form action={acceptStarkInteraktCompanySuggestion} className="mt-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="kind" value="company" /><PendingSubmitButton idleLabel="Use this company" pendingLabel="Saving…" className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-violet-700" /></form> : null}</div> : null}{selected.proposed_brand_name ? <div className="mt-3"><p className="text-[10px] text-violet-600">Suggested brand</p><p className="text-sm font-black text-violet-950">{selected.proposed_brand_name}</p>{canWorkInbound ? <form action={acceptStarkInteraktCompanySuggestion} className="mt-2"><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="kind" value="brand" /><PendingSubmitButton idleLabel="Use this brand" pendingLabel="Saving…" className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-violet-700" /></form> : null}</div> : null}{latestEvidence?.evidence ? <p className="mt-3 text-[10px] leading-4 text-violet-700">Evidence: {latestEvidence.evidence}</p> : null}</section> : null}

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between"><h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">Setu Guru</h3><span className="text-[9px] font-bold text-emerald-700">{currentGuru.label}</span></div>
          <p className="mt-2 text-xs font-bold text-emerald-950">{selected.computed_band}</p>
          {leadBlockers.length ? <p className="mt-2 text-[11px] leading-5 text-emerald-800">Sales handoff still needs: {leadBlockers.map(missingLabel).join(', ')}.</p> : <p className="mt-2 text-[11px] leading-5 text-emerald-800">Ready for Lead. Sales can proceed now; MOQ is not enforced here.</p>}
          {laterEnrichment.length ? <div className="mt-2 rounded-lg border border-emerald-100 bg-white/70 px-2.5 py-2"><p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Can collect during quote preparation</p><p className="mt-1 text-[10px] leading-4 text-emerald-800">{laterEnrichment.map(missingLabel).join(' · ')}</p></div> : null}
          {canWorkInbound && selected.guru_evaluation_status !== 'evaluated' ? <form action={evaluateStarkInteraktPage} className="mt-3"><input type="hidden" name="rowIds" value={selected.id} /><PendingSubmitButton idleLabel="✨ Evaluate this inquiry" pendingLabel="Evaluating inquiry…" pendingDetail="Setu Guru is reviewing the latest captured evidence" className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[10px] font-bold text-emerald-800" /></form> : null}
        </section>

        <section id="create-lead" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">Sales decision</h3><p className="mt-2 text-xs font-bold text-slate-950">Create Lead</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Setu Guru advises; the salesperson decides. Duplicate checking always runs. Captured packaging is carried into quote preparation.</p>
          <form action={createStarkInteraktLeadOverride} className="mt-3 space-y-2"><input type="hidden" name="rowId" value={selected.id} />{leadBlockers.length ? <select name="overrideReason" required className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"><option value="">Why create now?</option><option>Customer confirmed by phone</option><option>Sufficient information to proceed</option><option>Existing relationship</option><option>Salesperson judgement</option></select> : <input type="hidden" name="overrideReason" value="Sales handoff requirements satisfied" />}<PendingSubmitButton disabled={!canWorkInbound} idleLabel="＋ Create Lead" pendingLabel="Creating Lead…" pendingDetail="Checking duplicates and carrying the captured requirement into the Lead" className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white" /></form>
          <div className="mt-2 grid grid-cols-2 gap-2"><form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="needs_info" /><PendingSubmitButton disabled={!canWorkInbound} idleLabel="Needs info" pendingLabel="Saving…" className="w-full rounded-lg border border-amber-200 px-2 py-2 text-[10px] font-bold text-amber-700" /></form><form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="nurture" /><PendingSubmitButton disabled={!canWorkInbound} idleLabel="Nurture" pendingLabel="Saving…" className="w-full rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-600" /></form></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Source</h3><div className="mt-3 space-y-2 text-xs">{[['Channel', selected.channel_source || 'WhatsApp'], ['Acquisition', selected.acquisition_type], ['Platform', selected.ad_platform], ['Owner', selected.interakt_assignee_name]].map(([label,value]) => <div key={label} className="flex justify-between gap-3"><span className="text-slate-500">{label}</span><strong className="text-right text-slate-800">{value || '—'}</strong></div>)}</div>{selected.ad_url ? <a href={selected.ad_url} target="_blank" rel="noreferrer" className="mt-3 block rounded-lg bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700">Open Meta ad ↗</a> : null}<details className="mt-3"><summary className="cursor-pointer text-[10px] font-bold text-slate-500">Technical attribution</summary><div className="mt-2 space-y-1 text-[9px] text-slate-500"><p>Campaign: {selected.meta_campaign_id || '—'}</p><p>Ad set: {selected.meta_adset_id || '—'}</p><p>Ad: {selected.meta_ad_id || '—'}</p></div></details></section>
      </aside>
    </div>
  </div>;
}

function Header({ canWorkInbound }: { canWorkInbound: boolean }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div><div className="flex items-center gap-2"><span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Inbound</span><h1 className="text-lg font-black text-slate-950">Sales Inbox</h1></div><p className="mt-1 text-xs text-slate-500">Review, communicate and move real buyer inquiries into the permanent Lead pipeline. Browsing-only contacts stay out until they engage.</p></div><div className="flex items-center gap-2"><Link href="/leads" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Lead Queue</Link>{canWorkInbound ? <form action={refreshStarkInteraktStaging}><PendingSubmitButton idleLabel="↻ Sync contacts" pendingLabel="Syncing contacts…" pendingDetail="Checking Interakt for new or updated contacts" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white" /></form> : null}</div></div>;
}

function Kpis({ kpis, searchParams }: { kpis: any; searchParams: SearchParams }) {
  const items = [
    { label: 'Active', value: kpis.active, detail: `${kpis.browsingHidden ?? 0} browsing hidden`, icon: '◉', tone: 'blue', patch: { status: undefined, guru: undefined } },
    { label: 'Inquiries', value: kpis.inquiries, detail: 'Conversation-backed', icon: '💬', tone: 'violet', patch: { status: undefined } },
    { label: 'Needs reply', value: kpis.needsReply, detail: 'Customer waiting', icon: '↩', tone: 'rose', patch: { status: 'needs_reply' } },
    { label: 'Needs info', value: kpis.needsInfo, detail: 'Sales handoff gaps', icon: '◇', tone: 'amber', patch: { status: 'needs_info' } },
    { label: 'Ready', value: kpis.ready, detail: 'Marked ready', icon: '✓', tone: 'emerald', patch: { status: 'ready' } },
    { label: 'Guru coverage', value: `${kpis.evaluated}/${kpis.active}`, detail: `${kpis.newEvidence} new evidence · ${kpis.pending} pending`, icon: '✨', tone: 'indigo', patch: { guru: 'evaluated' } },
  ];
  const tones: Record<string, string> = {
    blue: 'border-blue-100 bg-gradient-to-br from-white to-blue-50/70 hover:border-blue-300',
    violet: 'border-violet-100 bg-gradient-to-br from-white to-violet-50/70 hover:border-violet-300',
    rose: 'border-rose-100 bg-gradient-to-br from-white to-rose-50/70 hover:border-rose-300',
    amber: 'border-amber-100 bg-gradient-to-br from-white to-amber-50/70 hover:border-amber-300',
    emerald: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 hover:border-emerald-300',
    indigo: 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 hover:border-indigo-300',
  };
  return <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{items.map((item) => <Link key={item.label} href={paramsHref(searchParams, { ...item.patch, page: '1', review: undefined })} className={`group rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[item.tone]}`}><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{item.label}</p><span className="text-sm opacity-70 transition group-hover:scale-110">{item.icon}</span></div><p className="mt-1 text-xl font-black text-slate-950">{String(item.value)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{item.detail}</p></Link>)}</div>;
}

function FilterBar({ searchParams }: { searchParams: SearchParams }) {
  return <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <form method="get" className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="view" value={searchParams.view || 'review'} />
      {searchParams.columns ? <input type="hidden" name="columns" value={searchParams.columns} /> : null}
      <label className="min-w-[240px] flex-1 text-[9px] font-bold uppercase text-slate-500">Search<input name="q" defaultValue={searchParams.q || ''} placeholder="Search by name, company or phone" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs normal-case" /></label>
      <Select name="status" label="Segment" value={searchParams.status || 'all'} options={[['all','All'],['new','New'],['needs_reply','Needs reply'],['needs_info','Needs info'],['ready','Ready'],['history_pending','History pending']]} />
      <Select name="guru" label="Setu Guru" value={searchParams.guru || 'all'} options={[['all','All'],['evaluated','Evaluated'],['new_evidence','New evidence'],['partial_history','History pending'],['pending','Pending']]} />
      <Select name="source" label="Source" value={searchParams.source || 'all'} options={[['all','All'],['ctwa','CTWA'],['instagram','Instagram'],['whatsapp','WhatsApp']]} />
      <label className="text-[9px] font-bold uppercase text-slate-500">Owner<input name="owner" defaultValue={searchParams.owner || ''} placeholder="Any owner" className="mt-1 block w-32 rounded-xl border border-slate-200 px-3 py-2 text-xs normal-case" /></label>
      <Select name="sort" label="Sort" value={searchParams.sort || 'recent'} options={[['recent','Most recent'],['oldest','Oldest'],['score','Highest score'],['name','Name A-Z']]} />
      <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">Apply</button>
      <Link href={`/leads/inbound?view=${searchParams.view === 'list' ? 'list' : 'review'}`} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500">Clear</Link>
    </form>
    <InboundViewControls view={searchParams.view || 'review'} columns={searchParams.columns} />
  </div>;
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[][] }) {
  return <label className="text-[9px] font-bold uppercase text-slate-500">{label}<select name={name} defaultValue={value} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-xs normal-case">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}

function ListView({ rows, workspaceData, searchParams, canWorkInbound }: { rows: any[]; workspaceData: any; searchParams: SearchParams; canWorkInbound: boolean }) {
  const columns = selectedColumns(searchParams.columns);
  const show = (id: string) => columns.has(id);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div><h2 className="text-sm font-black text-slate-950">Inbound contacts</h2><p className="mt-0.5 text-[10px] text-slate-500">{workspaceData.count.toLocaleString()} matching records · 30 per page</p></div>
      {canWorkInbound && rows.length ? <form action={evaluateStarkInteraktPage}><input type="hidden" name="rowIds" value={rows.map((row) => row.id).join(',')} /><PendingSubmitButton idleLabel="✨ Evaluate page" pendingLabel="Evaluating…" pendingDetail={`Reviewing ${rows.length} visible contacts`} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700" /></form> : null}
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left">
        <thead className="bg-slate-50/80"><tr>
          {show('contact') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Contact</th> : null}
          {show('phone') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Phone</th> : null}
          {show('company') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Company</th> : null}
          {show('requirement') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Requirement</th> : null}
          {show('quantity') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Quantity</th> : null}
          {show('source') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Source</th> : null}
          {show('owner') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Owner</th> : null}
          {show('guru') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Setu Guru</th> : null}
          {show('score') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Score</th> : null}
          {show('last_activity') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Last activity</th> : null}
          {show('needs_reply') ? <th className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Reply</th> : null}
          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Action</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const guru = guruLabel(row.guru_evaluation_status);
            return <tr key={row.id} className="group hover:bg-blue-50/30">
              {show('contact') ? <td className="px-4 py-3"><p className="whitespace-nowrap text-xs font-black text-slate-900">{row.person_name || row.contact_name || 'Unnamed contact'}</p>{row.email ? <p className="mt-0.5 text-[9px] text-slate-400">{row.email}</p> : null}</td> : null}
              {show('phone') ? <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{row.full_phone_number || '—'}</td> : null}
              {show('company') ? <td className="max-w-[220px] px-4 py-3"><p className="truncate text-xs font-semibold text-slate-700">{row.company_name || row.brand_name || 'Not confirmed'}</p></td> : null}
              {show('requirement') ? <td className="max-w-[250px] px-4 py-3"><p className="truncate text-xs font-semibold text-slate-700">{row.pouch_type || row.packaging_type || 'Not captured'}</p>{row.industry ? <p className="mt-0.5 truncate text-[9px] text-slate-400">{row.industry}</p> : null}</td> : null}
              {show('quantity') ? <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">{row.quantity_text || '—'}</td> : null}
              {show('source') ? <td className="px-4 py-3"><p className="whitespace-nowrap text-xs font-semibold text-slate-700">{row.computed_source}</p>{row.acquisition_type === 'ctwa' ? <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-700">CTWA</span> : null}</td> : null}
              {show('owner') ? <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{row.interakt_assignee_name || 'Unassigned'}</td> : null}
              {show('guru') ? <td className="px-4 py-3"><span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[9px] font-bold ${guru.className}`}>{guru.icon} {guru.label}</span></td> : null}
              {show('score') ? <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${scoreClass(Number(row.computed_score ?? 0))}`}>{row.computed_score ?? 0}</span></td> : null}
              {show('last_activity') ? <td className="whitespace-nowrap px-4 py-3"><p className="text-xs font-semibold text-slate-700">{timeAgo(row.last_inbound_at || row.first_inquiry_at || row.source_modified_at)}</p><p className="mt-0.5 text-[9px] text-slate-400">{formatDateTime(row.last_inbound_at || row.first_inquiry_at || row.source_modified_at)}</p></td> : null}
              {show('needs_reply') ? <td className="px-4 py-3">{row.needs_reply ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-black text-rose-700">Needs reply</span> : <span className="text-[9px] font-bold text-slate-400">Up to date</span>}</td> : null}
              <td className="px-4 py-3 text-right"><Link href={paramsHref(searchParams, { view: 'review', review: row.id })} className="inline-flex rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[10px] font-black text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">Review</Link></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <Pagination page={workspaceData.page} totalPages={workspaceData.totalPages} count={workspaceData.count} pageSize={workspaceData.pageSize} searchParams={searchParams} />
  </section>;
}

function Pagination({ page, totalPages, count, pageSize, searchParams }: { page: number; totalPages: number; count: number; pageSize: number; searchParams: SearchParams }) {
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, count);
  const startPage = totalPages <= 5 ? 1 : Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4));
  return <div className="border-t border-slate-100 px-4 py-3"><p className="text-center text-[10px] text-slate-500">Showing {start}–{end} of {count}</p><div className="mt-2 flex items-center justify-center gap-1"><Link aria-disabled={page <= 1} href={paramsHref(searchParams, { page: String(Math.max(1, page - 1)), review: undefined })} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${page <= 1 ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 text-slate-600'}`}>‹ Prev</Link>{Array.from({ length: Math.min(5, totalPages) }, (_, index) => startPage + index).map((candidate) => <Link key={candidate} href={paramsHref(searchParams, { page: String(candidate), review: undefined })} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${candidate === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'}`}>{candidate}</Link>)}<Link aria-disabled={page >= totalPages} href={paramsHref(searchParams, { page: String(Math.min(totalPages, page + 1)), review: undefined })} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${page >= totalPages ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 text-slate-600'}`}>Next ›</Link></div></div>;
}
