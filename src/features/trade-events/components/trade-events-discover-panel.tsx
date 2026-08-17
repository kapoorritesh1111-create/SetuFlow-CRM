import { ExternalLink, Sparkles } from 'lucide-react';
import { saveTradeEventRecommendationFeedback } from '@/features/trade-events/server/event-recommendation-actions';
import type { TradeEventRecommendation } from '@/lib/trade-events/recommendations';
import { formatDate } from '@/lib/utils';

function dateRange(item: TradeEventRecommendation) {
  if (!item.startsOn && !item.endsOn) return 'Dates not set';
  if (item.startsOn && (!item.endsOn || item.startsOn === item.endsOn)) return formatDate(item.startsOn);
  if (!item.startsOn) return formatDate(item.endsOn);
  return `${formatDate(item.startsOn)} – ${formatDate(item.endsOn)}`;
}

export function TradeEventsDiscoverPanel({ recommendations }: { recommendations: TradeEventRecommendation[] }) {
  return <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
    <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700"><Sparkles className="h-4 w-4" />Setu Guru discovery</p>
    <h2 className="mt-2 text-2xl font-black">Verified recommendations only</h2>
    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">Future shows are ranked only when Setu Flow has a real catalog event and a defensible organization, product, market, or historical-fit reason.</p>
    {!recommendations.length ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-600">No verified organization-specific recommendations are available yet. Setu Flow will leave this space empty instead of inventing a recommendation.</div> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{recommendations.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-950">{item.name}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{[item.city,item.country].filter(Boolean).join(', ') || 'Location TBD'} · {dateRange(item)}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{item.score}% fit</span></div><div className="mt-3 space-y-1">{item.reasons.map((reason) => <p key={reason} className="text-xs font-semibold text-slate-600">• {reason}</p>)}</div><div className="mt-4 flex flex-wrap gap-2">{item.websiteUrl ? <a href={item.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">Official site <ExternalLink className="ml-1 h-3.5 w-3.5" /></a> : null}<form action={saveTradeEventRecommendationFeedback}><input type="hidden" name="catalog_event_id" value={item.id} /><input type="hidden" name="feedback" value="saved" /><button className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white">Save event</button></form><form action={saveTradeEventRecommendationFeedback} className="flex gap-1"><input type="hidden" name="catalog_event_id" value={item.id} /><input type="hidden" name="feedback" value="not_relevant" /><select name="reason" defaultValue="wrong_industry" className="min-h-10 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"><option value="wrong_industry">Wrong industry</option><option value="wrong_country">Wrong country</option><option value="too_far">Too far</option><option value="already_know">Already know it</option><option value="other">Other</option></select><button className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">Not relevant</button></form></div></article>)}</div>}
  </section>;
}
