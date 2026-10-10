'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import KldDraftGenerator from '@/features/packaging/components/kld-draft-generator';
import { activatePackagingKldV5, uploadPackagingKldV5 } from '@/features/packaging/server/pricing-v5-admin-actions';

export default function PricingV5KldManager({templateId,size,klds=[]}:{templateId:string;size:any;klds?:any[]}){
  const router=useRouter();
  const [file,setFile]=useState<File|null>(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [pending,startTransition]=useTransition();

  const versions=useMemo(()=>klds
    .filter((item:any)=>String(item.spec_key??item.size_preset_key??'')===String(size?.size_key??''))
    .sort((a:any,b:any)=>Number(b.version??0)-Number(a.version??0)),[klds,size?.size_key]);
  const active=versions.find((item:any)=>item.is_active)??null;

  function upload(){
    if(!file||!size?.id) return;
    setMessage('');setError('');
    startTransition(async()=>{
      const form=new FormData();
      form.set('template_id',templateId);
      form.set('size_profile_id',String(size.id));
      form.set('file',file);
      const result:any=await uploadPackagingKldV5(form);
      if(!result.ok){setError(result.error??'KLD upload failed.');return;}
      setMessage((result.fileName??'KLD')+' uploaded and approved as KLD v'+String(result.version??''));
      setFile(null);
      router.refresh();
    });
  }

  return <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">KLD / Dieline</div>
        <h4 className="mt-1 text-sm font-black text-slate-950">{active?'Approved KLD linked':'Replacement KLD required'}</h4>
        <p className="mt-1 text-xs font-semibold text-slate-500">Upload a replacement PDF or reactivate an earlier approved version. The active file is what Sales can select for this exact size.</p>
      </div>
      <span className={'rounded-full px-2.5 py-1 text-[10px] font-black '+(active?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700')}>{active?'v'+String(active.version)+' active':'Needs KLD'}</span>
    </div>

    {active?<div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white p-3">
      <div><div className="text-xs font-black text-slate-900">{active.file_name}</div><div className="mt-0.5 text-[10px] font-semibold text-slate-500">Version {active.version} · approved for {size.name}</div></div>
      {active.public_token?<a href={'/api/public/packaging-kld/'+active.public_token} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-blue-700">View KLD</a>:null}
    </div>:null}

    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
      <input type="file" accept="application/pdf,.pdf" onChange={(e)=>setFile(e.target.files?.[0]??null)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"/>
      <button type="button" onClick={upload} disabled={!file||pending} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300">{pending?'Uploading…':active?'Replace KLD':'Upload Approved KLD'}</button>
    </div>

    <KldDraftGenerator size={size}/>

    {versions.length>1?<details className="mt-3">
      <summary className="cursor-pointer text-xs font-black text-slate-700">KLD version history ({versions.length})</summary>
      <div className="mt-2 space-y-2">{versions.map((item:any)=><div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
        <div className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-900">v{item.version} · {item.file_name}</b><span className="text-[10px] text-slate-500">{item.is_active?'Currently active':'Previous approved version'}</span></div>
        {item.public_token?<a href={'/api/public/packaging-kld/'+item.public_token} target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-700">View</a>:null}
        {!item.is_active?<form action={activatePackagingKldV5}><input type="hidden" name="template_id" value={templateId}/><input type="hidden" name="size_profile_id" value={size.id}/><input type="hidden" name="kld_id" value={item.id}/><button className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-700">Make Active</button></form>:null}
      </div>)}</div>
    </details>:null}

    {message?<div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">{message}</div>:null}
    {error?<div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">{error}</div>:null}
  </div>;
}
