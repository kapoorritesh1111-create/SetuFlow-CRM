import Link from 'next/link';

type View = 'dashboard'|'sizes'|'constructions'|'rates'|'waste';

const items:{label:string;href:string;view?:View;badge?:string}[]=[
  {label:'Pricing Dashboard',href:'/admin/packaging-pricing-v5',view:'dashboard'},
  {label:'Sizes & KLDs',href:'/admin/packaging-pricing-v5?view=sizes',view:'sizes',badge:'20'},
  {label:'Constructions',href:'/admin/packaging-pricing-v5?view=constructions',view:'constructions',badge:'44'},
  {label:'Rates & Charges',href:'/admin/packaging-pricing-v5?view=rates',view:'rates'},
  {label:'Waste & Margins',href:'/admin/packaging-pricing-v5?view=waste',view:'waste'},
  {label:'Price Matrix',href:'/admin/packaging-pricing-v5/matrix'},
  {label:'Competitor Evaluator',href:'/admin/packaging-pricing-v5/matrix#competitor-evaluator'},
];

export default function PricingV5AdminNav({active='dashboard'}:{active?:View}){
  return <nav className="overflow-x-auto border-b border-slate-200 bg-white">
    <div className="flex min-w-max items-center gap-1 px-1">
      {items.map((item)=>{
        const selected=item.view===active;
        return <Link key={item.label} href={item.href} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-black transition ${selected?'border-blue-600 text-blue-700':'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950'}`}>
          <span>{item.label}</span>
          {item.badge?<span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">{item.badge}</span>:null}
        </Link>;
      })}
    </div>
  </nav>;
}
