"use client";

import React from 'react';
import NewMarketForm from './NewMarketForm';
import { checkboxClassName } from '@/components/ui/checkbox';
import { LeadCoverageManager } from '@/components/shell/LeadCoverageManager';
import {
  mergeSupplierCapabilityIntoNotes,
  parseSupplierCapabilityFromNotes,
  type SupplierCapabilityMetadata,
} from '@/lib/lead-workflow';

 type Product = { id: string; name: string; sku: string | null; category_id: string | null };
type ProductCategory = { id: string; name: string; is_active?: boolean; sort_order?: number; parent_id?: string | null };
type Market = { id: string; name: string };
type Country = { id: string; name: string; market_id: string | null };

type CoverageSelection = {
  key: string;
  categoryId: string;
  productIds: string[];
};

interface CategoryTreeItem {
  category: ProductCategory;
  indent: number;
}

interface ProductMarketsSectionProps {
  categoryTree: CategoryTreeItem[];
  coverageSelections: CoverageSelection[];
  onAddCoverageSelection: () => void;
  onChangeCoverageCategory: (key: string, categoryId: string) => void;
  onToggleCoverageProduct: (key: string, productId: string, checked: boolean) => void;
  onRemoveCoverageSelection: (key: string) => void;
  products: Product[];
  markets: Market[];
  countries: Country[];
  countryId: string;
  selectedMarketIdSet: string[];
  setSelectedMarketIdSet: (ids: string[]) => void;
  showNewMarketForm: boolean;
  setShowNewMarketForm: (open: boolean) => void;
  newMarketName: string;
  setNewMarketName: (value: string) => void;
  newMarketCode: string;
  setNewMarketCode: (value: string) => void;
  inputClassName: () => string;
  notesValue: string;
  onNotesChange: (value: string) => void;
  showInterestSelectors?: boolean;
  onAddMarket: () => void;
}

type LeadDrawerContext = {
  leadId: string;
  companyName: string;
  leadType: 'buyer' | 'supplier';
};

function readDrawerInputValue(name: string) {
  if (typeof document === 'undefined') return '';
  return String((document.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.value ?? '').trim();
}

function useLeadContextFromDrawerForm(): LeadDrawerContext {
  const [leadContext, setLeadContext] = React.useState<LeadDrawerContext>({
    leadId: '',
    companyName: '',
    leadType: 'buyer',
  });

  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const sync = () => {
      const leadId = readDrawerInputValue('lead_id');
      const companyName = readDrawerInputValue('company_name');
      const rawLeadType = readDrawerInputValue('lead_type');
      setLeadContext({
        leadId,
        companyName,
        leadType: rawLeadType === 'supplier' ? 'supplier' : 'buyer',
      });
    };

    sync();
    const frame = window.requestAnimationFrame(sync);
    const interval = window.setInterval(sync, 500);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, []);

  return leadContext;
}

function SupplierCapabilitySection({
  capability,
  onChange,
}: {
  capability: SupplierCapabilityMetadata;
  onChange: (next: SupplierCapabilityMetadata) => void;
}) {
  const updateField = (field: keyof SupplierCapabilityMetadata, value: string) => {
    onChange({ ...capability, [field]: value });
  };

  const fieldClassName = 'h-11 w-full rounded-2xl border border-teal-100 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100';
  const labelClassName = 'block space-y-2';
  const labelTextClassName = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700';

  return (
    <div data-s41-supplier-capability-section="true" className="rounded-[1.5rem] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">Supplier capability</p>
          <h3 className="mt-2 text-base font-bold text-slate-950">Map sourcing readiness before cost requests</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Capture MOQ, capacity, lead time, payment terms, Incoterms, export markets, risk, approval, and performance signals without adding a new supplier table yet.
          </p>
        </div>
        <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          Supplier only
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className={labelClassName}>
          <span className={labelTextClassName}>Capability category</span>
          <input value={capability.category ?? ''} onChange={(event) => updateField('category', event.target.value)} placeholder="e.g. Knits, woven shirts, denim" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>MOQ</span>
          <input value={capability.moq ?? ''} onChange={(event) => updateField('moq', event.target.value)} placeholder="e.g. 500 pcs / style" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Production capacity</span>
          <input value={capability.productionCapacity ?? ''} onChange={(event) => updateField('productionCapacity', event.target.value)} placeholder="e.g. 25k pcs / month" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Lead time</span>
          <input value={capability.leadTime ?? ''} onChange={(event) => updateField('leadTime', event.target.value)} placeholder="e.g. 45–60 days" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Payment terms</span>
          <input value={capability.paymentTerms ?? ''} onChange={(event) => updateField('paymentTerms', event.target.value)} placeholder="e.g. 30/70, LC, advance" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Incoterms</span>
          <input value={capability.incoterms ?? ''} onChange={(event) => updateField('incoterms', event.target.value)} placeholder="e.g. FOB, CIF, EXW" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Export markets</span>
          <input value={capability.exportMarkets ?? ''} onChange={(event) => updateField('exportMarkets', event.target.value)} placeholder="e.g. EU, UK, UAE, USA" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Risk status</span>
          <select value={capability.riskStatus ?? ''} onChange={(event) => updateField('riskStatus', event.target.value)} className={fieldClassName}>
            <option value="">Select risk</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Approval status</span>
          <select value={capability.approvalStatus ?? ''} onChange={(event) => updateField('approvalStatus', event.target.value)} className={fieldClassName}>
            <option value="">Select status</option>
            <option value="profile_review">Profile review</option>
            <option value="capability_mapped">Capability mapped</option>
            <option value="compliance_review">Compliance review</option>
            <option value="approved">Approved supplier</option>
            <option value="rejected">Rejected supplier</option>
            <option value="inactive">Inactive supplier</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className={labelClassName}>
          <span className={labelTextClassName}>Reliability score</span>
          <input value={capability.reliabilityScore ?? ''} onChange={(event) => updateField('reliabilityScore', event.target.value)} placeholder="1–5 or notes" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Quality score</span>
          <input value={capability.qualityScore ?? ''} onChange={(event) => updateField('qualityScore', event.target.value)} placeholder="1–5 or notes" className={fieldClassName} />
        </label>
        <label className={labelClassName}>
          <span className={labelTextClassName}>Response speed</span>
          <input value={capability.responseTimeScore ?? ''} onChange={(event) => updateField('responseTimeScore', event.target.value)} placeholder="e.g. same day, 48h, slow" className={fieldClassName} />
        </label>
      </div>
    </div>
  );
}

export default function ProductMarketsSection({
  categoryTree,
  coverageSelections,
  onAddCoverageSelection,
  onChangeCoverageCategory,
  onToggleCoverageProduct,
  onRemoveCoverageSelection,
  products,
  markets,
  countries,
  countryId,
  selectedMarketIdSet,
  setSelectedMarketIdSet,
  showNewMarketForm,
  setShowNewMarketForm,
  newMarketName,
  setNewMarketName,
  newMarketCode,
  setNewMarketCode,
  inputClassName,
  notesValue,
  onNotesChange,
  showInterestSelectors = true,
  onAddMarket,
}: ProductMarketsSectionProps) {
  const { leadId, companyName, leadType } = useLeadContextFromDrawerForm();
  const selectedCountry = countries.find((country) => country.id === countryId) ?? null;
  const countryLinkedMarket = selectedCountry?.market_id ?? null;
  const availableMarkets = countryLinkedMarket
    ? markets.filter((market) => market.id !== countryLinkedMarket)
    : markets;
  const supplierCapability = React.useMemo(() => parseSupplierCapabilityFromNotes(notesValue), [notesValue]);
  const supplierCapabilitySection = leadType === 'supplier' ? (
    <SupplierCapabilitySection
      capability={supplierCapability}
      onChange={(next) => onNotesChange(mergeSupplierCapabilityIntoNotes(notesValue, next))}
    />
  ) : null;

  if (showInterestSelectors && leadId) {
    return (
      <section className="rounded-3xl border border-slate-200 p-4">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Coverage manager</p>
          <h3 className="mt-2 text-base font-bold text-slate-950">Manage product coverage for this lead</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            This step now uses the selected lead ID directly. Product and market coverage are saved through the coverage resolver, not the legacy Quick Edit product/category form.
          </p>
        </div>

        <div className="mt-4 rounded-[24px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <LeadCoverageManager leadId={leadId} companyName={companyName || null} />
        </div>

        <div className="mt-4 space-y-4">
          {supplierCapabilitySection}
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</span>
            <textarea
              name="notes"
              value={notesValue}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Legacy category/product checkboxes are deprecated for existing leads. Use the coverage manager above so quote builder receives saved lead_product_interests from the selected lead ID.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 p-4">
      {showInterestSelectors ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Product/category interest</p>
                <p className="mt-1 text-sm text-slate-600">Choose one or more categories, then optionally tag the exact products that should bridge this lead into catalog-led quoting.</p>
              </div>
              <button
                type="button"
                onClick={onAddCoverageSelection}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Add category
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {coverageSelections.map((selection, index) => {
              const scopedProducts = selection.categoryId
                ? products.filter((product) => product.category_id === selection.categoryId)
                : [];

              return (
                <div key={selection.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category group {index + 1}</p>
                      <p className="mt-1 text-sm text-slate-600">Products stay optional. Leave the product list untouched when the lead is still category-qualified but not product-confirmed yet.</p>
                    </div>
                    {coverageSelections.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => onRemoveCoverageSelection(selection.key)}
                        className="text-sm font-medium text-slate-500 hover:text-slate-900"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category</label>
                      <select
                        value={selection.categoryId}
                        onChange={(event) => onChangeCoverageCategory(selection.key, event.target.value)}
                        className={inputClassName()}
                      >
                        <option value="">Select category</option>
                        {categoryTree.map(({ category, indent }) => (
                          <option key={category.id} value={category.id}>{`${indent > 0 ? '— '.repeat(indent) : ''}${category.name}`}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Products</label>
                        <span className="text-xs text-slate-500">Optional line refinement</span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-3">
                        {!selection.categoryId ? (
                          <p className="text-sm text-slate-500">Select a category first to narrow the product list.</p>
                        ) : scopedProducts.length === 0 ? (
                          <p className="text-sm text-slate-500">No products exist under this category yet. Add them in Admin → Product Management before quoting from this interest.</p>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {scopedProducts.map((product) => {
                              const checked = selection.productIds.includes(product.id);
                              return (
                                <label
                                  key={product.id}
                                  className={[
                                    'flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition',
                                    checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300',
                                  ].join(' ')}
                                >
                                  <input
                                    type="checkbox"
                                    className={checkboxClassName()}
                                    checked={checked}
                                    onChange={(event) => onToggleCoverageProduct(selection.key, product.id, event.target.checked)}
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-medium text-slate-900">{product.name}</span>
                                    {product.sku ? <span className="mt-1 block text-xs text-slate-500">SKU {product.sku}</span> : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Market coverage</p>
            {countryLinkedMarket ? (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{selectedCountry?.name}</span> automatically maps to
                {' '}
                <span className="font-semibold text-slate-900">{markets.find((market) => market.id === countryLinkedMarket)?.name ?? 'its linked market'}</span>.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Choose any supporting markets you want to keep visible for this lead.</p>
            )}

            <div className="mt-4 space-y-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Add supporting market</span>
                <select
                  className={inputClassName()}
                  value=""
                  onChange={(event) => {
                    const marketId = event.target.value;
                    if (!marketId) return;
                    setSelectedMarketIdSet(Array.from(new Set([...selectedMarketIdSet, marketId])));
                  }}
                >
                  <option value="">Select market</option>
                  {availableMarkets
                    .filter((market) => !selectedMarketIdSet.includes(market.id))
                    .map((market) => (
                      <option key={market.id} value={market.id}>{market.name}</option>
                    ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                {countryLinkedMarket ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {markets.find((market) => market.id === countryLinkedMarket)?.name ?? 'Linked market'} · auto from country
                  </span>
                ) : null}
                {selectedMarketIdSet.map((marketId) => {
                  const market = markets.find((item) => item.id === marketId);
                  if (!market) return null;
                  return (
                    <span key={marketId} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {market.name}
                      <button
                        type="button"
                        onClick={() => setSelectedMarketIdSet(selectedMarketIdSet.filter((id) => id !== marketId))}
                        className="text-slate-400 hover:text-slate-700"
                        aria-label={`Remove ${market.name}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>

              <div>
                <button
                  type="button"
                  className="text-xs font-medium text-brand-700 underline-offset-4 hover:underline"
                  onClick={() => setShowNewMarketForm(!showNewMarketForm)}
                >
                  {showNewMarketForm ? 'Cancel' : 'Add new market'}
                </button>
                {showNewMarketForm ? (
                  <div className="mt-3">
                    <NewMarketForm
                      newMarketName={newMarketName}
                      setNewMarketName={setNewMarketName}
                      newMarketCode={newMarketCode}
                      setNewMarketCode={setNewMarketCode}
                      inputClassName={inputClassName}
                      onCancel={() => {
                        setNewMarketName('');
                        setNewMarketCode('');
                        setShowNewMarketForm(false);
                      }}
                      onSave={onAddMarket}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={showInterestSelectors ? 'mt-4 space-y-4' : 'space-y-4'}>
        {supplierCapabilitySection}
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Notes</span>
          <textarea
            name="notes"
            value={notesValue}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={showInterestSelectors ? 4 : 3}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </label>
        {showInterestSelectors ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Structured category and product selections are now the preferred workflow. The legacy free-text products field remains in the database for compatibility only and is no longer edited here.
          </div>
        ) : null}
      </div>
    </section>
  );
}
