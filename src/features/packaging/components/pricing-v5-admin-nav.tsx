import Link from 'next/link';

type Active='dashboard'|'sizes'|'constructions'|'rates'|'waste'|'matrix'|'competitor';

export default function PricingV5AdminNav({
  active='dashboard',model='sup',family='sup',form='pouch',constructionCount,sizeCount,
}:{active?:Active;model?:'sup'|'frame';family?:string;form?:string;constructionCount?:number;sizeCount?:number}){
  const familyQuery=model==='sup'?'':`&family=${encodeURIComponent(family)}&form=${encodeURIComponent(form)}`;
  const href=(view:string)=>view==='dashboard'
    ? (model==='sup'?'/admin/packaging-pricing-v5':`/admin/packaging-pricing-v5?family=${encodeURIComponent(family)}&form=${encodeURIComponent(form)}`)
    : `/admin/packaging-pricing-v5?view=${encodeURIComponent(view)}${familyQuery}`;
  const items=[
    {key:'dashboard' as Active,label:'Pricing Dashboard',href:href('dashboard'),icon:'■'},
    ...(model==='sup'?[{key:'sizes' as Active,label:'Sizes & KLDs',href:href('sizes'),badge:String(sizeCount??20),icon:'▣'}]:[]),
    {key:'constructions' as Active,label:'Constructions',href:href('constructions'),badge:String(constructionCount??0),icon:'▥'},
    {key:'rates' as Active,label:'Rates & Charges',href:href('rates'),icon:'⊙'},
    {key:'waste' as Active,label:'Waste & Margins',href:href('waste'),icon:'▤'},
    {key:'matrix' as Active,label:'Price Matrix',href:href('matrix'),icon:'▦'},
    ...(model==='sup'?[{key:'competitor' as Active,label:'Competitor Evaluator',href:href('competitor'),icon:'♧'}]:[]),
  ];
  return <nav className="overflow-x-auto border-y border-slate-200 bg-white"><div className="flex min-w-max items-center px-3">{items.map((item)=>{const selected=item.key===active;return <Link key={item.key} href={item.href} className={'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition '+(selected?'border-blue-600 text-blue-700':'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950')}><span className="text-[10px] text-blue-700">{item.icon}</span><span>{item.label}</span>{item.badge?<span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{item.badge}</span>:null}</Link>;})}</div></nav>;
}
