'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Boxes, Gauge, Globe2, Lightbulb, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { workspacePanelClass } from '@/components/ui/workspace-surfaces';

export type PackagingPricingIntelligenceData = {
  families: Array<{name:string;slug:string;is_quoteable:boolean;pricing_engine_type:string|null;published_templates:number}>;
  activeFamilyCount:number;
  setupFamilyCount:number;
  currentSup:{templateId:string|null;publishedAt:string|null;sizes:number;constructions:number;bands:number;costRates:number;chargeRates:number;missingChargeRates:number}|null;
  quoteCount:number;
  approvedQuoteCount:number;
  orderCount:number;
  discountCount:number;
  benchmarkCount:number;
  trackedCompetitors:string[];
  bucketMap:Array<{bucket:number;sizes:string[]}>;
};

type Tab='overview'|'buckets'|'market'|'optimization';

const tabs:Array<{key:Tab;label:string}>=[
  {key:'overview',label:'Overview'},
  {key:'buckets',label:'Bucket Intelligence'},
  {key:'market',label:'Market Intelligence'},
  {key:'optimization',label:'Optimization'},
];

function Metric({label,value,sub}:{label:string;value:string|number;sub:string}){
  return <div className="rounded-2xl border border-line bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-content-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-content-primary">{value}</p><p className="mt-1 text-xs text-content-muted">{sub}</p></div>;
}

export function PackagingPricingIntelligenceWorkspace({data}:{data:PackagingPricingIntelligenceData}){
  const [tab,setTab]=useState<Tab>('overview');
  const liveFamilies=data.families.filter(x=>x.published_templates>0);
  const sup=data.currentSup;
  const readiness=Math.round(((data.activeFamilyCount-data.setupFamilyCount)/Math.max(1,data.activeFamilyCount))*100);
  const evidenceScore=Math.min(100,Math.round((Math.min(data.approvedQuoteCount,20)*2)+(Math.min(data.orderCount,20)*2.5)+(Math.min(data.benchmarkCount,20)*2.5)));
  const topBucketRows=useMemo(()=>data.bucketMap.slice(0,12),[data.bucketMap]);

  return <div className="space-y-4">
    <div className={cn(workspacePanelClass,'overflow-hidden')}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Stark Packmate</p><h1 className="mt-1 text-2xl font-semibold text-content-primary">Pricing Intelligence</h1><p className="mt-1 max-w-3xl text-sm text-content-secondary">Owner view of pricing health today, bucket impact, market evidence and future optimization using approved quotes, discounts and orders.</p></div>
        <div className="rounded-xl bg-info-bg px-3 py-2 text-xs font-medium text-brand-800">Owner decision remains final</div>
      </div>
      <nav className="flex overflow-x-auto p-2">{tabs.map(item=><button key={item.key} onClick={()=>setTab(item.key)} className={cn('shrink-0 rounded-xl px-4 py-2 text-sm font-medium',tab===item.key?'bg-brand-800 text-white':'text-content-secondary hover:bg-surface-2')}>{item.label}</button>)}</nav>
    </div>

    {tab==='overview'?<>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Overall status" value={data.setupFamilyCount?'AMBER':'GREEN'} sub="Pricing setup and evidence readiness"/>
        <Metric label="Families live" value={liveFamilies.length} sub={`of ${data.activeFamilyCount} active families`}/>
        <Metric label="Needs setup" value={data.setupFamilyCount} sub="No published pricing template"/>
        <Metric label="SUP sizes" value={sup?.sizes??0} sub="Current published revision"/>
        <Metric label="SUP constructions" value={sup?.constructions??0} sub="Current published revision"/>
        <Metric label="Market evidence" value={data.benchmarkCount} sub="Verified benchmark observations"/>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <section className={cn(workspacePanelClass,'p-5')}>
          <div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">Service Family Health</h2></div>
          <div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-left text-xs uppercase text-content-muted"><tr><th className="pb-2">Family</th><th>Pricing</th><th>Quoteable</th><th>Status</th></tr></thead><tbody>{data.families.map(f=><tr key={f.slug} className="border-t border-line"><td className="py-3 font-medium">{f.name}</td><td>{f.pricing_engine_type??'Manual / not set'}</td><td>{f.is_quoteable?'Yes':'No'}</td><td><span className={cn('rounded-full px-2 py-1 text-xs font-medium',f.published_templates>0?'bg-success-bg text-success-fg':f.is_quoteable?'bg-warning-bg text-warning-fg':'bg-surface-2 text-content-muted')}>{f.published_templates>0?'Live':f.is_quoteable?'Needs pricing':'Setup later'}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className={cn(workspacePanelClass,'p-5')}>
          <div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">Owner Insights</h2></div>
          <div className="mt-4 space-y-3 text-sm text-content-secondary">
            <p><b className="text-content-primary">SUP:</b> {sup?.sizes??0} sizes, {sup?.constructions??0} constructions and {sup?.bands??0} commercial bands are live.</p>
            <p><b className="text-content-primary">Current controls:</b> bucket choices are treated as owner-approved; intelligence explains impact rather than overriding them.</p>
            <p><b className="text-content-primary">Evidence:</b> {data.approvedQuoteCount} approved quotes, {data.orderCount} orders, {data.discountCount} discount/override records and {data.benchmarkCount} competitor observations are available today.</p>
            <p><b className="text-content-primary">Readiness:</b> {readiness}% of active families have published pricing coverage.</p>
          </div>
        </section>
      </div>
    </>:null}

    {tab==='buckets'?<>
      <div className="grid gap-3 md:grid-cols-4"><Metric label="SUP pricing groups" value={new Set(data.bucketMap.map(x=>x.bucket)).size} sub="Owner-managed mapping"/><Metric label="Commercial bands" value={sup?.bands??0} sub="Waste + margin run bands"/><Metric label="Missing charge rates" value={sup?.missingChargeRates??0} sub="Requires review if used"/><Metric label="Evidence score" value={evidenceScore+'%'} sub="Grows with quotes, orders and market data"/></div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.85fr]">
        <section className={cn(workspacePanelClass,'p-5')}>
          <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">Bucket Impact Map</h2></div>
          <p className="mt-1 text-sm text-content-muted">Shows how Akshay currently groups sizes. The next layer will compare each group against realized selling price, approved discounts and market evidence by construction.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{topBucketRows.map(row=><div key={row.bucket} className="rounded-xl border border-line bg-surface-1 p-4"><div className="flex items-center justify-between"><b>Bucket {row.bucket}</b><span className="text-xs text-content-muted">{row.sizes.length} size{row.sizes.length===1?'':'s'}</span></div><p className="mt-2 text-xs leading-5 text-content-secondary">{row.sizes.join(' · ')}</p></div>)}</div>
        </section>
        <section className={cn(workspacePanelClass,'p-5')}>
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">Optimal Bucket Logic</h2></div>
          <div className="mt-4 space-y-3">
            {['Current bucket price curve','Approved / realized quote price','Discount dependence','Order conversion','Verified competitor range'].map((x,i)=><div key={x} className="flex items-center gap-3 rounded-xl border border-line p-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-info-bg text-xs font-semibold text-brand-800">{i+1}</span><span className="text-sm">{x}</span></div>)}
          </div>
          <div className="mt-4 rounded-xl border border-warning-line bg-warning-bg p-4 text-sm text-warning-fg">Recommendations stay informational until evidence is strong enough. No pricing bucket is changed automatically.</div>
        </section>
      </div>
    </>:null}

    {tab==='market'?<>
      <div className="grid gap-3 md:grid-cols-4"><Metric label="Tracked competitors" value={data.trackedCompetitors.length} sub="Named Stark benchmark set"/><Metric label="Verified observations" value={data.benchmarkCount} sub="Stored exact price evidence"/><Metric label="Coverage" value={data.benchmarkCount?'Active':'Building'} sub="By size, construction and quantity"/><Metric label="Confidence" value={evidenceScore+'%'} sub="Evidence-weighted"/></div>
      <section className={cn(workspacePanelClass,'p-5')}>
        <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">Tracked Market</h2></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.trackedCompetitors.map(name=><div key={name} className="rounded-2xl border border-line bg-white p-4"><b>{name}</b><p className="mt-2 text-xs text-content-muted">Tracked for flexible packaging relevance. Verified quotes or public price points will raise recommendation confidence.</p></div>)}</div>
        <div className="mt-4 rounded-xl bg-info-bg p-4 text-sm text-brand-900">Evidence hierarchy: Orders &gt; approved quotes &gt; customer-shared competitor quotes &gt; competitor website prices &gt; public listings &gt; estimated benchmarks.</div>
      </section>
    </>:null}

    {tab==='optimization'?<>
      <div className="grid gap-3 md:grid-cols-5"><Metric label="Quotes" value={data.quoteCount} sub="Available history"/><Metric label="Approved quotes" value={data.approvedQuoteCount} sub="High-value evidence"/><Metric label="Orders" value={data.orderCount} sub="Realized pricing evidence"/><Metric label="Discount signals" value={data.discountCount} sub="Overrides and discounts"/><Metric label="Optimization readiness" value={evidenceScore+'%'} sub="Improves as history grows"/></div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className={cn(workspacePanelClass,'p-5')}>
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">Optimization Learning Loop</h2></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{[
            ['1','Track approved pricing','Capture owner-approved changes and revision history.'],
            ['2','Learn realized price','Compare calculated price to approved quotes, discounts and orders.'],
            ['3','Compare market','Benchmark exact size + construction + quantity against verified competition.'],
            ['4','Recommend actions','Suggest hold / reduce / increase bucket or adjust only selected run bands.'],
          ].map(([n,t,b])=><div key={n} className="rounded-xl border border-line p-4"><span className="text-xs font-semibold text-brand-700">STEP {n}</span><b className="mt-1 block">{t}</b><p className="mt-2 text-xs leading-5 text-content-muted">{b}</p></div>)}</div>
        </section>
        <section className={cn(workspacePanelClass,'p-5')}>
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-700"/><h2 className="text-lg font-semibold">What the system will recommend</h2></div>
          <ul className="mt-4 space-y-3 text-sm text-content-secondary"><li>• Hold current bucket when pricing converts at healthy margin.</li><li>• Reduce a bucket or selected run band when successful quotes repeatedly require discounting.</li><li>• Increase pricing where orders convert with little discount and market evidence supports premium positioning.</li><li>• Flag insufficient evidence instead of fabricating an optimal price.</li></ul>
        </section>
      </div>
    </>:null}
  </div>;
}
