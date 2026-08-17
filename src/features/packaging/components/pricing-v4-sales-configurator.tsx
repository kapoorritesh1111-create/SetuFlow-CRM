'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewPackagingPricingV4, savePackagingPricingV4QuoteLine } from '@/features/packaging/server/pricing-v4-actions';

const STEP_LABELS = ['Product & Size', 'Material & Finish', 'Features', 'Quantity & Price', 'Summary'];
const CATEGORY_LABEL: Record<string,string> = { extra:'Extra', pre:'Pre-production', post:'Post-production' };

function money(value: unknown, currency = 'INR') {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

export default function PricingV4SalesConfigurator({ quoteId, leadId, options }: { quoteId: string; leadId: string; options: any }) {
  const router = useRouter();
  const families = options?.families ?? [];
  const templates = options?.templates ?? [];
  const variations = options?.variations ?? [];
  const klds = options?.klds ?? [];
  const matrixRows = options?.matrixRows ?? [];
  const charges = options?.charges ?? [];
  const supAvailability = options?.supAvailability ?? [];
  const [familyId, setFamilyId] = useState(families[0]?.id ?? '');
  const family = families.find((item: any) => item.id === familyId);
  const familyTemplates = templates.filter((item: any) => item.family_id === familyId);
  const [templateId, setTemplateId] = useState(familyTemplates[0]?.id ?? '');
  const template = templates.find((item: any) => item.id === templateId);
  const familyVariations = variations.filter((item: any) => item.family_id === familyId);
  const [variationId, setVariationId] = useState(familyVariations[0]?.id ?? '');
  const variation = variations.find((item: any) => item.id === variationId);
  const [construction, setConstruction] = useState('matte_foil');
  const [print, setPrint] = useState('CMYKW');
  const [quantity, setQuantity] = useState(5000);
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>([]);
  const [kldFileId, setKldFileId] = useState('');
  const [supplyForm, setSupplyForm] = useState('center_seal');
  const [matrixProductId, setMatrixProductId] = useState('');
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(140);
  const [tier, setTier] = useState('Q1');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [pending, startTransition] = useTransition();

  function defaultChargeCodes(nextTemplateId: string) {
    return charges.some((item: any) => item.code === 'EXTRA_ZIPPER' && (item.template_ids ?? []).includes(nextTemplateId)) ? ['EXTRA_ZIPPER'] : [];
  }

  useEffect(() => {
    const nextTemplates = templates.filter((item: any) => item.family_id === familyId);
    const nextTemplate = nextTemplates[0];
    setTemplateId(nextTemplate?.id ?? '');
    const nextVariations = variations.filter((item: any) => item.family_id === familyId);
    setVariationId(nextVariations[0]?.id ?? '');
    setSelectedChargeCodes(defaultChargeCodes(nextTemplate?.id ?? ''));
    setKldFileId('');
    setPreview(null);
    setError('');
    if (nextTemplate?.slug?.includes('3ss')) setSupplyForm(nextTemplate.slug.includes('pouch') ? 'three_side_seal_pouch' : 'three_side_seal_roll');
    else if (nextTemplate?.calculation_engine_key === 'matrix_per_frame') setSupplyForm('center_seal');
  }, [familyId, templates, variations]);

  useEffect(() => {
    if (!template) return;
    if (template.slug?.includes('3ss-pouch')) setSupplyForm('three_side_seal_pouch');
    else if (template.slug?.includes('3ss-roll')) setSupplyForm('three_side_seal_roll');
    else if (template.calculation_engine_key === 'matrix_per_frame') setSupplyForm('center_seal');
    setSelectedChargeCodes(defaultChargeCodes(template.id));
    setMatrixProductId('');
    setPreview(null);
    setError('');
  }, [templateId]);

  const rows = useMemo(() => matrixRows.filter((row: any) => row.template_id === templateId && row.supply_form === supplyForm), [matrixRows, templateId, supplyForm]);
  const selectedRow = rows.find((row: any) => row.client_product_id === matrixProductId) ?? rows[0];
  const availableKlds = klds.filter((file: any) => file.family_id === familyId && (!file.product_variation_id || !variationId || file.product_variation_id === variationId));
  const familyCharges = charges.filter((item: any) => (item.template_ids ?? []).includes(templateId));
  const effectiveChargeCodes = selectedChargeCodes.filter((code) => familyCharges.some((item: any) => item.code === code));
  const availability = supAvailability.find((item: any) => item.template_id === templateId && item.variation_id === variationId);
  const availableConstructions = availability?.constructions ?? [];
  const selectedConstruction = availableConstructions.find((item: any) => item.key === construction) ?? availableConstructions[0];
  const printOptions: string[] = selectedConstruction?.print_options ?? [];
  const selectedPrint = printOptions.includes(print) ? print : (printOptions[0] ?? '');
  const isSup = template?.calculation_engine_key === 'sup_formula';
  const supReady = Boolean(variationId && selectedConstruction?.key && selectedPrint);
  const currency = preview?.selling_price?.currency ?? 'INR';

  function toggleCharge(code: string) {
    setSelectedChargeCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
    setPreview(null);
  }

  function buildInput() {
    if (isSup) {
      return {
        product_variation_id: variationId,
        construction_key: selectedConstruction?.key ?? '',
        print: selectedPrint,
        quantity,
        selected_charge_codes: effectiveChargeCodes,
        kld_file_id: kldFileId || null,
      } as any;
    }
    return {
      width_mm: width,
      height_mm: height,
      supply_form: supplyForm,
      client_product_id: matrixProductId || selectedRow?.client_product_id || '',
      tier,
      quantity,
      selected_charge_codes: effectiveChargeCodes,
      kld_file_id: kldFileId || null,
    } as any;
  }

  function runPreview() {
    if (!templateId || (isSup && !supReady)) return;
    setError(''); setSaved('');
    startTransition(async () => {
      const response: any = await previewPackagingPricingV4({ templateId, input: buildInput() });
      setPreview(response.result ?? null);
      if (!response.ok) setError(response.error ?? 'Pricing needs attention.');
    });
  }

  function saveLine() {
    if (!templateId || !familyId || (isSup && !supReady)) return;
    setError(''); setSaved('');
    startTransition(async () => {
      const response: any = await savePackagingPricingV4QuoteLine({ quoteId, leadId, familyId, templateId, input: buildInput() });
      if (!response.ok) { setError(response.error ?? 'Packaging line could not be saved.'); return; }
      setPreview(response.result ?? preview);
      setSaved('Packaging line added to this quote.');
      router.refresh();
    });
  }

  if (!families.length || !templates.length) return null;

  return (
    <section className="rounded-card border border-cyan-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Packaging Pricing v4</p><h2 className="mt-1 text-xl font-black text-slate-950">Build a packaging quote</h2><p className="mt-1 text-sm font-semibold text-slate-500">Choose the customer requirement. SETU calculates the production path and selling price on the server.</p></div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Published pricing only</span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">{STEP_LABELS.map((label, index) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><div className="text-[10px] font-black text-slate-400">{index + 1}</div><div className="text-xs font-black text-slate-700">{label}</div></div>)}</div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-black text-slate-600">Service family<select value={familyId} onChange={(e) => setFamilyId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{families.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="text-xs font-black text-slate-600">Pricing template<select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{familyTemplates.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>

          {isSup ? <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-black text-slate-600">Product & size<select value={variationId} onChange={(e) => { setVariationId(e.target.value); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{familyVariations.map((item: any) => <option key={item.id} value={item.id}>{item.name} · {item.dimension_label}</option>)}</select></label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Selected dimensions</div><div className="mt-1 text-sm font-black text-slate-800">{variation?.dimension_label ?? 'Choose a size'}</div></div>
            </div>
            {supReady ? <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-black text-slate-600">Material & finish<select value={selectedConstruction?.key ?? ''} onChange={(e) => { setConstruction(e.target.value); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{availableConstructions.map((item:any) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
              <label className="text-xs font-black text-slate-600">Printing<select value={selectedPrint} onChange={(e) => { setPrint(e.target.value); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{printOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">No fully rated material + print construction is ready for this size. Pricing Admin must complete the required Master rates before Sales can quote it.</div>}
          </> : <>
            {String(family?.slug ?? '').includes('three-side') ? <label className="block text-xs font-black text-slate-600">Supply form<select value={supplyForm} onChange={(e) => { setSupplyForm(e.target.value); setMatrixProductId(''); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="three_side_seal_roll">Roll</option><option value="three_side_seal_pouch">Pouch</option></select></label> : null}
            <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-black text-slate-600">Width (mm)<input value={width} min={1} type="number" onChange={(e) => { setWidth(Number(e.target.value)); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" /></label><label className="text-xs font-black text-slate-600">Height (mm)<input value={height} min={1} type="number" onChange={(e) => { setHeight(Number(e.target.value)); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" /></label></div>
            <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-black text-slate-600">Construction / matrix row<select value={matrixProductId} onChange={(e) => { setMatrixProductId(e.target.value); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="">Choose approved row</option>{rows.map((row: any) => <option key={row.id} value={row.client_product_id}>{row.client_product_id} · {row.construction_key}</option>)}</select></label><label className="text-xs font-black text-slate-600">Quantity tier<select value={tier} onChange={(e) => { setTier(e.target.value); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">{['Q1','Q2','Q3','Q4','Q5'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
          </>}

          {familyCharges.length ? <div className="rounded-xl border border-slate-200 p-3"><div className="mb-2 text-xs font-black text-slate-600">Features & additional charges</div><div className="grid gap-2 md:grid-cols-2">{familyCharges.map((item:any) => <label key={item.code} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold text-slate-700"><input type="checkbox" checked={effectiveChargeCodes.includes(item.code)} onChange={() => toggleCharge(item.code)} /><span>{item.name}<span className="ml-2 text-[10px] font-black uppercase tracking-wide text-slate-400">{CATEGORY_LABEL[item.category] ?? item.category}</span></span></label>)}</div></div> : null}

          <label className="block text-xs font-black text-slate-600">KLD / dieline<select value={kldFileId} onChange={(e) => setKldFileId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"><option value="">No KLD selected</option>{availableKlds.map((item: any) => <option key={item.id} value={item.id}>{item.file_name}{item.version_label ? ` · ${item.version_label}` : ''}</option>)}</select></label>
          <label className="block text-xs font-black text-slate-600">Quantity<input type="number" min={1} value={quantity} onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value))); setPreview(null); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" /></label>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={runPreview} disabled={pending || !templateId || (isSup && !supReady)} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 disabled:opacity-50">{pending ? 'Calculating…' : 'Calculate price'}</button><button type="button" onClick={saveLine} disabled={pending || !preview?.ok} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Add to quote</button></div>
          {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">{error}</div> : null}
          {saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{saved}</div> : null}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Price summary</p>
          {preview?.selling_price ? <div className="mt-4 space-y-3"><div><div className="text-xs font-bold text-slate-500">Unit price</div><div className="text-2xl font-black text-slate-950">{money(preview.selling_price.unit_price, currency)}</div></div><div className="flex justify-between text-sm"><span className="font-semibold text-slate-500">Product total</span><strong>{money(preview.selling_price.product_total, currency)}</strong></div><div className="flex justify-between text-sm"><span className="font-semibold text-slate-500">GST {preview.selling_price.gst_pct}%</span><strong>{money(preview.selling_price.gst, currency)}</strong></div><div className="border-t border-slate-200 pt-3"><div className="text-xs font-bold text-slate-500">Grand total before freight</div><div className="text-xl font-black text-slate-950">{money(preview.selling_price.grand_total_before_freight, currency)}</div></div>{preview.separate_charges?.length ? <div className="border-t border-slate-200 pt-3"><div className="mb-2 text-xs font-black text-slate-500">Separate quote charges</div>{preview.separate_charges.map((item:any) => <div key={item.code} className="flex justify-between gap-3 py-1 text-xs"><span className="font-semibold text-slate-600">{item.name}</span><strong>{money(item.amount,currency)}</strong></div>)}</div> : null}{preview.kld?.file_id ? <div className="rounded-lg bg-white p-2 text-xs font-bold text-slate-600">KLD attached to pricing snapshot</div> : null}</div> : <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">Calculate the price to see customer-facing selling outputs. Internal COGS, wastage, margin and charge rules are not shown here.</p>}
        </aside>
      </div>
    </section>
  );
}
