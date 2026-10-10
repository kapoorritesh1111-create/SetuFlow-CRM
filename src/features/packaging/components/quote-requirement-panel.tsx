'use client';

import { useEffect, useMemo, useState } from 'react';

type FamilyKey='sup'|'center-seal'|'3ss';
type Requirement={
  id:string;
  label:string;
  quantity:string;
  quantityMode:string;
  notes:string;
  familyId:string|null;
  dimensionOptionId:string|null;
  dimensions:string;
  customWidthMm:string;
  customHeightMm:string;
  customGussetMm:string;
  sourceContext:any;
};
type Family={id:string;name:string;slug?:string};
type DimensionOption={id:string;family_id:string;name:string;width_mm?:number|null;height_mm?:number|null;bottom_gusset_each_mm?:number|null};

function familyKeyFor(requirement:Requirement,families:Family[]):FamilyKey|null{
  const family=families.find((item)=>String(item.id)===String(requirement.familyId));
  const text=(family?.slug||family?.name||requirement.label||'').toLowerCase();
  if(text.includes('center')) return 'center-seal';
  if(text.includes('three')||text.includes('3 side')||text.includes('3-side')||text.includes('3ss')) return '3ss';
  if(text.includes('stand')) return 'sup';
  return null;
}
function familyImage(key:FamilyKey|null){
  if(key==='center-seal') return '/packaging/quote-stock/stark-center-seal.png';
  if(key==='3ss') return '/packaging/quote-stock/stark-three-side-seal.png';
  return '/packaging/quote-stock/stark-stand-up.png';
}

export default function QuoteRequirementPanel({leadId,available,onUse,onStartFresh}:{leadId:string;available:FamilyKey[];onUse:(family:FamilyKey,requirement:Requirement)=>void;onStartFresh:()=>void}){
  const [requirements,setRequirements]=useState<Requirement[]>([]);
  const [families,setFamilies]=useState<Family[]>([]);
  const [dimensionOptions,setDimensionOptions]=useState<DimensionOption[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [editingId,setEditingId]=useState('');
  const [draft,setDraft]=useState<Requirement|null>(null);
  const [saving,setSaving]=useState(false);

  async function load(){
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/leads/'+leadId+'/requirements',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok) throw new Error(data?.error||'Requirements could not be loaded.');
      setRequirements(Array.isArray(data.requirements)?data.requirements:[]);
      setFamilies(Array.isArray(data.families)?data.families:[]);
      setDimensionOptions(Array.isArray(data.dimensionOptions)?data.dimensionOptions:[]);
    }catch(err:any){setError(err?.message||'Requirements could not be loaded.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[leadId]);

  const editDimensions=useMemo(()=>draft?dimensionOptions.filter((item)=>String(item.family_id)===String(draft.familyId)):[],[draft,dimensionOptions]);

  function beginEdit(item:Requirement){
    setEditingId(item.id);
    setDraft({...item,sourceContext:item.sourceContext||{}});
  }
  function cancelEdit(){setEditingId('');setDraft(null);setError('');}

  async function saveEdit(){
    if(!draft) return;
    setSaving(true);setError('');
    const next=requirements.map((item)=>item.id===editingId?draft:item);
    try{
      const response=await fetch('/api/leads/'+leadId+'/requirements',{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requirements:next}),
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data?.error||'Requirement could not be saved.');
      cancelEdit();
      await load();
    }catch(err:any){setError(err?.message||'Requirement could not be saved.');}
    finally{setSaving(false);}
  }

  if(loading) return <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Loading captured requirements…</div>;
  if(!requirements.length) return error?<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{error}</div>:null;

  return <div className="mt-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">From Lead Requirements</div><h3 className="mt-1 text-lg font-black text-slate-950">Start from what Sales already captured</h3><p className="mt-1 text-xs font-semibold text-slate-500">Use the requirement as the starting point, edit it if the customer changed something, or add another product below.</p></div>
      <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={onStartFresh} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Don't use lead requirement</button><span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-black text-teal-700">{requirements.length} requirement{requirements.length===1?'':'s'}</span></div>
    </div>
    {error?<div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>:null}
    <div className="mt-3 grid gap-3">
      {requirements.map((item)=>{
        const key=familyKeyFor(item,families);
        const usable=Boolean(key&&available.includes(key));
        return <div key={item.id} className="grid gap-3 rounded-2xl border border-cyan-200 bg-gradient-to-r from-white to-cyan-50/50 p-4 md:grid-cols-[84px_minmax(0,1fr)_auto] md:items-center">
          <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl bg-white"><img src={familyImage(key)} alt="" className="h-16 w-auto object-contain"/></div>
          <div><div className="text-sm font-black text-slate-950">{item.label||'Packaging requirement'}</div><div className="mt-1 text-xs font-semibold text-slate-500">{item.dimensions||'Dimensions to confirm'}{item.quantity?' · '+item.quantity+' requested':''}</div>{item.notes?<div className="mt-2 text-xs font-semibold text-slate-600">{item.notes}</div>:null}<div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">Captured requirement</span>{usable?<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Ready to configure</span>:<span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">Manual quote route</span>}</div></div>
          <div className="flex flex-wrap gap-2 md:justify-end"><button type="button" onClick={()=>beginEdit(item)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">Change Requirement</button><button type="button" onClick={onStartFresh} className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">Use Different Product</button>{usable&&key?<button type="button" onClick={()=>onUse(key,item)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">Use Requirement →</button>:null}</div>
        </div>;
      })}
    </div>

    {draft?<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Edit requirement">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Edit Requirement</div><h3 className="mt-1 text-xl font-black text-slate-950">{draft.label||'Packaging requirement'}</h3></div><button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">Close</button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-600">Service family<select value={draft.familyId||''} onChange={(e)=>{const family=families.find((f)=>f.id===e.target.value);setDraft({...draft,familyId:e.target.value,label:family?.name||draft.label,dimensionOptionId:'',dimensions:'',customWidthMm:'',customHeightMm:'',customGussetMm:''});}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5">{families.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-black text-slate-600">Quantity<input value={draft.quantity} onChange={(e)=>setDraft({...draft,quantity:e.target.value,quantityMode:'custom'})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="e.g. 10,000"/></label>
          <label className="text-xs font-black text-slate-600 sm:col-span-2">Dimensions<select value={draft.dimensionOptionId||''} onChange={(e)=>{const option=editDimensions.find((x)=>x.id===e.target.value);setDraft({...draft,dimensionOptionId:e.target.value,dimensions:option?.name||'',customWidthMm:'',customHeightMm:'',customGussetMm:''});}} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Choose approved dimensions</option>{editDimensions.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}<option value="custom">Custom dimensions</option></select></label>
          {draft.dimensionOptionId==='custom'?<><label className="text-xs font-black text-slate-600">Width (mm)<input type="number" min="1" value={draft.customWidthMm} onChange={(e)=>setDraft({...draft,customWidthMm:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label><label className="text-xs font-black text-slate-600">Height (mm)<input type="number" min="1" value={draft.customHeightMm} onChange={(e)=>setDraft({...draft,customHeightMm:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label><label className="text-xs font-black text-slate-600">Gusset (mm, optional)<input type="number" min="0" value={draft.customGussetMm} onChange={(e)=>setDraft({...draft,customGussetMm:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label></>:null}
          <label className="text-xs font-black text-slate-600 sm:col-span-2">Requirement notes<textarea rows={3} value={draft.notes} onChange={(e)=>setDraft({...draft,notes:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-black">Cancel</button><button type="button" disabled={saving} onClick={saveEdit} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving?'Saving…':'Save Requirement'}</button></div>
      </div>
    </div>:null}
  </div>;
}
