'use client';

import { useMemo, useState } from 'react';
import { savePackagingConstructionLayersV5 } from '@/features/packaging/server/pricing-v5-admin-actions';

type LayerEditorProps={
  templateId:string;
  constructionId:string;
  isDraft:boolean;
  materials:any[];
  layers:any[];
};

const selectClass='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400';

export default function ConstructionLayerEditorV5({templateId,constructionId,isDraft,materials,layers}:LayerEditorProps){
  const initial=useMemo(()=>{
    const ordered=[...layers].sort((a:any,b:any)=>Number(a.layer_position)-Number(b.layer_position)).map((l:any)=>String(l.cost_master_item_id));
    return ordered.length>=2?ordered.slice(0,6):['',''];
  },[constructionId]);
  const [stack,setStack]=useState<string[]>(initial);

  function update(index:number,value:string){setStack((current)=>current.map((item,i)=>i===index?value:item));}
  function add(){setStack((current)=>current.length>=6?current:[...current,'']);}
  function remove(index:number){setStack((current)=>current.length<=2?current:current.filter((_,i)=>i!==index));}
  function move(index:number,direction:-1|1){
    setStack((current)=>{
      const next=[...current]; const target=index+direction;
      if(target<0||target>=next.length) return current;
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }

  const materialById=useMemo(()=>new Map(materials.map((m:any)=>[String(m.id),m])),[materials]);
  return <form action={savePackagingConstructionLayersV5} className="mt-4">
    <input type="hidden" name="template_id" value={templateId}/><input type="hidden" name="id" value={constructionId}/>
    {[1,2,3,4,5,6].map((n)=><input key={n} type="hidden" name={'layer_'+n} value={stack[n-1]??''}/>)}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Editable layer recipe</div><p className="mt-1 text-xs font-semibold text-slate-500">Reorder layers, add/remove optional layers, then save. Final layer must remain an approved PE sealant.</p></div>
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{stack.length} layers</span>
    </div>
    <div className="mt-3 space-y-2">
      {stack.map((id,index)=>{const material:any=materialById.get(String(id));return <div key={index} className="grid items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[42px_minmax(0,1fr)_auto]">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm">{index+1}</div>
        <div>
          <select disabled={!isDraft} value={id} onChange={(e)=>update(index,e.target.value)} className={selectClass}>
            <option value="">{index<2?'Select material':'Unused layer'}</option>
            {materials.map((m:any)=><option key={m.id} value={m.id}>{m.name}{m.micron?' · '+m.micron+'µ':m.gsm?' · '+m.gsm+' GSM':''}</option>)}
          </select>
          {material?<div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500"><span>{material.code}</span>{material.micron?<span>{material.micron}µ</span>:null}{material.gsm?<span>{material.gsm} GSM</span>:null}{index===stack.length-1?<span className="text-emerald-700">Sealant position</span>:null}</div>:null}
        </div>
        <div className="flex gap-1">
          <button type="button" disabled={!isDraft||index===0} onClick={()=>move(index,-1)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-black disabled:opacity-30" aria-label="Move layer up">↑</button>
          <button type="button" disabled={!isDraft||index===stack.length-1} onClick={()=>move(index,1)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-black disabled:opacity-30" aria-label="Move layer down">↓</button>
          <button type="button" disabled={!isDraft||stack.length<=2} onClick={()=>remove(index)} className="rounded-lg border border-rose-200 bg-white px-2 py-2 text-xs font-black text-rose-600 disabled:opacity-30" aria-label="Remove layer">×</button>
        </div>
      </div>})}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={add} disabled={!isDraft||stack.length>=6} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-30">+ Add layer</button>
      <button disabled={!isDraft||stack.some((id,index)=>index<2&&!id)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300">Save Layer Recipe</button>
    </div>
  </form>;
}
