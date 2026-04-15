/**
 * Orders page — Sprint 6 · Orders foundation
 *
 * Sprint 5 delivered the live query for accepted/sent quotes + lead context.
 * Sprint 6 Batch 1 folds documents and compliance into each order record so
 * execution readiness is visible without leaving the Orders surface.
 *
 * Queries (all org-scoped):
 *  1. quotes WHERE status IN ('accepted','sent') ORDER BY updated_at DESC
 *  2. leads WHERE id IN (quote lead_ids)
 *  3. documents WHERE related_entity='quote' AND related_id IN (quote_ids)
 *  4. lead_compliance_items WHERE lead_id IN (lead_ids)
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

// ─── Types ────────────────────────────────────────────────────────────────────

type DocRow = {
  id: string;
  file_name: string;
  doc_type: string;
  status: string;
  uploaded_at: string;
  version: number;
  related_id: string; // quote id
};

type ComplianceRow = {
  id: string;
  lead_id: string;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  compliance_item_id: string;
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docStatusClasses(status: string) {
  const s = status.toLowerCase();
  if (['approved', 'complete', 'ready'].includes(s))
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (['rejected', 'expired', 'missing'].includes(s))
    return 'border-rose-200 bg-rose-50 text-rose-700';
  if (['submitted', 'in_review', 'pending_review'].includes(s))
    return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function complianceStatusClasses(status: string) {
  return docStatusClasses(status);
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function dispatchReadiness(docs: DocRow[], compliance: ComplianceRow[]) {
  const blockedDocs = docs.filter(
    (d) => !['approved', 'complete', 'ready'].includes(d.status.toLowerCase()),
  ).length;
  const blockedCompliance = compliance.filter(
    (c) => !['approved', 'complete'].includes(c.status.toLowerCase()),
  ).length;
  const total = blockedDocs + blockedCompliance;
  if (total === 0) return { label: 'Dispatch ready', tone: 'success' as const };
  if (total <= 2) return { label: `${total} blocker${total > 1 ? 's' : ''}`, tone: 'warning' as const };
  return { label: `${total} blockers`, tone: 'danger' as const };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function OrdersPage() {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <EmptyState
        title="Workspace membership needed"
        description="Your account is signed in but no active organization membership could be loaded."
      />
    );
  }

  if (!hasSupabaseEnv) {
    return (
      <EmptyState
        title="Configuration required"
        description="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to load live order data."
      />
    );
  }

  const supabase = await createClient();
  const orgId = workspace.organization.id;

  // 1 — quotes
  const { data: quoteRows, error: quotesError } = await supabase
    .from('quotes')
    .select('id, status, currency, updated_at, lead_id')
    .eq('organization_id', orgId)
    .in('status', ['accepted', 'sent'])
    .order('updated_at', { ascending: false })
    .limit(50);

  if (quotesError) {
    return <EmptyState title="Orders could not be loaded" description={quotesError.message} />;
  }

  const quotes = quoteRows ?? [];
  const quoteIds = quotes.map((q) => q.id);
  const leadIds = [...new Set(quotes.map((q) => q.lead_id))];

  // 2–4 — parallel fetch: leads, documents, compliance
  const [leadsResult, docsResult, complianceResult] = await Promise.all([
    leadIds.length > 0
      ? supabase
          .from('leads')
          .select('id, company_name, contact_name, country, deal_value, deal_currency')
          .eq('organization_id', orgId)
          .in('id', leadIds)
      : Promise.resolve({ data: [], error: null }),

    quoteIds.length > 0
      ? supabase
          .from('documents')
          .select('id, file_name, doc_type, status, uploaded_at, version, related_id')
          .eq('organization_id', orgId)
          .eq('related_entity', 'quote')
          .in('related_id', quoteIds)
          .order('uploaded_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

    leadIds.length > 0
      ? supabase
          .from('lead_compliance_items')
          .select('id, lead_id, status, submitted_at, approved_at, compliance_item_id')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Build lookup maps
  const leadMap = new Map<string, {
    company_name: string;
    contact_name: string | null;
    country: string | null;
    deal_value: number | null;
    deal_currency: string | null;
  }>();
  (leadsResult.data ?? []).forEach((l) => leadMap.set(l.id, l));

  const docsByQuote = new Map<string, DocRow[]>();
  (docsResult.data ?? []).forEach((d) => {
    const existing = docsByQuote.get(d.related_id) ?? [];
    existing.push(d as DocRow);
    docsByQuote.set(d.related_id, existing);
  });

  const complianceByLead = new Map<string, ComplianceRow[]>();
  (complianceResult.data ?? []).forEach((c) => {
    const existing = complianceByLead.get(c.lead_id) ?? [];
    existing.push(c as ComplianceRow);
    complianceByLead.set(c.lead_id, existing);
  });

  // Assemble order records
  const orders: OrderRecord[] = quotes.map((q) => {
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
    };
  });

  const acceptedOrders = orders.filter((o) => o.quoteStatus === 'accepted');
  const sentOrders = orders.filter((o) => o.quoteStatus === 'sent');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        eyebrow="Orders"
        title="Orders"
        description="Accepted and sent quotes with execution readiness — documents and compliance folded into each order record."
        badge="Sprint 6 · Live"
        status={orders.length > 0 ? `${orders.length} active` : 'No orders yet'}
        meta={[
          `${acceptedOrders.length} accepted`,
          `${sentOrders.length} sent`,
          'Documents + compliance visible',
        ]}
        actions={[{ label: 'Go to Leads', href: PRODUCT_ROUTES.app.leads }]}
      />

      {orders.length === 0 ? (
        <SectionCard
          eyebrow="No orders yet"
          title="Orders appear here when quotes are accepted or sent"
          description="Move a quote to accepted or sent status from the Lead quote workspace and it will appear here with its document and compliance readiness."
        >
          <Link
            href={PRODUCT_ROUTES.app.leads}
            className="inline-flex rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go to Leads
          </Link>
        </SectionCard>
      ) : (
        <>
          {acceptedOrders.length > 0 && (
            <SectionCard
              eyebrow="Commercially accepted"
              title="Accepted orders"
              description="These quotes have been accepted. Pricing snapshot is locked and execution can begin."
            >
              <div className="space-y-6">
                {acceptedOrders.map((order) => (
                  <OrderCard key={order.quoteId} order={order} tone="accepted" />
                ))}
              </div>
            </SectionCard>
          )}

          {sentOrders.length > 0 && (
            <SectionCard
              eyebrow="Sent — awaiting acceptance"
              title="Sent quotes"
              description="These quotes are customer-facing. They will move to accepted orders once the buyer confirms."
            >
              <div className="space-y-6">
                {sentOrders.map((order) => (
                  <OrderCard key={order.quoteId} order={order} tone="sent" />
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  tone,
}: {
  order: OrderRecord;
  tone: 'accepted' | 'sent';
}) {
  const readiness = dispatchReadiness(order.documents, order.complianceItems);
  const borderClass =
    tone === 'accepted' ? 'border-emerald-100' : 'border-amber-100';
  const bgClass =
    tone === 'accepted' ? 'bg-emerald-50/40' : 'bg-amber-50/30';

  return (
    <div className={`rounded-2xl border ${borderClass} ${bgClass} p-4`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{order.companyName}</p>
            <StatusBadge
              label={tone === 'accepted' ? 'Accepted' : 'Sent'}
              tone={tone === 'accepted' ? 'success' : 'warning'}
            />
            <StatusBadge label={readiness.label} tone={readiness.tone} />
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

      {/* Documents + Compliance grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Documents */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Documents
            {order.documents.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {order.documents.length}
              </span>
            )}
          </p>
          {order.documents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              No documents linked to this quote yet.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {order.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {doc.file_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {titleCase(doc.doc_type)} · v{doc.version} ·{' '}
                      {formatDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${docStatusClasses(doc.status)}`}
                  >
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
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {order.complianceItems.length}
              </span>
            )}
          </p>
          {order.complianceItems.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              No compliance items linked to this lead yet.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {order.complianceItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <p className="truncate text-xs text-slate-600">
                    {item.compliance_item_id.slice(0, 12)}…
                    {item.submitted_at && (
                      <span className="ml-1 text-slate-400">
                        submitted {formatDateTime(item.submitted_at)}
                      </span>
                    )}
                  </p>
                  <span
                    className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${complianceStatusClasses(item.status)}`}
                  >
                    {titleCase(item.status)}
                  </span>
                </div>
              ))}
              {order.complianceItems.length > 6 && (
                <p className="text-[10px] text-slate-400">
                  +{order.complianceItems.length - 6} more — view in Lead
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
