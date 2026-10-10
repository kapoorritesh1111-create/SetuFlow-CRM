'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import {
  copyPackagingCommercialGroupV5,
  createPackagingCommercialBandV5,
  createPackagingConstructionV5,
  deletePackagingCommercialBandV5,
  saveAndPublishPackagingCommercialBandsV5,
  savePackagingCommercialBandsV5,
  savePackagingConstructionLayersV5,
  savePackagingFrameTemplateSettingsV5,
  savePackagingMasterRateV5,
  savePackagingChargeRateV5,
  setPackagingConstructionQuoteableV5,
} from '@/features/packaging/server/pricing-v5-admin-actions';
import { previewPackagingFramePricingV5 } from '@/features/packaging/server/pricing-v5-frame-actions';
import ConstructionLayerEditorV5 from '@/features/packaging/components/construction-layer-editor-v5';

type View='dashboard'|'constructions'|'rates'|'waste'|'matrix';
const QUANTITIES=[1000,2000,3000,5000,10000,20000,30000,50000];
const input='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';
const primary='rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const secondary='rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

function money(value:unknown,currency='INR'){
  const n=Number(value??0);
  return currency+' '+(Number.isFinite(n)?n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'0.00');
}
function Label({children}:{children:ReactNode}){return <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">{children}</span>;}
function Card({children,className=''}:{children:ReactNode;className?:string}){return <div className={'rounded-xl border border-slate-200 bg-white shadow-sm '+className}>{children}</div>;}
function EditBanner({isDraft}:{isDraft:boolean}){return isDraft?<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Editing working draft. Live Sales pricing remains unchanged until this revision is published.</div>:<div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"><b>Published pricing is protected.</b> Click <b>Edit Pricing</b> above to create a draft and unlock owner controls.</div>;}
function Metric({label,value,sub}:{label:string;value:ReactNode;sub:string}){return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{sub}</div></div>;}

export default function PricingV5FrameOwnerWorkspace({data,view}:{data:any;view:View}){
  const isDraft=data.template?.status==='draft';
  if(view==='constructions') return <Constructions data={data} isDraft={isDraft}/>;
  if(view==='rates') return <Rates data={data} isDraft={isDraft}/>;
  if(view==='waste') return <Waste data={data} isDraft={isDraft}/>;
  if(view==='matrix') return <Matrix data={data}/>;
  return <Dashboard data={data} isDraft={isDraft}/>;
}

function FramePreview({data,showMatrix=false}:{data:any;showMatrix?:boolean}){
  const template=data.template;
  const constructions=(data.constructions??[]).filter((x:any)=>x.is_active&&x.is_quoteable);
  const [constructionId,setConstructionId]=useState(constructions[0]?.id??'');
  const [width,setWidth]=useState(120);
  const [height,setHeight]=useState(180);
  const [quantity,setQuantity]=useState(5000);
  const [print,setPrint]=useState<'CMYK'|'CMYKW'>('CMYKW');
  const [preview,setPreview]=useState<any>(null);
  const [matrix,setMatrix]=useState<any[]>([]);
  const [error,setError]=useState('');
  const [pending,startTransition]=useTransition();
  const construction=constructions.find((x:any)=>x.id===constructionId)??constructions[0];
  const supplyForm=String(template?.production_rules_json?.supply_form??'');
  const currency=preview?.selling_price?.currency??template?.currency??'INR';
  const breakdown=Object.entries(preview?.cost_breakdown?.per_unit??{});

  function buildInput(q:number){
    return {supply_form:supplyForm,width_mm:Number(width),height_mm:Number(height),construction_id:construction?.id??'',print,quantity:q,commercial_bucket:null} as any;
  }
  function calculate(){
    if(!template?.id||!construction?.id||width<=0||height<=0||quantity<=0) return;
    setError('');
    startTransition(async()=>{
      const response:any=await previewPackagingFramePricingV5({templateId:template.id,input:buildInput(quantity)});
      setPreview(response.result??null);
      if(!response.ok&&!response.result?.smart_moq)setError(response.error??'Price could not be calculated.');
    });
  }
  function buildMatrix(){
    if(!template?.id||!construction?.id||width<=0||height<=0) return;
    setError('');
    startTransition(async()=>{
      const rows=await Promise.all(QUANTITIES.map(async(q)=>{
        const response:any=await previewPackagingFramePricingV5({templateId:template.id,input:buildInput(q)});
        return response.ok?{ok:true,quantity:q,result:response.result}:{ok:false,quantity:q,error:response.error??'Pricing failed'};
      }));
      setMatrix(rows);
      const bad=rows.find((x:any)=>!x.ok); if(bad)setError(bad.error);
    });
  }

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{showMatrix?'Price Matrix':'Quick Price Preview'}</h2><p className="mt-1 text-sm text-slate-500">Enter customer dimensions and use the same V5 frame engine as Sales.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">Owner view</span></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label><Label>Width mm</Label><input className={input} type="number" min="1" value={width} onChange={(e)=>{setWidth(Number(e.target.value));setPreview(null);setMatrix([]);}}/></label>
        <label><Label>Height mm</Label><input className={input} type="number" min="1" value={height} onChange={(e)=>{setHeight(Number(e.target.value));setPreview(null);setMatrix([]);}}/></label>
        <label><Label>Quantity pcs</Label><input className={input} type="number" min="1" value={quantity} onChange={(e)=>{setQuantity(Number(e.target.value));setPreview(null);}}/></label>
        <label className="md:col-span-2"><Label>Construction</Label><select className={input} value={construction?.id??''} onChange={(e)=>{setConstructionId(e.target.value);setPreview(null);setMatrix([]);}}>{constructions.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label><Label>Printing</Label><select className={input} value={print} onChange={(e)=>{setPrint(e.target.value as any);setPreview(null);setMatrix([]);}}><option value="CMYK">Digital (CMYK)</option><option value="CMYKW">Digital (CMYKW)</option></select></label>
      </div>
      {error?<div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>:null}
      {preview?.smart_moq?<div className="mt-4 space-y-3">
        <div className={preview.smart_moq.below_minimum?"rounded-xl border border-amber-200 bg-amber-50 p-4":"rounded-xl border border-emerald-200 bg-emerald-50 p-4"}>
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Minimum order for this size</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{Number(preview.smart_moq.recommended_minimum_quantity).toLocaleString()} {preview.smart_moq.quantity_uom??'pcs'}</div>
          <p className="mt-1 text-xs font-semibold text-slate-600">250 m production minimum requires approximately {Number(preview.smart_moq.exact_minimum_quantity).toLocaleString()} pcs for {width} × {height} mm.</p>
          {preview.smart_moq.below_minimum?<button type="button" onClick={()=>{setQuantity(Number(preview.smart_moq.recommended_minimum_quantity));setPreview(null);setError('');}} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">Use {Number(preview.smart_moq.recommended_minimum_quantity).toLocaleString()} {preview.smart_moq.quantity_uom??'pcs'}</button>:null}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3"><b className="text-sm text-slate-950">Recommended quantity options</b><span className="ml-2 text-xs text-slate-500">Higher quantities can unlock lower unit pricing.</span></div>
          <div className="divide-y divide-slate-100">{(preview.smart_moq.options??[]).map((o:any)=><div key={o.quantity} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"><div><b className="text-sm text-slate-900">{Number(o.quantity).toLocaleString()} {preview.smart_moq.quantity_uom??'pcs'}</b><div className="text-[11px] text-slate-500">{o.label}</div></div><div className="text-xs text-slate-600">~{Number(o.run_length_m).toFixed(0)} m run</div><div className="text-sm font-black text-slate-900">{o.unit_price!=null?money(o.unit_price,currency):'Calculate after MOQ'}</div><div className="text-xs font-bold text-slate-700">{o.price_per_kg!=null?<>{Number(o.finished_weight_kg??0).toFixed(2)} kg · {money(o.price_per_kg,currency)}/kg</>:'—'}</div><button type="button" onClick={()=>{setQuantity(Number(o.quantity));setPreview(null);setError('');}} className={secondary}>Use</button></div>)}</div>
        </div>
      </div>:null}
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={calculate} disabled={pending} className={primary}>{pending?'Calculating…':'Calculate Price'}</button><button type="button" onClick={buildMatrix} disabled={pending} className={secondary}>Build 1K–50K Matrix</button></div>
      {matrix.length?<div className="mt-5 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-3 py-3 text-left">Qty</th><th className="px-3 py-3 text-left">Unit price</th><th className="px-3 py-3 text-left">Order total</th><th className="px-3 py-3 text-left">Finished weight</th><th className="px-3 py-3 text-left">Price / kg</th><th className="px-3 py-3 text-left">Run length</th><th className="px-3 py-3 text-left">Waste</th><th className="px-3 py-3 text-left">Margin/frame</th></tr></thead><tbody>{matrix.map((row:any)=><tr key={row.quantity} className="border-t border-slate-100"><td className="px-3 py-3 font-black">{row.quantity.toLocaleString()}</td><td className="px-3 py-3">{row.ok?money(row.result?.selling_price?.unit_price,row.result?.selling_price?.currency??currency):'Blocked'}</td><td className="px-3 py-3">{row.ok?money(row.result?.selling_price?.product_total,row.result?.selling_price?.currency??currency):row.error}</td><td className="px-3 py-3">{row.ok&&row.result?.roll_weight?Number(row.result.roll_weight.finished_weight_kg).toFixed(2)+' kg':'—'}</td><td className="px-3 py-3">{row.ok&&row.result?.roll_weight?money(row.result.roll_weight.price_per_kg,row.result?.selling_price?.currency??currency)+'/kg':'—'}</td><td className="px-3 py-3">{row.ok?Number(row.result?.run_length_m??row.result?.geometry?.run_length_m??0).toFixed(1)+' m':'—'}</td><td className="px-3 py-3">{row.ok?String(row.result?.wastage_pct??'—')+'%':'—'}</td><td className="px-3 py-3">{row.ok?money(row.result?.margin_per_frame??0,row.result?.selling_price?.currency??currency):'—'}</td></tr>)}</tbody></table></div>:null}
    </Card>
    <Card className="p-5">
      <h2 className="text-lg font-black text-slate-950">Price Result</h2>
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs font-bold text-slate-500">Calculated price / piece</div><div className="mt-1 text-3xl font-black text-slate-950">{preview?.ok?money(preview.selling_price?.unit_price,currency):'—'}</div>{preview?.ok?<div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">{quantity.toLocaleString()} pcs</span><b>{money(preview.selling_price?.product_total,currency)}</b></div>:null}</div>
      {preview?.ok&&preview.roll_weight?<div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs font-black uppercase tracking-wide text-blue-900">Finished Weight & Price per KG</div><div className="mt-3 grid grid-cols-3 gap-3 text-center"><div><div className="text-[10px] font-bold text-slate-500">Total GSM</div><div className="text-lg font-black">{Number(preview.roll_weight.total_gsm).toFixed(2)}</div></div><div><div className="text-[10px] font-bold text-slate-500">Finished Weight</div><div className="text-lg font-black">{Number(preview.roll_weight.finished_weight_kg).toFixed(2)} kg</div></div><div><div className="text-[10px] font-bold text-slate-500">Price per KG</div><div className="text-lg font-black">{money(preview.roll_weight.price_per_kg,currency)}/kg</div></div></div></div>:null}
      {breakdown.length?<div className="mt-4 overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-right">INR/pc</th></tr></thead><tbody>{breakdown.map(([k,v]:any)=><tr key={String(k)} className="border-t border-slate-100"><td className="px-3 py-2">{String(k).replaceAll('_',' ')}</td><td className="px-3 py-2 text-right font-black">{money(v,currency).replace(currency+' ','')}</td></tr>)}<tr className="border-t border-emerald-200 bg-emerald-50"><td className="px-3 py-2 font-black">Final price</td><td className="px-3 py-2 text-right font-black">{preview?.ok?money(preview.selling_price?.unit_price,currency).replace(currency+' ',''):'—'}</td></tr></tbody></table></div>:<p className="mt-4 text-sm text-slate-500">Calculate a price to see the engine-backed breakdown.</p>}
    </Card>
  </div>;
}

function Dashboard({data,isDraft}:{data:any;isDraft:boolean}){
  const template=data.template;
  const quoteable=(data.constructions??[]).filter((x:any)=>x.is_active&&x.is_quoteable);
  const missingRates=(data.costs??[]).filter((x:any)=>x.current_rate==null).length;
  const defaultBucket=Number(template?.production_rules_json?.default_commercial_bucket??0);
  const bucketBands=(data.bands??[]).filter((x:any)=>Number(x.pricing_bucket)===defaultBucket);
  return <div className="space-y-4">
    <EditBanner isDraft={isDraft}/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Supply form" value={data.supplyLabel??'Frame family'} sub="current owner model"/>
      <Metric label="Constructions" value={quoteable.length} sub="active + quoteable"/>
      <Metric label="Default pricing group" value={'PG'+String(defaultBucket||0).padStart(2,'0')} sub="applied automatically to Sales"/>
      <Metric label="Commercial bands" value={bucketBands.length} sub="bands in active group"/>
      <Metric label="Missing rates" value={missingRates} sub={missingRates?'needs owner attention':'all configured'}/>
    </div>
    <FramePreview data={data}/>
  </div>;
}

function Constructions({data,isDraft}:{data:any;isDraft:boolean}){
  const constructions=data.constructions??[]; const materials=(data.costs??[]).filter((x:any)=>x.item_type==='material'&&x.rate_basis==='per_kg');
  const [selectedId,setSelectedId]=useState(constructions[0]?.id??''); const [query,setQuery]=useState('');
  const selected=constructions.find((x:any)=>x.id===selectedId)??constructions[0];
  const layers=(data.layers??[]).filter((x:any)=>x.construction_id===selected?.id).sort((a:any,b:any)=>a.layer_position-b.layer_position);
  const shown=constructions.filter((x:any)=>!query||String(x.name).toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-4">
    <div><h2 className="text-xl font-black text-slate-950">Constructions</h2><p className="mt-1 text-sm text-slate-500">Manage the approved film recipes for this exact family and supply form.</p></div>
    <EditBanner isDraft={isDraft}/>
    {isDraft?<details className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><summary className="cursor-pointer text-sm font-black text-blue-900">+ Add Construction</summary><form action={createPackagingConstructionV5} className="mt-4 grid gap-3 md:grid-cols-3"><input type="hidden" name="template_id" value={data.template?.id??''}/><label className="md:col-span-2"><Label>Name</Label><input name="name" required className={input} placeholder="e.g. 3 layer - 12 pet + 12 metpet + 60 PE"/></label><label><Label>Family key</Label><input name="construction_family_key" className={input} defaultValue="custom"/></label>{[1,2,3,4,5,6].map((n)=><label key={n}><Label>Layer {n}</Label><select name={'layer_'+n} className={input} required={n<=2}><option value="">None</option>{materials.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}<div className="md:col-span-3 flex justify-end"><button className={primary}>Create Construction</button></div></form></details>:null}
    <Card className="p-4"><input className={input} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search constructions"/></Card>
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="overflow-hidden"><div className="max-h-[760px] overflow-y-auto p-2">{shown.map((c:any)=><button key={c.id} type="button" onClick={()=>setSelectedId(c.id)} className={'mb-2 w-full rounded-xl border p-3 text-left '+(selected?.id===c.id?'border-blue-500 bg-blue-50':'border-slate-200 bg-white')}><div className="text-sm font-black text-slate-900">{c.name}</div><div className="mt-1 text-[11px] text-slate-500">{c.layer_count} layers · {c.is_quoteable?'Quoteable':'Hidden'}</div></button>)}</div></Card>
      {selected?<Card className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-950">{selected.name}</h3><p className="mt-1 text-xs text-slate-500">{selected.construction_key}</p></div><span className={'rounded-full px-2.5 py-1 text-[10px] font-black '+(selected.is_quoteable?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600')}>{selected.is_quoteable?'Quoteable':'Not quoteable'}</span></div>
        <ConstructionLayerEditorV5 templateId={data.template?.id??''} constructionId={selected.id} isDraft={isDraft} materials={materials} layers={layers}/>
        <form action={setPackagingConstructionQuoteableV5} className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><input type="hidden" name="template_id" value={data.template?.id??''}/><input type="hidden" name="id" value={selected.id}/><label className="text-sm font-bold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={selected.is_active} disabled={!isDraft} className="mr-2"/>Active</label><label className="text-sm font-bold text-slate-700"><input type="checkbox" name="is_quoteable" defaultChecked={selected.is_quoteable} disabled={!isDraft} className="mr-2"/>Available to Sales</label><button disabled={!isDraft} className={secondary}>Save Availability</button></form>
      </Card>:null}
    </div>
  </div>;
}

function Rates({data,isDraft}:{data:any;isDraft:boolean}){
  const costs=data.costs??[]; const charges=data.charges??[];
  return <div className="space-y-4"><div><h2 className="text-xl font-black text-slate-950">Rates & Charges</h2><p className="mt-1 text-sm text-slate-500">Edit the material, printing, lamination, slitting, pouching and linked charge rates used by this form.</p></div><EditBanner isDraft={isDraft}/>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Material & Process Rates</h3></div><div className="divide-y divide-slate-100">{costs.map((x:any)=><form key={x.id} action={savePackagingMasterRateV5} className="grid items-center gap-3 p-3 md:grid-cols-[1fr_180px_120px]"><input type="hidden" name="template_id" value={data.template?.id??''}/><input type="hidden" name="id" value={x.id}/><div><div className="text-sm font-black text-slate-900">{x.name}</div><div className="text-[11px] text-slate-500">{x.code} · {x.rate_basis} · {x.rate_uom}</div></div><input name="current_rate" type="number" min="0" step="0.0001" defaultValue={x.current_rate??''} disabled={!isDraft} className={input}/><button disabled={!isDraft} className={secondary}>Save Rate</button></form>)}</div></Card>
    <Card className="overflow-hidden"><div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Linked Charges</h3></div>{charges.length?<div className="divide-y divide-slate-100">{charges.map((x:any)=><form key={x.id} action={savePackagingChargeRateV5} className="grid items-center gap-3 p-3 md:grid-cols-[1fr_180px_120px]"><input type="hidden" name="template_id" value={data.template?.id??''}/><input type="hidden" name="id" value={x.id}/><div><div className="text-sm font-black text-slate-900">{x.name}</div><div className="text-[11px] text-slate-500">{x.code} · {x.basis}</div></div><input name="current_rate" type="number" min="0" step="0.0001" defaultValue={x.current_rate??''} disabled={!isDraft} className={input}/><button disabled={!isDraft} className={secondary}>Save Charge</button></form>)}</div>:<p className="p-4 text-sm text-slate-500">No optional charges are linked to this family.</p>}</Card>
  </div>;
}

function Waste({data,isDraft}:{data:any;isDraft:boolean}){
  const bands=data.bands??[]; const groups:number[]=Array.from(new Set<number>(bands.map((x:any)=>Number(x.pricing_bucket)))).sort((a,b)=>a-b);
  const configured=Number(data.template?.production_rules_json?.default_commercial_bucket??groups[0]??1);
  const [group,setGroup]=useState(configured);
  const rows=bands.filter((x:any)=>Number(x.pricing_bucket)===group);
  const nextGroup=Math.min(99,(groups[groups.length-1]??0)+1);
  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Pricing Groups · Waste & Margins</h2><p className="mt-1 text-sm text-slate-500">Select a pricing group, review its bands, then edit only what needs to change.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{groups.length} groups</span></div><EditBanner isDraft={isDraft}/>
    <Card className="p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><div className="text-xs font-black text-slate-900">Pricing groups</div><div className="text-[11px] text-slate-500">Click a group to review its waste and margin bands.</div></div><div className="text-[11px] font-bold text-slate-500">PG{String(configured).padStart(2,'0')} is currently applied to Sales</div></div><div className="flex flex-wrap gap-2">{groups.map((g)=>{const count=bands.filter((x:any)=>Number(x.pricing_bucket)===g).length;return <button key={g} type="button" onClick={()=>setGroup(g)} className={'rounded-xl border px-3 py-2 text-left transition '+(group===g?'border-blue-500 bg-blue-50 text-blue-900':'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}><div className="flex items-center gap-2"><b className="text-sm">PG{String(g).padStart(2,'0')}</b>{g===configured?<span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">LIVE</span>:null}</div><div className="mt-0.5 text-[10px] text-slate-500">{count} bands</div></button>;})}</div><form action={savePackagingFrameTemplateSettingsV5} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"><input type="hidden" name="template_id" value={data.template?.id??''}/><input type="hidden" name="default_commercial_bucket" value={group}/><div className="mr-auto"><div className="text-xs font-black text-slate-900">Selected: PG{String(group).padStart(2,'0')}</div><div className="text-[11px] text-slate-500">{rows.length} commercial bands</div></div><button disabled={!isDraft||group===configured} className={primary}>{group===configured?'Current Sales Group':'Use PG'+String(group).padStart(2,'0')+' for Sales'}</button></form></Card>
    {isDraft?<div className="grid gap-3 lg:grid-cols-2"><details className="rounded-xl border border-blue-200 bg-blue-50/60 p-4"><summary className="cursor-pointer text-sm font-black text-blue-900">+ Add a band to PG{String(group).padStart(2,'0')}</summary><form action={createPackagingCommercialBandV5} className="mt-4 grid gap-3 md:grid-cols-3"><input type="hidden" name="template_id" value={data.template?.id??''}/><input type="hidden" name="pricing_bucket" value={group}/><label><Label>Run length max m</Label><input required type="number" min="1" name="run_length_max_m" className={input}/></label><label><Label>Waste %</Label><input required type="number" min="0" step="0.01" name="wastage_pct" className={input}/></label><label><Label>Margin / frame</Label><input required type="number" min="0" step="0.0001" name="margin_per_frame" className={input}/></label><div className="md:col-span-3 flex justify-end"><button className={primary}>Add Band</button></div></form></details><details className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" open><summary className="cursor-pointer text-sm font-black text-emerald-900">+ Create a pricing group</summary><div className="mt-2 text-xs text-emerald-800">Fastest option: copy an existing group, then change only the waste or margin values that differ.</div><form action={copyPackagingCommercialGroupV5} className="mt-4 grid gap-3 md:grid-cols-2"><input type="hidden" name="template_id" value={data.template?.id??''}/><label><Label>Copy from</Label><select name="source_pricing_bucket" defaultValue={group} className={input}>{groups.map((g)=><option key={g} value={g}>PG{String(g).padStart(2,'0')} · {bands.filter((x:any)=>Number(x.pricing_bucket)===g).length} bands</option>)}</select></label><label><Label>New Group Number</Label><input required type="number" min="1" max="99" name="target_pricing_bucket" defaultValue={nextGroup} className={input}/></label><div className="md:col-span-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] text-slate-600">Copies every run-length band, waste %, and margin/frame. It does <b>not</b> reassign Sales or any size automatically.</div><div className="md:col-span-2 flex justify-end"><button className={primary}>Copy & Create Group</button></div></form><div className="my-4 flex items-center gap-3 text-[10px] font-black uppercase text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>or start blank</span><span className="h-px flex-1 bg-slate-200"/></div><form action={createPackagingCommercialBandV5} className="grid gap-3 md:grid-cols-2"><input type="hidden" name="template_id" value={data.template?.id??''}/><label><Label>New Group Number</Label><input required type="number" min="1" max="99" name="pricing_bucket" defaultValue={nextGroup} className={input}/></label><label><Label>First Run Length Max m</Label><input required type="number" min="1" name="run_length_max_m" className={input}/></label><label><Label>Waste %</Label><input required type="number" min="0" step="0.01" name="wastage_pct" className={input}/></label><label><Label>Margin / frame</Label><input required type="number" min="0" step="0.0001" name="margin_per_frame" className={input}/></label><div className="md:col-span-2 flex justify-end"><button className={secondary}>Create Blank Group</button></div></form></details></div>:null}
    <form id="pricing-v5-waste-form" action={savePackagingCommercialBandsV5} className="space-y-3">
      <input type="hidden" name="template_id" value={data.template?.id??''}/>
      <Card className="overflow-hidden"><table className="min-w-full text-xs"><thead className="bg-slate-950 text-white"><tr><th className="px-3 py-3 text-left">Run length max</th><th className="px-3 py-3 text-left">Waste %</th><th className="px-3 py-3 text-left">Margin / frame</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id} className="border-t border-slate-100"><td colSpan={4} className="p-0"><div className="grid items-center gap-2 p-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]"><input type="hidden" name="band_id" value={x.id}/><input name="run_length_max_m" type="number" min="1" defaultValue={x.run_length_max_m} disabled={!isDraft} className={input}/><input name="wastage_pct" type="number" min="0" step="0.01" defaultValue={x.wastage_pct} disabled={!isDraft} className={input}/><input name="margin_per_frame" type="number" min="0" step="0.0001" defaultValue={x.margin_per_frame} disabled={!isDraft} className={input}/><button type="submit" name="save_band_id" value={x.id} formAction={savePackagingCommercialBandsV5} disabled={!isDraft} className={secondary}>Save</button>{isDraft?<button type="submit" name="delete_id" value={x.id} formAction={deletePackagingCommercialBandV5} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-600">Delete</button>:null}</div></td></tr>)}</tbody></table></Card>
      {isDraft?<div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur"><span className="mr-auto text-xs font-bold text-slate-500">All {rows.length} visible PG{String(group).padStart(2,'0')} bands are saved together.</span><button className={secondary}>Save All Waste & Margins</button><button id="pricing-v5-waste-publish" formAction={saveAndPublishPackagingCommercialBandsV5} className={primary}>Save All & Publish</button></div>:null}
    </form>
  </div>;
}

function Matrix({data}:{data:any}){return <div className="space-y-4"><div><h2 className="text-xl font-black text-slate-950">Price Matrix</h2><p className="mt-1 text-sm text-slate-500">Owner-only 1K–50K pricing across the selected dimensions and construction.</p></div><FramePreview data={data} showMatrix/></div>;}
