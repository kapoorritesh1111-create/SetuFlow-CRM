import Link from 'next/link';

type Active='dashboard'|'sizes'|'constructions'|'rates'|'waste'|'matrix'|'competitor';
const items:{key:Active;label:string;href:string;badge?:string;icon:string}[]=[
  {key:'dashboard',label:'Pricing Dashboard',href:'/admin/packaging-pricing-v5',icon:'■'},
  {key:'sizes',label:'Sizes & KLDs',href:'/admin/packaging-pricing-v5?view=sizes',badge:'20',icon:'▣'},
  {key:'constructions',label:'Constructions',href:'/admin/packaging-pricing-v5?view=constructions',badge:'44',icon:'▥'},
  {key:'rates',label:'Rates & Charges',href:'/admin/packaging-pricing-v5?view=rates',icon:'⊙'},
  {key:'waste',label:'Waste & Margins',href:'/admin/packaging-pricing-v5?view=waste',icon:'▤'},
  {key:'matrix',label:'Price Matrix',href:'/admin/packaging-pricing-v5/matrix',icon:'▦'},
  {key:'competitor',label:'Competitor Evaluator',href:'/admin/packaging-pricing-v5/matrix?view=competitor',icon:'♧'},
];

export default function PricingV5AdminNav({active='dashboard'}:{active?:Active}){
  return <nav className="overflow-x-auto border-y border-slate-200 bg-white">
    <div className="flex min-w-max items-center px-3">
      {items.map((item)=>{const selected=item.key===active;return <Link key={item.key} href={item.href} className={'flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition '+(selected?'border-blue-600 text-blue-700':'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950')}><span className="text-[10px] text-blue-700">{item.icon}</span><span>{item.label}</span>{item.badge?<span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{item.badge}</span>:null}</Link>;})}
    </div>
  </nav>;
}
