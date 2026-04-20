"use client";

import React from 'react';
import NewMarketForm from './NewMarketForm';
import { checkboxClassName } from '@/components/ui/checkbox';

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
  const selectedCountry = countries.find((country) => country.id === countryId) ?? null;
  const countryLinkedMarket = selectedCountry?.market_id ?? null;
  const availableMarkets = countryLinkedMarket
    ? markets.filter((market) => market.id !== countryLinkedMarket)
    : markets;

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
