'use client';

import { useEffect, useId, useMemo, useState } from 'react';

type Option = {
  productId: string;
  variantId?: string | null;
  label: string;
  pack?: string | null;
  unit?: string | null;
  currency?: string | null;
  moq?: number | null;
  casePrice?: number | null;
  unitPrice?: number | null;
  basis?: string | null;
};

type Row = {
  id?: string | null;
  product_id?: string | null;
  product_variant_id?: string | null;
  quantity?: unknown;
  unit_price?: unknown;
  catalog_price_amount?: unknown;
  currency?: string | null;
  notes?: string | null;
  line_notes?: string | null;
  pack_label?: string | null;
  calculation_meta?: Record<string, unknown> | null;
  basis_applied?: string | null;
};

type EditorRow = {
  key: string;
  productId: string;
  variantId: string;
  lookup: string;
  pack: string;
  qty: string;
  unit: string;
  currency: string;
  notes: string;
  casePrice: string;
  unitPrice: string;
  basis: string;
  source: string;
  discountType: string;
  discountValue: string;
  freight: string;
  blank: boolean;
};

function num(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: unknown, currency = 'USD', showZero = false) {
  const parsed = num(value);
  return parsed !== null && (showZero || parsed > 0)
    ? `${currency} ${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '-';
}

function match(options: Option[], row: Row) {
  return (
    options.find(
      (option) => option.productId === row.product_id && String(option.variantId ?? '') === String(row.product_variant_id ?? ''),
    ) ??
    options.find((option) => option.productId === row.product_id) ??
    null
  );
}

function init(row: Row, index: number, options: Option[], quoteCurrency: string): EditorRow {
  const option = match(options, row);
  const meta = (row.calculation_meta ?? {}) as Record<string, unknown>;
  const rowPrice = num(row.unit_price ?? row.catalog_price_amount);
  const qty = num(row.quantity ?? (row as Row & { moq?: unknown }).moq ?? option?.moq ?? 1) ?? 1;
  const casePrice = rowPrice ?? num(option?.casePrice);
  const unitPrice = num(option?.unitPrice);

  return {
    key: String(row.id ?? `blank-${index}`),
    productId: String(row.product_id ?? option?.productId ?? ''),
    variantId: String(row.product_variant_id ?? option?.variantId ?? ''),
    lookup: option?.label ?? '',
    pack: String(row.pack_label ?? option?.pack ?? 'Case'),
    qty: String(qty),
    unit: String(option?.unit ?? 'Case'),
    currency: String(row.currency ?? quoteCurrency),
    notes: String(row.notes ?? row.line_notes ?? ''),
    casePrice: casePrice !== null ? String(casePrice) : '',
    unitPrice: unitPrice !== null ? String(unitPrice) : '',
    basis: String(row.basis_applied ?? option?.basis ?? 'FOB').toUpperCase(),
    source: String(meta.price_source ?? 'Price List'),
    discountType: String(meta.discount_type ?? 'none'),
    discountValue: meta.discount_value != null ? String(meta.discount_value) : '',
    freight: meta.freight != null ? String(meta.freight) : '0.20',
    blank: String(row.id ?? '').startsWith('blank-'),
  };
}

function resolveOption(options: Option[], value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const exact = options.find((option) => option.label.trim().toLowerCase() === normalized);
  if (exact) return exact;

  const starts = options.filter((option) => option.label.trim().toLowerCase().startsWith(normalized));
  if (starts.length === 1) return starts[0];

  const contains = options.filter((option) => option.label.trim().toLowerCase().includes(normalized));
  return contains.length === 1 ? contains[0] : null;
}

export default function QuoteProductRowsClient({
  rows,
  options,
  quoteCurrency,
  includePricing = false,
}: {
  rows: Row[];
  options: Option[];
  quoteCurrency: string;
  includePricing?: boolean;
}) {
  const generatedId = useId();
  const listId = `quote-products-${generatedId.replace(/:/g, '')}`;
  const optionMap = useMemo(
    () => new Map(options.map((option) => [option.label.trim().toLowerCase(), option])),
    [options],
  );
  const [items, setItems] = useState<EditorRow[]>(() =>
    rows.map((row, index) => init(row, index, options, quoteCurrency)),
  );

  useEffect(() => {
    setItems(rows.map((row, index) => init(row, index, options, quoteCurrency)));
  }, [options, quoteCurrency, rows]);

  const set = (index: number, patch: Partial<EditorRow>) => {
    setItems((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  };

  const applyOption = (index: number, option: Option) => {
    set(index, {
      productId: option.productId,
      variantId: String(option.variantId ?? ''),
      lookup: option.label,
      pack: option.pack || 'Case',
      qty: String(option.moq || 1),
      unit: option.unit || 'Case',
      currency: quoteCurrency,
      casePrice: num(option.casePrice) !== null ? String(option.casePrice) : '',
      unitPrice: num(option.unitPrice) !== null ? String(option.unitPrice) : '',
      basis: String(option.basis || 'FOB').toUpperCase(),
      source: 'Price List',
      blank: false,
    });
  };

  const typeValue = (index: number, value: string) => {
    const exact = optionMap.get(value.trim().toLowerCase());
    if (exact) {
      applyOption(index, exact);
      return;
    }
    set(index, {
      lookup: value,
      productId: '',
      variantId: '',
      casePrice: '',
      unitPrice: '',
      currency: quoteCurrency,
    });
  };

  const choose = (index: number, value: string) => {
    const option = resolveOption(options, value);
    if (option) applyOption(index, option);
  };

  const clear = (index: number) => {
    set(index, {
      productId: '',
      variantId: '',
      lookup: '',
      pack: '',
      qty: '1',
      unit: 'Case',
      currency: quoteCurrency,
      casePrice: '',
      unitPrice: '',
      notes: '',
      blank: true,
    });
  };

  const remove = (index: number) => {
    setItems((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const draftTotal = useMemo(
    () =>
      items.reduce((sum, row) => {
        const qty = num(row.qty) ?? 0;
        const casePrice = num(row.casePrice) ?? 0;
        const discount = num(row.discountValue) ?? 0;
        const discountAmount =
          row.discountType === 'percent'
            ? (casePrice * discount) / 100
            : row.discountType === 'amount'
              ? discount
              : 0;
        return sum + Math.max(0, casePrice - discountAmount) * qty;
      }, 0),
    [items],
  );

  return (
    <>
      <datalist id={listId}>
        {options.map((option) => (
          <option key={`${option.productId}-${option.variantId ?? 'product'}`} value={option.label} />
        ))}
      </datalist>

      {items.map((row, index) => {
        const qty = num(row.qty) ?? 1;
        const casePrice = num(row.casePrice) ?? 0;
        const unitPrice = num(row.unitPrice) ?? 0;
        const discount = num(row.discountValue) ?? 0;
        const discountAmount =
          row.discountType === 'percent'
            ? (casePrice * discount) / 100
            : row.discountType === 'amount'
              ? discount
              : 0;
        const finalCase = Math.max(0, casePrice - discountAmount);
        const missingPrice = Boolean(row.productId) && casePrice <= 0;

        return (
          <tr key={row.key || index} className="border-t border-slate-100 align-top">
            <td className="py-2 font-black">{index + 1}</td>
            <td className="py-2">
              {includePricing ? (
                <div className="min-w-64 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="font-black text-slate-900">{row.lookup || 'Product not selected'}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    {row.pack} · {row.unit}
                  </p>
                </div>
              ) : (
                <div className="min-w-72">
                  <div className="flex gap-2">
                    <input
                      list={listId}
                      value={row.lookup}
                      onChange={(event) => typeValue(index, event.target.value)}
                      onBlur={(event) => choose(index, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        choose(index, event.currentTarget.value);
                      }}
                      placeholder="Type product, SKU, pack, or variant"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 font-bold"
                    />
                    {row.productId ? (
                      <button
                        type="button"
                        onClick={() => clear(index)}
                        className="rounded-xl border border-slate-200 px-2 text-xs font-black text-slate-500"
                      >
                        Change
                      </button>
                    ) : null}
                  </div>
                  {missingPrice ? (
                    <p className="mt-1 text-[10px] font-bold text-amber-700">
                      No active {quoteCurrency} price was found for this product.
                    </p>
                  ) : null}
                </div>
              )}
              <input type="hidden" name="product_id" value={row.productId} />
              <input type="hidden" name="product_variant_id" value={row.variantId} />
            </td>
            <td className="py-2">
              <input
                name="pack_label"
                value={row.pack}
                readOnly
                className="w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold"
              />
            </td>
            <td className="py-2">
              <input
                name="quantity"
                value={row.qty}
                onChange={(event) => set(index, { qty: event.target.value })}
                readOnly={includePricing}
                className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 font-bold read-only:bg-slate-50"
              />
            </td>
            <td className="py-2 text-xs font-bold text-slate-500">
              {row.unit}
              <input type="hidden" name="sell_unit" value={row.unit} />
            </td>
            <td className="py-2">
              <input
                name="currency"
                value={quoteCurrency}
                readOnly
                className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold uppercase"
              />
            </td>

            {includePricing ? (
              <>
                <td className="py-2">
                  <input
                    name="unit_price"
                    value={row.casePrice}
                    readOnly
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold"
                  />
                </td>
                <td className="py-2">
                  <div className="w-24 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 font-black text-slate-700">
                    {unitPrice ? money(unitPrice, quoteCurrency) : '-'}
                  </div>
                </td>
                <td className="py-2">
                  <select
                    name="discount_type"
                    value={row.discountType}
                    onChange={(event) => set(index, { discountType: event.target.value })}
                    className="w-24 rounded-xl border border-slate-200 px-3 py-1.5"
                  >
                    <option value="none">None</option>
                    <option value="percent">%</option>
                    <option value="amount">Amount</option>
                  </select>
                </td>
                <td className="py-2">
                  <input
                    name="discount_value"
                    value={row.discountValue}
                    onChange={(event) => set(index, { discountValue: event.target.value })}
                    placeholder="0"
                    className="w-24 rounded-xl border border-slate-200 px-3 py-1.5"
                  />
                </td>
                <td className="py-2">
                  <input
                    name="basis"
                    value={row.basis}
                    readOnly
                    className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold"
                  />
                </td>
                <td className="py-2">
                  <input
                    name="price_source"
                    value={row.source}
                    readOnly
                    className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold"
                  />
                </td>
                <td className="py-2">
                  <input
                    name="freight"
                    value={row.freight}
                    onChange={(event) => set(index, { freight: event.target.value })}
                    className="w-20 rounded-xl border border-slate-200 px-3 py-1.5"
                  />
                </td>
                <td className="py-2">
                  <div className="font-black text-slate-950">{money(finalCase * qty, quoteCurrency)}</div>
                  {discount > 15 && row.discountType === 'percent' ? (
                    <div className="text-[10px] font-black text-amber-700">approval required</div>
                  ) : null}
                </td>
              </>
            ) : (
              <>
                <input type="hidden" name="unit_price" value={row.casePrice} />
                <input type="hidden" name="basis" value={row.basis} />
                <input type="hidden" name="price_source" value={row.source} />
                <input type="hidden" name="freight" value={row.freight} />
                <input type="hidden" name="discount_type" value="none" />
                <input type="hidden" name="discount_value" value="" />
                <td className="py-2">
                  <input
                    name="line_notes"
                    value={row.notes}
                    onChange={(event) => set(index, { notes: event.target.value })}
                    placeholder="Notes"
                    className="rounded-xl border border-slate-200 px-3 py-1.5"
                  />
                </td>
                <td className="py-2 font-black text-slate-700">{money(casePrice, quoteCurrency)}</td>
                <td className="py-2 font-black text-slate-700">{money(unitPrice, quoteCurrency)}</td>
                <td className="py-2 font-black text-slate-700">{money(casePrice * qty, quoteCurrency)}</td>
              </>
            )}

            <td className="py-2">
              {row.productId ? (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600"
                >
                  Delete
                </button>
              ) : null}
            </td>
          </tr>
        );
      })}

      {!includePricing ? (
        <tr className="border-t-2 border-slate-200 bg-slate-50">
          <td colSpan={9} className="px-3 py-3 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Live product total
          </td>
          <td className="px-3 py-3 font-black text-slate-950">{money(draftTotal, quoteCurrency, true)}</td>
          <td />
        </tr>
      ) : null}
    </>
  );
}
