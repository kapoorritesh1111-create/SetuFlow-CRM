'use client';

import { useEffect, useState } from 'react';
import { publishPackagingTemplateV5 } from '@/features/packaging/server/pricing-v5-admin-actions';

const EDIT_SURFACE_ID='pricing-v5-admin-edit-surface';

function isPersistedPricingField(target:EventTarget|null){
  if(!(target instanceof HTMLElement)) return false;
  const form=target.closest('form');
  if(!(form instanceof HTMLFormElement)) return false;
  if(form.id==='pricing-v5-header-publish-form') return false;
  return Boolean(form.querySelector('input[name="template_id"]'));
}

export default function PricingV5SafePublishButton({templateId}:{templateId:string}){
  const [dirty,setDirty]=useState(false);
  const [publishing,setPublishing]=useState(false);

  useEffect(()=>{
    const surface=document.getElementById(EDIT_SURFACE_ID);
    if(!surface) return;
    const markDirty=(event:Event)=>{ if(isPersistedPricingField(event.target)) setDirty(true); };
    const markSaved=()=>setDirty(false);
    surface.addEventListener('input',markDirty,true);
    surface.addEventListener('change',markDirty,true);
    window.addEventListener('pricing-v5-save-success',markSaved);
    return ()=>{
      surface.removeEventListener('input',markDirty,true);
      surface.removeEventListener('change',markDirty,true);
      window.removeEventListener('pricing-v5-save-success',markSaved);
    };
  },[]);

  return <div className="flex flex-col items-end gap-1">
    <form id="pricing-v5-header-publish-form" action={publishPackagingTemplateV5} onSubmit={()=>setPublishing(true)}>
      <input type="hidden" name="template_id" value={templateId}/>
      <button
        disabled={dirty||publishing}
        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {publishing?'Publishing…':'Publish Changes'}
      </button>
    </form>
    {dirty?<span role="status" className="max-w-[240px] text-right text-[10px] font-bold text-amber-700">Unsaved edits detected. Save the changed row or section before publishing.</span>:null}
  </div>;
}
