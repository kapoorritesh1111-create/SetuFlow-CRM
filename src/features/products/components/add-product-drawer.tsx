'use client';

import { useEffect, useMemo, useState } from 'react';
import { createProduct } from '@/features/products/api/create-product';
import { getProductOptions, type ProductCategoryOption } from '@/features/products/api/get-product-options';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (productId: string) => void;
};

type FormState = {
  name: string;
  categoryId: string;
  brandName: string;
  pricingType: 'chips' | 'powders';
  skuCode: string;
  packLabel: string;
  packSizeValue: string;
  unitsPerCase: string;
  moqCases: string;
  moqKg: string;
  pricingModeDefault: 'unit' | 'case' | 'kg';
  description: string;
  exFactoryValue: string;
  fobValue: string;
  bulkValue: string;
};

const initialForm: FormState = {
  name: '',
  categoryId: '',
  brandName: 'Roohted',
  pricingType: 'chips',
  skuCode: '',
  packLabel: '',
  packSizeValue: '',
  unitsPerCase: '',
  moqCases: '',
  moqKg: '',
  pricingModeDefault: 'unit',
  description: '',
  exFactoryValue: '',
  fobValue: '',
  bulkValue: '',
};

export function AddProductDrawer({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOptionsLoading(true);
    setError(null);
    void getProductOptions()
      .then((result) => {
        setCategories(result.categories);
        setForm((current) => ({
          ...current,
          categoryId: current.categoryId || result.categories[0]?.id || '',
        }));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load category options.');
      })
      .finally(() => setOptionsLoading(false));
  }, [open]);

  const isPowder = form.pricingType === 'powders';

  useEffect(() => {
    setForm((current) => ({
      ...current,
      pricingModeDefault: isPowder ? 'kg' : 'unit',
    }));
  }, [isPowder]);

  const categoryName = useMemo(
    () => categories.find((category) => category.id === form.categoryId)?.name ?? '',
    [categories, form.categoryId],
  );

  if (!open) return null;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setForm(initialForm);
    setError(null);
  };

  const save = async () => {
    if (!form.name.trim() || !form.categoryId || !form.skuCode.trim() || !form.packLabel.trim()) {
      setError('Product name, category, SKU code, and pack label are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await createProduct({
        name: form.name.trim(),
        category_id: form.categoryId,
        brand_name: form.brandName.trim() || null,
        description: form.description.trim() || null,
        pricing_type: form.pricingType,
        variant: {
          sku_code: form.skuCode.trim(),
          pack_label: form.packLabel.trim(),
          pack_size_value: form.packSizeValue ? Number(form.packSizeValue) : null,
          pack_size_unit: isPowder ? 'g' : 'g',
          units_per_case: form.unitsPerCase ? Number(form.unitsPerCase) : null,
          moq_cases: !isPowder && form.moqCases ? Number(form.moqCases) : null,
          moq_kg: isPowder && form.moqKg ? Number(form.moqKg) : null,
          pricing_mode_default: form.pricingModeDefault,
          supports_bulk_pricing: isPowder,
        },
        pricing: {
          ex_factory_value: form.exFactoryValue ? Number(form.exFactoryValue) : null,
          ex_factory_unit: isPowder ? 'kg' : 'unit',
          fob_value: form.fobValue ? Number(form.fobValue) : null,
          fob_unit: isPowder ? 'kg' : 'unit',
          bulk_value: isPowder && form.bulkValue ? Number(form.bulkValue) : form.exFactoryValue ? Number(form.exFactoryValue) : null,
          source_sheet_name: 'MANUAL_CREATE',
        },
      });

      reset();
      onCreated(result.product_id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <div className="h-full w-full max-w-2xl overflow-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Create catalog row</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Add product</h2>
            <p className="mt-2 text-sm text-slate-500">Create the product, first variant, and first pricing row in one flow.</p>
          </div>
          <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600" onClick={() => { reset(); onClose(); }}>Close</button>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Product name</span>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Organic Moringa Leaf Powder" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category</span>
            <select value={form.categoryId} onChange={(e) => setField('categoryId', e.target.value)} disabled={optionsLoading} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400">
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {categoryName ? <div className="text-xs text-slate-500">Selected: {categoryName}</div> : null}
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pricing type</span>
            <select value={form.pricingType} onChange={(e) => setField('pricingType', e.target.value as FormState['pricingType'])} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400">
              <option value="chips">Chips / snacks</option>
              <option value="powders">Powders</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Brand</span>
            <input value={form.brandName} onChange={(e) => setField('brandName', e.target.value)} placeholder="Roohted" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">SKU code</span>
            <input value={form.skuCode} onChange={(e) => setField('skuCode', e.target.value)} placeholder="RH-PW-010" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pack label</span>
            <input value={form.packLabel} onChange={(e) => setField('packLabel', e.target.value)} placeholder="1 kg" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pack size value</span>
            <input value={form.packSizeValue} onChange={(e) => setField('packSizeValue', e.target.value)} placeholder={isPowder ? '1000' : '50'} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Units per case</span>
            <input value={form.unitsPerCase} onChange={(e) => setField('unitsPerCase', e.target.value)} placeholder={isPowder ? '10' : '72'} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          {isPowder ? (
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">MOQ kg</span>
              <input value={form.moqKg} onChange={(e) => setField('moqKg', e.target.value)} placeholder="10" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            </label>
          ) : (
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">MOQ cases</span>
              <input value={form.moqCases} onChange={(e) => setField('moqCases', e.target.value)} placeholder="15" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            </label>
          )}

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pricing mode</span>
            <select value={form.pricingModeDefault} onChange={(e) => setField('pricingModeDefault', e.target.value as FormState['pricingModeDefault'])} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400">
              {!isPowder ? <option value="unit">Per unit</option> : null}
              {!isPowder ? <option value="case">Per case</option> : null}
              <option value="kg">Per kg</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Description</span>
            <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Commercial description, claims, sourcing notes, or internal remarks" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" rows={4} />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ex-factory {isPowder ? 'per kg' : 'per unit'}</span>
            <input value={form.exFactoryValue} onChange={(e) => setField('exFactoryValue', e.target.value)} placeholder={isPowder ? '9.50' : '0.99'} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">FOB {isPowder ? 'per kg' : 'per unit'}</span>
            <input value={form.fobValue} onChange={(e) => setField('fobValue', e.target.value)} placeholder={isPowder ? '11.75' : '1.15'} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bulk / kg {isPowder ? '(optional)' : '(not used for chips)'}</span>
            <input value={form.bulkValue} onChange={(e) => setField('bulkValue', e.target.value)} placeholder={isPowder ? '9.50' : ''} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600" onClick={() => { reset(); onClose(); }}>Cancel</button>
          <button type="button" disabled={saving || optionsLoading} onClick={() => void save()} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creating...' : 'Create product'}</button>
        </div>
      </div>
    </div>
  );
}
