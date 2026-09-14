'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  createPackagingConstructionV5,
  publishPackagingTemplateV5,
  savePackagingCommercialBandV5,
  savePackagingMasterRateV5,
  savePackagingSizeProfileV5,
  setPackagingConstructionQuoteableV5,
} from '@/features/packaging/server/pricing-v5-admin-actions';

type Props={
  data:{
    template:any|null;
    sizes:any[];
    constructions:any[];
    layers:any[];
    costs:any[];
    bands:any[];
    featureFlag:any|null;
  };
};

const tabs=['Overview','Sizes & Routes','Constructions','Materials & Processes','Commercial Buckets'] as const;
const input='rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';
const btn='inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300';

function Pill({children,tone='slate'}:{children:ReactNode;tone?:'slate'|'green'|'amber'|'blue'}){
  const styles=tone==='green'?'border-emerald-200 bg-emerald-50 text-emerald-700':tone==='amber'?'border-amber-200 bg-amber-50 text-amber-700':tone==='blue'?'border-cyan-200 bg-cyan-50 text-cyan-700':'border-slate-200 bg-slate-50 text-slate-600';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-extrabold ${styles}`}>{children}</span>;
}

export default function PricingV5AdminWorkspace({data}:Props){
  const [tab,setTab]=useState<(typeof tabs)[number]>('Overview');
  const isDraft=data.template?.status==='draft';
  const quoteableSizes=data.sizes.filter((item)=>item.is_quoteable).length;
  const quoteableConstructions=data.constructions.filter((item)=>item.is_quoteable).length;
  const missingRates=data.costs.filter((item)=>item.current_rate==null).length;
  const materialCosts=data.costs.filter((item)=>item.item_type==='material'&&item.rate_basis==='per_kg');
  const layersByConstruction=useMemo(()=>new Map(data.constructions.map((construction)=>[
    construction.id,data.layers.filter((layer)=>layer.construction_id===construction.id).sort((a,b)=>a.layer_position-b.layer_position),
  ])),[data.constructions,data.layers]);
  const costsById=useMemo(()=>new Map(data.costs.map((cost)=>[cost.id,cost])),[data.costs]);

  return <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">Pricing v5 · isolated from v4</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">Workbook-backed SUP pricing</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">20 approved workbook sizes, dynamic construction recipes, five run-length commercial buckets and split-gusset production rules.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Pill tone={data.template?.status==='published'?'green':'amber'}>{data.template?.status??'No template'}</Pill>
          <Pill tone={data.featureFlag?.enabled?'green':'slate'}>{data.featureFlag?.enabled?'Flag enabled':'Flag disabled'}</Pill>
          <Pill tone="blue">Engine v5</Pill>
        </div>
      </div>
      {!isDraft&&data.template&&<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Published Pricing v5 is locked against structural and rate edits. A future revision must be created as a new draft before further changes.</div>}
      <div className="mt-4 flex gap-1 overflow-x-auto border-t border-slate-100 pt-3">
        {tabs.map((item)=><button key={item} onClick={()=>setTab(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-extrabold ${tab===item?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-100'}`}>{item}</button>)}
      </div>
    </div>

    {tab==='Overview'&&<div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Workbook sizes',`${data.sizes.length} / 20`,data.sizes.length===20],
          ['Constructions',`${data.constructions.length} / 44+`,data.constructions.length>=44],
          ['Quoteable sizes',String(quoteableSizes),quoteableSizes>0],
          ['Missing v5 rates',String(missingRates),missingRates===0],
        ].map(([label,value,ok])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p><div className="mt-2"><Pill tone={ok?'green':'amber'}>{ok?'Ready':'Needs attention'}</Pill></div></div>)}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-black text-slate-950">Safe rollout state</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <p>• Existing v4 pricing engine, rates and quote routing remain unchanged.</p>
          <p>• Pricing v5 feature flag remains independent from template publish state.</p>
          <p>• Publish validation requires 20 active workbook sizes, 44+ constructions and exact bucket schedules.</p>
          <p>• Published v5 configuration is immutable until revision cloning is available.</p>
        </div>
        {data.template&&isDraft&&<form action={publishPackagingTemplateV5} className="mt-4 border-t border-slate-100 pt-4">
          <input type="hidden" name="template_id" value={data.template.id}/>
          <button className={btn} type="submit">Validate & publish v5 template</button>
          <p className="mt-2 text-xs text-slate-400">Publishing the template does not enable the v5 Sales feature flag.</p>
        </form>}
      </div>
    </div>}

    {tab==='Sizes & Routes'&&<div className="space-y-3">
      {data.sizes.map((size)=><form action={savePackagingSizeProfileV5} key={size.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1.4fr_.55fr_1fr_1fr_1.1fr_auto] lg:items-end">
        <input type="hidden" name="id" value={size.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/>
        <div><p className="text-sm font-black text-slate-950">{size.name}</p><p className="mt-1 text-xs text-slate-400">{size.width_mm} × {size.height_mm} · BG {size.bottom_gusset_each_mm}+{size.bottom_gusset_each_mm}</p></div>
        <label className="text-[10px] font-black uppercase text-slate-500">Bucket<select disabled={!isDraft} name="pricing_bucket" defaultValue={size.pricing_bucket} className={`${input} mt-1 w-full`}>{[1,2,3,4,5].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="text-[10px] font-black uppercase text-slate-500">Route<select disabled={!isDraft} name="gusset_production_mode" defaultValue={size.gusset_production_mode} className={`${input} mt-1 w-full`}><option value="integrated">Integrated</option><option value="separate">Separate gusset</option><option value="conditional">Conditional</option></select></label>
        <label className="text-[10px] font-black uppercase text-slate-500">Bottom registration<select disabled={!isDraft} name="bottom_registration_mode" defaultValue={size.bottom_registration_mode} className={`${input} mt-1 w-full`}><option value="not_applicable">Not applicable</option><option value="optional">Ask Sales</option><option value="required_registered">Registered required</option><option value="required_unregistered">Solid only</option></select></label>
        <label className="text-[10px] font-black uppercase text-slate-500">Profile<input disabled={!isDraft} name="production_profile_key" defaultValue={size.production_profile_key??''} className={`${input} mt-1 w-full`}/></label>
        <div className="flex gap-3"><label className="text-xs font-bold text-slate-600"><input disabled={!isDraft} type="checkbox" name="is_active" defaultChecked={size.is_active} className="mr-1"/>Active</label><label className="text-xs font-bold text-slate-600"><input disabled={!isDraft} type="checkbox" name="is_quoteable" defaultChecked={size.is_quoteable} className="mr-1"/>Quoteable</label></div>
        <button disabled={!isDraft} className={btn}>Save</button>
      </form>)}
    </div>}

    {tab==='Constructions'&&<div className="space-y-3">
      {isDraft&&data.template&&<form action={createPackagingConstructionV5} className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
        <input type="hidden" name="template_id" value={data.template.id}/>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-black text-slate-950">Create private custom construction</h3><p className="mt-1 text-xs text-slate-500">Custom structures start non-quoteable. Final layer must be a PE sealant.</p></div><Pill tone="blue">Admin only</Pill></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-[10px] font-black uppercase text-slate-500">Name<input required name="name" className={`${input} mt-1 w-full`} placeholder="Custom high-barrier structure"/></label>
          <label className="text-[10px] font-black uppercase text-slate-500">Key<input name="construction_key" className={`${input} mt-1 w-full`} placeholder="custom_high_barrier"/></label>
          <label className="text-[10px] font-black uppercase text-slate-500">Family<input name="construction_family_key" className={`${input} mt-1 w-full`} defaultValue="custom"/></label>
          <label className="text-[10px] font-black uppercase text-slate-500">Finish<input name="finish_type" className={`${input} mt-1 w-full`} placeholder="matte / glossy"/></label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map((position)=><label key={position} className="text-[10px] font-black uppercase text-slate-500">Layer {position}{position<=2?' *':''}<select required={position<=2} name={`layer_${position}`} className={`${input} mt-1 w-full`} defaultValue=""><option value="">{position<=2?'Select film':'Optional'}</option>{materialCosts.map((cost)=><option key={cost.id} value={cost.id}>{cost.name}{cost.current_rate==null?' · rate missing':''}</option>)}</select></label>)}
        </div>
        <label className="mt-3 block text-[10px] font-black uppercase text-slate-500">Barrier type<input name="barrier_type" className={`${input} mt-1 w-full md:w-96`} placeholder="high_barrier / clear / silver"/></label>
        <button className={`${btn} mt-4`} type="submit">Create custom construction</button>
      </form>}
      {data.constructions.map((construction)=>{
        const layers=(layersByConstruction.get(construction.id)??[]) as any[];
        const missing=layers.some((layer)=>costsById.get(layer.cost_master_item_id)?.current_rate==null)||layers.length!==construction.layer_count;
        return <form action={setPackagingConstructionQuoteableV5} key={construction.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="id" value={construction.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/>
          <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-slate-950">{construction.name}</h3><Pill tone={missing?'amber':'green'}>{construction.layer_count} layers</Pill>{construction.metadata?.private_custom&&<Pill tone="blue">Custom</Pill>}</div><p className="mt-2 text-xs text-slate-500">{layers.map((layer)=>costsById.get(layer.cost_master_item_id)?.name??'Unmapped').join(' / ')||'No layers configured'}</p></div><div className="flex items-center gap-3"><label className="text-xs font-bold text-slate-600"><input disabled={!isDraft} type="checkbox" name="is_active" defaultChecked={construction.is_active} className="mr-1"/>Active</label><label className="text-xs font-bold text-slate-600"><input disabled={!isDraft||missing} type="checkbox" name="is_quoteable" defaultChecked={construction.is_quoteable} className="mr-1"/>Quoteable</label><button disabled={!isDraft} className={btn}>Save</button></div></div>
        </form>;
      })}
    </div>}

    {tab==='Materials & Processes'&&<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-cyan-100 bg-cyan-50 px-4 py-3 text-xs font-bold text-cyan-800">These are Pricing v5 rate overrides. Saving here does not overwrite the shared v4 Cost Master rate.</div>
      <div className="grid grid-cols-[1.5fr_.8fr_.8fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-500"><span>Component</span><span>Basis</span><span>V5 rate</span><span/></div>
      {data.costs.map((cost)=><form action={savePackagingMasterRateV5} key={cost.id} className="grid grid-cols-[1.5fr_.8fr_.8fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><input type="hidden" name="id" value={cost.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/><div><p className="text-sm font-black text-slate-900">{cost.name}</p><p className="text-[10px] font-bold text-slate-400">{cost.code}</p></div><span className="text-xs text-slate-500">{cost.rate_basis}</span><input disabled={!isDraft} className={input} name="current_rate" defaultValue={cost.current_rate??''} placeholder="Rate required"/><button disabled={!isDraft} className={btn}>Save v5 rate</button></form>)}
    </div>}

    {tab==='Commercial Buckets'&&<div className="grid gap-4 xl:grid-cols-2">
      {[1,2,3,4,5].map((bucket)=><div key={bucket} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white"><h3 className="text-sm font-black">Bucket {bucket}</h3><Pill tone="blue">Run-length rules</Pill></div><div className="grid grid-cols-[.8fr_.8fr_.9fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase text-slate-500"><span>Run ≤ m</span><span>Waste %</span><span>Margin/frame</span><span/></div>{data.bands.filter((band)=>Number(band.pricing_bucket)===bucket).map((band)=><form action={savePackagingCommercialBandV5} key={band.id} className="grid grid-cols-[.8fr_.8fr_.9fr_auto] items-center gap-2 border-b border-slate-100 px-4 py-2 last:border-0"><input type="hidden" name="id" value={band.id}/><input type="hidden" name="template_id" value={data.template?.id??''}/><span className="text-sm font-black text-slate-900">{band.run_length_max_m}</span><input disabled={!isDraft} name="wastage_pct" className={input} defaultValue={band.wastage_pct}/><input disabled={!isDraft} name="margin_per_frame" className={input} defaultValue={band.margin_per_frame}/><button disabled={!isDraft} className={btn}>Save</button></form>)}</div>)}
    </div>}
  </div>;
}
