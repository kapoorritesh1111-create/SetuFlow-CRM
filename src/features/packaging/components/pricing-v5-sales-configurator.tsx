'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { previewPackagingPricingV5, savePackagingPricingV5QuoteLine } from '@/features/packaging/server/pricing-v5-actions';

function money(value: unknown, currency = 'INR') {
  const amount = Number(value ?? 0);
  return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
}

function quantityAllowedForSize(size: any, quantity: number) {
  const metadata = size?.quantity_rules ?? size?.metadata ?? {};
  const allowed = Array.isArray(metadata.allowed_quantities) ? metadata.allowed_quantities.map(Number).filter((value: number) => value > 0) : [];
  const blocked = Array.isArray(metadata.blocked_quantities) ? metadata.blocked_quantities.map(Number).filter((value: number) => value > 0) : [];
  if (blocked.includes(quantity)) return false;
  if (allowed.length && !allowed.includes(quantity)) return false;
  return true;
}

function firstValidReviewQuantity(size: any) {
  const ladder = [1000, 2000, 3000, 5000, 10000, 20000, 30000, 50000];
  return ladder.find((value) => quantityAllowedForSize(size, value)) ?? 1000;
}

function kldMatchesSize(item: any, size: any) {
  if (!item || !size) return false;
  const file = String(item.file_name ?? '').toLowerCase().replace(/\s+/g, '');
  const width = String(Number(size.width_mm));
  const height = String(Number(size.height_mm));
  return file.includes(`${width}mmxh${height}mm`) || file.includes(`${width}x${height}`) || file.includes(`w${width}mmxh${height}mm`);
}

export default function PricingV5SalesConfigurator({ quoteId, leadId, options, savedLines = [] }: { quoteId: string; leadId: string; options: any; savedLines?: any[] }) {
  const router = useRouter();
  const families = options?.families ?? [];
  const templates = options?.templates ?? [];
  const sizes = options?.sizes ?? [];
  const constructions = options?.constructions ?? [];
  const klds = options?.klds ?? [];
  const charges = options?.charges ?? [];
  const family = families[0] ?? null;
  const template = templates[0] ?? null;
  const engineCharges = charges.filter((item: any) => item.pricing_mode !== 'manual');
  const manualSpotUv = charges.find((item: any) => item.code === 'EXTRA_SPOT_UV' && item.pricing_mode === 'manual') ?? null;

  const [editingLineId, setEditingLineId] = useState('');
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? '');
  const [constructionId, setConstructionId] = useState(constructions[0]?.id ?? '');
  const [print, setPrint] = useState<'CMYK' | 'CMYKW'>('CMYKW');
  const [quantity, setQuantity] = useState(1000);
  const [bottomPrintMode, setBottomPrintMode] = useState<'solid_unregistered' | 'registered_artwork' | ''>('');
  const [selectedChargeCodes, setSelectedChargeCodes] = useState<string[]>(() => charges.some((item: any) => item.code === 'EXTRA_ZIPPER') ? ['EXTRA_ZIPPER'] : []);
  const [kldFileId, setKldFileId] = useState('');
  const [spotUvEnabled, setSpotUvEnabled] = useState(false);
  const [spotUvAmount, setSpotUvAmount] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [pending, startTransition] = useTransition();

  const size = sizes.find((item: any) => item.id === sizeId) ?? sizes[0];
  const compatibleConstructions = useMemo(() => {
    const allowed=new Set((size?.allowed_pe_microns ?? []).map((value: unknown)=>Number(value)));
    return constructions.filter((item:any)=>allowed.has(Number(item.pe_micron)));
  }, [constructions, size]);
  const construction = compatibleConstructions.find((item: any) => item.id === constructionId) ?? compatibleConstructions[0] ?? null;
  const askBottomPrint = size?.bottom_registration_mode === 'optional' && size?.gusset_production_mode === 'conditional';
  const matchingKlds = useMemo(() => klds.filter((item: any) => kldMatchesSize(item, size)), [klds, size]);
  const validQuantities = useMemo(() => [1000,2000,3000,5000,10000,20000,30000,50000].filter((value)=>quantityAllowedForSize(size,value)), [size]);
  const quantityAllowed = quantityAllowedForSize(size, quantity);
  const manualSpotUvValid = !spotUvEnabled || (Number.isFinite(Number(spotUvAmount)) && Number(spotUvAmount) > 0);
  const canPrice = Boolean(family?.id && template?.id && size?.id && construction?.id && quantity > 0 && quantityAllowed && manualSpotUvValid && (!askBottomPrint || bottomPrintMode));
  const currency = preview?.selling_price?.currency ?? template?.currency ?? 'INR';
  const alternativeRows = useMemo(() => {
    const currentUnit = Number(preview?.selling_price?.unit_price ?? 0);
    return (preview?.alternative_quantities ?? [])
      .filter((row: any) => Number(row.quantity) > quantity)
      .slice(0, 3)
      .map((row: any) => ({
        ...row,
        saving_per_unit: Math.max(0, currentUnit - Number(row.unit_price ?? 0)),
        saving_pct: currentUnit > 0 ? Math.max(0, ((currentUnit - Number(row.unit_price ?? 0)) / currentUnit) * 100) : 0,
      }));
  }, [preview, quantity]);

  useEffect(() => {
    if (!sizes.some((item: any) => item.id === sizeId)) setSizeId(sizes[0]?.id ?? '');
  }, [sizes, sizeId]);

  useEffect(() => {
    if (!compatibleConstructions.some((item:any)=>item.id===constructionId)) setConstructionId(compatibleConstructions[0]?.id ?? '');
  }, [compatibleConstructions, constructionId]);

  useEffect(() => {
    if (!quantityAllowedForSize(size, quantity)) setQuantity(firstValidReviewQuantity(size));
    if (!askBottomPrint) setBottomPrintMode('');
    setKldFileId('');
    setPreview(null);
    setError('');
    setSaved('');
  }, [sizeId]);

  useEffect(() => {
    if (!askBottomPrint) setBottomPrintMode('');
  }, [askBottomPrint]);

  function invalidate() {
    setPreview(null);
    setSaved('');
    setError('');
  }

  function toggleCharge(code: string) {
    setSelectedChargeCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
    invalidate();
  }

  function buildInput() {
    return {
      size_profile_id: size?.id ?? '',
      construction_id: construction?.id ?? '',
      print,
      quantity,
      bottom_print_mode: askBottomPrint ? bottomPrintMode || undefined : undefined,
      selected_charge_codes: selectedChargeCodes,
      manual_quote_charges: spotUvEnabled ? [{ code:'EXTRA_SPOT_UV', amount:Number(spotUvAmount), note:'Owner deferred automatic Spot UV rate/basis; Sales manual price.' }] : [],
      kld_file_id: kldFileId || null,
    } as any;
  }

  function runPreview() {
    if (!canPrice) return;
    setError('');
    setSaved('');
    startTransition(async () => {
      const response: any = await previewPackagingPricingV5({ templateId: template.id, input: buildInput() });
      setPreview(response.result ?? null);
      if (!response.ok) setError(response.error ?? 'Pricing needs attention.');
    });
  }

  function editSavedLine(line: any) {
    if (!line) return;
    setEditingLineId(String(line.lineId ?? ''));
    setSizeId(String(line.sizeProfileId ?? sizes[0]?.id ?? ''));
    setConstructionId(String(line.constructionId ?? constructions[0]?.id ?? ''));
    setPrint(line.print === 'CMYK' ? 'CMYK' : 'CMYKW');
    setQuantity(Number(line.quantity ?? 1000));
    setBottomPrintMode(line.bottomPrintMode === 'solid_unregistered' || line.bottomPrintMode === 'registered_artwork' ? line.bottomPrintMode : '');
    setSelectedChargeCodes(Array.isArray(line.selectedChargeCodes) ? line.selectedChargeCodes : []);
    setKldFileId(String(line.kldFileId ?? ''));
    setSpotUvEnabled(Boolean(line.spotUvEnabled));
    setSpotUvAmount(line.spotUvAmount != null ? String(line.spotUvAmount) : '');
    setPreview(null);
    setSaved('');
    setError('');
  }

  function startNewLine() {
    setEditingLineId('');
    setSizeId(sizes[0]?.id ?? '');
    setConstructionId(constructions[0]?.id ?? '');
    setPrint('CMYKW');
    setQuantity(firstValidReviewQuantity(sizes[0]));
    setBottomPrintMode('');
    setSelectedChargeCodes(charges.some((item: any) => item.code === 'EXTRA_ZIPPER') ? ['EXTRA_ZIPPER'] : []);
    setKldFileId('');
    setSpotUvEnabled(false);
    setSpotUvAmount('');
    setPreview(null);
    setSaved('');
    setError('');
  }

  function saveLine() {
    if (!canPrice) return;
    setError('');
    setSaved('');
    startTransition(async () => {
      const response: any = await savePackagingPricingV5QuoteLine({ quoteId, leadId, familyId: family.id, templateId: template.id, input: buildInput(), lineId: editingLineId || null });
      if (!response.ok) {
        setError(response.error ?? 'Packaging line could not be saved.');
        return;
      }
      setPreview(response.result ?? preview);
      setEditingLineId(String(response.lineId ?? editingLineId));
      setSaved(editingLineId ? 'Packaging line updated.' : 'Packaging line added to this quote.');
      router.refresh();
    });
  }

  if (!family || !template || !sizes.length || !constructions.length) return null;

  return <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Packaging Pricing v5</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Build a stand-up pouch quote</h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">Sales enters the customer requirement. SETU applies the approved construction, production route, commercial band and selling price automatically.</p>
      </div>
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Published v5 pricing</span>
    </div>

    {savedLines.length ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-black text-slate-900">Saved Pricing v5 lines</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Reopen a saved pouch line to change quantity, structure, printing, KLD or manual Spot UV without creating a duplicate line.</div></div><button type="button" onClick={startNewLine} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">New pouch line</button></div><div className="mt-3 grid gap-2 md:grid-cols-2">{savedLines.map((line:any)=><button type="button" key={line.lineId} onClick={()=>editSavedLine(line)} className={`rounded-xl border p-3 text-left ${editingLineId===line.lineId?'border-teal-400 bg-teal-50':'border-slate-200 bg-white hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-800">{Number(line.quantity).toLocaleString()} pcs</span><span className="text-xs font-black text-slate-950">{money(line.unitPrice,line.currency)} / pc</span></div><div className="mt-1 text-[11px] font-semibold text-slate-500">{editingLineId===line.lineId?'Editing this saved line':'Edit saved line'}</div></button>)}</div></div> : null}

    <div className="mt-4 grid gap-2 sm:grid-cols-4">
      <Step number="1" title="Requirement" active />
      <Step number="2" title="Options & KLD" active={Boolean(size?.id && construction?.id)} />
      <Step number="3" title="Price" active={Boolean(preview?.ok)} />
      <Step number="4" title="Add to quote" active={Boolean(saved)} />
    </div>

    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-2"><div><div className="text-xs font-black text-slate-900">1. Customer requirement</div><div className="mt-1 text-[11px] text-slate-500">Choose only what Sales should know. Internal costing remains hidden.</div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">Sales view</span></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-black text-slate-600">Pouch size<select value={size?.id ?? ''} onChange={(e) => setSizeId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900">{sizes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Dimensions</div><div className="mt-1 text-sm font-black text-slate-800">{size?.width_mm} × {size?.height_mm} mm · BG {size?.bottom_gusset_each_mm}+{size?.bottom_gusset_each_mm}</div></div>
            <label className="text-xs font-black text-slate-600">Material & finish<select value={construction?.id ?? ''} disabled={!compatibleConstructions.length} onChange={(e) => { setConstructionId(e.target.value); invalidate(); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 disabled:bg-slate-100">{compatibleConstructions.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="mt-1 block text-[11px] font-semibold text-teal-700">{compatibleConstructions.length ? `Approved PE ${(size?.allowed_pe_microns ?? []).join(' / ')}µ · ${compatibleConstructions.length} compatible construction${compatibleConstructions.length===1?'':'s'}` : 'No approved construction is configured for this size.'}</span></label>
            <label className="text-xs font-black text-slate-600">Printing<select value={print} onChange={(e) => { setPrint(e.target.value as 'CMYK' | 'CMYKW'); invalidate(); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"><option value="CMYK">CMYK</option><option value="CMYKW">CMYKW</option></select></label>
          </div>

          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-blue-500">Approved size-matched structure</div><div className="mt-1 text-sm font-black text-slate-800">{construction?.structure_label ?? 'No compatible structure available'}</div><p className="mt-1 text-xs text-slate-500">{construction ? `${construction.layer_count} layers · PE ${construction.pe_micron}µ. Sales cannot change material rates, wastage or margin.` : 'Pricing is blocked until a compatible construction exists.'}</p></div>

          {askBottomPrint ? <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3"><div className="text-xs font-black text-slate-700">Printing on the bottom gusset?</div><p className="mt-1 text-xs text-slate-500">This question appears only because the answer changes the production route.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className={`cursor-pointer rounded-xl border p-3 text-sm font-bold ${bottomPrintMode === 'solid_unregistered' ? 'border-teal-500 bg-white text-teal-800' : 'border-slate-200 bg-white text-slate-700'}`}><input className="mr-2" type="radio" name="bottom-mode-v5" checked={bottomPrintMode === 'solid_unregistered'} onChange={() => { setBottomPrintMode('solid_unregistered'); invalidate(); }} />Solid color only</label><label className={`cursor-pointer rounded-xl border p-3 text-sm font-bold ${bottomPrintMode === 'registered_artwork' ? 'border-teal-500 bg-white text-teal-800' : 'border-slate-200 bg-white text-slate-700'}`}><input className="mr-2" type="radio" name="bottom-mode-v5" checked={bottomPrintMode === 'registered_artwork'} onChange={() => { setBottomPrintMode('registered_artwork'); invalidate(); }} />Logo, text or artwork</label></div></div> : <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs font-bold text-emerald-700">{size?.gusset_production_mode === 'separate' ? 'SETU will automatically use split-gusset production for this size.' : 'Bottom artwork question does not apply to this size.'}</div>}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="text-xs font-black text-slate-900">2. Options, quantity & KLD</div>
          {engineCharges.length ? <div className="mt-3 grid gap-2 md:grid-cols-2">{engineCharges.map((item: any) => <label key={item.code} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm font-bold text-slate-700"><input type="checkbox" checked={selectedChargeCodes.includes(item.code)} onChange={() => toggleCharge(item.code)} /><span>{item.name}</span></label>)}</div> : null}
          {manualSpotUv ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3"><label className="flex items-center gap-2 text-sm font-black text-slate-800"><input type="checkbox" checked={spotUvEnabled} onChange={(e)=>{setSpotUvEnabled(e.target.checked);if(!e.target.checked)setSpotUvAmount('');invalidate();}} />Spot UV — Manual Price</label><p className="mt-1 text-xs font-semibold text-amber-800">Automatic Spot UV rate and charging basis are on hold. Enter the total Spot UV charge for this quote only.</p>{spotUvEnabled ? <label className="mt-3 block text-xs font-black text-slate-600">Manual Spot UV amount ({template?.currency ?? 'INR'})<input type="number" min="0.01" step="0.01" value={spotUvAmount} onChange={(e)=>{setSpotUvAmount(e.target.value);invalidate();}} placeholder="Enter total manual charge" className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold" /></label> : null}</div> : null}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-black text-slate-600">Quantity<select value={quantity} onChange={(e) => { setQuantity(Number(e.target.value)); invalidate(); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">{validQuantities.map((value)=><option key={value} value={value}>{value.toLocaleString()} pcs</option>)}</select><span className="mt-1 block text-[11px] font-semibold text-slate-500">Only producible quantities are selectable for this size.</span></label>
            <label className="text-xs font-black text-slate-600">KLD / dieline<select value={kldFileId} onChange={(e) => { setKldFileId(e.target.value); invalidate(); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="">{matchingKlds.length ? 'No KLD selected' : 'No approved KLD for this size'}</option>{matchingKlds.map((item: any) => <option key={item.id} value={item.id}>{item.file_name}{item.version ? ` · v${item.version}` : ''}</option>)}</select><span className={`mt-1 block text-[11px] font-semibold ${matchingKlds.length ? 'text-emerald-600' : 'text-amber-600'}`}>{matchingKlds.length ? `${matchingKlds.length} size-matched KLD${matchingKlds.length === 1 ? '' : 's'} available.` : 'KLDs from other sizes are hidden intentionally.'}</span></label>
          </div>
        </div>

        {!compatibleConstructions.length ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">No approved PE construction is available for this pouch size. Pricing is blocked.</div> : !quantityAllowed ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">{quantity.toLocaleString()} pcs is not producible for this pouch size. Choose a valid quantity.</div> : spotUvEnabled && !manualSpotUvValid ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Enter the manual Spot UV amount before calculating or saving the quote.</div> : !canPrice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Complete the required selections before calculating the price.</div> : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
        {saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{saved}</div> : null}

        <div className="flex flex-wrap gap-2"><button type="button" disabled={!canPrice || pending} onClick={runPreview} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{pending ? 'Calculating…' : 'Calculate price'}</button>{preview?.ok ? <button type="button" disabled={pending} onClick={saveLine} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{editingLineId ? 'Update quote line' : 'Add to quote'}</button> : null}</div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Customer price</div>{preview?.ok ? <><div className="mt-3 text-3xl font-black">{money(preview.selling_price.unit_price, currency)}</div><div className="text-xs font-bold text-white/50">per pouch</div><div className="mt-4 border-t border-white/10 pt-3"><div className="flex justify-between text-xs text-white/60"><span>Pouch order total</span><span className="font-black text-white">{money(preview.selling_price.product_total, currency)}</span></div>{(preview.applied_charges ?? []).filter((item:any)=>item.application_stage==='separate_quote_line').map((item:any)=><div key={item.code} className="mt-2 flex justify-between text-xs text-white/60"><span>{item.code==='EXTRA_SPOT_UV'?'Spot UV — Manual Price':item.name}</span><span>{money(item.amount,currency)}</span></div>)}{Number(preview.selling_price.separate_charges_total||0)>0?<div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-xs text-white/60"><span>Subtotal before GST</span><span>{money(preview.selling_price.subtotal_before_gst,currency)}</span></div>:null}<div className="mt-2 flex justify-between text-xs text-white/60"><span>GST</span><span>{money(preview.selling_price.gst, currency)}</span></div><div className="mt-2 flex justify-between text-xs text-white/60"><span>Total incl. GST</span><span className="font-black text-white">{money(preview.selling_price.grand_total_before_freight, currency)}</span></div></div></> : <div className="mt-3 text-sm font-bold text-white/55">Calculate to see the approved selling price.</div>}</div>

        {preview?.construction ? <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-black uppercase text-slate-400">Quote summary</div><div className="mt-2 text-sm font-black text-slate-900">{preview.construction.name}</div><div className="mt-1 text-xs text-slate-500">{preview.construction.structure_label}</div>{preview.production_route?.components?.length > 1 ? <div className="mt-2 rounded-lg bg-cyan-50 px-2.5 py-2 text-xs font-bold text-cyan-800">SETU automatically applied split-gusset production.</div> : null}</div> : null}

        {alternativeRows.length ? <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-black uppercase text-slate-400">Suggested higher quantities</div><div className="mt-1 text-[11px] font-semibold text-slate-500">Up to 3 higher producible quantities showing how the approved unit price can reduce.</div><div className="mt-2 space-y-2">{alternativeRows.map((row: any) => <button type="button" key={row.quantity} onClick={() => { setQuantity(Number(row.quantity)); setPreview(null); }} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:bg-slate-50"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-700">{Number(row.quantity).toLocaleString()} pcs</span><span className="text-xs font-black text-slate-950">{money(row.unit_price, currency)} / pc</span></div><div className="mt-1 flex items-center justify-between gap-2 text-[11px]"><span className="text-slate-500">Order {money(row.product_total, currency)}</span>{row.saving_per_unit>0?<span className="font-black text-emerald-700">Save {money(row.saving_per_unit,currency)} / pc · {row.saving_pct.toFixed(1)}%</span>:<span className="font-bold text-slate-400">Same unit price</span>}</div></button>)}</div></div> : null}

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3"><div className="text-[10px] font-black uppercase text-blue-500">What Sales does not see</div><p className="mt-1 text-xs font-semibold text-slate-600">Raw material rates, COGS, wastage, margin/frame and internal competitor intelligence stay in Admin.</p></div>
      </aside>
    </div>
  </section>;
}

function Step({ number, title, active }: { number: string; title: string; active: boolean }) {
  return <div className={`rounded-xl border px-3 py-2 ${active ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-slate-50'}`}><div className={`text-[10px] font-black ${active ? 'text-teal-700' : 'text-slate-400'}`}>STEP {number}</div><div className="mt-0.5 text-xs font-black text-slate-800">{title}</div></div>;
}
