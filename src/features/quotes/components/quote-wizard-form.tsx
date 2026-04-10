'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';

import { DrawerActionBar } from '@/components/RightDrawer';
import { SectionCard } from '@/components/ui/section-card';
import { WizardShell, WizardStepBody, WizardValidationSummary, type WizardStepDefinition } from '@/components/ui/wizard-shell';
import { CommercialWizardFooter } from '@/components/ui/commercial-wizard-footer';
import { createQuote, updateQuoteWorkflow, type QuoteActionState } from '@/features/quotes/server/actions';
import { APPROVAL_STATES, getApprovalBadgeClasses } from '@/lib/approvalRouting';
import { PRICING_TEMPLATES, applyPricingTemplate, getPricingTemplate } from '@/lib/pricingTemplates';
import { QUOTE_STATUSES, computeQuoteTotals, getQuoteStatusBadgeClasses, getQuoteWorkflowStatus, parseQuoteWorkflow } from '@/lib/quoteWorkflow';
import { formatDateTime } from '@/lib/utils';

type ProductOption = { id: string; name: string; defaultVariantId: string | null; defaultVariantName: string | null; catalogPriceId: string | null; catalogPriceAmount: number | null; catalogPriceCurrency: string | null; catalogMarketId: string | null; exFactoryPriceAmount?: number | null; fobPriceAmount?: number | null; cifBasePriceAmount?: number | null; bulkPriceAmount?: number | null; pricingModeDefault?: string | null; pricingType?: string | null; unitsPerCase?: number | null; skuCode?: string | null; packLabel?: string | null; moqValue?: number | null; moqUnit?: string | null; moqDisplay?: string | null };
type PricingBasis = 'ex_factory' | 'fob' | 'cif';
type RfqOption = { id: string; status: string; currency: string | null; notes?: string | null };
type QuoteRecord = {
  id: string;
  lead_id: string;
  rfq_id: string | null;
  status: string;
  currency: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  lineItems?: Array<{ id: string; product_id: string | null; product_variant_id: string | null; catalog_price_id: string | null; catalog_price_amount: number | null; catalog_price_currency: string | null; quantity: number; unit_price: number | null; currency: string | null; is_price_overridden?: boolean | null; override_reason?: string | null; notes: string | null }>;
};

type DraftQuoteLine = { product_id: string; product_variant_id: string; catalog_price_id: string; catalog_price_amount: number | null; catalog_price_currency: string; quantity: number; unit_price: number; currency: string; override_reason: string; notes: string };
type StepId = 'commercial' | 'pricing' | 'review';
type ProgressionGuardSummary = { blockerCount: number; blockerReasons: string[] };

const QUOTE_CREATE_STEPS: WizardStepDefinition[] = [
  { id: 'commercial', title: 'Commercial context', shortLabel: 'Context', description: 'Choose RFQ linkage, template, currency, and approval posture before pricing.' },
  { id: 'pricing', title: 'Pricing lines', shortLabel: 'Pricing', description: 'Keep product and price linkage inside the same commercial flow.' },
  { id: 'review', title: 'Review and save', shortLabel: 'Review', description: 'Confirm totals, workflow state, and approval visibility before saving the quote.' },
];

const QUOTE_EDIT_STEPS: WizardStepDefinition[] = [
  { id: 'commercial', title: 'Workflow context', shortLabel: 'Context', description: 'Adjust approval and status context without changing routing or page architecture.' },
  { id: 'pricing', title: 'Pricing summary', shortLabel: 'Pricing', description: 'Review commercial totals and linked line items in one place.' },
  { id: 'review', title: 'Review and save', shortLabel: 'Review', description: 'Confirm approval state, timeline, and notes before saving the quote.' },
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

function normalizePricingBasis(value: string | null | undefined): PricingBasis {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'ex_factory' || normalized === 'ex-factory') return 'ex_factory';
  if (normalized === 'cif' || normalized === 'cif') return 'cif';
  return 'fob';
}

function pricingBasisLabel(value: PricingBasis) {
  if (value === 'ex_factory') return 'Ex-Factory';
  if (value === 'cif') return 'CIF';
  return 'FOB';
}

function getProductBasisAmount(product: ProductOption | undefined, basis: PricingBasis) {
  if (!product) return null;
  if (basis === 'ex_factory') return typeof product.exFactoryPriceAmount === 'number' ? product.exFactoryPriceAmount : product.catalogPriceAmount;
  if (basis === 'cif') return typeof product.cifBasePriceAmount === 'number' ? product.cifBasePriceAmount : typeof product.fobPriceAmount === 'number' ? product.fobPriceAmount : product.catalogPriceAmount;
  return typeof product.fobPriceAmount === 'number' ? product.fobPriceAmount : product.catalogPriceAmount;
}

function buildLineFromProduct(product: ProductOption | undefined, currency: string, pricingBasis: PricingBasis = 'fob'): DraftQuoteLine {
  const normalizedCurrency = normalizeCurrency(product?.catalogPriceCurrency || currency) || 'USD';
  const basisAmount = getProductBasisAmount(product, pricingBasis);
  return {
    product_id: product?.id ?? '',
    product_variant_id: product?.defaultVariantId ?? '',
    catalog_price_id: product?.catalogPriceId ?? '',
    catalog_price_amount: typeof basisAmount === 'number' ? basisAmount : null,
    catalog_price_currency: normalizedCurrency,
    quantity: typeof product?.moqValue === 'number' && product.moqValue > 0 ? product.moqValue : 1,
    unit_price: typeof basisAmount === 'number' ? basisAmount : 0,
    currency: normalizedCurrency,
    override_reason: '',
    notes: '',
  };
}

function hydrateLineFromProduct(line: DraftQuoteLine, product: ProductOption | undefined, currency: string, pricingBasis: PricingBasis): DraftQuoteLine {
  const next = buildLineFromProduct(product, currency, pricingBasis);
  return { ...line, ...next, notes: line.notes ?? '' };
}

function hydrateExistingLineWithCatalog(
  line: NonNullable<QuoteRecord['lineItems']>[number],
  products: ProductOption[],
  currency: string,
  pricingBasis: PricingBasis = 'fob',
): DraftQuoteLine {
  const matchedProduct =
    products.find((product) => product.id === line.product_id) ??
    products.find((product) => product.defaultVariantId === line.product_variant_id);

  const fallback = buildLineFromProduct(matchedProduct, currency, pricingBasis);
  const catalogPriceAmount =
    typeof line.catalog_price_amount === 'number'
      ? line.catalog_price_amount
      : typeof getProductBasisAmount(matchedProduct, pricingBasis) === 'number'
        ? getProductBasisAmount(matchedProduct, pricingBasis)
        : fallback.catalog_price_amount;
  const normalizedCurrency =
    normalizeCurrency(line.currency || line.catalog_price_currency || matchedProduct?.catalogPriceCurrency || currency) || 'USD';

  return {
    product_id: line.product_id ?? matchedProduct?.id ?? fallback.product_id,
    product_variant_id: line.product_variant_id ?? matchedProduct?.defaultVariantId ?? fallback.product_variant_id,
    catalog_price_id: line.catalog_price_id ?? matchedProduct?.catalogPriceId ?? fallback.catalog_price_id,
    catalog_price_amount: catalogPriceAmount,
    catalog_price_currency:
      normalizeCurrency(line.catalog_price_currency || matchedProduct?.catalogPriceCurrency || normalizedCurrency) || 'USD',
    quantity: typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : fallback.quantity,
    unit_price: typeof line.unit_price === 'number' ? line.unit_price : catalogPriceAmount ?? fallback.unit_price,
    currency: normalizedCurrency,
    override_reason: line.override_reason ?? '',
    notes: line.notes ?? '',
  };
}

function isLinePriceOverridden(line: DraftQuoteLine) {
  return typeof line.catalog_price_amount === 'number' && Number(line.unit_price) !== Number(line.catalog_price_amount);
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  return `${normalizeCurrency(currency || 'USD') || 'USD'} ${amount.toFixed(2)}`;
}

function getLineMode(product: ProductOption | undefined, fallbackCurrency: string) {
  const mode = String(product?.pricingModeDefault ?? '').trim().toLowerCase();
  if (mode === 'kg') return { label: 'kg', quoteLabel: product?.moqUnit ?? 'kg', helper: product?.bulkPriceAmount != null ? `${formatMoney(product.bulkPriceAmount, product.catalogPriceCurrency || fallbackCurrency)} / kg` : 'Per kg pricing' };
  if (mode === 'unit') return { label: 'unit', quoteLabel: product?.moqUnit ?? 'units', helper: 'Per unit pricing' };
  return { label: 'case', quoteLabel: product?.moqUnit ?? 'cases', helper: product?.unitsPerCase ? `${product.unitsPerCase} units/case` : 'Per case pricing' };
}

function QuoteLineTable({
  lineItems,
  products,
  currency,
  pricingBasis,
  onChangeLine,
  onRemoveLine,
}: {
  lineItems: DraftQuoteLine[];
  products: ProductOption[];
  currency: string;
  pricingBasis: PricingBasis;
  onChangeLine: (index: number, next: DraftQuoteLine) => void;
  onRemoveLine: (index: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
      <table className="min-w-[1120px] w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Product</th>
            <th className="px-3 py-3">Pack</th>
            <th className="px-3 py-3">MOQ</th>
            <th className="px-3 py-3">Quote qty</th>
            <th className="px-3 py-3">Basis</th>
            <th className="px-3 py-3">Base price</th>
            <th className="px-3 py-3">Quote price</th>
            <th className="px-3 py-3">Line total</th>
            <th className="px-3 py-3">Override reason</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => {
            const product = products.find((entry) => entry.id === item.product_id) ?? products.find((entry) => entry.defaultVariantId === item.product_variant_id);
            const mode = getLineMode(product, currency);
            const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
            return (
              <tr key={`quote-table-line-${index}`} className="border-t border-slate-100 align-top">
                <td className="px-3 py-3">
                  <select className={inputClassName()} value={item.product_id} onChange={(event) => onChangeLine(index, hydrateLineFromProduct(item, products.find((product) => product.id === event.target.value), currency, pricingBasis))}>
                    <option value="">Select product</option>
                    {products.map((productOption) => <option key={productOption.id} value={productOption.id}>{productOption.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">{product?.skuCode ? `SKU ${product.skuCode}` : 'Pick a product to load pricing.'}</p>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="min-w-[110px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium text-slate-900">{product?.packLabel ?? product?.defaultVariantName ?? '—'}</div>
                    <div className="mt-1 text-xs text-slate-500">{mode.helper}</div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="min-w-[90px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium text-slate-900">{product?.moqDisplay ?? '1'}</div>
                    <div className="mt-1 text-xs text-slate-500">Default baseline</div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input className={inputClassName()} type="number" min="1" value={item.quantity} onChange={(event) => onChangeLine(index, { ...item, quantity: Number(event.target.value) || 0 })} />
                  <p className="mt-1 text-xs text-slate-500">{product?.moqUnit ?? mode.quoteLabel}</p>
                </td>
                <td className="px-3 py-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">{pricingBasisLabel(pricingBasis)}</div>
                  <p className="mt-1 text-xs text-slate-500">{pricingBasis === 'cif' ? 'FOB base used for CIF uplift' : 'Catalog basis linked'}</p>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium text-slate-900">{formatMoney(item.catalog_price_amount, item.catalog_price_currency || currency)}</div>
                    <div className="mt-1 text-xs text-slate-500">per {mode.label}</div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input className={inputClassName()} type="number" step="0.01" value={item.unit_price} onChange={(event) => onChangeLine(index, { ...item, unit_price: Number(event.target.value) })} />
                  <p className="mt-1 text-xs text-slate-500">{formatMoney(Number(item.unit_price || 0) - Number(item.catalog_price_amount || 0), item.currency || currency)} vs base</p>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className={`rounded-xl border px-3 py-2 ${isLinePriceOverridden(item) ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className="font-medium text-slate-900">{formatMoney(lineTotal, item.currency || currency)}</div>
                    <div className="mt-1 text-xs text-slate-500">{isLinePriceOverridden(item) ? 'Override active' : 'Using base price'}</div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input className={inputClassName()} value={item.override_reason} onChange={(event) => onChangeLine(index, { ...item, override_reason: event.target.value })} placeholder={isLinePriceOverridden(item) ? 'Why is this price changed?' : 'No override reason needed'} disabled={!isLinePriceOverridden(item)} />
                  <input className={`${inputClassName()} mt-2`} value={item.notes} onChange={(event) => onChangeLine(index, { ...item, notes: event.target.value })} placeholder="Internal note" />
                </td>
                <td className="px-3 py-3">
                  <button type="button" onClick={() => onRemoveLine(index)} className="rounded-2xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Remove</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function applyPricingBasisToLine(line: DraftQuoteLine, products: ProductOption[], currency: string, pricingBasis: PricingBasis): DraftQuoteLine {
  const matchedProduct = products.find((product) => product.id === line.product_id) ?? products.find((product) => product.defaultVariantId === line.product_variant_id);
  const nextCatalogAmount = getProductBasisAmount(matchedProduct, pricingBasis);
  const previousCatalogAmount = typeof line.catalog_price_amount === 'number' ? line.catalog_price_amount : null;
  const shouldFollowCatalog = previousCatalogAmount == null || Number(line.unit_price) === Number(previousCatalogAmount);
  const nextCurrency = normalizeCurrency(line.catalog_price_currency || matchedProduct?.catalogPriceCurrency || line.currency || currency) || 'USD';
  return {
    ...line,
    catalog_price_amount: typeof nextCatalogAmount === 'number' ? nextCatalogAmount : null,
    catalog_price_currency: nextCurrency,
    unit_price: shouldFollowCatalog ? (typeof nextCatalogAmount === 'number' ? nextCatalogAmount : 0) : line.unit_price,
    currency: normalizeCurrency(line.currency || nextCurrency || currency) || 'USD',
  };
}

function mapTemplateLinesToDraftLines(templateId: string, currency: string, pricingBasis: PricingBasis = 'fob'): DraftQuoteLine[] {
  const template = getPricingTemplate(templateId);
  if (!template) return [buildLineFromProduct(undefined, currency, pricingBasis)];
  return applyPricingTemplate(template, currency).map((line) => ({
    product_id: line.product_id,
    product_variant_id: '',
    catalog_price_id: '',
    catalog_price_amount: null,
    catalog_price_currency: normalizeCurrency(line.currency || currency) || 'USD',
    quantity: line.quantity,
    unit_price: line.unit_price,
    currency: normalizeCurrency(line.currency || currency) || 'USD',
    override_reason: '',
    notes: line.notes,
  }));
}

function getQuoteValidation(stepId: StepId, data: {
  currency: string;
  approvalRequired: boolean;
  approvalState: string;
  status: string;
  lineItems: DraftQuoteLine[];
  quoteSendGuard?: ProgressionGuardSummary;
}) {
  const issues: string[] = [];
  if (stepId === 'commercial') {
    if (!normalizeCurrency(data.currency)) issues.push('Choose a 3-letter currency code such as USD or EUR.');
    if (data.approvalRequired && !APPROVAL_STATES.includes(data.approvalState as (typeof APPROVAL_STATES)[number])) {
      issues.push('Pick a valid approval state when approval is required.');
    }
  }
  if (stepId === 'pricing') {
    const usable = data.lineItems.filter((item) => item.quantity > 0 && (item.product_id || item.notes.trim()));
    if (!usable.length) issues.push('Add at least one priced line item before continuing.');
    if (data.lineItems.some((item) => item.quantity <= 0)) issues.push('Quote quantities must stay above zero.');
    if (data.lineItems.some((item) => item.unit_price < 0)) issues.push('Unit pricing cannot be negative.');
    if (data.lineItems.some((item) => isLinePriceOverridden(item) && !item.override_reason.trim())) issues.push('Add an override reason whenever final quote pricing differs from the catalog baseline.');
  }
  if (stepId === 'review') {
    if (!QUOTE_STATUSES.includes(data.status as (typeof QUOTE_STATUSES)[number])) issues.push('Pick a valid quote workflow state.');
    if (data.status === 'sent' && data.approvalRequired && data.approvalState === 'pending') issues.push('Resolve approval before marking the quote as sent.');
    if (data.status === 'sent' && (data.quoteSendGuard?.blockerCount ?? 0) > 0) issues.push('Resolve quote-send blockers before submitting this quote.');
  }
  return issues;
}

function QuoteReviewPanel({
  currency,
  status,
  approvalRequired,
  approvalState,
  lineItems,
  templateId,
  quoteSendGuard,
}: {
  currency: string;
  status: string;
  approvalRequired: boolean;
  approvalState: string;
  lineItems: DraftQuoteLine[];
  templateId: string;
  quoteSendGuard?: ProgressionGuardSummary;
}) {
  const totals = computeQuoteTotals(lineItems, normalizeCurrency(currency));
  const template = getPricingTemplate(templateId);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(status as any)}`}>{status.replaceAll('_', ' ')}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses((approvalRequired ? approvalState : 'not_required') as any)}`}>approval {(approvalRequired ? approvalState : 'not_required').replaceAll('_', ' ')}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subtotal</p><p className="mt-2 text-sm font-medium text-slate-900">{totals.currency} {totals.subtotal.toFixed(2)}</p></div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Line items</p><p className="mt-2 text-sm font-medium text-slate-900">{totals.lineItemCount}</p></div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Currency</p><p className="mt-2 text-sm font-medium text-slate-900">{normalizeCurrency(currency) || 'Unset'}</p></div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Template</p><p className="mt-2 text-sm font-medium text-slate-900">{template?.name ?? 'Manual pricing'}</p></div>
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft text-sm text-slate-600">
        <p className="font-medium text-slate-900">Commercial framing</p>
        <ul className="mt-3 space-y-2">
          <li>Pricing linkage remains inside the current quote + quote line item model.</li>
          <li>Approval state and workflow status stay visible before send or revision decisions.</li>
          <li>Validation follows the same step-aware pattern used in the lead and RFQ wizards.</li>
        </ul>
        {quoteSendGuard?.blockerCount ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Quote-send blockers</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">{quoteSendGuard.blockerReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">Quote-send readiness is currently clear.</div>}
      </div>
    </div>
  );
}

export function QuoteCreateWizardForm({ leadId, rfqs, products, quoteSendGuard, onClose, onSaved }: { leadId: string; rfqs: RfqOption[]; products: ProductOption[]; quoteSendGuard?: ProgressionGuardSummary; onClose: () => void; onSaved?: (quote: QuoteRecord) => void }) {
  const [state, formAction] = useFormState(createQuote, {} as QuoteActionState);
  const defaultTemplate = PRICING_TEMPLATES[0];
  const [activeStepId, setActiveStepId] = useState<StepId>('commercial');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [rfqId, setRfqId] = useState('');
  const [templateId, setTemplateId] = useState(defaultTemplate?.id ?? '');
  const [currency, setCurrency] = useState(defaultTemplate?.currency ?? 'USD');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [approvalState, setApprovalState] = useState<string>('pending');
  const [status, setStatus] = useState<string>('draft');
  const [notes, setNotes] = useState('');
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>('fob');
  const [lineItems, setLineItems] = useState<DraftQuoteLine[]>([buildLineFromProduct(products[0], defaultTemplate?.currency ?? 'USD', 'fob')]);

  useEffect(() => {
    if (state.success) setValidationIssues([]);
    if (state.success && state.record) {
      onSaved?.(state.record as QuoteRecord);
      onClose();
    }
  }, [onClose, onSaved, state.record, state.success]);

  const activeIndex = QUOTE_CREATE_STEPS.findIndex((step) => step.id === activeStepId);
  const currentStep = QUOTE_CREATE_STEPS[activeIndex] ?? QUOTE_CREATE_STEPS[0];
  const currentIssues = getQuoteValidation(activeStepId, { currency, approvalRequired, approvalState, status, lineItems, quoteSendGuard });

  const goNext = () => {
    const issues = getQuoteValidation(activeStepId, { currency, approvalRequired, approvalState, status, lineItems });
    setValidationIssues(issues);
    if (issues.length) return;
    setActiveStepId(QUOTE_CREATE_STEPS[Math.min(activeIndex + 1, QUOTE_CREATE_STEPS.length - 1)]?.id as StepId);
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="rfq_id" value={rfqId} />
      <input type="hidden" name="template_id" value={templateId} />
      <input type="hidden" name="currency" value={normalizeCurrency(currency)} />
      <input type="hidden" name="approval_required" value={approvalRequired ? 'true' : 'false'} />
      <input type="hidden" name="approval_state" value={approvalRequired ? approvalState : 'not_required'} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems.map((item) => ({ ...item, currency: normalizeCurrency(item.currency || currency), catalog_price_currency: normalizeCurrency(item.catalog_price_currency || item.currency || currency), is_price_overridden: isLinePriceOverridden(item) })))} readOnly />
      <input type="hidden" name="pricing_basis" value={pricingBasis} readOnly />
      
      <WizardShell
        steps={QUOTE_CREATE_STEPS}
        activeStepId={activeStepId}
        onStepChange={(nextStep) => {
          const issues = getQuoteValidation(activeStepId, { currency, approvalRequired, approvalState, status, lineItems, quoteSendGuard });
          if (QUOTE_CREATE_STEPS.findIndex((step) => step.id === nextStep) > activeIndex && issues.length) {
            setValidationIssues(issues);
            return;
          }
          setValidationIssues([]);
          setActiveStepId(nextStep as StepId);
        }}
        summary={<WizardValidationSummary title="Resolve before continuing" issues={validationIssues.length ? validationIssues : currentIssues} tone="info" />}
      >
        {activeStepId === 'commercial' ? (
          <WizardStepBody title="Commercial context" description="Choose RFQ linkage, pricing template, and approval posture before pricing lines are adjusted." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} quoteSendGuard={quoteSendGuard} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterField label="Linked RFQ"><select className={inputClassName()} value={rfqId} onChange={(event) => { const nextRfqId = event.target.value; setRfqId(nextRfqId); const linked = rfqs.find((rfq) => rfq.id === nextRfqId); if (linked?.currency) setCurrency(normalizeCurrency(linked.currency)); }}><option value="">None</option>{rfqs.map((rfq) => <option key={rfq.id} value={rfq.id}>{rfq.id.slice(0, 8)} · {rfq.status.replaceAll('_', ' ')}</option>)}</select></FilterField>
                <FilterField label="Pricing template"><select className={inputClassName()} value={templateId} onChange={(event) => { const nextId = event.target.value; const template = getPricingTemplate(nextId); setTemplateId(nextId); if (template) { setCurrency(template.currency); setLineItems(mapTemplateLinesToDraftLines(nextId, template.currency, pricingBasis)); } }}>{PRICING_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></FilterField><FilterField label="Pricing basis"><select className={inputClassName()} value={pricingBasis} onChange={(event) => { const nextBasis = normalizePricingBasis(event.target.value); setPricingBasis(nextBasis); setLineItems((current) => current.map((line) => applyPricingBasisToLine(line, products, currency, nextBasis))); }}>{['ex_factory','fob','cif'].map((basis) => <option key={basis} value={basis}>{pricingBasisLabel(normalizePricingBasis(basis as string))}</option>)}</select></FilterField>
                <FilterField label="Currency"><input className={inputClassName()} value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))} maxLength={3} /></FilterField>
                <FilterField label="Workflow status"><select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>{QUOTE_STATUSES.map((quoteStatus) => <option key={quoteStatus} value={quoteStatus}>{quoteStatus.replaceAll('_', ' ')}</option>)}</select></FilterField>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[auto_220px] sm:items-end">
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={approvalRequired} onChange={(event) => { setApprovalRequired(event.target.checked); if (!event.target.checked) setApprovalState('not_required'); else if (approvalState === 'not_required') setApprovalState('pending'); }} />Approval required before send</label>
                <FilterField label="Approval state"><select className={inputClassName()} value={approvalRequired ? approvalState : 'not_required'} onChange={(event) => setApprovalState(event.target.value)} disabled={!approvalRequired}>{APPROVAL_STATES.map((state) => <option key={state} value={state}>{state.replaceAll('_', ' ')}</option>)}</select></FilterField>
              </div>
              <div className="mt-4"><FilterField label="Quote notes"><textarea className={`${inputClassName()} min-h-[120px]`} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Commercial notes, approval guidance, or send context." /></FilterField></div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'pricing' ? (
          <WizardStepBody title="Pricing lines" description="Keep product linkage and pricing adjustments inside the same quote workflow." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} quoteSendGuard={quoteSendGuard} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold text-slate-900">Line items</h4><p className="mt-1 text-xs text-slate-500">Pricing stays editable in one step without leaving the quote workflow.</p></div><button type="button" onClick={() => setLineItems((current) => [...current, buildLineFromProduct(undefined, currency, pricingBasis)])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Add line</button></div>
              <div className="mt-4 space-y-3">
                <QuoteLineTable
                  lineItems={lineItems}
                  products={products}
                  currency={currency}
                  pricingBasis={pricingBasis}
                  onChangeLine={(index, next) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))}
                  onRemoveLine={(index) => setLineItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                />
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}

        {activeStepId === 'review' ? (
          <WizardStepBody title="Review and save" description="Confirm pricing totals, workflow state, and approval visibility before saving the quote." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} />}>
            <SectionCard className="p-4 sm:p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Workflow checklist</p>
                <ul className="mt-3 space-y-2">
                  <li>• The quote remains linked to the current lead and optional RFQ without schema changes.</li>
                  <li>• Approval state stays readable before send or revision decisions.</li>
                  <li>• Product/pricing linkage remains within the current quote line-item model.</li>
                </ul>
              </div>
            </SectionCard>
          </WizardStepBody>
        ) : null}
      </WizardShell>

      <CommercialWizardFooter
        title="Quote workflow"
        description="Save the quote with product linkage, pricing context, and approval visibility kept in one flow."
        error={state.error}
        success={state.success}
        isPending={false}
        activeStepIndex={activeIndex}
        totalSteps={QUOTE_CREATE_STEPS.length}
        activeStepTitle={currentStep.title}
        canGoBack={activeIndex > 0}
        onBack={() => setActiveStepId(QUOTE_CREATE_STEPS[Math.max(activeIndex - 1, 0)]?.id as StepId)}
        onCancel={onClose}
        onNext={goNext}
        submitLabel="Create quote"
      />
    </form>
  );
}

function QuoteEditorSaveButton({ disabled, pending }: { disabled: boolean; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Saving quote...' : disabled ? 'Resolve issues to save' : 'Save quote'}
    </button>
  );
}

function QuoteSummaryCards({
  currency,
  status,
  approvalRequired,
  approvalState,
  lineItems,
  templateId,
}: {
  currency: string;
  status: string;
  approvalRequired: boolean;
  approvalState: string;
  lineItems: DraftQuoteLine[];
  templateId: string;
}) {
  const totals = computeQuoteTotals(lineItems, normalizeCurrency(currency));
  const template = getPricingTemplate(templateId);
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Subtotal</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{totals.currency} {totals.subtotal.toFixed(2)}</p>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Line items</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{totals.lineItemCount}</p>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Currency</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{normalizeCurrency(currency) || 'Unset'}</p>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(status as any)}`}>{status.replaceAll('_', ' ')}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses((approvalRequired ? approvalState : 'not_required') as any)}`}>{(approvalRequired ? approvalState : 'not_required').replaceAll('_', ' ')}</span>
        </div>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Template</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{template?.name ?? 'Manual pricing'}</p>
      </div>
    </div>
  );
}

export function QuoteEditWizardForm({ quote, products, quoteSendGuard, onClose, onSaved }: { quote: QuoteRecord; products: ProductOption[]; quoteSendGuard?: ProgressionGuardSummary; onClose: () => void; onSaved?: (quote: QuoteRecord) => void }) {
  const [state, setState] = useState<QuoteActionState>({});
  const [isSaving, startSavingTransition] = useTransition();
  const parsed = useMemo(() => parseQuoteWorkflow(quote.notes), [quote.notes]);
  const [currency, setCurrency] = useState(quote.currency ?? 'USD');
  const [templateId, setTemplateId] = useState(parsed.meta.templateId ?? '');
  const [approvalRequired, setApprovalRequired] = useState(parsed.meta.approval?.required ?? false);
  const [approvalState, setApprovalState] = useState<string>(parsed.meta.approval?.state ?? 'not_required');
  const [status, setStatus] = useState<string>(getQuoteWorkflowStatus(quote, parsed.meta.approval));
  const [notes, setNotes] = useState(parsed.plainNotes ?? '');
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>(normalizePricingBasis(parsed.meta.pricingBasis ?? 'fob'));
  const [lineItems, setLineItems] = useState<DraftQuoteLine[]>(() => {
    const initialBasis = normalizePricingBasis(parsed.meta.pricingBasis ?? 'fob');
    const existingItems = (quote.lineItems ?? []).map((item) => hydrateExistingLineWithCatalog(item, products, quote.currency ?? 'USD', initialBasis));
    return existingItems.length ? existingItems : [buildLineFromProduct(products[0], quote.currency ?? 'USD', initialBasis)];
  });

  const formId = `quote-edit-form-${quote.id}`;
  const validationIssues = getQuoteValidation('review', { currency, approvalRequired, approvalState, status, lineItems, quoteSendGuard });
  const hasBlockingIssues = validationIssues.length > 0;
  const summarySnapshot = useMemo(
    () => JSON.stringify({
      currency: normalizeCurrency(currency),
      templateId,
      approvalRequired,
      approvalState,
      status,
      notes,
      pricingBasis,
      lineItems,
    }),
    [currency, templateId, approvalRequired, approvalState, status, notes, pricingBasis, lineItems],
  );
  const initialSnapshot = useMemo(
    () => JSON.stringify({
      currency: normalizeCurrency(quote.currency ?? 'USD'),
      templateId: parsed.meta.templateId ?? '',
      approvalRequired: parsed.meta.approval?.required ?? false,
      approvalState: parsed.meta.approval?.state ?? 'not_required',
      status: getQuoteWorkflowStatus(quote, parsed.meta.approval),
      notes: parsed.plainNotes ?? '',
      pricingBasis: normalizePricingBasis(parsed.meta.pricingBasis ?? 'fob'),
      lineItems: ((quote.lineItems ?? []).map((item) => hydrateExistingLineWithCatalog(item, products, quote.currency ?? 'USD', normalizePricingBasis(parsed.meta.pricingBasis ?? 'fob')))),
    }),
    [parsed.meta.approval, parsed.meta.pricingBasis, parsed.meta.templateId, parsed.plainNotes, products, quote, quote.currency, quote.lineItems],
  );
  const hasUnsavedChanges = summarySnapshot !== initialSnapshot;

  useEffect(() => {
    if (state.success) {
      if (state.record) onSaved?.(state.record as QuoteRecord);
      onClose();
    }
  }, [onClose, onSaved, state.record, state.success]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (hasBlockingIssues || !hasUnsavedChanges || isSaving) return;

    const formData = new FormData(event.currentTarget);
    formData.set('quote_id', quote.id);
    formData.set('currency', normalizeCurrency(currency));
    formData.set('template_id', templateId);
    formData.set('approval_required', approvalRequired ? 'true' : 'false');
    formData.set('approval_state', approvalRequired ? approvalState : 'not_required');
    formData.set('status', status);
    formData.set('notes', notes);
    formData.set('pricing_basis', pricingBasis);
    formData.set(
      'line_items',
      JSON.stringify(
        lineItems.map((item) => ({
          ...item,
          currency: normalizeCurrency(item.currency || currency),
          catalog_price_currency: normalizeCurrency(item.catalog_price_currency || item.currency || currency),
          is_price_overridden: isLinePriceOverridden(item),
        })),
      ),
    );

    setState({});
    startSavingTransition(() => {
      void updateQuoteWorkflow(undefined, formData).then((result) => {
        setState(result ?? {});
      }).catch((error) => {
        setState({ error: error instanceof Error ? error.message : 'Failed to save quote.' });
      });
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="quote_id" value={quote.id} />
      <input type="hidden" name="currency" value={normalizeCurrency(currency)} />
      <input type="hidden" name="template_id" value={templateId} />
      <input type="hidden" name="approval_required" value={approvalRequired ? 'true' : 'false'} />
      <input type="hidden" name="approval_state" value={approvalRequired ? approvalState : 'not_required'} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems.map((item) => ({ ...item, currency: normalizeCurrency(item.currency || currency), catalog_price_currency: normalizeCurrency(item.catalog_price_currency || item.currency || currency), is_price_overridden: isLinePriceOverridden(item) })))} readOnly />
      <input type="hidden" name="pricing_basis" value={pricingBasis} readOnly />

      <SectionCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote editor</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Edit pricing in one table</h3>
            <p className="mt-1 text-sm text-slate-600">Review every line item, base price, MOQ, and final quote price without moving between steps.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(status as any)}`}>{status.replaceAll('_', ' ')}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses((approvalRequired ? approvalState : 'not_required') as any)}`}>{(approvalRequired ? approvalState : 'not_required').replaceAll('_', ' ')}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          <FilterField label="Pricing basis">
            <select className={inputClassName()} value={pricingBasis} onChange={(event) => {
              const nextBasis = normalizePricingBasis(event.target.value);
              setPricingBasis(nextBasis);
              setLineItems((current) => current.map((line) => applyPricingBasisToLine(line, products, currency, nextBasis)));
            }}>
              <option value="ex_factory">Ex-Factory</option>
              <option value="fob">FOB</option>
              <option value="cif">CIF</option>
            </select>
          </FilterField>
          <FilterField label="Currency">
            <input className={inputClassName()} value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))} maxLength={3} />
          </FilterField>
          <FilterField label="Quote status">
            <select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>
              {QUOTE_STATUSES.map((quoteStatus) => <option key={quoteStatus} value={quoteStatus}>{quoteStatus.replaceAll('_', ' ')}</option>)}
            </select>
          </FilterField>
          <FilterField label="Template">
            <select className={inputClassName()} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              <option value="">No template</option>
              {PRICING_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </FilterField>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[220px_1fr] xl:items-start">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={approvalRequired} onChange={(event) => {
              setApprovalRequired(event.target.checked);
              if (!event.target.checked) setApprovalState('not_required');
              else if (approvalState === 'not_required') setApprovalState('pending');
            }} />
            Approval required
          </label>
          <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
            <FilterField label="Approval state">
              <select className={inputClassName()} value={approvalRequired ? approvalState : 'not_required'} onChange={(event) => setApprovalState(event.target.value)} disabled={!approvalRequired}>
                {APPROVAL_STATES.map((entry) => <option key={entry} value={entry}>{entry.replaceAll('_', ' ')}</option>)}
              </select>
            </FilterField>
            <FilterField label="Workflow notes">
              <textarea className={`${inputClassName()} min-h-[96px]`} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal pricing note, customer promise, or approval context." />
            </FilterField>
          </div>
        </div>
      </SectionCard>

      <SectionCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Quote lines</h4>
            <p className="mt-1 text-xs text-slate-500">Every line shows pack, MOQ, base price, quote price, and total in one editable table.</p>
          </div>
          <button type="button" onClick={() => setLineItems((current) => [...current, buildLineFromProduct(products[0], currency, pricingBasis)])} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Add product</button>
        </div>
        <div className="mt-4">
          <QuoteLineTable
            lineItems={lineItems}
            products={products}
            currency={currency}
            pricingBasis={pricingBasis}
            onChangeLine={(index, next) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))}
            onRemoveLine={(index) => setLineItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}
          />
        </div>
      </SectionCard>

      <QuoteSummaryCards
        currency={currency}
        status={status}
        approvalRequired={approvalRequired}
        approvalState={approvalState}
        lineItems={lineItems}
        templateId={templateId}
      />

      <SectionCard className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">What this save does</p>
            <ul className="mt-2 space-y-2">
              <li>• Saves all edited line items from this table.</li>
              <li>• Keeps catalog base pricing separate from final quote pricing.</li>
              <li>• Refreshes the selected buyer quote after save.</li>
            </ul>
          </div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Validation</p>
            {hasBlockingIssues ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-700">
                {validationIssues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-emerald-700">Ready to save. No blocking issues found in the current quote.</p>
            )}
          </div>
        </div>
      </SectionCard>

      {state.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.error}</div> : null}
      {state.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{state.success}</div> : null}

      <div className="sticky bottom-0 z-10 rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-soft backdrop-blur">
        <DrawerActionBar
          title="Quote workflow"
          description={hasUnsavedChanges ? 'You have unsaved quote changes.' : 'No pending quote edits.'}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <QuoteEditorSaveButton disabled={hasBlockingIssues || !hasUnsavedChanges} pending={isSaving} />
        </DrawerActionBar>
      </div>
    </form>
  );
}
