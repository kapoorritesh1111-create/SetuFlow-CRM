'use client';

import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { useEffect, useMemo, useState } from 'react';
import { deleteProduct } from '@/features/products/api/delete-product';
import { updateProductDetail } from '@/features/products/api/update-product-detail';
import type { ProductDetailResponse } from '@/types/products';

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

  useEffect(() => {
    setName(detail?.product.name ?? '');
    setBrandName(detail?.product.brand_name ?? '');
    setDescription(detail?.product.description ?? '');
    setIsActive(Boolean(detail?.product.is_active ?? true));
    setActionError(null);
  }, [detail]);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    return (
      name !== (detail.product.name ?? '') ||
      brandName !== (detail.product.brand_name ?? '') ||
      description !== (detail.product.description ?? '') ||
      isActive !== Boolean(detail.product.is_active)
    );
  }, [brandName, description, detail, isActive, name]);

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
      <div className="h-full w-full max-w-2xl overflow-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product detail</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{detail?.product.name ?? 'Loading product...'}</h2>
            <p className="mt-1 text-sm text-slate-500">Fix blockers fast, confirm quote readiness, or jump straight into a trade-show quote from this product.</p>
          </div>
          <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600" onClick={onClose}>Close</button>
        </div>

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
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">SKU</th>
                      <th className="px-4 py-3 text-left">Pack</th>
                      <th className="px-4 py-3 text-left">MOQ</th>
                      <th className="px-4 py-3 text-left">Ex-Factory</th>
                      <th className="px-4 py-3 text-left">FOB</th>
                      <th className="px-4 py-3 text-left">Bulk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.variants.map((variant) => (
                      <tr key={variant.product_variant_id}>
                        <td className="border-t border-slate-100 px-4 py-3">{variant.sku_code ?? '—'}</td>
                        <td className="border-t border-slate-100 px-4 py-3">{variant.pack_label ?? '—'}</td>
                        <td className="border-t border-slate-100 px-4 py-3">{variant.moq_display ?? '—'}</td>
                        <td className="border-t border-slate-100 px-4 py-3">{variant.ex_factory_display ?? 'Missing'}</td>
                        <td className="border-t border-slate-100 px-4 py-3">{variant.fob_display ?? 'Missing'}</td>
                        <td className="border-t border-slate-100 px-4 py-3">{variant.bulk_display ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  );
}
