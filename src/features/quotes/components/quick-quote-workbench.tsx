'use client';

import { useMemo, useState, useTransition } from 'react';
import { findQuickQuoteCustomer, listQuickQuoteEstimates, saveQuickQuoteEstimate } from '@/features/quotes/server/quick-quote-estimate-actions';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';
import { previewPackagingFramePricingV5 } from '@/features/packaging/server/pricing-v5-frame-actions';

type Result = { quantity:number; unit:number; total:number; currency:string; weight:number|null; perKg:number|null };
type Props = { sup:any; frame:any; manualFamilies:any[] };
const LADDER=[1000,2000,3000,5000,10000,20000,30000,50000];
const money=(n:number,c='INR')=>new Intl.NumberFormat('en-IN',{style:'currency',currency:c,maximumFractionDigits:2}).format(n);

export default function QuickQuoteWorkbench({sup,frame,manualFamilies}:Props){
  const [mode,setMode]=useState('');
  const [templateId,setTemplateId]=useState('');
  const [sizeId,setSizeId]=useState('');
  const [custom,setCustom]=useState(false);
  const [width,setWidth]=useState('150'),[height,setHeight]=useState('220'),[gusset,setGusset]=useState('50');
  const [constructionId,setConstructionId]=useState('');
  const [qty,setQty]=useState('5000');
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [bottom,setBottom]=useState<'solid_unregistered'|'registered_artwork'>('solid_unregistered');
  const [extras,setExtras]=useState<string[]>([]);
  const [rows,setRows]=useState<Result[]>([]);
  const [selected,setSelected]=useState(0);
  const [error,setError]=useState('');
  const [pending,start]=useTransition();
  const [manualPrice,setManualPrice]=useState('');
  const [customerTerm,setCustomerTerm]=useState('');
  const [customerMatches,setCustomerMatches]=useState<any[]>([]);
  const [customerLookupError,setCustomerLookupError]=useState('');
  const [selectedLeadId,setSelectedLeadId]=useState('');
  const [draftId,setDraftId]=useState('');
  const [draftLabel,setDraftLabel]=useState('Call estimate');
  const [draftStatus,setDraftStatus]=useState('');
  const [savedDrafts,setSavedDrafts]=useState<any[]>([]);
  const [basket,setBasket]=useState<any[]>([]);

  const all=[...(sup?.families??[]).map((f:any)=>({id:'sup:'+f.id,label:f.name,kind:'sup',templateId:sup.templates?.[0]?.id})),
    ...(frame?.templates??[]).map((t:any)=>({id:'frame:'+t.id,label:t.supply_label??t.name,kind:'frame',templateId:t.id})),
    ...manualFamilies.map((f:any)=>({id:'manual:'+f.id,label:f.name,kind:'manual',templateId:''}))];
  const chosen=all.find(f=>f.id===mode)??null;
  const frameTemplate=(frame?.templates??[]).find((t:any)=>String(t.id)===String(templateId))??null;
  const sizes=sup?.sizes??[];
  const size=sizes.find((s:any)=>String(s.id)===sizeId)??sizes[0];
  const constructions=chosen?.kind==='frame'?frameTemplate?.constructions??[]:(sup?.constructions??[]).filter((c:any)=>{
    if(custom)return true;
    const allowed=size?.allowed_pe_microns??[];
    return allowed.includes(Number(c.pe_micron));
  });
  const construction=constructions.find((c:any)=>String(c.id)===constructionId)??constructions[0];
  const rules=size?.quantity_rules??{};
  const quantities=useMemo(()=>{
    const input=Math.floor(Number(qty));
    const candidates=chosen?.kind==='sup' && !custom && rules.allowed_quantities?.length
      ? rules.allowed_quantities.map(Number):LADDER;
    return [...new Set([...candidates,input])].filter(n=>Number.isInteger(n)&&n>0
      &&(chosen?.kind!=='sup'||custom||(!rules.allowed_quantities?.length||rules.allowed_quantities.map(Number).includes(n)))
      &&(chosen?.kind!=='sup'||custom||!rules.blocked_quantities?.map(Number).includes(n)))
      .sort((a,b)=>a-b);
  },[qty,mode,custom,JSON.stringify(rules)]);
  function choose(id:string){
    const option=all.find(o=>o.id===id);
    setMode(id);setTemplateId(option?.templateId??'');setSizeId(sizes[0]?.id??'');
    setConstructionId('');setCustom(false);setRows([]);setSelected(0);setError('');setExtras([]);
  }
  function calculate(){
    setError('');setRows([]);
    if(!chosen)return setError('Choose a service family.');
    if(chosen.kind==='manual')return setError('This family uses manual pricing. Enter an approved unit price instead.');
    if(!construction?.id)return setError('Choose an available construction.');
    if(!quantities.includes(Number(qty)))return setError('Requested quantity is not permitted for this size.');
    if(!Number(width)||!Number(height)||Number(width)<=0||Number(height)<=0)return setError('Dimensions must be greater than zero.');
    start(async()=>{
      const found:Result[]=[];
      for(const n of quantities){
        const response:any=chosen.kind==='sup'
          ?await previewPackagingPricingV5({templateId,input:{
            size_profile_id:size?.id,custom_size:custom?{width_mm:Number(width),height_mm:Number(height),bottom_gusset_each_mm:Number(gusset)}:null,
            construction_id:construction.id,print,quantity:n,bottom_print_mode:bottom,selected_charge_codes:extras,
          }})
          :await previewPackagingFramePricingV5({templateId,input:{
            supply_form:frameTemplate?.supply_form,width_mm:Number(width),height_mm:Number(height),
            construction_id:construction.id,print,quantity:n,commercial_bucket:null,selected_charge_codes:extras,
          }});
        if(response.ok&&response.result?.selling_price){
          const r=response.result;
          found.push({quantity:n,unit:Number(r.selling_price.unit_price),total:Number(r.selling_price.product_total),
            currency:String(r.selling_price.currency??'INR'),weight:r.roll_weight?.finished_weight_kg??null,perKg:r.roll_weight?.price_per_kg??null});
        }
      }
      setRows(found);setSelected(found.findIndex(r=>r.quantity===Number(qty))>=0?Number(qty):found[0]?.quantity??0);
      if(!found.length)setError('No valid prices returned for these specifications. Check MOQ and published construction rules.');
    });
  }
  function addLine(){
    if(!chosen)return;
    const r=chosen.kind==='manual'
      ?{quantity:Number(qty),unit:Number(manualPrice),total:Number(qty)*Number(manualPrice),currency:'INR'}
      :rows.find(r=>r.quantity===selected);
    if(!r||!(r.unit>0)||!(r.quantity>0))return setError('Calculate or enter an approved price first.');
    const input=chosen.kind==='sup'?{size_profile_id:size?.id,custom_size:custom?{width_mm:Number(width),height_mm:Number(height),bottom_gusset_each_mm:Number(gusset)}:null,construction_id:construction?.id,print,quantity:r.quantity,bottom_print_mode:bottom,selected_charge_codes:extras}:chosen.kind==='frame'?{supply_form:frameTemplate?.supply_form,width_mm:Number(width),height_mm:Number(height),construction_id:construction?.id,print,quantity:r.quantity,commercial_bucket:null,selected_charge_codes:extras}:null;
    setBasket(b=>[...b,{name:chosen.label,quantity:r.quantity,price:r.unit,currency:r.currency,engine:chosen.kind,templateId:templateId||null,familyId:chosen.id.split(':')[1],input,notes:chosen.kind==='sup'
      ?(custom?`Custom ${width} x ${height} mm`:`Size ${size?.name??''}`)+` · ${construction?.name??''}`
      :chosen.kind==='frame'?`${width} x ${height} mm · ${construction?.name??''}`:'Manual price · requires formal quote approval'}]);
    setRows([]);setError('');
  }
  function lookupCustomers(){
    setCustomerLookupError('');setCustomerMatches([]);setSelectedLeadId('');
    start(async()=>{
      const response=await findQuickQuoteCustomer(customerTerm);
      if(!response.ok){setCustomerLookupError(response.error??'Unable to search customers.');return;}
      setCustomerMatches(response.customers??[]);
      if(!response.customers?.length)setCustomerLookupError('No matching existing buyer leads.');
    });
  }
  function saveDraft(){
    setDraftStatus('');
    start(async()=>{
      const result=await saveQuickQuoteEstimate({id:draftId||undefined,items:basket,label:draftLabel});
      if(!result.ok){setDraftStatus(result.error??'Save failed.');return;}
      setDraftId(result.id??'');setDraftStatus('Internal estimate saved securely.');
    });
  }
  function loadDrafts(){
    setDraftStatus('');
    start(async()=>{
      const result=await listQuickQuoteEstimates();
      if(!result.ok){setDraftStatus(result.error??'Could not load drafts.');return;}
      setSavedDrafts(result.estimates);
      if(!result.estimates.length)setDraftStatus('No saved estimates found.');
    });
  }
  const field='min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">1. Choose product or service</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {all.map(f=><button key={f.id} onClick={()=>choose(f.id)} className={'min-h-12 rounded-xl border px-3 py-3 text-left text-sm font-semibold '+(mode===f.id?'border-blue-700 bg-blue-50 text-blue-900':'border-slate-200 bg-slate-50 text-slate-800')}>{f.label}</button>)}
      </div>
      {!all.length?<p className="mt-3 text-sm text-amber-700">No published, quotable pricing/service families are available for this workspace.</p>:null}
    </section>
    {chosen?<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">2. Configure specifications</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {chosen.kind==='sup'?<label className="text-sm font-medium">Size<select className={field} value={size?.id??''} onChange={e=>{setSizeId(e.target.value);setRows([]);setConstructionId('')}}>{sizes.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}
        {chosen.kind==='sup'?<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={custom} onChange={e=>{setCustom(e.target.checked);setRows([])}}/>Custom size</label>:null}
        {(chosen.kind!=='sup'||custom)?<>
          <label className="text-sm">Width (mm)<input className={field} inputMode="decimal" value={width} onChange={e=>setWidth(e.target.value)}/></label>
          <label className="text-sm">Height (mm)<input className={field} inputMode="decimal" value={height} onChange={e=>setHeight(e.target.value)}/></label>
          {chosen.kind==='sup'?<label className="text-sm">Bottom gusset each (mm)<input className={field} inputMode="decimal" value={gusset} onChange={e=>setGusset(e.target.value)}/></label>:null}
        </>:null}
        {chosen.kind!=='manual'?<>
          <label className="text-sm">Construction<select className={field} value={construction?.id??''} onChange={e=>{setConstructionId(e.target.value);setRows([])}}>{constructions.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-sm">Print<select className={field} value={print} onChange={e=>setPrint(e.target.value as any)}><option value="CMYK">CMYK</option><option value="CMYKW">CMYK + White</option></select></label>
          {chosen.kind==='sup'?<label className="text-sm">Bottom print<select className={field} value={bottom} onChange={e=>setBottom(e.target.value as any)}><option value="solid_unregistered">Solid / unregistered</option><option value="registered_artwork">Registered / artwork</option></select></label>:null}
          <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Add-ons (optional)</p>{(chosen.kind==='sup'?sup?.charges: [{code:'EXTRA_ZIPPER',name:'Zipper'}])?.filter((x:any)=>x.pricing_mode!=='manual').map((x:any)=><label key={x.code} className="mr-4 inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={extras.includes(x.code)} onChange={e=>{setExtras(v=>e.target.checked?[...v,x.code]:v.filter(c=>c!==x.code));setRows([])}}/>{x.name}</label>)}</div>
        </>:null}
        <label className="text-sm">Requested quantity (pcs)<input className={field} inputMode="numeric" value={qty} onChange={e=>{setQty(e.target.value);setRows([])}}/></label>
        {chosen.kind==='manual'?<label className="text-sm">Approved unit price (INR)<input className={field} inputMode="decimal" value={manualPrice} onChange={e=>setManualPrice(e.target.value)}/></label>:null}
      </div>
      <button disabled={pending} onClick={chosen.kind==='manual'?addLine:calculate} className="mt-4 min-h-12 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50">{pending?'Calculating valid quantities…':chosen.kind==='manual'?'Add Manual Estimate':'Calculate All Valid Prices'}</button>
      {error?<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
    </section>:null}
    {rows.length>0?<section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold">3. Compare all valid quantity prices</h2>
      <p className="mb-3 text-xs text-slate-600">Only valid engine-calculated quantity breaks appear. Select the price to discuss on the call.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="border-b text-left"><th className="p-2">Qty</th><th className="p-2">Unit price</th><th className="p-2">Total</th><th className="p-2">Per kg (if available)</th><th className="p-2">Pick</th></tr></thead><tbody>{rows.map(r=><tr key={r.quantity} className={'border-b '+(selected===r.quantity?'bg-blue-50 text-blue-900':'')}><td className="p-2 font-semibold">{r.quantity.toLocaleString('en-IN')}{r.quantity===Number(qty)?' · Requested':''}</td><td className="p-2">{money(r.unit,r.currency)}</td><td className="p-2">{money(r.total,r.currency)}</td><td className="p-2">{r.perKg?money(r.perKg,r.currency):'—'}</td><td className="p-2"><input aria-label={'Select '+r.quantity} type="radio" checked={selected===r.quantity} onChange={()=>setSelected(r.quantity)}/></td></tr>)}</tbody></table></div>
      <button onClick={addLine} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white">Add Selected Price to Internal Basket</button>
    </section>:null}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-bold">4. Internal estimate basket ({basket.length})</h2>
      {basket.length?basket.map((b,i)=><div key={i} className="my-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="text-sm"><strong>{b.name}</strong><p>{b.notes}</p><p>{b.quantity.toLocaleString('en-IN')} × {money(b.price,b.currency)}</p></div><button onClick={()=>setBasket(v=>v.filter((_,n)=>i!==n))} className="min-h-11 rounded-lg border px-3 text-sm">Remove</button></div>):<p className="mt-2 text-sm text-slate-500">Add a priced product to begin. No lead or formal quote has been created.</p>}
      {basket.length?<p className="mt-3 text-sm font-bold">Total internal estimate: {money(basket.reduce((s,r)=>s+r.quantity*r.price,0))}</p>:null}
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-3">
        <label className="block text-sm">Internal estimate name<input className={field} value={draftLabel} maxLength={100} onChange={e=>setDraftLabel(e.target.value)}/></label>
        <div className="grid grid-cols-2 gap-2"><button disabled={pending||!basket.length} onClick={saveDraft} className="min-h-12 rounded-xl bg-blue-700 px-3 font-bold text-white disabled:opacity-50">Save Estimate</button><button disabled={pending} onClick={loadDrafts} className="min-h-12 rounded-xl border px-3 text-sm font-semibold">Resume Estimate</button></div>
        {draftStatus?<p role="status" className="text-sm">{draftStatus}</p>:null}
        {savedDrafts.length?<div className="space-y-2">{savedDrafts.map(d=><button key={d.id} onClick={()=>{setDraftId(d.id);setDraftLabel(d.label);setBasket(d.items);setSavedDrafts([]);setRows([]);setDraftStatus('Saved estimate loaded.')}} className="block min-h-12 w-full rounded-xl border p-3 text-left text-sm">{d.label} · {new Date(d.updated_at).toLocaleString()}</button>)}</div>:null}
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <h3 className="mb-1 text-base font-bold">5. Find existing buyer (formal quote preparation)</h3>
        <p className="mb-3 text-xs text-slate-600">Search existing buyer leads in this workspace. Conversion is still disabled while the quote transaction is being built.</p>
        <label className="block text-sm">Company, email or phone<input className={field} value={customerTerm} onChange={e=>{setCustomerTerm(e.target.value);setSelectedLeadId('')}} placeholder="At least 3 characters"/></label>
        <button disabled={pending||customerTerm.trim().length<3} onClick={lookupCustomers} className="mt-2 min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50">Find Customer</button>
        {customerLookupError?<p role="status" className="mt-2 text-sm text-amber-800">{customerLookupError}</p>:null}
        <div className="mt-2 space-y-2">{customerMatches.map(c=><label key={c.id} className="flex min-h-12 items-center gap-3 rounded-lg border p-3 text-sm"><input type="radio" name="customer" checked={selectedLeadId===c.id} onChange={()=>setSelectedLeadId(c.id)}/><span><strong>{c.company_name}</strong><span className="block text-xs">{c.contact_name??''} · {c.phone??c.email??''}</span></span></label>)}</div>
        {selectedLeadId?<p className="mt-2 text-xs text-emerald-800">Existing lead selected. No changes to this lead have been made.</p>:null}
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Formalization and sending are intentionally disabled here until secure estimate persistence, lead selection, and atomic conversion are implemented and verified. Use the existing lead quote builder to issue formal quotations.</p>
    </section>
  </div>;
}
