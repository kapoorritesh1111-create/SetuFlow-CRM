'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';

import { SectionCard } from '@/components/ui/section-card';
import { WizardShell, WizardStepBody, WizardValidationSummary, type WizardStepDefinition } from '@/components/ui/wizard-shell';
import { CommercialWizardFooter } from '@/components/ui/commercial-wizard-footer';
import { createRfq, updateRfqWorkflow, type RfqActionState } from '@/features/rfqs/server/actions';
import { RFQ_STATUSES, computeRFQStatus, getRfqStatusBadgeClasses, parseRfqWorkflow } from '@/lib/rfqWorkflow';
import { SUPPLIER_RESPONSE_STATES, getSupplierResponseBadgeClasses, type SupplierResponse } from '@/lib/supplierResponse';
import { formatDate, formatDateTime } from '@/lib/utils';

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

type DraftLineItem = {
  product_id: string;
  product_variant_id: string;
  catalog_price_id: string;
  catalog_price_amount: number | null;
  catalog_price_currency: string;
  quantity: number;
  unit_price: string;
  override_reason: string;
  notes: string;
};

type StepId = 'overview' | 'items' | 'suppliers' | 'review';

const RFQ_CREATE_STEPS: WizardStepDefinition[] = [
  { id: 'overview', title: 'Request brief', shortLabel: 'Brief', description: 'Capture buyer intent, timing, and commercial context before routing the RFQ.' },
  { id: 'items', title: 'Requested items', shortLabel: 'Items', description: 'Keep product, quantity, and target pricing in one structured step.' },
  { id: 'suppliers', title: 'Supplier plan', shortLabel: 'Suppliers', description: 'Stage supplier outreach so response tracking stays inside the RFQ workflow.' },
  { id: 'review', title: 'Review and submit', shortLabel: 'Review', description: 'Confirm status, timeline, and validation before saving the RFQ.' },
];

const RFQ_EDIT_STEPS: WizardStepDefinition[] = [
  { id: 'overview', title: 'Workflow brief', shortLabel: 'Brief', description: 'Review buyer context, currency, and lifecycle state before changing outreach details.' },
  { id: 'items', title: 'Requested items', shortLabel: 'Items', description: 'Verify linked item scope without replacing the current line-item data model.' },
  { id: 'suppliers', title: 'Supplier responses', shortLabel: 'Responses', description: 'Keep supplier outreach and response updates visible in one place.' },
  { id: 'review', title: 'Review and save', shortLabel: 'Review', description: 'Confirm status transitions and timeline context before saving the RFQ.' },
];

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-slate-600">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function inputClassName() {
  return 'min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400';
}

function normalizeCurrency(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}

function buildLineFromProduct(product: ProductOption | undefined, currency: string): DraftLineItem {
  const normalizedCurrency = normalizeCurrency(product?.catalogPriceCurrency || currency) || 'USD';
  return {
    product_id: product?.id ?? '',
    product_variant_id: product?.defaultVariantId ?? '',
    catalog_price_id: product?.catalogPriceId ?? '',
    catalog_price_amount: typeof product?.catalogPriceAmount === 'number' ? product.catalogPriceAmount : null,
    catalog_price_currency: normalizedCurrency,
    quantity: 1,
    unit_price: typeof product?.catalogPriceAmount === 'number' ? String(product.catalogPriceAmount) : '',
    override_reason: '',
    notes: '',
  };
}

function hydrateLineFromProduct(line: DraftLineItem, product: ProductOption | undefined, currency: string): DraftLineItem {
  const next = buildLineFromProduct(product, currency);
  return { ...line, ...next, notes: line.notes ?? '' };
}

function isLinePriceOverridden(line: DraftLineItem) {
  return typeof line.catalog_price_amount === 'number' && Number(line.unit_price || 0) !== Number(line.catalog_price_amount);
}

function buildRfqValidation(stepId: StepId, data: {
  title: string;
  requestSummary: string;
  neededBy: string;
  currency: string;
  validityDate: string;
  status: string;
  lineItems: DraftLineItem[];
  suppliers: SupplierResponse[];
}) {
  const issues: string[] = [];
  if (stepId === 'overview') {
    if (!data.title.trim()) issues.push('Add an RFQ title so teams can scan the request quickly.');
    if (!data.requestSummary.trim()) issues.push('Add a buyer request summary before moving forward.');
    if (!normalizeCurrency(data.currency)) issues.push('Choose a 3-letter currency code such as USD or EUR.');
    if (!data.neededBy) issues.push('Set a needed-by date so follow-up urgency is clear.');
  }
  if (stepId === 'items') {
    const usable = data.lineItems.filter((item) => item.quantity > 0 && (item.product_id || item.notes.trim()));
    if (!usable.length) issues.push('Add at least one requested item with a product or line description.');
    if (data.lineItems.some((item) => item.quantity <= 0)) issues.push('Requested item quantities must stay above zero.');
  }
  if (stepId === 'suppliers') {
    if (data.suppliers.some((supplier) => !supplier.supplierName.trim())) issues.push('Every supplier row needs a supplier name.');
    if (data.status === 'sent_to_suppliers' && !data.suppliers.length) issues.push('Add at least one supplier before marking the RFQ as sent to suppliers.');
  }
  if (stepId === 'review') {
    if (!data.validityDate) issues.push('Set a validity date before saving the RFQ.');
    if (!RFQ_STATUSES.includes(data.status as (typeof RFQ_STATUSES)[number])) issues.push('Pick a valid RFQ lifecycle state.');
  }
  return issues;
}

function RfqReviewPanel({
  title,
  requestSummary,
  neededBy,
  validityDate,
  currency,
  status,
  lineItems,
  suppliers,
}: {
  title: string;
  requestSummary: string;
  neededBy: string;
  validityDate: string;
  currency: string;
  status: string;
  lineItems: DraftLineItem[];
  suppliers: SupplierResponse[];
}) {
  const activeLineItems = lineItems.filter((item) => item.quantity > 0 && (item.product_id || item.notes.trim()));
  const respondedSuppliers = suppliers.filter((supplier) => supplier.status === 'responded').length;

  return (
    <div className="space-y-4">
      <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow snapshot</p>
        <h4 className="mt-2 text-base font-semibold text-slate-900">{title || 'Untitled RFQ'}</h4>
        <p className="mt-2 text-sm text-slate-600">{requestSummary || 'Buyer request summary will appear here once provided.'}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Needed by</p><p className="mt-2 text-sm font-medium text-slate-900">{formatDate(neededBy)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Validity</p><p className="mt-2 text-sm font-medium text-slate-900">{formatDate(validityDate)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Currency</p><p className="mt-2 text-sm font-medium text-slate-900">{normalizeCurrency(currency) || 'Unset'}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supplier replies</p><p className="mt-2 text-sm font-medium text-slate-900">{respondedSuppliers}/{suppliers.length || 0}</p></div>
        </div>
      </div>
      <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">Submission review</p><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRfqStatusBadgeClasses(status as any)}`}>{status.replaceAll('_', ' ')}</span></div>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>{activeLineItems.length} requested items prepared for supplier comparison.</li>
          <li>{suppliers.length ? `${suppliers.length} suppliers staged for outreach tracking.` : 'No suppliers staged yet; the RFQ can still remain in draft or submission review.'}</li>
          <li>Validation and review stay inside the same drawer-first commercial workflow.</li>
        </ul>
      </div>
    </div>
  );
}

export function RfqCreateWizardForm({ leadId, products, onClose, onSaved }: { leadId: string; products: ProductOption[]; onClose: () => void; onSaved?: (rfq: RfqRecord) => void }) {
  const [state, formAction] = useFormState(createRfq, {} as RfqActionState);
  const [activeStepId, setActiveStepId] = useState<StepId>('overview');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [requestSummary, setRequestSummary] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [validityDate, setValidityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([buildLineFromProduct(products[0], 'USD')]);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);

  useEffect(() => {
    if (state.success) setValidationIssues([]);
    if (state.success && state.record) {
      onSaved?.(state.record as RfqRecord);
      onClose();
    }
  }, [onClose, onSaved, state.record, state.success]);

  const activeIndex = RFQ_CREATE_STEPS.findIndex((step) => step.id === activeStepId);
  const currentStep = RFQ_CREATE_STEPS[activeIndex] ?? RFQ_CREATE_STEPS[0];
  const currentIssues = buildRfqValidation(activeStepId, { title, requestSummary, neededBy, currency, validityDate, status, lineItems, suppliers });

  const goNext = () => {
    const issues = buildRfqValidation(activeStepId, { title, requestSummary, neededBy, currency, validityDate, status, lineItems, suppliers });
    setValidationIssues(issues);
    if (issues.length) return;
    setActiveStepId(RFQ_CREATE_STEPS[Math.min(activeIndex + 1, RFQ_CREATE_STEPS.length - 1)]?.id as StepId);
  };

  const updateLineItem = (index: number, patch: Partial<DraftLineItem>) => {
    setLineItems((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)));
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="request_summary" value={requestSummary} />
      <input type="hidden" name="needed_by" value={neededBy} />
      <input type="hidden" name="currency" value={normalizeCurrency(currency)} />
      <input type="hidden" name="validity_date" value={validityDate} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems.map((item) => ({ ...item, currency: normalizeCurrency(currency), catalog_price_currency: normalizeCurrency(item.catalog_price_currency || currency), is_price_overridden: isLinePriceOverridden(item) })))} readOnly />
      <input type="hidden" name="supplier_responses" value={JSON.stringify(suppliers)} readOnly />

      <WizardShell
        steps={RFQ_CREATE_STEPS}
        activeStepId={activeStepId}
        onStepChange={(nextStep) => {
          const issues = buildRfqValidation(activeStepId, { title, requestSummary, neededBy, currency, validityDate, status, lineItems, suppliers });
          if (RFQ_CREATE_STEPS.findIndex((step) => step.id === nextStep) > activeIndex && issues.length) {
            setValidationIssues(issues);
            return;
          }
          setValidationIssues([]);
          setActiveStepId(nextStep as StepId);
        }}
        summary={<WizardValidationSummary title="Resolve before continuing" issues={validationIssues.length ? validationIssues : currentIssues} tone="info" />}
      >
        {activeStepId === 'overview' ? (
          <WizardStepBody title="Request brief" description="Capture the buyer request in a clean first step so the rest of the RFQ stays grounded." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={suppliers} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterField label="RFQ title"><input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Buyer request title" /></FilterField>
                <FilterField label="Needed by"><input className={inputClassName()} type="date" value={neededBy} onChange={(event) => setNeededBy(event.target.value)} /></FilterField>
                <FilterField label="Currency"><input className={inputClassName()} value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))} placeholder="USD" maxLength={3} /></FilterField>
                <FilterField label="Validity date"><input className={inputClassName()} type="date" value={validityDate} onChange={(event) => setValidityDate(event.target.value)} /></FilterField>
              </div>
              <div className="mt-4 grid gap-4">
                <FilterField label="Buyer request summary"><textarea className={`${inputClassName()} min-h-[120px]`} rows={4} value={requestSummary} onChange={(event) => setRequestSummary(event.target.value)} placeholder="Summarize demand, target market, quantity, or quality requirements." /></FilterField>
                <FilterField label="Internal notes"><textarea className={`${inputClassName()} min-h-[100px]`} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal context, sourcing notes, or follow-up guidance." /></FilterField>
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'items' ? (
          <WizardStepBody title="Requested items" description="Structure requested products and target pricing before supplier outreach begins." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={suppliers} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Requested items</h4>
                  <p className="mt-1 text-xs text-slate-500">Keep product, quantity, and target pricing in one structured step.</p>
                </div>
                <button type="button" onClick={() => setLineItems((current) => [...current, buildLineFromProduct(undefined, currency)])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Add line</button>
              </div>
              <div className="mt-4 space-y-3">
                {lineItems.map((item, index) => (
                  <div key={`rfq-line-${index}`} className="rounded-panel border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-[1.3fr_0.55fr_0.75fr_auto]">
                      <select className={inputClassName()} value={item.product_id} onChange={(event) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? hydrateLineFromProduct(entry, products.find((product) => product.id === event.target.value), currency) : entry))} aria-label={`Requested item ${index + 1} product`}>
                        <option value="">Select product</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </select>
                      <input className={inputClassName()} type="number" min="1" value={item.quantity} onChange={(event) => updateLineItem(index, { quantity: Number(event.target.value) || 0 })} aria-label={`Requested item ${index + 1} quantity`} />
                      <input className={inputClassName()} type="number" step="0.01" value={item.unit_price} onChange={(event) => updateLineItem(index, { unit_price: event.target.value })} placeholder="Target" aria-label={`Requested item ${index + 1} target price`} />
                      <button type="button" onClick={() => setLineItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="rounded-2xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Catalog baseline</p>
                        <p className="mt-2 font-medium text-slate-900">{typeof item.catalog_price_amount === 'number' ? `${item.catalog_price_currency || normalizeCurrency(currency)} ${item.catalog_price_amount.toFixed(2)}` : 'No catalog price linked'}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.product_variant_id ? `Variant linked: ${products.find((product) => product.id === item.product_id)?.defaultVariantName ?? 'Default variant'}` : 'Select a product to pull baseline pricing.'}</p>
                      </div>
                      <div className={`rounded-2xl border px-3 py-3 text-sm ${isLinePriceOverridden(item) ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">RFQ target price</p>
                        <p className="mt-2 font-medium text-slate-900">{normalizeCurrency(currency)} {Number(item.unit_price || 0).toFixed(2)}</p>
                        <p className="mt-1 text-xs text-slate-500">{isLinePriceOverridden(item) ? 'Override active — reason required.' : 'Using catalog baseline.'}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input className={inputClassName()} value={item.notes} onChange={(event) => updateLineItem(index, { notes: event.target.value })} placeholder="Line notes" aria-label={`Requested item ${index + 1} notes`} />
                      <input className={inputClassName()} value={item.override_reason} onChange={(event) => updateLineItem(index, { override_reason: event.target.value })} placeholder={isLinePriceOverridden(item) ? 'Why is this price overridden?' : 'Override reason not needed'} disabled={!isLinePriceOverridden(item)} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'suppliers' ? (
          <WizardStepBody title="Supplier plan" description="Stage supplier outreach and status tracking without leaving the RFQ drawer." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={suppliers} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Suppliers to contact</h4>
                  <p className="mt-1 text-xs text-slate-500">Track outreach and response state from the same workflow surface.</p>
                </div>
                <button type="button" onClick={() => setSuppliers((current) => [...current, { id: `supplier-${current.length + 1}`, supplierName: '', status: 'not_sent', contactedAt: null, viewedAt: null, respondedAt: null, notes: '' }])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Add supplier</button>
              </div>
              <div className="mt-4 space-y-3">
                {suppliers.length ? suppliers.map((supplier, index) => (
                  <div key={supplier.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_1fr_auto]">
                      <input className={inputClassName()} value={supplier.supplierName} onChange={(event) => setSuppliers((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, supplierName: event.target.value } : entry))} placeholder="Supplier name" />
                      <select className={inputClassName()} value={supplier.status} onChange={(event) => setSuppliers((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: event.target.value as SupplierResponse['status'], contactedAt: event.target.value === 'not_sent' ? entry.contactedAt : entry.contactedAt ?? new Date().toISOString(), respondedAt: event.target.value === 'responded' ? entry.respondedAt ?? new Date().toISOString() : entry.respondedAt } : entry))}>
                        {SUPPLIER_RESPONSE_STATES.map((supplierStatus) => <option key={supplierStatus} value={supplierStatus}>{supplierStatus.replaceAll('_', ' ')}</option>)}
                      </select>
                      <input className={inputClassName()} value={supplier.notes} onChange={(event) => setSuppliers((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} placeholder="Outreach or response notes" />
                      <button type="button" onClick={() => setSuppliers((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="rounded-2xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${getSupplierResponseBadgeClasses(supplier.status)}`}>{supplier.status.replaceAll('_', ' ')}</span>
                      <span>Contacted {formatDateTime(supplier.contactedAt)}</span>
                      <span>Responded {formatDateTime(supplier.respondedAt)}</span>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">No suppliers added yet. Leave this empty for a draft RFQ or stage outreach before sending.</div>
                )}
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'review' ? (
          <WizardStepBody title="Review and submit" description="Confirm lifecycle state, notes, and supplier readiness before saving the RFQ." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={suppliers} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterField label="Lifecycle status">
                  <select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>
                    {RFQ_STATUSES.map((rfqStatus) => <option key={rfqStatus} value={rfqStatus}>{rfqStatus.replaceAll('_', ' ')}</option>)}
                  </select>
                </FilterField>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Timeline framing</p>
                  <p className="mt-2">Needed by {formatDate(neededBy)} · valid through {formatDate(validityDate)}.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Readiness checklist</p>
                <ul className="mt-3 space-y-2">
                  <li>• Buyer demand is structured before supplier routing begins.</li>
                  <li>• Supplier response tracking stays tied to the RFQ instead of separate notes.</li>
                  <li>• Validation matches the lead wizard pattern with step-aware review.</li>
                </ul>
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}
      </WizardShell>

      <CommercialWizardFooter
        title="RFQ workflow"
        description="Save the RFQ and keep the buyer request, supplier plan, and review state in one product system."
        error={state.error}
        success={state.success}
        isPending={false}
        activeStepIndex={activeIndex}
        totalSteps={RFQ_CREATE_STEPS.length}
        activeStepTitle={currentStep.title}
        canGoBack={activeIndex > 0}
        onBack={() => setActiveStepId(RFQ_CREATE_STEPS[Math.max(activeIndex - 1, 0)]?.id as StepId)}
        onCancel={onClose}
        onNext={goNext}
        submitLabel="Create RFQ"
      />
    </form>
  );
}

export function RfqEditWizardForm({ rfq, products, onClose, onSaved }: { rfq: RfqRecord; products: ProductOption[]; onClose: () => void; onSaved?: (rfq: RfqRecord) => void }) {
  const [state, formAction] = useFormState(updateRfqWorkflow, {} as RfqActionState);
  const parsed = useMemo(() => parseRfqWorkflow(rfq.notes), [rfq.notes]);
  const [activeStepId, setActiveStepId] = useState<StepId>('overview');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [title, setTitle] = useState(parsed.meta.title ?? '');
  const [requestSummary, setRequestSummary] = useState(parsed.meta.requestSummary ?? '');
  const [neededBy, setNeededBy] = useState(parsed.meta.neededBy ?? '');
  const [currency, setCurrency] = useState(rfq.currency ?? 'USD');
  const [validityDate, setValidityDate] = useState(rfq.validity_date ?? '');
  const [notes, setNotes] = useState(parsed.plainNotes ?? '');
  const [status, setStatus] = useState<string>(computeRFQStatus(rfq, parsed.meta.supplierResponses ?? []));
  const [supplierResponses, setSupplierResponses] = useState<SupplierResponse[]>(parsed.meta.supplierResponses ?? []);

  const activeIndex = RFQ_EDIT_STEPS.findIndex((step) => step.id === activeStepId);
  const currentStep = RFQ_EDIT_STEPS[activeIndex] ?? RFQ_EDIT_STEPS[0];
  const [lineItems, setLineItems] = useState<DraftLineItem[]>((rfq.lineItems ?? []).map((item) => ({ product_id: item.product_id ?? '', product_variant_id: item.product_variant_id ?? '', catalog_price_id: item.catalog_price_id ?? '', catalog_price_amount: item.catalog_price_amount ?? null, catalog_price_currency: item.catalog_price_currency ?? item.currency ?? rfq.currency ?? 'USD', quantity: item.quantity, unit_price: String(item.unit_price ?? ''), override_reason: item.override_reason ?? '', notes: item.notes ?? '' })));
  const currentIssues = buildRfqValidation(activeStepId, { title, requestSummary, neededBy, currency, validityDate, status, lineItems, suppliers: supplierResponses });

  const goNext = () => {
    const issues = buildRfqValidation(activeStepId, { title, requestSummary, neededBy, currency, validityDate, status, lineItems, suppliers: supplierResponses });
    setValidationIssues(issues);
    if (issues.length) return;
    setActiveStepId(RFQ_EDIT_STEPS[Math.min(activeIndex + 1, RFQ_EDIT_STEPS.length - 1)]?.id as StepId);
  };

  useEffect(() => {
    if (state.success) setValidationIssues([]);
    if (state.success && state.record) {
      onSaved?.(state.record as RfqRecord);
      onClose();
    }
  }, [onClose, onSaved, state.record, state.success]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="rfq_id" value={rfq.id} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="request_summary" value={requestSummary} />
      <input type="hidden" name="needed_by" value={neededBy} />
      <input type="hidden" name="currency" value={normalizeCurrency(currency)} />
      <input type="hidden" name="validity_date" value={validityDate} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="supplier_responses" value={JSON.stringify(supplierResponses)} readOnly />
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems.map((item) => ({ ...item, currency: normalizeCurrency(currency), catalog_price_currency: normalizeCurrency(item.catalog_price_currency || currency), is_price_overridden: isLinePriceOverridden(item) })))} readOnly />

      <WizardShell
        steps={RFQ_EDIT_STEPS}
        activeStepId={activeStepId}
        onStepChange={(nextStep) => {
          const issues = buildRfqValidation(activeStepId, { title, requestSummary, neededBy, currency, validityDate, status, lineItems, suppliers: supplierResponses });
          if (RFQ_EDIT_STEPS.findIndex((step) => step.id === nextStep) > activeIndex && issues.length) {
            setValidationIssues(issues);
            return;
          }
          setValidationIssues([]);
          setActiveStepId(nextStep as StepId);
        }}
        summary={<WizardValidationSummary title="Resolve before continuing" issues={validationIssues.length ? validationIssues : currentIssues} tone="info" />}
      >
        {activeStepId === 'overview' ? (
          <WizardStepBody title="Workflow brief" description="Update lifecycle and internal context without leaving the RFQ drawer." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={supplierResponses} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterField label="RFQ title"><input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} /></FilterField>
                <FilterField label="Needed by"><input className={inputClassName()} type="date" value={neededBy} onChange={(event) => setNeededBy(event.target.value)} /></FilterField>
                <FilterField label="Currency"><input className={inputClassName()} value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))} maxLength={3} /></FilterField>
                <FilterField label="Lifecycle status"><select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>{RFQ_STATUSES.map((rfqStatus) => <option key={rfqStatus} value={rfqStatus}>{rfqStatus.replaceAll('_', ' ')}</option>)}</select></FilterField>
              </div>
              <div className="mt-4 grid gap-4">
                <FilterField label="Buyer request summary"><textarea className={`${inputClassName()} min-h-[120px]`} rows={4} value={requestSummary} onChange={(event) => setRequestSummary(event.target.value)} /></FilterField>
                <FilterField label="Internal notes"><textarea className={`${inputClassName()} min-h-[100px]`} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} /></FilterField>
                <FilterField label="Validity date"><input className={inputClassName()} type="date" value={validityDate} onChange={(event) => setValidityDate(event.target.value)} /></FilterField>
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'items' ? (
          <WizardStepBody title="Requested items" description="Edit requested products and target pricing while preserving RFQ audit context." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={supplierResponses} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-900">Requested items</h4><p className="mt-1 text-xs text-slate-500">Update baseline-linked target pricing directly from the RFQ workspace.</p></div><button type="button" onClick={() => setLineItems((current) => [...current, buildLineFromProduct(undefined, currency)])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Add line</button></div>
              <div className="mt-4 space-y-3">
                {lineItems.map((item, index) => (
                  <div key={`rfq-edit-line-${index}`} className="rounded-panel border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-[1.3fr_0.55fr_0.75fr_auto]">
                      <select className={inputClassName()} value={item.product_id} onChange={(event) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? hydrateLineFromProduct(entry, products.find((product) => product.id === event.target.value), currency) : entry))}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
                      <input className={inputClassName()} type="number" min="1" value={item.quantity} onChange={(event) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: Number(event.target.value) || 0 } : entry))} />
                      <input className={inputClassName()} type="number" step="0.01" value={item.unit_price} onChange={(event) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, unit_price: event.target.value } : entry))} placeholder="Target" />
                      <button type="button" onClick={() => setLineItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="rounded-2xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Catalog baseline</p><p className="mt-2 font-medium text-slate-900">{typeof item.catalog_price_amount === 'number' ? `${item.catalog_price_currency || normalizeCurrency(currency)} ${item.catalog_price_amount.toFixed(2)}` : 'No catalog price linked'}</p><p className="mt-1 text-xs text-slate-500">{item.product_variant_id ? `Variant linked: ${products.find((product) => product.id === item.product_id)?.defaultVariantName ?? 'Default variant'}` : 'Select a product to pull baseline pricing.'}</p></div>
                      <div className={`rounded-2xl border px-3 py-3 text-sm ${isLinePriceOverridden(item) ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">RFQ target price</p><p className="mt-2 font-medium text-slate-900">{normalizeCurrency(currency)} {Number(item.unit_price || 0).toFixed(2)}</p><p className="mt-1 text-xs text-slate-500">{isLinePriceOverridden(item) ? 'Override active — reason required.' : 'Using catalog baseline.'}</p></div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input className={inputClassName()} value={item.notes} onChange={(event) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} placeholder="Line notes" />
                      <input className={inputClassName()} value={item.override_reason} onChange={(event) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, override_reason: event.target.value } : entry))} placeholder={isLinePriceOverridden(item) ? 'Why is this price overridden?' : 'Override reason not needed'} disabled={!isLinePriceOverridden(item)} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'suppliers' ? (
          <WizardStepBody title="Supplier responses" description="Update outreach timing and supplier response state without changing route behavior." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={supplierResponses} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-900">Supplier response tracking</h4><p className="mt-1 text-xs text-slate-500">Keep outreach updates inside the RFQ instead of separate notes or spreadsheets.</p></div><button type="button" onClick={() => setSupplierResponses((current) => [...current, { id: `supplier-${current.length + 1}`, supplierName: '', status: 'requested', contactedAt: new Date().toISOString(), viewedAt: null, respondedAt: null, notes: '' }])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Add supplier</button></div>
              <div className="mt-4 space-y-3">
                {supplierResponses.length ? supplierResponses.map((supplier, index) => (
                  <div key={supplier.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_1fr_auto]">
                      <input className={inputClassName()} value={supplier.supplierName} onChange={(event) => setSupplierResponses((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, supplierName: event.target.value } : entry))} placeholder="Supplier name" />
                      <select className={inputClassName()} value={supplier.status} onChange={(event) => setSupplierResponses((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: event.target.value as SupplierResponse['status'], contactedAt: entry.contactedAt ?? new Date().toISOString(), respondedAt: event.target.value === 'responded' ? entry.respondedAt ?? new Date().toISOString() : entry.respondedAt } : entry))}>{SUPPLIER_RESPONSE_STATES.map((supplierStatus) => <option key={supplierStatus} value={supplierStatus}>{supplierStatus.replaceAll('_', ' ')}</option>)}</select>
                      <input className={inputClassName()} value={supplier.notes} onChange={(event) => setSupplierResponses((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: event.target.value } : entry))} placeholder="Response details" />
                      <button type="button" onClick={() => setSupplierResponses((current) => current.filter((_, entryIndex) => entryIndex !== index))} className="rounded-2xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className={`rounded-full px-2.5 py-1 font-semibold ${getSupplierResponseBadgeClasses(supplier.status)}`}>{supplier.status.replaceAll('_', ' ')}</span><span>Contacted {formatDateTime(supplier.contactedAt)}</span><span>Responded {formatDateTime(supplier.respondedAt)}</span></div>
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">No supplier responses tracked yet.</div>}
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'review' ? (
          <WizardStepBody title="Review and save" description="See the current timeline state before saving workflow updates." aside={<RfqReviewPanel title={title} requestSummary={requestSummary} neededBy={neededBy} validityDate={validityDate} currency={currency} status={status} lineItems={lineItems} suppliers={supplierResponses} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Created</p><p className="mt-2 text-slate-900">{formatDateTime(rfq.created_at)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last update</p><p className="mt-2 text-slate-900">{formatDateTime(rfq.updated_at)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Buyer submitted</p><p className="mt-2 text-slate-900">{formatDateTime(parsed.meta.buyerSubmittedAt)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sent to suppliers</p><p className="mt-2 text-slate-900">{formatDateTime(parsed.meta.sentToSuppliersAt)}</p></div>
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}
      </WizardShell>

      <CommercialWizardFooter
        title="RFQ workflow"
        description="Save the RFQ and keep status clarity, outreach visibility, and timeline context in one operational surface."
        error={state.error}
        success={state.success}
        isPending={false}
        activeStepIndex={activeIndex}
        totalSteps={RFQ_EDIT_STEPS.length}
        activeStepTitle={currentStep.title}
        canGoBack={activeIndex > 0}
        onBack={() => setActiveStepId(RFQ_EDIT_STEPS[Math.max(activeIndex - 1, 0)]?.id as StepId)}
        onCancel={onClose}
        onNext={goNext}
        submitLabel="Save RFQ"
      />
    </form>
  );
}
