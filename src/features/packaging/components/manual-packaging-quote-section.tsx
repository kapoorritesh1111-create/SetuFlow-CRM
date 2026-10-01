'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveManualPackagingQuoteLine } from '@/features/packaging/server/manual-packaging-actions';
import { deletePackagingQuoteLine } from '@/features/packaging/server/actions';

type Family = { id: string; name: string; slug: string };
type Line = {
  id: string;
  quantity: number;
  unit_price: number;
  currency: string | null;
  notes: string | null;
  packaging_family_id: string | null;
  input_snapshot_json?: any;
};

export default function ManualPackagingQuoteSection({
  quoteId,
  leadId,
  currency,
  families,
  lines,
}: {
  quoteId: string;
  leadId: string;
  currency: string;
  families: Family[];
  lines: Line[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [familyId, setFamilyId] = useState(families[0]?.id ?? '');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [gusset, setGusset] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  if (!families.length) return null;

  const money = (value: number, code = currency) => `${code} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  const save = () => {
    setError('');
    startTransition(async () => {
      const response = await saveManualPackagingQuoteLine({
        quoteId,
        leadId,
        familyId,
        widthMm: Number(width),
        heightMm: Number(height),
        gussetMm: gusset ? Number(gusset) : null,
        quantity: Number(String(quantity).replace(/,/g, '')),
        unitPrice: Number(unitPrice),
        currency,
        notes,
      });
      if (!response.ok) {
        setError(response.error || 'Unable to save this line.');
        return;
      }
      setOpen(false);
      setWidth('');
      setHeight('');
      setGusset('');
      setQuantity('');
      setUnitPrice('');
      setNotes('');
      router.refresh();
    });
  };

  const remove = (lineId: string) => {
    startTransition(async () => {
      const response = await deletePackagingQuoteLine({ quoteId, leadId, lineId });
      if (!response.ok) setError(response.error || 'Unable to remove this line.');
      router.refresh();
    });
  };

  return (
    <section className="mb-4 rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Custom-price packaging</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Spout Pouches</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Enter the customer-specific dimensions, quantity and unit price. No pricing engine is applied.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-black text-white">
          {open ? 'Cancel' : '+ Add custom-price line'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-black text-slate-600">Service family
              <select value={familyId} onChange={(event) => setFamilyId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold">
                {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-black text-slate-600">Width (mm)
              <input type="number" min="1" step="0.1" value={width} onChange={(event) => setWidth(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
            </label>
            <label className="text-xs font-black text-slate-600">Height (mm)
              <input type="number" min="1" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
            </label>
            <label className="text-xs font-black text-slate-600">Gusset (mm, optional)
              <input type="number" min="0" step="0.1" value={gusset} onChange={(event) => setGusset(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
            </label>
            <label className="text-xs font-black text-slate-600">Quantity (pcs)
              <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
            </label>
            <label className="text-xs font-black text-slate-600">Custom unit price ({currency} / pc)
              <input type="number" min="0.0001" step="0.0001" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
            </label>
          </div>
          <label className="mt-3 block text-xs font-black text-slate-600">Requirement / commercial notes
            <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Spout position, cap details, material, artwork or customer instructions..." className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <button type="button" disabled={pending} onClick={save} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
              {pending ? 'Saving...' : 'Save to Quote'}
            </button>
          </div>
        </div>
      ) : null}

      {lines.length ? (
        <div className="mt-4 space-y-2">
          {lines.map((line) => (
            <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-black text-slate-900">{line.notes || 'Custom packaging line'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{Number(line.quantity).toLocaleString()} pcs · {money(Number(line.unit_price), line.currency || currency)} / pc</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-black text-slate-950">{money(Number(line.quantity) * Number(line.unit_price), line.currency || currency)}</p>
                <button type="button" disabled={pending} onClick={() => remove(line.id)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-black text-rose-600">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
