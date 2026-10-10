'use client';

import { useMemo, useState } from 'react';

type Family = 'SUP' | '3SS' | 'CSS';
type Props = { size: { width_mm?: number | string | null; height_mm?: number | string | null; bottom_gusset_each_mm?: number | string | null; name?: string | null } };

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mm = (n: number) => Number(n.toFixed(2));
const rect = (x:number,y:number,w:number,h:number,color:string,dash='') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width=".55" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const txt = (x:number,y:number,value:unknown,size=5,color='#334155') =>
  `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${esc(value)}</text>`;

function draftSvg(family:Family,w:number,h:number,g:number,side:number,top:number,bottom:number,center:number,repeat:number,version:string) {
  const margin=22, x=margin, y=34, ink='#db2777',safe='#059669',fold='#2563eb';
  const hasGusset=family==='SUP';
  const webWidth=family==='CSS'?2*w+center:family==='3SS'?2*w:w;
  const panelHeight=family==='CSS'?repeat:h;
  const span=family==='SUP'?(h*2+2*g):family==='3SS'?panelHeight:panelHeight;
  const totalH=span+76, totalW=webWidth+2*margin+30;
  let shapes='';
  if(family==='SUP') {
    shapes+=rect(x,y,w,h,ink)+rect(x,y+h,w,2*g,ink)+rect(x,y+h+2*g,w,h,ink);
    shapes+=rect(x+side,y+top,w-2*side,h-top-bottom,safe,'2 2');
    shapes+=rect(x+side,y+h+2*g+top,w-2*side,h-top-bottom,safe,'2 2');
    shapes+=`<line x1="${x}" y1="${y+h+g}" x2="${x+w}" y2="${y+h+g}" stroke="${fold}" stroke-width=".55" stroke-dasharray="3 2"/>`;
    shapes+=txt(x+3,y+h/2,'FRONT',6)+txt(x+3,y+h+g,'GUSSET '+g+' + '+g+' mm',5)+txt(x+3,y+h+2*g+h/2,'BACK',6);
  } else if(family==='3SS') {
    shapes+=rect(x,y,w,h,ink)+rect(x+w,y,w,h,ink);
    shapes+=rect(x+side,y+top,w-2*side,h-top-bottom,safe,'2 2');
    shapes+=rect(x+w+side,y+top,w-2*side,h-top-bottom,safe,'2 2');
    shapes+=`<line x1="${x+w}" y1="${y}" x2="${x+w}" y2="${y+h}" stroke="${fold}" stroke-width=".55" stroke-dasharray="3 2"/>`;
    shapes+=txt(x+3,y+h/2,'FRONT',6)+txt(x+w+3,y+h/2,'BACK',6);
  } else {
    shapes+=rect(x,y,webWidth,repeat,ink);
    shapes+=rect(x+side,y+top,w-2*side,repeat-top-bottom,safe,'2 2');
    shapes+=rect(x+w+center+side,y+top,w-2*side,repeat-top-bottom,safe,'2 2');
    shapes+=rect(x+w,y,center,repeat,fold,'3 2');
    shapes+=txt(x+3,y+repeat/2,'FRONT',6)+txt(x+w+center+3,y+repeat/2,'BACK',6)+txt(x+w+1,y+9,'BACK SEAL',4);
    shapes+=`<line x1="${x}" y1="${y+repeat}" x2="${x+webWidth}" y2="${y+repeat}" stroke="${fold}" stroke-width=".55" stroke-dasharray="3 2"/>`;
  }
  const subtitle = family==='SUP'?'Front / gusset / back flat layout':family==='3SS'?'Front and back conceptual layout':'One web repeat / center-back seal conceptual layout';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${mm(totalW)}mm" height="${mm(totalH)}mm" viewBox="0 0 ${totalW} ${totalH}">
    <rect width="100%" height="100%" fill="white"/>
    ${txt(10,11,'STARK PACKMATE — '+family+' KLD',8,'#0f172a')}
    ${txt(10,19,subtitle+' | '+w+' × '+h+' mm',5)}
    ${txt(10,27,'DRAFT — ENGINEERING REVIEW ONLY — NOT APPROVED FOR PRODUCTION',5,'#b91c1c')}
    ${shapes}
    ${txt(10,totalH-31,'Magenta: panel outline | Green dashed: provisional safe area | Blue: fold / seal reference',4)}
    ${txt(10,totalH-23,'Side allowance '+side+' mm | Top '+top+' mm | Bottom '+bottom+' mm | Center seal '+center+' mm',4)}
    ${txt(10,totalH-15,'Provisional artwork guide; dimensions and conversion geometry require manufacturer validation.',4,'#b91c1c')}
    ${txt(10,totalH-8,'Draft revision '+version+' | Editable values are NOT manufacturing-certified.',4)}
  </svg>`;
}
export default function KldDraftGenerator({size}:Props) {
  const [family,setFamily]=useState<Family>('SUP');
  const [width,setWidth]=useState(Number(size.width_mm)||140);
  const [height,setHeight]=useState(Number(size.height_mm)||230);
  const [gusset,setGusset]=useState(Number(size.bottom_gusset_each_mm)||55);
  const [side,setSide]=useState(8);
  const [top,setTop]=useState(15);
  const [bottom,setBottom]=useState(10);
  const [center,setCenter]=useState(10);
  const [repeat,setRepeat]=useState(Number(size.height_mm)||230);
  const svg=useMemo(()=>draftSvg(family,width,height,gusset,side,top,bottom,center,repeat,'1'),[family,width,height,gusset,side,top,bottom,center,repeat]);
  const valid=[width,height,side,top,bottom,center,repeat].every(v=>Number.isFinite(v)&&v>0)&&gusset>=0&&width>2*side&&height>top+bottom;
  function download(){
    if(!valid)return;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    const a=document.createElement('a');a.href=url;a.download=`Stark_${family}_${width}x${height}_ENGINEERING_REVIEW.svg`;a.click();
    URL.revokeObjectURL(url);
  }
  const field=(name:string,value:number,set:(n:number)=>void)=><label className="text-xs font-semibold text-slate-600">{name}<input type="number" min="0" step="0.5" value={value} onChange={e=>set(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-900"/></label>;
  return <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
    <summary className="cursor-pointer text-xs font-black text-slate-800">Generate or adjust a draft KLD (engineering review)</summary>
    <p className="mt-2 text-xs text-amber-900">These provisional templates are never activated as approved KLDs. Download the draft for design review, then upload a manufacturer-approved PDF above when ready.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
      <label className="text-xs font-semibold text-slate-600">Pouch family<select value={family} onChange={e=>setFamily(e.target.value as Family)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="SUP">Stand Up Pouch</option><option value="3SS">3 Side Seal</option><option value="CSS">Center Seal</option></select></label>
      {field('Width (mm)',width,setWidth)}
      {field('Height (mm)',height,setHeight)}
      {family==='SUP'?field('Each gusset half (mm)',gusset,setGusset):null}
      {field('Side allowance (mm)',side,setSide)}
      {field('Top allowance (mm)',top,setTop)}
      {field('Bottom allowance (mm)',bottom,setBottom)}
      {family==='CSS'?<>{field('Center back seal (mm)',center,setCenter)}{field('Web repeat (mm)',repeat,setRepeat)}</>:null}
    </div>
    {!valid?<p className="mt-2 text-xs font-bold text-red-700">Enter valid dimensions and allowances before exporting.</p>:null}
    <div className="mt-3 overflow-auto rounded-lg border border-slate-200 bg-white p-3">
      {valid?<div className="mx-auto max-w-xl" dangerouslySetInnerHTML={{__html:svg}}/>:null}
    </div>
    <button type="button" disabled={!valid} onClick={download} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white disabled:opacity-40">Download editable draft SVG</button>
  </details>;
}
