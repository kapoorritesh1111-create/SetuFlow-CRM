"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import RightDrawer from '@/components/RightDrawer';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { saveWorkspaceDefaultView, saveWorkspaceView } from '@/features/views/server/actions';
import { RfqCreateWizardForm, RfqEditWizardForm } from '@/features/rfqs/components/rfq-wizard-form';
import { RFQ_STATUSES, computeRFQStatus, getRfqStatusBadgeClasses, parseRfqWorkflow } from '@/lib/rfqWorkflow';
import { SUPPLIER_RESPONSE_STATES, getSupplierResponseBadgeClasses, type SupplierResponse } from '@/lib/supplierResponse';
import type { SavedViewDefinition } from '@/lib/savedViews';
import { formatDate, formatDateTime } from '@/lib/utils';
import { workspaceInsetClass, workspaceMetricClass, workspacePanelClass } from '@/components/ui/workspace-surfaces';
import { getPricingReadinessClasses, getPricingReadinessLabel, type CatalogPricingSnapshot } from '@/lib/catalog-pricing-model';

type ProductOption = { id: string; name: string; defaultVariantId: string | null; defaultVariantName: string | null; catalogPriceId: string | null; catalogPriceAmount: number | null; catalogPriceCurrency: string | null; catalogMarketId: string | null };
type RfqRecord = {
  id: string;
  lead_id: string | null;
  status: string;
  currency: string | null;
  validity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  notes?: string | null;
  lineItems?: Array<{ id: string; product_id: string | null; product_variant_id: string | null; catalog_price_id: string | null; catalog_price_amount: number | null; catalog_price_currency: string | null; quantity: number; unit_price: number | null; currency: string | null; is_price_overridden?: boolean | null; override_reason?: string | null; notes: string | null }>;
};

type RfqSavedViewId = 'all' | 'active' | 'awaiting_supplier' | 'completed' | string;
type RfqSortMode = 'updated' | 'created' | 'validity';

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-slate-600">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function RfqWorkspace({
  leadId,
  products,
  rfqs,
  savedViews = [],
  initialSavedView = 'all',
  redirectPath,
  pricingSnapshot,
}: {
  leadId: string;
  products: ProductOption[];
  rfqs: RfqRecord[];
  savedViews?: SavedViewDefinition[];
  initialSavedView?: string;
  redirectPath?: string;
  pricingSnapshot: CatalogPricingSnapshot;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [rfqRecords, setRfqRecords] = useState<RfqRecord[]>(rfqs);
  const [activeRfq, setActiveRfq] = useState<RfqRecord | null>(null);
  const [savedView, setSavedView] = useState<RfqSavedViewId>(initialSavedView || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<RfqSortMode>('updated');
  const [viewName, setViewName] = useState('');
  const [flash, setFlash] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRfqRecords(rfqs);
  }, [rfqs]);

  useEffect(() => {
    if (activeRfq) {
      const refreshed = rfqRecords.find((rfq) => rfq.id === activeRfq.id);
      if (refreshed) setActiveRfq(refreshed);
    }
  }, [activeRfq?.id, rfqRecords]);

  const upsertRfqRecord = (next: RfqRecord) => {
    setRfqRecords((current) => {
      const remaining = current.filter((rfq) => rfq.id !== next.id);
      return [next, ...remaining].sort((left, right) => (right.updated_at ?? '').localeCompare(left.updated_at ?? ''));
    });
    setActiveRfq(next);
  };

  useEffect(() => {
    const matched = savedViews.find((view) => view.id === savedView);
    if (matched) {
      const nextStatus = typeof matched.filterModel?.statusFilter === 'string' ? matched.filterModel.statusFilter : '';
      const nextSort = typeof matched.sortModel?.sortMode === 'string' ? matched.sortModel.sortMode as RfqSortMode : 'updated';
      setStatusFilter(nextStatus);
      setSortMode(nextSort);
      return;
    }

    switch (savedView) {
      case 'active':
        setStatusFilter('active');
        setSortMode('updated');
        break;
      case 'awaiting_supplier':
        setStatusFilter('awaiting_supplier');
        setSortMode('updated');
        break;
      case 'completed':
        setStatusFilter('completed');
        setSortMode('validity');
        break;
      default:
        setStatusFilter('');
        setSortMode('updated');
    }
  }, [savedView, savedViews]);

  const filteredRfqs = useMemo(() => {
    const matches = rfqRecords.filter((rfq) => {
      const parsed = parseRfqWorkflow(rfq.notes);
      const supplierResponses = parsed.meta.supplierResponses ?? [];
      const status = computeRFQStatus(rfq, supplierResponses);
      if (!statusFilter || statusFilter === 'all') return true;
      if (statusFilter === 'active') return !['closed', 'cancelled', 'fully_responded'].includes(status);
      if (statusFilter === 'awaiting_supplier') return ['sent_to_suppliers', 'supplier_responses_pending', 'partially_responded'].includes(status);
      if (statusFilter === 'completed') return ['fully_responded', 'closed'].includes(status);
      return status === statusFilter;
    });

    return [...matches].sort((left, right) => {
      if (sortMode === 'created') return (right.created_at ?? '').localeCompare(left.created_at ?? '');
      if (sortMode === 'validity') return (left.validity_date ?? '9999-12-31').localeCompare(right.validity_date ?? '9999-12-31');
      return (right.updated_at ?? '').localeCompare(left.updated_at ?? '');
    });
  }, [rfqRecords, statusFilter, sortMode]);

  const viewButtons: Array<{ id: RfqSavedViewId; label: string }> = [
    { id: 'all', label: 'All RFQs' },
    { id: 'active', label: 'Active' },
    { id: 'awaiting_supplier', label: 'Awaiting supplier' },
    { id: 'completed', label: 'Completed' },
    ...savedViews.map((view) => ({ id: view.id, label: view.name })),
  ];

  const currentFilterModel = { statusFilter };
  const currentSortModel = { sortMode };
  const awaitingSupplierCount = useMemo(() => rfqRecords.filter((rfq) => {
    const parsed = parseRfqWorkflow(rfq.notes);
    const status = computeRFQStatus(rfq, parsed.meta.supplierResponses ?? []);
    return ['sent_to_suppliers', 'supplier_responses_pending', 'partially_responded'].includes(status);
  }).length, [rfqRecords]);
  const completedCount = useMemo(() => rfqRecords.filter((rfq) => {
    const parsed = parseRfqWorkflow(rfq.notes);
    const status = computeRFQStatus(rfq, parsed.meta.supplierResponses ?? []);
    return ['fully_responded', 'closed'].includes(status);
  }).length, [rfqRecords]);
  const totalSupplierResponses = useMemo(() => filteredRfqs.reduce((sum, rfq) => sum + (parseRfqWorkflow(rfq.notes).meta.supplierResponses ?? []).length, 0), [filteredRfqs]);
  const inDraftCount = useMemo(() => rfqRecords.filter((rfq) => ['draft', 'submitted'].includes(String(rfq.status ?? '').toLowerCase())).length, [rfqRecords]);
  const hasActiveFilters = Boolean(statusFilter && statusFilter !== 'all');

  return (
    <section id="rfq-workspace" className="space-y-4">
      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">RFQ command center</p>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPricingReadinessClasses(pricingSnapshot.pricingReadiness)}`}>{getPricingReadinessLabel(pricingSnapshot.pricingReadiness)}</span>
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Buyer demand intake and supplier routing</h3>
            <p className="mt-2 text-sm text-slate-600">Run qualified demand through product coverage, supplier outreach, and pricing-readiness review without leaving the lead workflow. Use this workspace to keep RFQ progression tied to quote creation and negotiation readiness.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/leads/${leadId}`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Lead</Link>
            <Link href={`/leads?leadId=${leadId}&view=quote`} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Quotes</Link>
            <Link href="/pipeline" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Pipeline</Link>
            <button type="button" onClick={() => setCreateOpen(true)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">New RFQ</button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Visible RFQs</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredRfqs.length}</p>
            <p className="mt-1 text-xs text-slate-500">Demand items in the current operating view</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Draft and review</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{inDraftCount}</p>
            <p className="mt-1 text-xs text-slate-500">Still being qualified before supplier send</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Awaiting supplier</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{awaitingSupplierCount}</p>
            <p className="mt-1 text-xs text-slate-500">Sent or partially responded supplier loops</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Supplier rows in view</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalSupplierResponses}</p>
            <p className="mt-1 text-xs text-slate-500">Tracked outreach and response records</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Priced RFQ lines</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{pricingSnapshot.rfqPricedLineCount}/{pricingSnapshot.rfqLinkedLineCount || 0}</p>
            <p className="mt-1 text-xs text-slate-500">{pricingSnapshot.linkedPricedProductCount} linked products already rule-priced</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operating rules</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: 'Qualified leads first',
                  body: 'Create RFQs only after the lead is qualified and linked to at least one structured product.',
                },
                {
                  title: 'Supplier routing stays here',
                  body: 'Keep outreach, response status, and validity tracking in this workspace instead of scattered notes.',
                },
                {
                  title: 'Quote only when ready',
                  body: 'Use priced RFQ lines and supplier responses to move forward into quote drafting with fewer overrides.',
                },
              ].map((rule) => (
                <div key={rule.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{rule.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{rule.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Next best actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/leads?leadId=${leadId}&view=quote`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white">Open quote workspace</Link>
              <Link href={`/leads/${leadId}#timeline`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white">Review timeline</Link>
              <Link href="/tasks" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white">Follow-ups</Link>
            </div>
            <p className="mt-4 text-sm text-slate-600">Use the RFQ workspace as the bridge between qualified lead demand and quote-ready supplier/pricing context.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Saved views</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {viewButtons.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setSavedView(view.id)}
                  className={savedView === view.id ? 'rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white' : 'rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200'}
                  aria-pressed={savedView === view.id}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_220px_auto]">
            <FilterField label="Save current view">
              <input
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="Save current RFQ view"
                aria-label="Save current RFQ view"
              />
            </FilterField>
            <FilterField label="Sort by">
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as RfqSortMode)} aria-label="Sort RFQs">
                <option value="updated">Updated newest</option>
                <option value="created">Created newest</option>
                <option value="validity">Validity soonest</option>
              </select>
            </FilterField>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                disabled={!viewName.trim() || isPending}
                onClick={() => {
                  startTransition(async () => {
                    const formData = new FormData();
                    formData.set('entity_type', 'rfqs');
                    formData.set('name', viewName.trim());
                    formData.set('filter_model', JSON.stringify(currentFilterModel));
                    formData.set('sort_model', JSON.stringify(currentSortModel));
                    formData.set('redirect_path', redirectPath ?? `/leads/${leadId}`);
                    await saveWorkspaceView(formData);
                    setFlash(`Saved view “${viewName.trim()}”. Refresh to load the latest view list.`);
                    setViewName('');
                  });
                }}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Save view
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const formData = new FormData();
                    formData.set('entity_type', 'rfqs');
                    formData.set('saved_view_id', typeof savedView === 'string' && !['all', 'active', 'awaiting_supplier', 'completed'].includes(savedView) ? savedView : '');
                    formData.set('built_in_view_key', typeof savedView === 'string' && ['all', 'active', 'awaiting_supplier', 'completed'].includes(savedView) ? savedView : '');
                    formData.set('redirect_path', redirectPath ?? `/leads/${leadId}`);
                    await saveWorkspaceDefaultView(formData);
                    setFlash('Default RFQ view updated.');
                  });
                }}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Make default
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_220px_1fr]">
            <FilterField label="Lifecycle status">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter RFQs by status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="awaiting_supplier">Awaiting supplier</option>
                <option value="completed">Completed</option>
                {RFQ_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
              </select>
            </FilterField>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
              RFQ readiness is tracked alongside pricing coverage so the commercial team can spot where supplier routing is blocked by missing catalog context.
            </div>
          </div>
        </div>
      </SectionCard>

      {flash ? <StateMessage tone="success" title={flash} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredRfqs.map((rfq) => {
          const parsed = parseRfqWorkflow(rfq.notes);
          const supplierResponses = parsed.meta.supplierResponses ?? [];
          const status = computeRFQStatus(rfq, supplierResponses);
          return (
            <div key={rfq.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRfqStatusBadgeClasses(status)}`}>{status.replaceAll('_', ' ')}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{rfq.currency || 'USD'}</span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-900">{parsed.meta.title ?? `RFQ ${rfq.id.slice(0, 8)}`}</p>
                  <p className="mt-1 text-sm text-slate-500">{parsed.meta.requestSummary || 'No request summary captured yet.'}</p>
                </div>
                <button type="button" onClick={() => setActiveRfq(rfq)} className="rounded-2xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Manage RFQ</button>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">Requested lines:</span> {(rfq.lineItems ?? []).length}</p>
                <p className="mt-2"><span className="font-medium text-slate-900">Pricing posture:</span> {(rfq.lineItems ?? []).some((item) => item.is_price_overridden) ? 'Contains RFQ target overrides against catalog baseline.' : 'All RFQ targets are aligned to catalog baseline.'}</p>
                <p className="mt-2"><span className="font-medium text-slate-900">Validity:</span> {rfq.validity_date ? formatDate(rfq.validity_date) : 'Not set'}</p>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Supplier loop</p>
                {supplierResponses.length ? supplierResponses.map((supplier) => (
                  <div key={supplier.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{supplier.supplierName || 'Supplier pending'}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSupplierResponseBadgeClasses(supplier.status as SupplierResponse['status'])}`}>{supplier.status.replaceAll('_', ' ')}</span>
                    </div>
                    <p className="mt-2">{supplier.notes || 'No supplier notes yet.'}</p>
                    <p className="mt-2 text-xs text-slate-500">Updated {formatDateTime(supplier.respondedAt || supplier.viewedAt || supplier.contactedAt || rfq.updated_at)}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    No supplier responses tracked yet. Add suppliers when you manage the RFQ to keep outreach work in one place.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!filteredRfqs.length ? (
        <EmptyState
          title="No RFQs match this view"
          description={hasActiveFilters ? 'Clear the current filter to bring hidden RFQs back into view.' : 'Create a new RFQ to start tracking buyer demand and supplier response activity.'}
        />
      ) : null}

      <RightDrawer open={createOpen} onClose={() => setCreateOpen(false)} title="New buyer RFQ">
        <RfqCreateWizardForm leadId={leadId} products={products} onClose={() => setCreateOpen(false)} onSaved={(record: RfqRecord) => { upsertRfqRecord(record); setFlash('RFQ created.'); setCreateOpen(false); }} />
      </RightDrawer>
      <RightDrawer open={Boolean(activeRfq)} onClose={() => setActiveRfq(null)} title="Manage RFQ workflow">
        {activeRfq ? (
          <RfqEditWizardForm rfq={activeRfq} products={products} onClose={() => setActiveRfq(null)} onSaved={(record: RfqRecord) => { upsertRfqRecord(record); setFlash('RFQ workflow updated.'); }} />
        ) : null}
      </RightDrawer>
    </section>
  );
}
