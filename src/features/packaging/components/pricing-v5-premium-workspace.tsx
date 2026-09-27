'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import {
  savePackagingChargeRateV5,
  savePackagingCommercialBandV5,
  savePackagingMasterRateV5,
  savePackagingSizeProfileV5,
  savePackagingConstructionLayersV5,
  setPackagingConstructionQuoteableV5,
} from '@/features/packaging/server/pricing-v5-admin-actions';
import { previewPackagingPricingV5 } from '@/features/packaging/server/pricing-v5-actions';
import { allowedPeMicronsForSupSizeV5 } from '@/lib/packaging-pricing-v5/construction-compatibility';
import type { BottomPrintModeV5 } from '@/lib/packaging-pricing-v5/types';

type View='dashboard'|'sizes'|'constructions'|'rates'|'waste';
type Props={data:any;view:View};

const input='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';
const primary='rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const secondary='rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

function money(value:unknown,currency='INR'){
  const n=Number(value??0);
  return currency+' '+(Number.isFinite(n)?n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'0.00');
}
function labelize(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());}
function kldSrc(size:any){
  if(!size) return '';
  const w=Number(size.width_mm),h=Number(size.height_mm),g=Number(size.bottom_gusset_each_mm);
  return '/kld/pricing-v5/sup/'+w+'x'+h+'-bg-'+g+'-'+g+'.svg';
}
function Card({children,className=''}:{children:ReactNode;className?:string}){return <div className={'rounded-xl border border-slate-200 bg-white shadow-sm '+className}>{children}</div>;}
function Label({children}:{children:ReactNode}){return <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">{children}</span>;}
function Info({label,value}:{label:string;value:any}){return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-sm font-black text-slate-900">{value}</div></div>;}
function Status({children,tone='green'}:{children:ReactNode;tone?:'green'|'amber'|'blue'|'slate'}){const c=tone==='green'?'bg-emerald-50 text-emerald-700':tone==='amber'?'bg-amber-50 text-amber-700':tone==='blue'?'bg-blue-50 text-blue-700':'bg-slate-100 text-slate-600';return <span className={'inline-flex rounded-full px-2.5 py-1 text-[10px] font-black '+c}>{children}</span>;}
function EditBanner({isDraft}:{isDraft:boolean}){
  return isDraft
    ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Editing working draft. Live sales pricing is unchanged until you publish.</div>
    : <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><b>Published pricing is protected.</b> Click <b>Edit Pricing</b> above to create a working copy and unlock the fields below.</div>;
}

export default function PricingV5PremiumWorkspace({data,view}:Props){
  const isDraft=data.template?.status==='draft';
  if(view==='dashboard') return <Dashboard data={data}/>;
  if(view==='sizes') return <Sizes data={data} isDraft={isDraft}/>;
  if(view==='constructions') return <Constructions data={data} isDraft={isDraft}/>;
  if(view==='rates') return <Rates data={data} isDraft={isDraft}/>;
  return <Waste data={data} isDraft={isDraft}/>;
}

function Metric({label,value,sub,tone='blue'}:{label:string;value:any;sub:string;tone?:'blue'|'amber'|'green'}){
  const c=tone==='green'?'border-emerald-200 bg-emerald-50/40':tone==='amber'?'border-amber-200 bg-amber-50/40':'border-blue-100 bg-white';
  return <div className={'rounded-xl border p-4 shadow-sm '+c}><div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{sub}</div></div>;
}

function Dashboard({data}:{data:any}){
  const sizes=(data.sizes??[]).filter((x:any)=>x.is_quoteable);
  const constructions=(data.constructions??[]).filter((x:any)=>x.is_quoteable);
  const charges=data.charges??[];
  const template=data.template;
  const [sizeId,setSizeId]=useState(sizes[0]?.id??'');
  const [constructionId,setConstructionId]=useState(constructions[0]?.id??'');
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [quantity,setQuantity]=useState(5000);
  const [zipper,setZipper]=useState(charges.some((x:any)=>x.code==='EXTRA_ZIPPER'));
  const [bottomMode,setBottomMode]=useState<BottomPrintModeV5|''>('');
  const [preview,setPreview]=useState<any>(null);
  const [error,setError]=useState('');
  const [pending,startTransition]=useTransition();
  const size=sizes.find((x:any)=>x.id===sizeId)??sizes[0];
  const construction=constructions.find((x:any)=>x.id===constructionId)??constructions[0];
  const askBottom=size?.bottom_registration_mode==='optional'&&size?.gusset_production_mode==='conditional';
  const breakdown=Object.entries(preview?.cost_breakdown?.per_unit??{});
  const currency=preview?.selling_price?.currency??template?.currency??'INR';
  const missingRates=(data.costs??[]).filter((x:any)=>x.current_rate==null).length;
  const missingCharges=(data.charges??[]).filter((x:any)=>x.current_rate==null).length;
  const bandCount=(data.bands??[]).length;

  function calculate(){
    if(!template?.id||!size?.id||!construction?.id||quantity<=0||(askBottom&&!bottomMode)) return;
    setError('');
    startTransition(async()=>{
      const response:any=await previewPackagingPricingV5({templateId:template.id,input:{
        size_profile_id:size.id,
        construction_id:construction.id,
        print,
        quantity,
        bottom_print_mode:askBottom?(bottomMode||undefined):undefined,
        selected_charge_codes:zipper?['EXTRA_ZIPPER']:[],
        kld_file_id:null,
      }});
      setPreview(response.result??null);
      if(!response.ok) setError(response.error??'Price could not be calculated.');
    });
  }

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Configured Sizes" value={sizes.length} sub="approved Stand Up Pouch sizes"/>
      <Metric label="Constructions" value={constructions.length} sub="available film structures"/>
      <Metric label="Commercial Bands" value={bandCount} sub="run-length pricing rules"/>
      <Metric label="Missing Rates" value={missingRates+missingCharges} sub="rates or charges needing attention" tone={missingRates+missingCharges?'amber':'green'}/>
      <Metric label="Current Pricing" value={template?.status==='draft'?'Draft':'Published'} sub="Pricing V5 status" tone={template?.status==='draft'?'amber':'green'}/>
    </div>

    <div className="grid gap-3 md:grid-cols-4">
      <Link href="/admin/packaging-pricing-v5/matrix" className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm transition hover:border-blue-400"><b className="text-sm text-blue-950">1. Review Prices</b><span className="mt-1 block text-xs text-blue-800">See price by size and quantity</span><span className="mt-3 block text-xs font-black text-blue-700">Open Price Matrix →</span></Link>
      <Link href="/admin/packaging-pricing-v5?view=waste" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"><b className="text-sm text-slate-950">2. Adjust Pricing</b><span className="mt-1 block text-xs text-slate-500">Change waste and margins</span><span className="mt-3 block text-xs font-black text-blue-700">Open Waste & Margins →</span></Link>
      <Link href="/admin/packaging-pricing-v5?view=rates" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"><b className="text-sm text-slate-950">3. Change Rates</b><span className="mt-1 block text-xs text-slate-500">Update material or process cost</span><span className="mt-3 block text-xs font-black text-blue-700">Open Rates & Charges →</span></Link>
      <Link href="/admin/packaging-pricing-v5?view=sizes" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"><b className="text-sm text-slate-950">4. Review Sizes</b><span className="mt-1 block text-xs text-slate-500">Check KLDs and pricing groups</span><span className="mt-3 block text-xs font-black text-blue-700">Open Sizes & KLDs →</span></Link>
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-lg font-black text-slate-950">Quick Price Preview</h2><p className="mt-1 text-sm text-slate-500">Use the live V5 pricing rules to review a selling price.</p></div>
          {size?<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><img src={kldSrc(size)} alt="" className="h-24 w-16 bg-white object-contain"/><div><b className="text-xs text-slate-900">{size.name}</b><span className="mt-1 block text-[10px] text-slate-500">PG0{size.pricing_bucket}</span></div></div>:null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label><Label>Size</Label><select className={input} value={size?.id??''} onChange={(e)=>{setSizeId(e.target.value);setPreview(null);setBottomMode('');}}>{sizes.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label><Label>Construction</Label><select className={input} value={construction?.id??''} onChange={(e)=>{setConstructionId(e.target.value);setPreview(null);}}>{constructions.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label><Label>Printing</Label><select className={input} value={print} onChange={(e)=>{setPrint(e.target.value as 'CMYK'|'CMYKW');setPreview(null);}}><option value="CMYK">Gravure (CMYK)</option><option value="CMYKW">Gravure (CMYKW)</option></select></label>
          <label><Label>Add-on</Label><span className={input+' flex items-center gap-2'}><input type="checkbox" checked={zipper} onChange={(e)=>{setZipper(e.target.checked);setPreview(null);}}/> Zipper</span></label>
          {askBottom?<label><Label>Bottom Gusset</Label><select className={input} value={bottomMode} onChange={(e)=>{setBottomMode(e.target.value as BottomPrintModeV5|'');setPreview(null);}}><option value="">Choose</option><option value="solid_unregistered">Solid / unregistered</option><option value="registered_artwork">Registered artwork</option></select></label>:<div><Label>Bottom Gusset</Label><div className={input+' flex items-center'}>{size?.gusset_production_mode==='separate'?'Separate':'Integrated'}</div></div>}
          <label><Label>Quantity (pcs)</Label><input className={input} type="number" min={1} value={quantity} onChange={(e)=>{setQuantity(Math.max(1,Number(e.target.value)));setPreview(null);}}/></label>
        </div>
        {error?<div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>:null}
        <div className="mt-5 flex justify-end"><button type="button" onClick={calculate} disabled={pending||(askBottom&&!bottomMode)} className={primary}>{pending?'Calculating…':'Calculate Price'}</button></div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-black text-slate-950">Price Breakdown</h2>
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs font-bold text-slate-500">Calculated price / piece</div><div className="mt-1 text-3xl font-black text-slate-950">{preview?.ok?money(preview.selling_price?.unit_price,currency):'—'}</div>{preview?.ok?<div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">{quantity.toLocaleString()} pcs</span><b>{money(preview.selling_price?.product_total,currency)}</b></div>:null}</div>
        {breakdown.length?<div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-right">INR/pc</th></tr></thead><tbody>{breakdown.map(([k,v]:any)=><tr key={k} className="border-t border-slate-100"><td className="px-3 py-2">{labelize(String(k))}</td><td className="px-3 py-2 text-right font-black">{money(v,currency).replace(currency+' ','')}</td></tr>)}<tr className="border-t border-emerald-200 bg-emerald-50"><td className="px-3 py-2 font-black">Final price</td><td className="px-3 py-2 text-right font-black">{money(preview.selling_price?.unit_price,currency).replace(currency+' ','')}</td></tr></tbody></table></div>:<p className="mt-4 text-sm text-slate-500">Calculate a price to see material, process, waste, margin and charge contribution.</p>}
      </Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-950">KLD Review Samples</h2><p className="mt-1 text-sm text-slate-500">Approved Stand Up Pouch size range.</p></div><Link href="/admin/packaging-pricing-v5?view=sizes" className="text-sm font-black text-blue-700">View all →</Link></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{sizes.slice(0,5).map((s:any)=><Link key={s.id} href="/admin/packaging-pricing-v5?view=sizes" className="rounded-xl border border-slate-200 bg-slate-50 p-2 transition hover:border-blue-300"><img src={kldSrc(s)} alt={s.name} className="mx-auto h-40 w-full object-contain"/><b className="mt-2 block text-center text-[11px] text-slate-900">{s.name}</b></Link>)}</div></Card>
      <Card className="p-5"><h2 className="text-lg font-black text-slate-950">Pricing Drivers</h2><p className="mt-1 text-sm text-slate-500">Changes here directly affect calculated selling prices.</p><div className="mt-4 space-y-2">{[['Material / Process Rate','All constructions using the rate'],['Waste %','Prices in the selected production band'],['Margin / Frame','Prices in the selected commercial band'],['Construction Layers','Only constructions using that recipe'],['Pricing Group','The selected pouch size']].map(([a,b])=><div key={a} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><b className="text-xs text-slate-900">{a}</b><span className="mt-1 block text-[11px] text-slate-500">{b}</span></div>)}</div></Card>
    </div>
  </div>;
}

function Sizes({data,isDraft}:{data:any;isDraft:boolean}){
  const sizes=data.sizes??[];
  const [selectedId,setSelectedId]=useState(sizes[0]?.id??'');
  const [query,setQuery]=useState('');
  const selected=sizes.find((x:any)=>x.id===selectedId)??sizes[0];
  const pe=selected?allowedPeMicronsForSupSizeV5(selected):[];
  const shown=sizes.filter((x:any)=>!query||String(x.name).toLowerCase().includes(query.toLowerCase()));

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Sizes & KLDs</h2><p className="mt-1 text-sm text-slate-500">Manage approved pouch sizes, KLD samples, pricing groups and production route.</p></div><Status tone="blue">{sizes.length} approved sizes</Status></div>
    <EditBanner isDraft={isDraft}/>
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><input className={input} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search sizes, e.g. 160 × 240"/><div className="flex items-center justify-end text-xs font-bold text-slate-500">Stand Up Pouches</div></div></Card>
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="overflow-hidden"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Approved Sizes</h3></div><div className="max-h-[760px] overflow-y-auto p-2">{shown.map((s:any)=><button key={s.id} type="button" onClick={()=>setSelectedId(s.id)} className={'mb-2 flex w-full items-center gap-3 rounded-xl border p-2 text-left transition '+(selected?.id===s.id?'border-blue-500 bg-blue-50':'border-slate-200 bg-white hover:border-slate-300')}><img src={kldSrc(s)} alt="" className="h-20 w-14 rounded-md border border-slate-200 bg-white object-contain"/><span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{s.name}</b><small className="mt-1 block text-slate-500">BG {s.bottom_gusset_each_mm}+{s.bottom_gusset_each_mm} mm · PG0{s.pricing_bucket}</small><span className="mt-2 flex gap-1"><Status tone={s.is_quoteable?'green':'slate'}>{s.is_quoteable?'Quoteable':'Internal'}</Status></span></span></button>)}</div></Card>
      {selected?<Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><img src={kldSrc(selected)} alt={selected.name} className="mx-auto h-[390px] w-full object-contain"/><div className="mt-2 text-center text-xs font-bold text-slate-500">KLD review sample</div></div>
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-2xl font-black text-slate-950">{selected.name}</h3><p className="mt-1 text-sm text-slate-500">Stand Up Pouch size configuration</p></div><Status>{selected.is_active?'Active':'Inactive'}</Status></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Width" value={selected.width_mm+' mm'}/><Info label="Height" value={selected.height_mm+' mm'}/><Info label="Bottom Gusset" value={selected.bottom_gusset_each_mm+'+'+selected.bottom_gusset_each_mm+' mm'}/><Info label="Pricing Group" value={'PG0'+selected.pricing_bucket}/></div>
            <form action={savePackagingSizeProfileV5} key={selected.id} className="mt-6 space-y-4">
              <input type="hidden" name="id" value={selected.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/>
              <div className="grid gap-4 md:grid-cols-2">
                <label><Label>Pricing Group</Label><select name="pricing_bucket" disabled={!isDraft} defaultValue={selected.pricing_bucket} className={input}>{[1,2,3,4,5].map(x=><option key={x} value={x}>PG0{x}</option>)}</select></label>
                <label><Label>Production Route</Label><select name="gusset_production_mode" disabled={!isDraft} defaultValue={selected.gusset_production_mode} className={input}><option value="integrated">Integrated gusset</option><option value="separate">Separate gusset</option><option value="conditional">Conditional</option></select></label>
                <label><Label>Bottom Registration</Label><select name="bottom_registration_mode" disabled={!isDraft} defaultValue={selected.bottom_registration_mode} className={input}><option value="not_applicable">Not applicable</option><option value="optional">Optional / ask Sales</option><option value="required_registered">Registered required</option><option value="required_unregistered">Solid / unregistered</option></select></label>
                <label><Label>Production Profile</Label><input name="production_profile_key" disabled={!isDraft} defaultValue={selected.production_profile_key??''} className={input}/></label>
                <label><Label>Recommended grams / application</Label><input name="recommended_fill_grams" disabled={!isDraft} defaultValue={(selected.metadata?.recommended_fill_grams??[]).join(', ')} placeholder="100, 250, 500" className={input}/></label>
                <label><Label>Application examples</Label><input name="application_examples" disabled={!isDraft} defaultValue={selected.metadata?.application_examples??''} placeholder="Dry fruit, snacks, spices" className={input}/></label>
              </div>
              <div><Label>Approved PE thickness</Label><div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">{[60,75,95,120].map(m=><label key={m} className="text-sm font-bold text-slate-700"><input disabled={!isDraft} name={'pe_'+m} type="checkbox" defaultChecked={pe.includes(m)} className="mr-2"/>PE {m}µ</label>)}</div></div>
              <div className="flex flex-wrap items-center gap-5"><label className="text-sm font-bold text-slate-700"><input disabled={!isDraft} type="checkbox" name="is_active" defaultChecked={selected.is_active} className="mr-2"/>Active</label><label className="text-sm font-bold text-slate-700"><input disabled={!isDraft} type="checkbox" name="is_quoteable" defaultChecked={selected.is_quoteable} className="mr-2"/>Available for quoting</label><button disabled={!isDraft} className={primary}>Save Size</button></div>
            </form>
          </div>
        </div>
      </Card>:null}
    </div>
  </div>;
}

function Constructions({data,isDraft}:{data:any;isDraft:boolean}){
  const constructions=data.constructions??[];
  const materials=(data.costs??[]).filter((x:any)=>x.item_type==='material'&&x.rate_basis==='per_kg');
  const costsById=useMemo(()=>new Map((data.costs??[]).map((x:any)=>[String(x.id),x])),[data.costs]);
  const layersByConstruction=useMemo(()=>new Map(constructions.map((c:any)=>[c.id,(data.layers??[]).filter((l:any)=>l.construction_id===c.id).sort((a:any,b:any)=>a.layer_position-b.layer_position)])),[constructions,data.layers]);
  const [selectedId,setSelectedId]=useState(constructions[0]?.id??'');
  const [query,setQuery]=useState('');
  const selected=constructions.find((x:any)=>x.id===selectedId)??constructions[0];
  const selectedLayers=(layersByConstruction.get(selected?.id)??[]) as any[];
  const sampleSize=(data.sizes??[])[0];
  const shown=constructions.filter((x:any)=>!query||String(x.name).toLowerCase().includes(query.toLowerCase())||((layersByConstruction.get(x.id)??[]) as any[]).some((l:any)=>String(costsById.get(String(l.cost_master_item_id))?.name??'').toLowerCase().includes(query.toLowerCase())));
  const foil=constructions.filter((x:any)=>/foil|metpet|silver|holo/i.test([x.name,x.finish_type,x.barrier_type].join(' '))).length;
  const matte=constructions.filter((x:any)=>/matte|matt/i.test([x.name,x.finish_type].join(' '))).length;
  const gloss=constructions.filter((x:any)=>/gloss/i.test([x.name,x.finish_type].join(' '))).length;

  return <div className="space-y-4">
    <div><h2 className="text-xl font-black text-slate-950">Constructions</h2><p className="mt-1 text-sm text-slate-500">Review and edit the film recipes that Pricing V5 uses for cost and selling price.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Configured" value={constructions.length} sub="construction recipes"/><Metric label="Foil / Metallized" value={foil} sub="configured structures"/><Metric label="Matte" value={matte} sub="finish variants"/><Metric label="Gloss" value={gloss} sub="finish variants"/></div>
    <EditBanner isDraft={isDraft}/>
    <Card className="p-4"><input className={input} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search construction or material…"/></Card>
    <div className="grid gap-4 xl:grid-cols-[410px_minmax(0,1fr)]">
      <Card className="overflow-hidden"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Construction Recipes</h3></div><div className="max-h-[760px] overflow-y-auto p-2">{shown.map((c:any)=>{const ls=(layersByConstruction.get(c.id)??[]) as any[];return <button key={c.id} type="button" onClick={()=>setSelectedId(c.id)} className={'mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition '+(selected?.id===c.id?'border-blue-500 bg-blue-50':'border-slate-200 bg-white hover:border-slate-300')}><div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{sampleSize?<img src={kldSrc(sampleSize)} alt="" className="h-full w-full bg-white object-contain opacity-90"/>:null}</div><span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{c.name}</b><small className="mt-1 line-clamp-2 block text-slate-500">{ls.map((l:any)=>costsById.get(String(l.cost_master_item_id))?.name??'').filter(Boolean).join(' / ')||'Layer stack not configured'}</small><span className="mt-2 flex gap-1"><Status tone="blue">{c.layer_count} layers</Status>{c.is_quoteable?<Status>Quoteable</Status>:null}</span></span></button>})}</div></Card>
      {selected?<Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-2xl font-black text-slate-950">{selected.name}</h3><p className="mt-1 text-sm text-slate-500">Technical layer stack used for Pricing V5 calculation.</p></div><Status tone={selected.is_quoteable?'green':'amber'}>{selected.is_quoteable?'Available for quoting':'Internal only'}</Status></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">{sampleSize?<img src={kldSrc(sampleSize)} alt="" className="mx-auto h-72 w-full object-contain"/>:null}<div className="mt-2 text-center text-xs font-bold text-slate-500">Stand Up Pouch structure</div></div>
            <div className="grid gap-2"><Info label="Layers" value={selected.layer_count}/><Info label="Finish" value={selected.finish_type||'—'}/><Info label="Barrier" value={selected.barrier_type||'—'}/></div>
          </div>
          <div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Label>Current Layer Stack</Label><div className="mt-3 space-y-2">{selectedLayers.map((l:any,idx:number)=>{const m:any=costsById.get(String(l.cost_master_item_id));return <div key={l.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{idx+1}</span><div><b className="text-sm text-slate-900">{m?.name??'Unmapped material'}</b><span className="mt-0.5 block text-xs text-slate-500">{m?.micron?m.micron+' µ':m?.gsm?m.gsm+' GSM':m?.code??''}</span></div></div>})}</div></div>
            <form action={savePackagingConstructionLayersV5} key={selected.id} className="mt-4">
              <input type="hidden" name="id" value={selected.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/>
              <Label>Edit Layer Stack</Label>
              <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4,5,6].map(pos=>{const layer=selectedLayers.find((x:any)=>Number(x.layer_position)===pos);return <label key={pos}><span className="mb-1 block text-xs font-bold text-slate-600">Layer {pos}</span><select name={'layer_'+pos} disabled={!isDraft} defaultValue={layer?.cost_master_item_id??''} className={input}><option value="">{pos<=2?'Select material':'Unused'}</option>{materials.map((m:any)=><option key={m.id} value={m.id}>{m.name}{m.micron?' · '+m.micron+'µ':m.gsm?' · '+m.gsm+' GSM':''}</option>)}</select></label>})}</div>
              <div className="mt-4 flex justify-end"><button disabled={!isDraft} className={primary}>Save Construction</button></div>
            </form>
            <form action={setPackagingConstructionQuoteableV5} className="mt-4 flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="id" value={selected.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/>
              <label className="text-sm font-bold text-slate-700"><input disabled={!isDraft} type="checkbox" name="is_active" defaultChecked={selected.is_active} className="mr-2"/>Active</label>
              <label className="text-sm font-bold text-slate-700"><input disabled={!isDraft} type="checkbox" name="is_quoteable" defaultChecked={selected.is_quoteable} className="mr-2"/>Available for quoting</label>
              <button disabled={!isDraft} className={secondary}>Save Availability</button>
            </form>
          </div>
        </div>
      </Card>:null}
    </div>
  </div>;
}

function Rates({data,isDraft}:{data:any;isDraft:boolean}){
  const materials=(data.costs??[]).filter((x:any)=>x.item_type==='material');
  const processes=(data.costs??[]).filter((x:any)=>x.item_type!=='material');
  const charges=data.charges??[];
  const missing=[...materials,...processes,...charges].filter((x:any)=>x.current_rate==null).length;
  return <div className="space-y-4">
    <div><h2 className="text-xl font-black text-slate-950">Rates & Charges</h2><p className="mt-1 text-sm text-slate-500">Update the material, process and add-on rates that directly build the selling price.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Materials" value={materials.length} sub="configured material rates"/><Metric label="Processes" value={processes.length} sub="printing and conversion"/><Metric label="Add-on Charges" value={charges.length} sub="optional price additions"/><Metric label="Missing Rates" value={missing} sub="values requiring attention" tone={missing?'amber':'green'}/></div>
    <EditBanner isDraft={isDraft}/>
    <div className="grid gap-4 xl:grid-cols-2">
      <RateTable title="Material Rates" subtitle="Film, adhesive and raw material cost" rows={materials} isDraft={isDraft} templateId={data.template?.id}/>
      <RateTable title="Process Rates" subtitle="Printing, lamination, slitting and pouch making" rows={processes} isDraft={isDraft} templateId={data.template?.id}/>
    </div>
    <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h3 className="text-sm font-black text-slate-900">Add-on Charges</h3><p className="mt-1 text-xs text-slate-500">Zipper, Spot UV, valve and other optional charges.</p></div></div><div className="grid grid-cols-[1.4fr_.7fr_.7fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-500"><span>Charge</span><span>Basis</span><span>Rate</span><span/></div>{charges.map((x:any)=><form action={savePackagingChargeRateV5} key={x.id} className="grid items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 md:grid-cols-[1.4fr_.7fr_.7fr_auto]"><input type="hidden" name="id" value={x.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/><div><b className="text-sm text-slate-900">{x.name}</b><div className="text-xs text-slate-500">{x.code}</div></div><div className="text-xs font-bold text-slate-500">{x.basis??'—'}</div><input disabled={!isDraft} name="current_rate" defaultValue={x.current_rate??''} className={input}/><button disabled={!isDraft} className={primary}>Save</button></form>)}</Card>
    <Card className="p-4"><h3 className="text-sm font-black text-slate-900">Price impact</h3><p className="mt-1 text-xs leading-5 text-slate-500">A material or process rate change affects every construction that uses that item. Add-on charge changes affect only quotes where the option is selected. Use the Price Matrix after saving to review the resulting prices before publishing.</p><Link href="/admin/packaging-pricing-v5/matrix" className="mt-3 inline-flex text-xs font-black text-blue-700">Open Price Matrix →</Link></Card>
  </div>;
}

function RateTable({title,subtitle,rows,isDraft,templateId}:{title:string;subtitle:string;rows:any[];isDraft:boolean;templateId:string}){
  return <Card className="overflow-hidden"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="grid grid-cols-[1.4fr_.7fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-500"><span>Item</span><span>Rate</span><span/></div><div className="divide-y divide-slate-100">{rows.map((x:any)=><form action={savePackagingMasterRateV5} key={x.id} className="grid items-center gap-3 px-4 py-3 md:grid-cols-[1.4fr_.7fr_auto]"><input type="hidden" name="id" value={x.id}/><input type="hidden" name="template_id" value={templateId??''}/><div><b className="text-sm text-slate-900">{x.name}</b><div className="text-xs text-slate-500">{x.micron?x.micron+'µ · ':''}{x.gsm?x.gsm+' GSM · ':''}{x.rate_basis}{x.rate_uom?' · '+x.rate_uom:''}</div></div><input disabled={!isDraft} name="current_rate" defaultValue={x.current_rate??''} className={input}/><button disabled={!isDraft} className={primary}>Save</button></form>)}</div></Card>;
}

function Waste({data,isDraft}:{data:any;isDraft:boolean}){
  const bands=data.bands??[];
  const groupCounts=[1,2,3,4,5].map(n=>bands.filter((x:any)=>Number(x.pricing_bucket)===n).length);
  return <div className="space-y-4">
    <div><h2 className="text-xl font-black text-slate-950">Waste & Margins</h2><p className="mt-1 text-sm text-slate-500">Adjust the commercial rules that move selling price by production run length.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[1,2,3,4,5].map((n,i)=><Metric key={n} label={'Pricing Group PG0'+n} value={groupCounts[i]} sub="run-length bands"/>)}</div>
    <EditBanner isDraft={isDraft}/>
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><b className="text-xs text-slate-900">Waste %</b><span className="mt-1 block text-[11px] text-slate-500">Adds production loss into calculated cost.</span></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><b className="text-xs text-slate-900">Margin / frame</b><span className="mt-1 block text-[11px] text-slate-500">Adds the commercial margin to the production frame.</span></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><b className="text-xs text-slate-900">Run length</b><span className="mt-1 block text-[11px] text-slate-500">Selects which band is used for the job.</span></div></div></Card>
    <div className="grid gap-4 xl:grid-cols-2">{[1,2,3,4,5].map(bucket=><Card key={bucket} className="overflow-hidden"><div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><div><h3 className="text-sm font-black">Pricing Group PG0{bucket}</h3><p className="mt-0.5 text-[11px] text-white/60">Waste % and margin per frame</p></div><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black">{bands.filter((b:any)=>Number(b.pricing_bucket)===bucket).length} bands</span></div><div className="grid grid-cols-[.8fr_.8fr_.9fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-500"><span>Run ≤ m</span><span>Waste %</span><span>Margin/frame</span><span/></div>{bands.filter((b:any)=>Number(b.pricing_bucket)===bucket).map((b:any)=><form action={savePackagingCommercialBandV5} key={b.id} className="grid grid-cols-[.8fr_.8fr_.9fr_auto] items-center gap-2 border-b border-slate-100 px-4 py-2 last:border-0"><input type="hidden" name="id" value={b.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/><b className="text-sm text-slate-900">{Number(b.run_length_max_m).toLocaleString()}</b><input disabled={!isDraft} name="wastage_pct" defaultValue={b.wastage_pct} className={input}/><input disabled={!isDraft} name="margin_per_frame" defaultValue={b.margin_per_frame} className={input}/><button disabled={!isDraft} className={primary}>Save</button></form>)}</Card>)}</div>
    <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Review the impact before publishing</h3><p className="mt-1 text-xs text-slate-500">After adjusting waste or margin, open the Price Matrix and compare the resulting selling prices across quantity bands.</p></div><Link href="/admin/packaging-pricing-v5/matrix" className={secondary}>Open Price Matrix</Link></div></Card>
  </div>;
}
