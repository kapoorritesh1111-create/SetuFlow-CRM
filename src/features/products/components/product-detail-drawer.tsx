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

type DrawerTab = 'overview' | 'pricing' | 'variants' | 'trade' | 'history';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><div className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>{children}</div>;
}

export function ProductDetailDrawer({ open, detail, loading, error, onClose, onSaved, onDeleted, canManageCatalog = true, readOnlyMessage = null, actionBlockedMessage = null, onActionBlocked }: Props) {
  const [tab, setTab] = useState<DrawerTab>('overview');
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
    return name !== (detail.product.name ?? '') || brandName !== (detail.product.brand_name ?? '') || description !== (detail.product.description ?? '') || isActive !== Boolean(detail.product.is_active);
  }, [brandName, description, detail, isActive, name]);

  if (!open) return null;

  const block = (message: string) => {
    setActionError(message);
    onActionBlocked?.(message);
  };

  const save = async () => {
    if (!detail || !hasChanges) return;
    if (!canManageCatalog) return block(readOnlyMessage ?? 'Read-only mode is active. Ask a catalog manager to update this product.');
    setSaving(true);
    setActionError(null);
    try {
      const updated = await updateProductDetail(detail.product.id, { name: name.trim() || detail.product.name, brand_name: brandName.trim() || null, description: description.trim() || null, is_active: isActive });
      await onSaved(updated);
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!detail) return;
    if (!canManageCatalog) return block(readOnlyMessage ?? 'Read-only mode is active. Ask a catalog manager to delete this product.');
    const confirmed = window.confirm(`Delete ${detail.product.name}? This will mark the product, its variants, and catalog pricing inactive.`);
    if (!confirmed) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteProduct(detail.product.id);
      await onDeleted?.();
      onClose();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const readyVariants = detail?.variants.filter((variant) => variant.is_quoteable && (variant.ex_factory_value != null || variant.fob_value != null)).length ?? 0;
  const totalVariants = detail?.variants.length ?? 0;

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-[2px]">
      <div className="fixed bottom-0 right-0 top-0 z-[91] flex w-full max-w-[540px] flex-col bg-white shadow-[-16px_0_48px_rgba(15,23,42,.15)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-[22px] py-4">
          <div>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${detail?.product.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{detail?.product.is_active ? 'Active' : 'Inactive'}</span>
            <h2 className="mt-2 text-[15px] font-extrabold text-slate-950">{detail?.product.name ?? 'Loading product...'}</h2>
            <p className="mt-1 text-[11px] text-slate-500">{readyVariants}/{totalVariants} variants quote-ready · one drawer for product, pricing, variants, trade attrs, and history.</p>
          </div>
          <button type="button" className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--border)] text-slate-500" onClick={onClose}>×</button>
        </div>

        <div className="flex border-b border-[var(--border)] px-[22px]">
          {[
            ['overview', 'Overview'],
            ['pricing', 'Pricing'],
            ['variants', 'Variants'],
            ['trade', 'Trade attrs'],
            ['history', 'History'],
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key as DrawerTab)} className={`mb-[-1px] border-b-2 px-3.5 py-2.5 text-[11px] font-bold ${tab === key ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-400'}`}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">
          {!canManageCatalog && readOnlyMessage ? <div className="mb-4 rounded-[6px] border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">{readOnlyMessage}</div> : null}
          {loading ? <div className="rounded-[16px] border border-[var(--border)] p-6 text-[12px] text-slate-500">Loading product detail...</div> : null}
          {error ? <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-6 text-[12px] text-rose-700">{error}</div> : null}
          {actionBlockedMessage ? <div className="mb-4 rounded-[6px] border border-sky-200 bg-sky-50 p-3 text-[12px] text-sky-800">{actionBlockedMessage}</div> : null}
          {actionError ? <div className="mb-4 rounded-[6px] border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">{actionError}</div> : null}

          {detail && tab === 'overview' ? (
            <div className="space-y-5">
              <section>
                <h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Product identity</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Product name"><input value={name} readOnly={!canManageCatalog} onChange={(event) => setName(event.target.value)} className="rounded-[6px] border border-[var(--border)] px-2.5 py-2 text-[13px] font-semibold outline-none" /></Field>
                  <Field label="Brand"><input value={brandName} readOnly={!canManageCatalog} onChange={(event) => setBrandName(event.target.value)} className="rounded-[6px] border border-[var(--border)] px-2.5 py-2 text-[13px] font-semibold outline-none" /></Field>
                  <Field label="Category"><div className="rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 py-2 text-[13px] font-semibold">{detail.product.category_name ?? '—'}</div></Field>
                  <Field label="Pricing type"><div className="rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 py-2 text-[13px] font-semibold capitalize">{detail.product.pricing_type ?? '—'}</div></Field>
                </div>
              </section>
              <section>
                <h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Readiness gate</h3>
                <label className="flex items-center gap-2 rounded-[6px] border border-[var(--border)] bg-slate-50 p-2.5 text-[12px] font-semibold"><input type="checkbox" checked={isActive} disabled={!canManageCatalog} onChange={(event) => setIsActive(event.target.checked)} /> Active product</label>
                <textarea value={description} readOnly={!canManageCatalog} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Commercial description, claims, or product summary." className="mt-2 w-full rounded-[6px] border border-[var(--border)] px-2.5 py-2 text-[13px] outline-none" />
              </section>
            </div>
          ) : null}

          {detail && tab === 'pricing' ? (
            <section>
              <h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Pricing table</h3>
              <div className="overflow-hidden rounded-[12px] border border-[var(--border)]">
                <table className="min-w-full text-[12px]">
                  <thead className="bg-slate-50 text-left text-[9px] uppercase tracking-[0.12em] text-slate-400"><tr><th className="p-2">Market</th><th className="p-2">SKU</th><th className="p-2">Ex-Factory</th><th className="p-2">FOB</th><th className="p-2">CIF</th><th className="p-2">Bulk</th></tr></thead>
                  <tbody>{detail.variants.map((variant) => <tr key={variant.product_variant_id} className="border-t border-[var(--border)]"><td className="p-2"><span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">Default</span></td><td className="p-2 font-mono text-[11px]">{variant.sku_code ?? '—'}</td><td className="p-2 font-bold">{variant.ex_factory_display ?? 'Missing'}</td><td className="p-2 font-bold">{variant.fob_display ?? 'Missing'}</td><td className="p-2 font-bold">{variant.cif_display ?? '—'}</td><td className="p-2">{variant.bulk_display ?? '—'}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          ) : null}

          {detail && tab === 'variants' ? <section><h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Variants</h3><div className="space-y-2">{detail.variants.map((variant) => <div key={variant.product_variant_id} className="rounded-[12px] border border-[var(--border)] p-3"><div className="font-bold text-slate-900">{variant.variant_name}</div><div className="mt-1 text-[11px] text-slate-500">{variant.sku_code ?? '—'} · {variant.pack_label ?? '—'} · MOQ {variant.moq_display ?? '—'}</div><div className="mt-2 text-[10px] font-bold uppercase text-slate-400">{variant.is_quoteable ? 'Quote-ready enabled' : 'Blocked from quote'}</div></div>)}</div></section> : null}
          {detail && tab === 'trade' ? <section><h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Trade attributes</h3><div className="grid grid-cols-2 gap-2.5"><Field label="Rule set"><div className="rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 py-2 text-[13px] font-semibold">{detail.pricing_meta.pricing_rule_set_name ?? 'None configured'}</div></Field><Field label="Source"><div className="rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 py-2 text-[13px] font-semibold">{detail.pricing_meta.source_reference ?? 'Catalog'}</div></Field><Field label="Imported"><div className="rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 py-2 text-[13px] font-semibold">{detail.pricing_meta.last_imported_at ?? '—'}</div></Field><Field label="Gate"><div className="rounded-[6px] border border-[var(--border)] bg-slate-50 px-2.5 py-2 text-[13px] font-semibold">Active + quoteable + priced</div></Field></div></section> : null}
          {detail && tab === 'history' ? <section><h3 className="mb-2 border-b border-[var(--border)] pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">History</h3><div className="rounded-[12px] border border-[var(--border)] bg-slate-50 p-3 text-[12px] text-slate-600">Pricing source: {detail.pricing_meta.source_reference ?? 'Catalog'} · last import {detail.pricing_meta.last_imported_at ?? 'not recorded'}.</div></section> : null}
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] px-[22px] py-3.5">
          <button type="button" disabled={!hasChanges || saving} onClick={() => void save()} className="flex-1 rounded-[6px] bg-slate-900 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
          <button type="button" disabled={deleting} onClick={() => void removeProduct()} className="rounded-[6px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-600 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
          {detail?.product.is_active && detail.variants.some((variant) => variant.is_quoteable && (variant.ex_factory_value != null || variant.fob_value != null)) ? <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(detail.product.id)}`} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-[12px] font-bold text-slate-700">Quick quote</Link> : <Link href={PRODUCT_ROUTES.app.quotes} className="rounded-[6px] border border-[var(--border)] px-3 py-2 text-[12px] font-bold text-slate-700">Quotes</Link>}
        </div>
      </div>
    </div>
  );
}
