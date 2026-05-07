import Link from 'next/link';
import { uploadWorkspaceDocument, updateComplianceWorkflow, waiveLeadDocumentRequirement } from '@/features/compliance/server/actions';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { getApplicableRequirementRules, type DocumentRequirementRule, type LeadRequirementDocument } from '@/lib/document-requirements';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';

const APPROVED_STATUSES = new Set(['approved', 'complete', 'completed', 'ready', 'waived']);
const PENDING_STATUSES = new Set(['submitted', 'pending', 'in_review', 'pending_review']);

type SearchParams = Record<string, string | string[] | undefined>;

type LeadRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  lead_type: string | null;
  country: string | null;
};

type ProductInterest = { product_id: string | null; products?: { id: string; name: string | null; hsn_code?: string | null } | null };
type MarketInterest = { market_id: string | null; markets?: { id: string; name: string | null } | null };
type ComplianceRow = { id: string; status: string; severity: string | null; due_at: string | null; compliance_checklist_items?: { code: string | null; description: string | null; is_mandatory: boolean | null } | null };

function firstParam(params: SearchParams | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function normalizeStatus(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function isApproved(value: unknown) {
  return APPROVED_STATUSES.has(normalizeStatus(value));
}

function requirementStatus(rule: DocumentRequirementRule, documents: LeadRequirementDocument[]) {
  const matches = documents.filter((document) => String(document.requirement_code ?? '') === rule.requirement_code);
  if (matches.some((document) => isApproved(document.status))) return { label: 'Satisfied', tone: 'ready' as const };
  if (matches.some((document) => PENDING_STATUSES.has(normalizeStatus(document.status)))) return { label: 'In review', tone: 'attention' as const };
  return { label: rule.is_mandatory ? 'Required blocker' : 'Advisory prep', tone: rule.is_mandatory ? 'blocked' as const : 'neutral' as const };
}

function toneClasses(tone: 'ready' | 'attention' | 'blocked' | 'neutral') {
  if (tone === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (tone === 'blocked') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (tone === 'attention') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function stageLabel(rule: DocumentRequirementRule) {
  if (rule.is_mandatory) return 'Quote-send gate';
  const scope = String(rule.progression_scope ?? '').replace(/_/g, ' ');
  return scope || 'Dispatch / order prep';
}

function nextActionLabel(rule: DocumentRequirementRule) {
  return rule.is_mandatory ? 'Upload evidence or record a reviewed waiver.' : 'Prepare evidence for dispatch or order execution.';
}

async function submitEvidence(formData: FormData): Promise<void> {
  'use server';
  await uploadWorkspaceDocument(undefined, formData);
}

async function submitWaiver(formData: FormData): Promise<void> {
  'use server';
  await waiveLeadDocumentRequirement(undefined, formData);
}

async function submitComplianceWaiver(formData: FormData): Promise<void> {
  'use server';
  await updateComplianceWorkflow(undefined, formData);
}

function RequirementCard({ rule, leadId, canReview, documents }: { rule: DocumentRequirementRule; leadId: string; canReview: boolean; documents: LeadRequirementDocument[] }) {
  const status = requirementStatus(rule, documents);
  const returnPath = `/compliance/assist?leadId=${leadId}`;
  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-950">{rule.title || rule.requirement_code}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${toneClasses(status.tone)}`}>{status.label}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{stageLabel(rule)}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {rule.is_mandatory ? 'This item belongs to the quote-send gate and must be satisfied, reviewed, or waived before send.' : 'This is advisory preparation for dispatch or order execution unless your organization makes it mandatory.'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:max-w-xs">
          <p className="font-semibold text-slate-950">Next safe action</p>
          <p className="mt-1 leading-5">{nextActionLabel(rule)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <form action={submitEvidence} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="requirement_code" value={rule.requirement_code} />
          <input type="hidden" name="doc_type" value={rule.doc_type || rule.requirement_code || 'evidence'} />
          <input type="hidden" name="return_path" value={returnPath} />
          <p className="text-sm font-semibold text-slate-950">Submit evidence for review</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Record the file name and notes so a reviewer can decide whether this clears the requirement. This does not auto-approve the evidence.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">File name<input name="file_name" placeholder="COA.pdf or Packing List.xlsx" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" /></label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Expires at<input type="date" name="expires_at" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" /></label>
          </div>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Evidence notes<textarea name="review_notes" rows={2} placeholder="What this evidence proves" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" /></label>
          <button className="mt-3 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800" type="submit">Submit evidence</button>
        </form>
        <form action={submitWaiver} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="requirement_code" value={rule.requirement_code} />
          <input type="hidden" name="doc_type" value="waiver" />
          <input type="hidden" name="return_path" value={returnPath} />
          <p className="text-sm font-semibold text-amber-950">Reviewed waiver decision</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">Use only after a permitted reviewer decides this requirement is not needed for this lead or quote context. A reason is required.</p>
          <textarea name="review_notes" rows={3} placeholder="Required reason, e.g. advisory only before dispatch" className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400" />
          <button disabled={!canReview} className="mt-3 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Record waiver with reason</button>
          {!canReview ? <p className="mt-2 text-xs text-amber-800">Only users with compliance review permission can waive requirements.</p> : null}
        </form>
      </div>
    </section>
  );
}

export default async function ComplianceAssistPage({ searchParams }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) {
    return <WorkspaceState eyebrow="Compliance assist" title="Workspace access needed" description="Sign in to a workspace before opening compliance assist." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const leadId = firstParam(searchParams, 'leadId');
  if (!leadId) {
    return <WorkspaceState eyebrow="Compliance assist" title="Open from a lead" description="Compliance Assist needs a lead context so it can show product, market, and document requirements." primaryActionHref="/leads" primaryActionLabel="Open leads" />;
  }

  const db = (await createClient()) as any;
  const [{ data: lead }, { data: leadProducts }, { data: leadMarkets }, { data: documents }, { data: complianceRows }, { data: rules }] = await Promise.all([
    db.from('leads').select('id, company_name, contact_name, lead_type, country').eq('organization_id', workspace.organization.id).eq('id', leadId).maybeSingle(),
    db.from('lead_product_interests').select('product_id, products(id, name, hsn_code)').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('lead_markets').select('market_id, markets(id, name)').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('documents').select('id, requirement_code, status, expires_at, related_entity, related_id, file_name, doc_type, uploaded_at, review_notes').eq('organization_id', workspace.organization.id).eq('related_entity', 'lead').eq('related_id', leadId),
    db.from('lead_compliance_items').select('id, status, severity, due_at, compliance_checklist_items(code, description, is_mandatory)').eq('organization_id', workspace.organization.id).eq('lead_id', leadId),
    db.from('document_requirement_rules').select('id, organization_id, market_id, product_id, lead_type, progression_scope, requirement_code, title, doc_type, applies_to_entity, is_mandatory, is_active').eq('organization_id', workspace.organization.id).eq('is_active', true),
  ]);

  if (!lead?.id) {
    return <WorkspaceState eyebrow="Compliance assist" title="Lead not found" description="The selected lead could not be loaded in this organization." primaryActionHref="/leads" primaryActionLabel="Open leads" />;
  }

  const productRows = (leadProducts ?? []) as ProductInterest[];
  const marketRows = (leadMarkets ?? []) as MarketInterest[];
  const productIds = productRows.map((row) => row.product_id).filter(Boolean) as string[];
  const marketIds = marketRows.map((row) => row.market_id).filter(Boolean) as string[];
  const allRules = (rules ?? []) as DocumentRequirementRule[];
  const quoteRules = getApplicableRequirementRules({ rules: allRules, leadType: lead.lead_type, marketIds, productIds, scope: 'quote_send' });
  const dispatchRules = getApplicableRequirementRules({ rules: allRules, leadType: lead.lead_type, marketIds, productIds, scope: 'contract_progression' });
  const requiredQuoteRules = quoteRules.filter((rule) => rule.is_mandatory === true);
  const advisoryRules = [...quoteRules, ...dispatchRules].filter((rule, index, array) => rule.is_mandatory !== true && array.findIndex((entry) => entry.requirement_code === rule.requirement_code) === index);
  const blockerRows = ((complianceRows ?? []) as ComplianceRow[]).filter((row) => row.compliance_checklist_items?.is_mandatory !== false && !APPROVED_STATUSES.has(normalizeStatus(row.status)));
  const canReview = hasWorkspaceCapability(workspace.currentRoles, 'compliance.review');
  const leadName = (lead as LeadRow).company_name;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Compliance Assist</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Resolve blockers without mixing stages</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Lead: <strong>{leadName}</strong>{lead.country ? ` · Destination: ${lead.country}` : ''}. Quote-send blockers, advisory dispatch documents, and waiver decisions are separated so the next action stays clear.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {productRows.map((row) => row.products?.name).filter(Boolean).slice(0, 5).map((name) => <span key={String(name)} className="rounded-full bg-slate-100 px-3 py-1.5">{name}</span>)}
              {marketRows.map((row) => row.markets?.name).filter(Boolean).slice(0, 5).map((name) => <span key={String(name)} className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">{name}</span>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/leads?leadId=${lead.id}&view=quote`} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Back to quote</Link>
            <Link href={`/leads/${lead.id}`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open command center</Link>
          </div>
        </div>
      </section>

      {firstParam(searchParams, 'notice') ? <StateMessage title="Compliance update" description={firstParam(searchParams, 'notice')} tone="success" /> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">Required quote-send blockers</p><p className="mt-2 text-3xl font-semibold text-slate-950">{requiredQuoteRules.length + blockerRows.length}</p><p className="mt-1 text-sm text-rose-700">Must be satisfied or reviewed before send.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Advisory dispatch prep</p><p className="mt-2 text-3xl font-semibold text-slate-950">{advisoryRules.length}</p><p className="mt-1 text-sm text-slate-500">Prepare for order execution; not a quote blocker unless configured.</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Human-reviewed decisions</p><p className="mt-2 text-3xl font-semibold text-slate-950">{canReview ? 'On' : 'Locked'}</p><p className="mt-1 text-sm text-amber-800">Waivers require permission and a reason.</p></div>
      </section>

      <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Decision guide</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4"><p className="font-semibold text-rose-950">Required blocker</p><p className="mt-1 text-sm leading-6 text-rose-800">Blocks quote send until evidence is satisfied or a permitted reviewer records a waiver.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-950">Advisory document</p><p className="mt-1 text-sm leading-6 text-slate-600">Useful for dispatch or order execution. It should not stop quote send unless your rule makes it mandatory.</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><p className="font-semibold text-amber-950">Waiver boundary</p><p className="mt-1 text-sm leading-6 text-amber-800">A waiver is a human decision, not an automatic cleanup. Capture a reason and reviewer permission.</p></div>
        </div>
      </section>

      {blockerRows.length ? (
        <section className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-5">
          <h2 className="text-lg font-semibold text-rose-950">Open compliance checklist blockers</h2>
          <div className="mt-4 space-y-3">
            {blockerRows.map((row) => (
              <form action={submitComplianceWaiver} key={row.id} className="rounded-2xl border border-rose-200 bg-white p-4">
                <input type="hidden" name="compliance_id" value={row.id} />
                <input type="hidden" name="status" value="waived" />
                <p className="font-semibold text-slate-950">{row.compliance_checklist_items?.description || row.compliance_checklist_items?.code || 'Compliance item'}</p>
                <p className="mt-1 text-sm text-slate-500">Current status: {row.status}. Upload evidence in the document cards below, or waive only if an owner/admin confirms it is not required for this quote.</p>
                <textarea name="review_notes" rows={2} placeholder="Waiver / fix note" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button disabled={!canReview} type="submit" className="mt-3 rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">Record reviewed waiver</button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Required before quote send</h2>
          <p className="mt-1 text-sm text-slate-500">Only these items should block the quote send gate.</p>
        </div>
        {requiredQuoteRules.length ? requiredQuoteRules.map((rule) => <RequirementCard key={rule.id} rule={rule} leadId={lead.id} canReview={canReview} documents={documents ?? []} />) : <StateMessage title="Quote compliance clear" description="No mandatory quote-send document rule is currently blocking this lead." tone="success" />}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Advisory before dispatch / order execution</h2>
          <p className="mt-1 text-sm text-slate-500">These items help operations prepare the order. They should not block quote creation unless your org explicitly marks them mandatory.</p>
        </div>
        {advisoryRules.length ? advisoryRules.map((rule) => <RequirementCard key={rule.id} rule={rule} leadId={lead.id} canReview={canReview} documents={documents ?? []} />) : <StateMessage title="No advisory document rules" description="Set product, market, or category document guidance in compliance rules when needed." tone="neutral" />}
      </div>

      {(documents ?? []).length ? (
        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Linked evidence register</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(documents ?? []).map((document: any) => <div key={document.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{document.file_name}</p><p className="text-sm text-slate-500">{document.requirement_code || document.doc_type || 'general'} · {document.status}</p></div><span className="text-xs text-slate-400">{document.uploaded_at ? new Date(document.uploaded_at).toLocaleDateString() : ''}</span></div>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
