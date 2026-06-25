import Link from 'next/link';
import { uploadWorkspaceDocument, waiveLeadDocumentRequirement } from '@/features/compliance/server/actions';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getApplicableRequirementRules, type DocumentRequirementRule, type LeadRequirementDocument } from '@/lib/document-requirements';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';

const APPROVED_STATUSES = new Set(['approved', 'complete', 'completed', 'ready']);
const PENDING_STATUSES = new Set(['submitted', 'pending', 'in_review', 'pending_review']);
const COMPLIANCE_DOCS_PREFIX = 'storage://compliance-docs/';

type SearchParams = Record<string, string | string[] | undefined>;
type LeadRow = { id: string; company_name: string; contact_name: string | null; lead_type: string | null; country: string | null };
type ProductInterest = { product_id: string | null; products?: { id: string; name: string | null; hsn_code?: string | null } | null };
type MarketInterest = { market_id: string | null; markets?: { id: string; name: string | null } | null };
type QuoteContext = { id: string; quote_number: string | null; lead_id: string | null; status: string | null; currency: string | null; display_currency: string | null; updated_at: string | null };
type QuoteDocument = { id: string; file_name: string | null; file_url: string | null; doc_type: string | null; requirement_code: string | null; status: string | null; uploaded_at: string | null; review_notes: string | null };
type EvidenceLink = QuoteDocument & { downloadUrl: string | null };

function firstParam(params: SearchParams | undefined, key: string) { const value = params?.[key]; return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
function normalizeStatus(value: unknown) { return String(value ?? '').trim().toLowerCase(); }
function isApproved(value: unknown) { return APPROVED_STATUSES.has(normalizeStatus(value)); }
function isPending(value: unknown) { return PENDING_STATUSES.has(normalizeStatus(value)); }
function quoteLabel(quote?: QuoteContext | null) { return quote?.quote_number ? `Quote ${quote.quote_number}` : quote?.id ? `Quote ${quote.id.slice(0, 8)}` : 'Active quote'; }
function reviewReturnHref(leadId: string, quoteId: string) { return quoteId ? `/leads/${encodeURIComponent(leadId)}/quote?quoteId=${encodeURIComponent(quoteId)}&step=4#quote-review` : `/leads/${encodeURIComponent(leadId)}/quote`; }
function assistReturnPath(leadId: string, quoteId: string) { return quoteId ? `/compliance/assist?quoteId=${quoteId}` : `/compliance/assist?leadId=${leadId}`; }
function latestQuoteDoc(docs: QuoteDocument[]) { return [...docs].sort((a, b) => String(b.uploaded_at ?? '').localeCompare(String(a.uploaded_at ?? '')))[0] ?? null; }
function storagePathFromUrl(value: string | null) { return value?.startsWith(COMPLIANCE_DOCS_PREFIX) ? value.slice(COMPLIANCE_DOCS_PREFIX.length) : null; }
async function buildEvidenceLinks(db: Awaited<ReturnType<typeof createClient>>, docs: QuoteDocument[]): Promise<EvidenceLink[]> {
  return await Promise.all(docs.map(async (doc) => {
    const path = storagePathFromUrl(doc.file_url);
    if (!path) return { ...doc, downloadUrl: null };
    const { data } = await db.storage.from('compliance-docs').createSignedUrl(path, 600);
    return { ...doc, downloadUrl: data?.signedUrl ?? null };
  }));
}
function quoteDocStatus(docs: QuoteDocument[], hasQuote: boolean) {
  if (!hasQuote) return { label: 'No quote', tone: 'neutral' as const, reason: 'No active quote context was found. Open this from a quote or use the command center quote action first.' };
  if (!docs.length) return { label: 'Missing', tone: 'blocked' as const, reason: 'Latest document: none linked. Quote review blocks send because no quote-linked evidence, waiver, or dispatch deferral is attached yet.' };
  const latest = latestQuoteDoc(docs);
  if (docs.some((doc) => isApproved(doc.status))) return { label: 'Cleared', tone: 'ready' as const, reason: `Latest document: ${latest?.file_name ?? 'linked evidence'} · approved/reviewed.` };
  if (docs.some((doc) => isPending(doc.status))) return { label: 'In review', tone: 'attention' as const, reason: `Latest document: ${latest?.file_name ?? 'linked evidence'} · still in review.` };
  return { label: 'Needs review', tone: 'blocked' as const, reason: `Latest document: ${latest?.file_name ?? 'linked evidence'} · status ${latest?.status ?? 'not approved'}.` };
}
function toneClasses(tone: 'ready' | 'attention' | 'blocked' | 'neutral') {
  if (tone === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (tone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}
function getRuleDocuments(rule: DocumentRequirementRule, documents: LeadRequirementDocument[]) { return documents.filter((document) => String(document.requirement_code ?? '') === rule.requirement_code); }
function ruleCleared(rule: DocumentRequirementRule, documents: LeadRequirementDocument[]) { return getRuleDocuments(rule, documents).some((document) => isApproved(document.status)); }

async function submitEvidence(formData: FormData): Promise<void> { 'use server'; await uploadWorkspaceDocument(undefined, formData); }
async function submitWaiver(formData: FormData): Promise<void> { 'use server'; await waiveLeadDocumentRequirement(undefined, formData); }

function EvidenceLinks({ links }: { links: EvidenceLink[] }) {
  if (!links.length) return null;
  return <div className="mt-4 rounded-2xl border border-current/15 bg-white/70 p-3">
    <p className="text-xs font-bold uppercase tracking-[0.14em]">Stored evidence</p>
    <div className="mt-2 grid gap-2">{links.slice(0, 3).map((doc) => <div key={doc.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>{doc.file_name ?? 'Evidence file'} · {doc.status ?? 'submitted'}</span>{doc.downloadUrl ? <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 hover:text-sky-900">Download evidence</a> : <span className="text-xs text-slate-500">No stored file link</span>}</div>)}</div>
  </div>;
}

function QuickFixActions({ leadId, quoteId, canReview, requirementCode, returnPath }: { leadId: string; quoteId: string; canReview: boolean; requirementCode: string; returnPath: string }) {
  if (!quoteId) return <StateMessage title="Quote context needed" description="Open Compliance Assist from the active quote so evidence, waiver, or dispatch deferral can be linked to the exact quote review." tone="warning" />;
  return <div className="grid gap-3 lg:grid-cols-3">
    <form action={submitEvidence} encType="multipart/form-data" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="lead_id" value={leadId} /><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="requirement_code" value={requirementCode} /><input type="hidden" name="doc_type" value="quote_review_evidence" /><input type="hidden" name="return_path" value={returnPath} />
      <p className="text-sm font-semibold text-slate-950">Attach evidence</p><p className="mt-1 text-xs leading-5 text-slate-500">Uploads a real quote-linked evidence file for review. PDF, JPG, PNG, DOC, or DOCX up to 10MB.</p>
      <input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-full file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-sky-700" />
      <textarea name="review_notes" rows={2} placeholder="What this evidence proves" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" />
      <button className="mt-3 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="submit">Attach to quote</button>
    </form>
    <form action={submitWaiver} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <input type="hidden" name="lead_id" value={leadId} /><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="requirement_code" value={requirementCode} /><input type="hidden" name="doc_type" value="waiver" /><input type="hidden" name="return_path" value={returnPath} />
      <p className="text-sm font-semibold text-amber-950">Waive for quote</p><p className="mt-1 text-xs leading-5 text-amber-800">Reviewer decides the missing document is not required for this quote.</p>
      <textarea name="review_notes" rows={3} placeholder="Required quote waiver reason" className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" />
      <button disabled={!canReview} className="mt-3 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Record waiver</button>
    </form>
    <form action={submitWaiver} className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm">
      <input type="hidden" name="lead_id" value={leadId} /><input type="hidden" name="quote_id" value={quoteId} /><input type="hidden" name="requirement_code" value={requirementCode} /><input type="hidden" name="doc_type" value="dispatch_defer" /><input type="hidden" name="return_path" value={returnPath} />
      <p className="text-sm font-semibold text-indigo-950">Defer to dispatch</p><p className="mt-1 text-xs leading-5 text-indigo-800">Quote can proceed, but the document stays recorded for order dispatch.</p>
      <textarea name="review_notes" rows={3} placeholder="Required dispatch deferral reason" className="mt-3 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" />
      <button disabled={!canReview} className="mt-3 rounded-full bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Defer with reason</button>
    </form>
  </div>;
}

export default async function ComplianceAssistPage({ searchParams }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return <WorkspaceState eyebrow="Compliance assist" title="Workspace access needed" description="Sign in to a workspace before opening compliance assist." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  const db = (await createClient()) as any;
  const requestedLeadId = firstParam(searchParams, 'leadId');
  const requestedQuoteId = firstParam(searchParams, 'quoteId');
  let quoteContext: QuoteContext | null = null;

  if (requestedQuoteId) {
    const { data } = await db.from('quotes').select('id, quote_number, lead_id, status, currency, display_currency, updated_at').eq('organization_id', workspace.organization.id).eq('id', requestedQuoteId).maybeSingle();
    quoteContext = data ?? null;
  }

  if (!quoteContext?.id && requestedLeadId) {
    const { data } = await db.from('quotes').select('id, quote_number, lead_id, status, currency, display_currency, updated_at').eq('organization_id', workspace.organization.id).eq('lead_id', requestedLeadId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    quoteContext = data ?? null;
  }

  const quoteId = quoteContext?.id ?? requestedQuoteId;
  const leadId = requestedLeadId || quoteContext?.lead_id || '';
  if (!leadId) return <WorkspaceState eyebrow="Compliance assist" title="Open from a lead or quote" description="Compliance Assist needs a lead or quote context so it can show the correct blocker and evidence path." primaryActionHref="/leads" primaryActionLabel="Open leads" />;

  const [{ data: lead }, { data: leadProducts }, { data: leadMarkets }, { data: leadDocuments }, { data: quoteDocuments }, { data: rules }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, lead_type, country').eq('organization_id', workspace.organization.id).eq('id', leadId).maybeSingle(),
    db.from('lead_product_interests').select('product_id, products(id, name, hsn_code)').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('lead_markets').select('market_id, markets(id, name)').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('documents').select('id, requirement_code, status, expires_at, related_entity, related_id, file_name, file_url, doc_type, uploaded_at, review_notes').eq('organization_id', workspace.organization.id).eq('related_entity', 'lead').eq('related_id', leadId),
    quoteId ? db.from('documents').select('id, file_name, file_url, doc_type, requirement_code, status, uploaded_at, review_notes').eq('organization_id', workspace.organization.id).eq('related_entity', 'quote').eq('related_id', quoteId).order('uploaded_at', { ascending: false }) : Promise.resolve({ data: [] }),
    db.from('document_requirement_rules').select('id, organization_id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', workspace.organization.id).eq('is_active', true),
  ]);
  if (!lead?.id) return <WorkspaceState eyebrow="Compliance assist" title="Lead not found" description="The selected lead could not be loaded in this organization." primaryActionHref="/leads" primaryActionLabel="Open leads" />;

  const productRows = (leadProducts ?? []) as ProductInterest[];
  const marketRows = (leadMarkets ?? []) as MarketInterest[];
  const productIds = productRows.map((row) => row.product_id).filter(Boolean) as string[];
  const marketIds = marketRows.map((row) => row.market_id).filter(Boolean) as string[];
  const quoteRules = getApplicableRequirementRules({ rules: (rules ?? []) as DocumentRequirementRule[], leadType: lead.lead_type, marketIds, productIds, scope: 'quote_send' }).filter((rule) => rule.is_mandatory === true);
  const openQuoteRules = quoteRules.filter((rule) => !ruleCleared(rule, (leadDocuments ?? []) as LeadRequirementDocument[]));
  const quoteDocs = (quoteDocuments ?? []) as QuoteDocument[];
  const evidenceLinks = await buildEvidenceLinks(db, quoteDocs);
  const quoteDoc = quoteDocStatus(quoteDocs, Boolean(quoteContext?.id || quoteId));
  const quoteReviewBlocked = Boolean((quoteContext?.id || quoteId) && quoteDoc.tone !== 'ready');
  const canReview = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  const leadName = (lead as LeadRow).company_name;
  const returnHref = reviewReturnHref(lead.id, quoteId);
  const returnPath = assistReturnPath(lead.id, quoteId);
  const requirementCode = openQuoteRules[0]?.requirement_code ?? 'quote_review_document';
  const headerBadgeClass = quoteReviewBlocked ? 'bg-rose-50 text-rose-700' : quoteDoc.tone === 'attention' ? 'bg-amber-50 text-amber-700' : quoteDoc.tone === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700';
  const headerBadgeLabel = quoteReviewBlocked ? 'Blocked' : quoteDoc.label;

  return <div className="mx-auto max-w-5xl space-y-4">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Lead → Quote → Compliance</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Quick compliance fix</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600"><strong>{leadName}</strong>{quoteContext ? ` · ${quoteLabel(quoteContext)}` : ''}. This panel shows the same quote-review document blocker and the shortest safe way to clear or defer it.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Return target: Review step</span>{quoteContext ? <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">{quoteLabel(quoteContext)}</span> : null}<span className={`rounded-full px-3 py-1.5 ${headerBadgeClass}`}>{headerBadgeLabel}</span></div>
        </div>
        <div className="flex flex-wrap gap-2"><Link href={returnHref} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Back to review</Link><Link href={`/leads/${encodeURIComponent(lead.id)}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open command center</Link></div>
      </div>
    </section>

    {firstParam(searchParams, 'notice') ? <StateMessage title="Compliance update" description={firstParam(searchParams, 'notice')} tone="success" /> : null}

    <section className={`rounded-[1.25rem] border p-5 shadow-sm ${toneClasses(quoteDoc.tone)}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em]">Exact quote-review blocker</p><h2 className="mt-2 text-xl font-semibold">{quoteReviewBlocked ? 'Document evidence is missing for this quote review' : quoteDoc.tone === 'ready' ? 'Quote-review document posture is clear' : 'Open an active quote to review document posture'}</h2><p className="mt-2 text-sm leading-6">{quoteDoc.reason}</p></div><span className="rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]">{quoteDoc.label}</span></div>
      <EvidenceLinks links={evidenceLinks} />
      {quoteReviewBlocked ? <div className="mt-4"><QuickFixActions leadId={lead.id} quoteId={quoteId} canReview={canReview} requirementCode={requirementCode} returnPath={returnPath} /></div> : null}
    </section>

    {openQuoteRules.length ? <section className="rounded-[1.25rem] border border-amber-200 bg-amber-50/70 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Rule-based requirements also open</p><div className="mt-3 grid gap-3">{openQuoteRules.map((rule) => <div key={rule.id} className="rounded-2xl border border-amber-200 bg-white p-4"><p className="font-semibold text-slate-950">{rule.title || rule.requirement_code}</p><p className="mt-1 text-sm text-slate-600">This rule still needs evidence, waiver, or dispatch deferral.</p><div className="mt-3"><QuickFixActions leadId={lead.id} quoteId={quoteId} canReview={canReview} requirementCode={rule.requirement_code} returnPath={returnPath} /></div></div>)}</div></section> : null}

    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">What happens next</p><div className="mt-3 grid gap-3 lg:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-950">1. Attach evidence</p><p className="mt-1 text-sm text-slate-600">Uploads a real quote-linked evidence file so Review no longer says latest document none linked.</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-950">2. Waive for quote</p><p className="mt-1 text-sm text-amber-800">Reviewer records why the quote can proceed without that document.</p></div><div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><p className="font-semibold text-indigo-950">3. Defer to dispatch</p><p className="mt-1 text-sm text-indigo-800">Reviewer records that the document is required later before order dispatch.</p></div></div></section>
  </div>;
}
