import Link from 'next/link';

type Active='dashboard'|'sizes'|'constructions'|'rates'|'waste'|'matrix'|'competitor';

export default function PricingV5AdminNav({
  active='dashboard',model='sup',family='sup',form='pouch',constructionCount, sizeCount,
}:{active?:Active;model?:'sup'|'frame';family?:string;form?:string;constructionCount?:number;sizeCount?:number}){
  const base=model==='sup'?'/admin/packaging-pricing-v5':`/admin/packaging-pricing-v5?family=${encodeURIComponent(family)}&form=${encodeURIComponent(form)}`;
  const href=(view:string)=>view==='dashboard'?base:base+'&view='+view;
  const items=model==='sup'
    ? [
      {key:'dashboard' as Active,label:'Pricing Dashboard',href:'/admin/packaging-pricing-v5',icon:'■'},
      {key:'sizes' as Active,label:'Sizes & KLDs',href:'/admin/packaging-pricing-v5?view=sizes',badge:String(sizeCount??20),icon:'▣'},
      {key:'constructions' as Active,label:'Constructions',href:'/admin/packaging-pricing-v5?view=constructions',badge:String(constructionCount??44),icon:'▥'},
      {key:'rates' as Active,label:'Rates & Charges',href:'/admin/packaging-pricing-v5?view=rates',icon:'⊙'},
      {key:'waste' as Active,label:'Waste & Margins',href:'/admin/packaging-pricing-v5?view=waste',icon:'▤'},
      {key:'matrix' as Active,label:'Price Matrix',href:'/admin/packaging-pricing-v5/matrix',icon:'▦'},
      {key:'competitor' as Active,label:'Competitor Evaluator',href:'/admin/packaging-pricing-v5/matrix?view=competitor',icon:'♧'},
    ]
    : [
      {key:'dashboard' as Active,label:'Pricing Dashboard',href:href('dashboard'),icon:'■'},
      {key:'constructions' as Active,label:'Constructions',href:href('constructions'),badge:String(constructionCount??0),icon:'▥'},
      {key:'rates' as Active,label:'Rates & Charges',href:href('rates'),icon:'⊙'},
      {key:'waste' as Active,label:'Waste & Margins',href:href('waste'),icon:'▤'},
      {key:'matrix' as Active,label:'Price Matrix',href:href('matrix'),icon:'▦'},
    ];

  return <nav className="overflow-x-auto border-y border-slate-200 bg-white"><div className="flex min-w-max items-center px-3">{items.map((item)=>{const selected=item.key===active;return <Link key={item.key} href={item.href} className={'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition '+(selected?'border-blue-600 text-blue-700':'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950')}><span className="text-[10px] text-blue-700">{item.icon}</span><span>{item.label}</span>{item.badge?<span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{item.badge}</span>:null}</Link>;})}</div></nav>;
}
