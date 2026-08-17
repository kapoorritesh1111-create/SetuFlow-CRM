'use client';

import { useEffect, useMemo, useState } from 'react';
import { previewPackagingPricingV4 } from '@/features/packaging/server/pricing-v4-actions';

const FIELD='rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900';
const CONSTRUCTION_LABELS:Record<string,string>={glossy_foil:'Glossy + Foil',matte_foil:'Matte + Foil',glossy_clear_window:'Glossy Clear Window',matte_frosted_window:'Matte Frosted Window'};
function money(value:unknown,currency='INR',digits=2){const amount=Number(value??0);return `${currency==='INR'?'₹':currency+' '}${Number.isFinite(amount)?amount.toLocaleString(undefined,{minimumFractionDigits:digits,maximumFractionDigits:digits}):'0.00'}`;}
function n(value:unknown){const parsed=Number(value??0);return Number.isFinite(parsed)?parsed:0;}
function nice(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,(c)=>c.toUpperCase());}

export default function PricingV4LivePreview({template,variations,recipes,charges,matrixRows}:{template:any;variations:any[];recipes:any[];charges:any[];matrixRows:any[]}){
  const isSup=template.calculation_engine_key==='sup_formula';
  const familyVariations=useMemo(()=>variations.filter((row:any)=>String(row.family_id)===String(template.family_id)&&row.approval_state==='approved'&&row.is_active),[variations,template.family_id]);
  const templateRows=useMemo(()=>matrixRows.filter((row:any)=>String(row.template_id)===String(template.id)),[matrixRows,template.id]);
  const constructions=useMemo(()=>[...new Set(recipes.filter((row:any)=>String(row.template_id)===String(template.id)&&row.construction_key!=='*').map((row:any)=>String(row.construction_key)))],[recipes,template.id]);
  const readyCharges=charges.filter((row:any)=>row.current_rate!=null&&row.basis&&row.application_stage);
  const defaults=template.quote_config_json?.default_dimensions??{};
  const labels=template.quote_config_json?.dimension_labels??{};

  const [variationId,setVariationId]=useState('');
  const [construction,setConstruction]=useState('');
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [quantity,setQuantity]=useState(5000);
  const [selectedCharges,setSelectedCharges]=useState<string[]>([]);
  const [matrixRowId,setMatrixRowId]=useState('');
  const [matrixWidth,setMatrixWidth]=useState(100);
  const [matrixHeight,setMatrixHeight]=useState(140);
  const [tier,setTier]=useState('Q1');
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    setVariationId(familyVariations[0]?.id??'');
    setConstruction(constructions[0]??'matte_foil');
    setMatrixRowId(templateRows[0]?.id??'');
    setMatrixWidth(Number(defaults.width_mm??100));
    setMatrixHeight(Number(defaults.height_mm??140));
    setTier('Q1');
    setSelectedCharges([]);
    setResult(null);
    setError('');
  },[template.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMatrix=templateRows.find((row:any)=>String(row.id)===matrixRowId)??templateRows[0]??null;
  const selectedVariation=familyVariations.find((row:any)=>String(row.id)===variationId)??familyVariations[0]??null;

  useEffect(()=>{
    let cancelled=false;
    const timer=setTimeout(async()=>{
      if(isSup&&(!selectedVariation||!construction))return;
      if(!isSup&&(!selectedMatrix||matrixWidth<=0||matrixHeight<=0))return;
      setLoading(true);setError('');
      const input:any=isSup?{
        product_variation_id:selectedVariation.id,
        construction_key:construction,
        print,
        quantity:Math.max(1,quantity),
        selected_charge_codes:selectedCharges,
      }:{
        width_mm:matrixWidth,
        height_mm:matrixHeight,
        supply_form:selectedMatrix.supply_form,
        client_product_id:selectedMatrix.client_product_id,
        tier,
        selected_charge_codes:selectedCharges,
      };
      const response:any=await previewPackagingPricingV4({templateId:template.id,input});
      if(cancelled)return;
      setResult(response.result??null);
      setError(response.ok?'':response.error??'Pricing calculation needs attention.');
      setLoading(false);
    },250);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[template.id,isSup,selectedVariation?.id,selectedMatrix?.id,construction,print,quantity,matrixWidth,matrixHeight,tier,selectedCharges.join('|')]);

  const currency=result?.selling_price?.currency??template.currency??'INR';
  const cost=result?.cost_build;
  const commercial=result?.commercial_rules??{};
  const production=result?.production_calculation??{};
  const priceBreaks=Array.isArray(production.price_breaks)?production.price_breaks:[];
  const selectedBreak=priceBreaks.find((row:any)=>row.tier===tier)??priceBreaks[0]??null;
  const valid=Boolean(result?.ok);
  const displayQuantity=isSup?Math.max(1,quantity):Number(result?.customer_requirement?.quantity??selectedBreak?.quantity??0);
  const configurationSummary=isSup
    ? [selectedVariation?.capacity_label||selectedVariation?.name,selectedVariation?.dimension_label,CONSTRUCTION_LABELS[construction]??nice(construction),print].filter(Boolean).join(' · ')
    : [`${matrixWidth} × ${matrixHeight} mm`,selectedMatrix?.construction_key,tier].filter(Boolean).join(' · ');

  return <aside className="space-y-3 xl:sticky xl:top-[92px] xl:max-h-[calc(100vh-110px)] xl:overflow-y-auto xl:pr-1">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Live Price Preview</div><div className={`mt-1 text-xs font-bold ${valid?'text-emerald-700':error?'text-amber-700':'text-slate-500'}`}>{loading?'Calculating…':valid?'● Calculation valid':error?'▲ Needs attention':'Choose test inputs'}</div></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Updates automatically</span></div>
      <div className="space-y-3 p-4">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Test configuration</div>
        {isSup?<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Size<select value={variationId} onChange={e=>setVariationId(e.target.value)} className={`${FIELD} mt-1 w-full`}>{familyVariations.map((row:any)=><option key={row.id} value={row.id}>{row.capacity_label||row.name} · {row.dimension_label}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Construction<select value={construction} onChange={e=>setConstruction(e.target.value)} className={`${FIELD} mt-1 w-full`}>{constructions.map(key=><option key={key} value={key}>{CONSTRUCTION_LABELS[key]??nice(key)}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Printing<select value={print} onChange={e=>setPrint(e.target.value as any)} className={`${FIELD} mt-1 w-full`}><option value="CMYK">CMYK</option><option value="CMYKW">CMYKW</option></select></label><label className="text-xs font-semibold text-slate-600">Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Number(e.target.value)||1)} className={`${FIELD} mt-1 w-full`}/></label></div>:
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><label className="text-xs font-semibold text-slate-600">{labels.width||'Width'} (mm)<input type="number" min="1" value={matrixWidth} onChange={e=>setMatrixWidth(Math.max(1,Number(e.target.value)||1))} className={`${FIELD} mt-1 w-full`}/></label><label className="text-xs font-semibold text-slate-600">{labels.height||'Height'} (mm)<input type="number" min="1" value={matrixHeight} onChange={e=>setMatrixHeight(Math.max(1,Number(e.target.value)||1))} className={`${FIELD} mt-1 w-full`}/></label></div>
          <label className="block text-xs font-semibold text-slate-600">Construction<select value={matrixRowId} onChange={e=>setMatrixRowId(e.target.value)} className={`${FIELD} mt-1 w-full`}>{templateRows.map((row:any)=><option key={row.id} value={row.id}>{row.construction_key} · {row.client_product_id}</option>)}</select></label>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-800">Dimensions come from the client costing form. The construction above selects the Q1–Q5 frame rates from <strong>{selectedMatrix?.source_worksheet??'the feeding sheet'}</strong>. SETU does not rotate the pouch or interpolate between price breaks.</div>
        </div>}
        {readyCharges.length?<details className="rounded-xl border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">Test extras / charges ({selectedCharges.length} selected)</summary><div className="mt-2 grid gap-2">{readyCharges.map((charge:any)=><label key={charge.code} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={selectedCharges.includes(charge.code)} onChange={e=>setSelectedCharges(current=>e.target.checked?[...current,charge.code]:current.filter(code=>code!==charge.code))}/><span>{charge.name}</span></label>)}</div></details>:null}
        {error?<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">{error}</div>:null}
      </div>
    </section>

    {result?<>
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-lg">
        <div className="border-b border-white/10 px-4 py-3"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">Quote Price</div><div className="mt-1 truncate text-xs font-semibold text-slate-300" title={configurationSummary}>{configurationSummary}</div></div>
        <div className="p-4"><div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Price Per Pouch</div><div className="mt-1 text-4xl font-black tabular-nums text-white">{money(result.selling_price?.unit_price,currency,4)}</div><div className="mt-1 text-xs font-semibold text-slate-400">{displayQuantity.toLocaleString()} pouches · {isSup?'live server-calculated selling price':`${tier} client workbook price break`}</div>
          <div className="mt-4 grid grid-cols-2 gap-2"><DarkValue label="Product total" value={money(result.selling_price?.product_total,currency)}/><DarkValue label={`GST (${result.selling_price?.gst_pct??0}%)`} value={money(result.selling_price?.gst,currency)}/></div>
          <div className="mt-3 rounded-xl border border-teal-300/30 bg-teal-300/10 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-teal-300">Total before freight</div><div className="mt-1 text-xl font-black tabular-nums text-white">{money(result.selling_price?.grand_total_before_freight,currency)}</div></div>
        </div>
      </section>

      {!isSup&&priceBreaks.length?<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Client Price Breaks</div><div className="mt-1 text-xs text-slate-500">Quantity changes automatically from pieces/frame × approved frame break.</div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">No interpolation</span></div><div className="mt-3 space-y-2">{priceBreaks.map((row:any)=><button key={row.tier} type="button" onClick={()=>setTier(row.tier)} className={`grid w-full grid-cols-[42px_1fr_auto] items-center gap-2 rounded-xl border px-3 py-2 text-left ${tier===row.tier?'border-teal-400 bg-teal-50':'border-slate-200 bg-white hover:bg-slate-50'}`}><span className="text-xs font-black text-slate-700">{row.tier}</span><span><span className="block text-sm font-black text-slate-900">{Number(row.quantity).toLocaleString()} pcs</span><span className="block text-[10px] font-semibold text-slate-400">{Number(row.frame_quantity).toLocaleString()} frames</span></span><span className="text-sm font-black tabular-nums text-slate-950">{money(row.unit_price,currency,4)}</span></button>)}</div></section>:null}

      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"><div><div className="text-xs font-black text-slate-800">Production & cost breakdown</div><div className="mt-0.5 text-[11px] text-slate-500">Open when you need to audit how the pouch price was built.</div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Details ↓</span></summary>
        <div className="space-y-3 border-t border-slate-200 p-3">
          <section className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Production</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Value label={isSup?'Pouches / frame':'Pieces / frame'} value={production.pouches_per_frame??production.units_per_frame??'—'}/>{isSup?<Value label="Run length" value={production.run_length_m!=null?`${n(production.run_length_m).toLocaleString(undefined,{maximumFractionDigits:2})} m`:'—'}/>:<Value label="Frames" value={production.frames_exact??'—'}/>}<Value label="Across" value={production.across??production.lanes_across??'—'}/><Value label="Along" value={production.along??'—'}/>{production.open_laminate_width_mm!=null?<Value label="Open laminate" value={`${production.open_laminate_width_mm} mm`}/>:null}{production.repeat_length_mm!=null?<Value label="Repeat" value={`${production.repeat_length_mm} mm`}/>:null}</div></section>
          {cost?<section className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cost build <span className="normal-case text-slate-400">(Admin only · per frame)</span></div><CostGroup title="Materials" rows={cost.materials} currency={currency}/><CostGroup title="Production" rows={cost.processes} currency={currency}/>{cost.production_extras?.length?<CostGroup title="Before-commercial extras" rows={cost.production_extras} currency={currency}/>:null}<div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs"><Line label="Material total" value={money(cost.material_total_per_frame,currency,4)}/><Line label="Process total" value={money(cost.process_total_per_frame,currency,4)}/><Line label="COGS before waste / margin" value={money(cost.pre_commercial_cogs_per_frame,currency,4)} strong/></div></section>:null}
          {!isSup?<section className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Workbook source</div><div className="mt-2 space-y-1"><Line label="Product ID" value={selectedMatrix?.client_product_id??'—'}/><Line label="Feeding sheet" value={commercial.source_worksheet??'—'}/><Line label="Source row" value={commercial.source_row_number?String(commercial.source_row_number):'—'}/><Line label="Selected frame rate" value={commercial.selected_frame_rate!=null?money(commercial.selected_frame_rate,currency):'—'} strong/></div></section>:<section className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Commercial</div><div className="mt-3 space-y-1 text-xs"><Line label="Wastage" value={commercial.wastage_pct!=null?`${commercial.wastage_pct}%`:'—'}/><Line label="Margin / frame" value={commercial.margin_per_frame!=null?money(commercial.margin_per_frame,currency):'—'}/>{commercial.selling_per_frame!=null?<Line label="Selling / frame" value={money(commercial.selling_per_frame,currency,4)} strong/>:null}</div></section>}
          {result.separate_charges?.length?<section className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Separate charges</div><div className="mt-2 space-y-1">{result.separate_charges.map((row:any)=><Line key={row.code} label={row.name} value={money(row.amount,currency)}/>)}</div></section>:null}
        </div>
      </details>
    </>:null}
  </aside>;
}

function DarkValue({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white/5 p-2.5"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 text-sm font-black tabular-nums text-white">{value}</div></div>;}
function Value({label,value}:{label:string;value:any}){return <div className="rounded-lg bg-slate-50 p-2"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 font-semibold text-slate-900">{String(value)}</div></div>;}
function Line({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className="flex items-baseline justify-between gap-3 text-xs"><span className={strong?'font-bold text-slate-800':'text-slate-500'}>{label}</span><span className={`${strong?'font-black text-slate-950':'font-semibold text-slate-700'} tabular-nums text-right`}>{value}</span></div>;}
function CostGroup({title,rows,currency}:{title:string;rows:any[];currency:string}){if(!rows?.length)return null;return <div className="mt-3"><div className="mb-1 text-[10px] font-bold uppercase text-slate-400">{title}</div><div className="space-y-1">{rows.map((row:any)=><Line key={`${row.code}-${row.master_id}`} label={row.name} value={money(row.amount_per_frame,currency,4)}/>)}</div></div>;}
