'use client';

import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { useEffect, useMemo, useState } from 'react';
import { deleteProduct } from '@/features/products/api/delete-product';
import { updateProductDetail } from '@/features/products/api/update-product-detail';
import type { ProductDetailResponse, UpdateProductVariantPayload } from '@/types/products';

type Props = {
  open: boolean;
  productId: string | null;
  detail: ProductDetailResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSaved: (detail: ProductDetailResponse) => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
  canManageCatalog?: boolean;
  readOnlyMessage?: string | null;
  actionBlockedMessage?: string | null;
  onActionBlocked?: (message: string) => void;
};

export function ProductDetailDrawer({ open, detail, loading, error, onClose, onSaved, onDeleted, canManageCatalog = true, readOnlyMessage = null, actionBlockedMessage = null, onActionBlocked }: Props) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'variants' | 'trade' | 'history'>('overview');
  const [variantDrafts, setVariantDrafts] = useState<Record<string, { is_quoteable: boolean; ex_factory_value: string; ex_factory_unit: 'unit' | 'case' | 'kg' | ''; fob_value: string; fob_unit: 'unit' | 'case' | 'kg' | ''; bulk_value: string }>>({});

  useEffect(() => {
    setName(detail?.product.name ?? '');
    setBrandName(detail?.product.brand_name ?? '');
    setDescription(detail?.product.description ?? '');
    setIsActive(Boolean(detail?.product.is_active ?? true));
    setVariantDrafts(Object.fromEntries((detail?.variants ?? []).map((variant) => [variant.product_variant_id, {
      is_quoteable: Boolean(variant.is_quoteable),
      ex_factory_value: variant.ex_factory_value == null ? '' : String(variant.ex_factory_value),
      ex_factory_unit: variant.ex_factory_unit ?? '',
      fob_value: variant.fob_value == null ? '' : String(variant.fob_value),
      fob_unit: variant.fob_unit ?? '',
      bulk_value: variant.bulk_value == null ? '' : String(variant.bulk_value),
    }])));
    setActionError(null);
  }, [detail]);

  const hasProductChanges = useMemo(() => {
    if (!detail) return false;
    return (
      name !== (detail.product.name ?? '') ||
      brandName !== (detail.product.brand_name ?? '') ||
      description !== (detail.product.description ?? '') ||
      isActive !== Boolean(detail.product.is_active)
    );
  }, [brandName, description, detail, isActive, name]);

  const changedVariants = useMemo<UpdateProductVariantPayload[]>(() => {
    if (!detail) return [];
    return detail.variants.flatMap((variant) => {
      const draft = variantDrafts[variant.product_variant_id];
      if (!draft) return [];
      const toNumber = (value: string) => value.trim() === '' ? null : Number(value);
      const exFactoryValue = toNumber(draft.ex_factory_value);
      const fobValue = toNumber(draft.fob_value);
      const bulkValue = toNumber(draft.bulk_value);
      const exFactoryUnit = draft.ex_factory_unit || null;
      const fobUnit = draft.fob_unit || null;
      const changed =
        draft.is_quoteable !== Boolean(variant.is_quoteable) ||
        exFactoryValue !== variant.ex_factory_value ||
        exFactoryUnit !== (variant.ex_factory_unit ?? null) ||
        fobValue !== variant.fob_value ||
        fobUnit !== (variant.fob_unit ?? null) ||
        bulkValue !== variant.bulk_value;
      if (!changed) return [];
      return [{
        product_variant_id: variant.product_variant_id,
        is_quoteable: draft.is_quoteable,
        ex_factory_value: Number.isFinite(exFactoryValue as number) ? exFactoryValue : null,
        ex_factory_unit: exFactoryUnit,
        fob_value: Number.isFinite(fobValue as number) ? fobValue : null,
        fob_unit: fobUnit,
        bulk_value: Number.isFinite(bulkValue as number) ? bulkValue : null,
      }];
    });
  }, [detail, variantDrafts]);

  const hasChanges = hasProductChanges || changedVariants.length > 0;

  if (!open) return null;

  const block = (message: string) => {
    setActionError(message);
    onActionBlocked?.(message);
  };

  const save = async () => {
    if (!detail || !hasChanges) return;
    if (!canManageCatalog) {
      block(readOnlyMessage ?? 'Read-only mode is active. Ask a catalog manager to update this product.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const updated = await updateProductDetail(detail.product.id, {
        name: name.trim() || detail.product.name,
        brand_name: brandName.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
        variants: changedVariants,
      });
      await onSaved(updated);
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!detail) return;
    if (!canManageCatalog) {
      block(readOnlyMessage ?? 'Read-only mode is active. Ask a catalog manager to delete this product.');
      return;
    }
    const confirmed = window.confirm(`Delete ${detail.product.name}? This will mark the product, its variants, and catalog pricing inactive.`);
    if (!confirmed) return;

    setDeleting(true);
    setActionError(null);
    try {
      await deleteProduct(detail.product.id);
      if (onDeleted) {
        await onDeleted();
      }
      onClose();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <div className="h-full w-full max-w-[520px] overflow-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product detail</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{detail?.product.name ?? 'Loading product...'}</h2>
              <p className="mt-1 text-sm text-slate-500">Fix blockers fast, confirm quote readiness, or jump straight into a trade-show quote from this product.</p>
            </div>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600" onClick={onClose}>Close</button>
          </div>
          {detail ? <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{(['overview', 'pricing', 'variants', 'trade', 'history'] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize ${activeTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{tab === 'trade' ? 'Trade attrs' : tab}</button>)}</div> : null}
        </div>
        <div className="px-6 py-5">

        {!canManageCatalog && readOnlyMessage ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{readOnlyMessage}</div> : null}
        {loading ? <div className="mt-6 rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading product detail...</div> : null}
        {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div> : null}
        {detail && !detail.pricing_meta.pricing_rule_set_id ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No pricing rule set is active for this workspace. Add or activate pricing configuration before treating this product as quote-ready.</div> : null}
        {actionBlockedMessage ? <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">{actionBlockedMessage}</div> : null}
        {actionError ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{actionError}</div> : null}

        {detail ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Product name</div>
                <input value={name} readOnly={!canManageCatalog} onChange={(e) => setName(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </label>
              <label className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Brand</div>
                <input value={brandName} readOnly={!canManageCatalog} onChange={(e) => setBrandName(e.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Category</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{detail.product.category_name ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Pricing type</div>
                    <div className="mt-2 text-sm font-semibold capitalize text-slate-900">{detail.product.pricing_type ?? '—'}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
                <label className="mt-3 inline-flex items-center gap-3 text-sm font-semibold text-slate-900">
                  <input type="checkbox" checked={isActive} disabled={!canManageCatalog} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  Active product
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Description</div>
              <textarea value={description} readOnly={!canManageCatalog} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" placeholder="Add commercial description, notes, claims, or product summary." />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <button type="button" disabled={deleting} onClick={() => void removeProduct()} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Delete product'}
                </button>
                <button type="button" disabled={!hasChanges || saving} onClick={() => void save()} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Variant pricing</div>
                <div className="text-xs text-slate-500">Rule set: {detail.pricing_meta.pricing_rule_set_name ?? 'None configured'}</div>
              </div>
              <div className="mt-4 space-y-3">
                {detail.variants.map((variant) => {
                  const draft = variantDrafts[variant.product_variant_id];
                  return (
                    <div key={variant.product_variant_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{variant.variant_name}</div>
                          <div className="mt-1 text-xs text-slate-500">{variant.sku_code ?? 'No SKU'} · {variant.pack_label ?? 'No pack'} · MOQ {variant.moq_display ?? 'missing'}</div>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <input type="checkbox" checked={draft?.is_quoteable ?? false} disabled={!canManageCatalog} onChange={(event) => setVariantDrafts((current) => ({ ...current, [variant.product_variant_id]: { ...(current[variant.product_variant_id] ?? { ex_factory_value: '', ex_factory_unit: '', fob_value: '', fob_unit: '', bulk_value: '' }), is_quoteable: event.target.checked } }))} />
                          Quote-ready
                        </label>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {[
                          ['Ex-Factory', 'ex_factory_value', 'ex_factory_unit'],
                          ['FOB', 'fob_value', 'fob_unit'],
                          ['Bulk/kg', 'bulk_value', null],
                        ].map(([label, valueKey, unitKey]) => (
                          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                            <div className="mt-2 flex gap-2">
                              <input inputMode="decimal" disabled={!canManageCatalog} value={draft?.[valueKey as 'ex_factory_value'] ?? ''} onChange={(event) => setVariantDrafts((current) => ({ ...current, [variant.product_variant_id]: { ...(current[variant.product_variant_id] ?? { is_quoteable: Boolean(variant.is_quoteable), ex_factory_value: '', ex_factory_unit: '', fob_value: '', fob_unit: '', bulk_value: '' }), [valueKey as string]: event.target.value } }))} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm font-semibold outline-none focus:border-blue-400" placeholder="Missing" />
                              {unitKey ? <select disabled={!canManageCatalog} value={draft?.[unitKey as 'ex_factory_unit'] ?? ''} onChange={(event) => setVariantDrafts((current) => ({ ...current, [variant.product_variant_id]: { ...(current[variant.product_variant_id] ?? { is_quoteable: Boolean(variant.is_quoteable), ex_factory_value: '', ex_factory_unit: '', fob_value: '', fob_unit: '', bulk_value: '' }), [unitKey as string]: event.target.value as 'unit' | 'case' | 'kg' | '' } }))} className="rounded-lg border border-slate-200 px-2 py-2 text-xs">
                                <option value="">Unit</option>
                                <option value="unit">unit</option>
                                <option value="case">case</option>
                                <option value="kg">kg</option>
                              </select> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Downstream commercial handoff</div>
                  <p className="mt-2 text-sm text-slate-600">Use the product quick quote when this item is active, quoteable, and already priced. Otherwise fix the blocker first.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm font-semibold">
                  {detail.product.is_active && detail.variants.some((variant) => variant.is_quoteable) ? (
                    <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(detail.product.id)}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Quick quote</Link>
                  ) : null}
                  <Link href="/pipeline" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Pipeline</Link>
                  <Link href={PRODUCT_ROUTES.app.leads} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Leads</Link>
                  <Link href={PRODUCT_ROUTES.app.quotes} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Quotes</Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
