/**
 * Orders — execution workspace
 *
 * Live Supabase query: accepted quotes with documents,
 * compliance items, and contract status per order card.
 */

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

// ─── Explicit row types (avoids Supabase generic inference issues) ────────────

type QuoteRow = {
  id: string;
  status: string;
  currency: string | null;
  updated_at: string;
  lead_id: string;
};

type LeadRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  country: string | null;
  deal_value: number | null;
  deal_currency: string | null;
};

type DocRow = {
  id: string;
  file_name: string;
  doc_type: string;
  status: string;
  uploaded_at: string;
  version: number;
  related_id: string;
};

type ComplianceRow = {
  id: string;
  lead_id: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  compliance_item_id: string;
};

type ContractRow = {
  id: string;
  quote_id: string;
  status: string;
  signed_at: string | null;
  starts_on: string | null;
  ends_on: string | null;
};

type OrderRecord = {
  quoteId: string;
  quoteStatus: string;
  currency: string | null;
  updatedAt: string;
  leadId: string;
  companyName: string;
  contactName: string | null;
  country: string | null;
  dealValue: number | null;
  dealCurrency: string | null;
  documents: DocRow[];
  complianceItems: ComplianceRow[];
  contract: ContractRow | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusClasses(s: string): string {
  const v = s.toLowerCase();
  if (['approved', 'complete', 'ready', 'signed', 'active'].includes(v))
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['rejected', 'expired', 'missing', 'terminated'].includes(v))
    return 'border-rose-200 bg-rose-50 text-rose-700';
  if (['submitted', 'in_review', 'pending_review', 'sent'].includes(v))
    return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function titleCase(v: string): string {
  return v.split(/[_\s-]+/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function dispatchGate(docs: DocRow[], compliance: ComplianceRow[]): { label: string; tone: 'success' | 'warning' | 'danger' } {
  const blocked = [
    ...docs.filter(d => !['approved', 'complete', 'ready'].includes(d.status.toLowerCase())),
    ...compliance.filter(c => !['approved', 'complete'].includes(c.status.toLowerCase())),
  ].length;
  if (blocked === 0) return { label: 'Dispatch ready', tone: 'success' };
  if (blocked <= 2) return { label: `${blocked} blocker${blocked > 1 ? 's' : ''}`, tone: 'warning' };
  return { label: `${blocked} blockers`, tone: 'danger' };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function OrdersPage() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <EmptyState
        title="Workspace required"
        description="Sign in with an active organization membership to view orders."
      />
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <EmptyState
        title="Configuration required"
        description="Supabase environment variables are not set."
      />
    );
  }

  const supabase = await createClient();
  const db = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const orgId = workspace.organization.id;

  // 1. Fetch accepted quotes only — orders should represent won commercial work
  const { data: rawQuotes, error: quotesError } = await db
    .from('quotes')
    .select('id, status, currency, updated_at, lead_id')
    .eq('organization_id', orgId)
    .in('status', ['accepted'])
    .order('updated_at', { ascending: false })
    .limit(50);

  if (quotesError) {
    return (
      <EmptyState
        title="Could not load orders"
        description={String(quotesError.message ?? 'Unknown error')}
      />
    );
  }

  const quotes: QuoteRow[] = Array.isArray(rawQuotes) ? (rawQuotes as QuoteRow[]) : [];

  if (quotes.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <PageHeader
          eyebrow="Orders"
          title="Orders"
          description="Accepted quotes become operational orders here with documents, compliance, and execution status in one place."
          badge="Live"
          status="No orders yet"
          actions={[{ label: 'Go to Leads', href: PRODUCT_ROUTES.app.leads }]}
        />
        <SectionCard
          eyebrow="No orders yet"
          title="Orders appear here when quotes are accepted"
          description="Accept a quote from the lead quote workspace and it will appear here with its full execution context."
        >
          <Link
            href={PRODUCT_ROUTES.app.leads}
            className="inline-flex rounded-2xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Go to Leads
          </Link>
        </SectionCard>
      </div>
    );
  }

  const quoteIds: string[] = quotes.map(q => q.id);
  const leadIds: string[] = [...new Set(quotes.map(q => q.lead_id))];

  // 2–5. Parallel fetch: leads, documents, compliance, contracts
  const [leadsResult, docsResult, complianceResult, contractsResult] = await Promise.all([
    db.from('leads')
      .select('id, company_name, contact_name, country, deal_value, deal_currency')
      .eq('organization_id', orgId)
      .in('id', leadIds),

    db.from('documents')
      .select('id, file_name, doc_type, status, uploaded_at, version, related_id')
      .eq('organization_id', orgId)
      .eq('related_entity', 'quote')
      .in('related_id', quoteIds)
      .order('uploaded_at', { ascending: false }),

    db.from('lead_compliance_items')
      .select('id, lead_id, status, submitted_at, approved_at, compliance_item_id')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false }),

    db.from('contracts')
      .select('id, quote_id, status, signed_at, starts_on, ends_on')
      .eq('organization_id', orgId)
      .in('quote_id', quoteIds),
  ]);

  // Build lookup maps with explicit typing
  const leadMap = new Map<string, LeadRow>();
  (Array.isArray(leadsResult.data) ? leadsResult.data as LeadRow[] : [])
    .forEach(l => leadMap.set(l.id, l));

  const docsByQuote = new Map<string, DocRow[]>();
  (Array.isArray(docsResult.data) ? docsResult.data as DocRow[] : [])
    .forEach(d => {
      const arr = docsByQuote.get(d.related_id) ?? [];
      arr.push(d);
      docsByQuote.set(d.related_id, arr);
    });

  const complianceByLead = new Map<string, ComplianceRow[]>();
  (Array.isArray(complianceResult.data) ? complianceResult.data as ComplianceRow[] : [])
    .forEach(c => {
      const arr = complianceByLead.get(c.lead_id) ?? [];
      arr.push(c);
      complianceByLead.set(c.lead_id, arr);
    });

  const contractByQuote = new Map<string, ContractRow>();
  (Array.isArray(contractsResult.data) ? contractsResult.data as ContractRow[] : [])
    .forEach(c => contractByQuote.set(c.quote_id, c));

  // Assemble order records
  const orders: OrderRecord[] = quotes.map(q => {
    const lead = leadMap.get(q.lead_id);
    return {
      quoteId: q.id,
      quoteStatus: q.status,
      currency: q.currency,
      updatedAt: q.updated_at,
      leadId: q.lead_id,
      companyName: lead?.company_name ?? 'Unknown buyer',
      contactName: lead?.contact_name ?? null,
      country: lead?.country ?? null,
      dealValue: lead?.deal_value ?? null,
      dealCurrency: lead?.deal_currency ?? null,
      documents: docsByQuote.get(q.id) ?? [],
      complianceItems: complianceByLead.get(q.lead_id) ?? [],
      contract: contractByQuote.get(q.id) ?? null,
    };
  });

  const accepted = orders.filter(o => o.quoteStatus === 'accepted');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Orders"
        title="Orders"
        description="Accepted quotes become live orders here with documents, compliance, and contract status visible per order."
        badge="Live"
        status={`${orders.length} active`}
        meta={[`${accepted.length} accepted`, 'Execution context visible', 'Order-ready only']}
        actions={[{ label: 'Go to Leads', href: PRODUCT_ROUTES.app.leads }]}
      />

      {accepted.length > 0 && (
        <SectionCard
          eyebrow="Commercially accepted"
          title="Accepted orders"
          description="Pricing snapshot locked. Execution can begin when document and compliance gates are clear."
        >
          <div className="space-y-6">
            {accepted.map(order => (
              <OrderCard key={order.quoteId} order={order} tone="accepted" />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, tone }: { order: OrderRecord; tone: 'accepted' | 'sent' }) {
  const gate = dispatchGate(order.documents, order.complianceItems);
  const borderClass = tone === 'accepted' ? 'border-emerald-100' : 'border-amber-100';
  const bgClass = tone === 'accepted' ? 'bg-emerald-50/40' : 'bg-amber-50/30';

  return (
    <div className={`rounded-2xl border ${borderClass} ${bgClass} p-4`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{order.companyName}</p>
            <StatusBadge
              label={tone === 'accepted' ? 'Accepted' : 'Sent'}
              tone={tone === 'accepted' ? 'success' : 'warning'}
            />
            <StatusBadge label={gate.label} tone={gate.tone} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
            {order.contactName && <span>{order.contactName}</span>}
            {order.country && <span>{order.country}</span>}
            <span>Updated {formatDateTime(order.updatedAt)}</span>
            <span className="font-mono text-slate-400">ref {order.quoteId.slice(0, 8)}</span>
            {order.dealValue != null && (
              <span className="font-semibold text-slate-700">
                {order.dealCurrency ?? order.currency ?? 'USD'}{' '}
                {order.dealValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`${PRODUCT_ROUTES.app.leads}/${order.leadId}/quote`}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            tone === 'accepted'
              ? 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
              : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
          }`}
        >
          View quote
        </Link>
      </div>

      {/* Three-panel grid: Documents · Compliance · Contract */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {/* Documents */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Documents
            {order.documents.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {order.documents.length}
              </span>
            )}
          </p>
          {order.documents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No documents linked yet.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {order.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800">{doc.file_name}</p>
                    <p className="text-[10px] text-slate-400">
                      {titleCase(doc.doc_type)} · v{doc.version}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(doc.status)}`}>
                    {titleCase(doc.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Compliance
            {order.complianceItems.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {order.complianceItems.length}
              </span>
            )}
          </p>
          {order.complianceItems.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No compliance items linked yet.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {order.complianceItems.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-600">
                    {item.compliance_item_id.slice(0, 16)}
                    {item.submitted_at && (
                      <span className="ml-1 text-slate-400">
                        · {formatDateTime(item.submitted_at)}
                      </span>
                    )}
                  </p>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(item.status)}`}>
                    {titleCase(item.status)}
                  </span>
                </div>
              ))}
              {order.complianceItems.length > 5 && (
                <p className="text-[10px] text-slate-400">
                  +{order.complianceItems.length - 5} more — view in Lead
                </p>
              )}
            </div>
          )}
        </div>

        {/* Contract */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contract</p>
          {!order.contract ? (
            <p className="mt-2 text-xs text-slate-400">No contract on record.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">Status</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses(order.contract.status)}`}>
                  {titleCase(order.contract.status)}
                </span>
              </div>
              {order.contract.signed_at && (
                <p className="text-xs text-slate-500">
                  Signed {formatDateTime(order.contract.signed_at)}
                </p>
              )}
              {order.contract.starts_on && (
                <p className="text-xs text-slate-500">Starts {order.contract.starts_on}</p>
              )}
              {order.contract.ends_on && (
                <p className="text-xs text-slate-500">Ends {order.contract.ends_on}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
