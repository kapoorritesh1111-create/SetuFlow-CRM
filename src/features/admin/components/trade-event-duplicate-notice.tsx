import Link from 'next/link';
import { createEnrichedTradeEvent } from '@/features/admin/server/trade-event-actions';

export type TradeEventDraft = {
  name?: string;
  city?: string;
  country?: string;
  starts_on?: string;
  ends_on?: string;
  booth_number?: string;
  notes?: string;
  image_url?: string;
  website_url?: string;
};

export function TradeEventDuplicateNotice({ kind, candidateId, eventName, draft }: { kind: 'exact' | 'possible'; candidateId: string; eventName: string; draft?: TradeEventDraft }) {
  return <section className={`mb-4 rounded-2xl border p-4 ${kind === 'exact' ? 'border-blue-200 bg-blue-50 text-blue-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
    <p className="text-xs font-black uppercase tracking-[0.16em]">{kind === 'exact' ? 'Existing event found' : 'Possible duplicate found'}</p>
    <h2 className="mt-1 text-lg font-black">{eventName || 'Trade event'}</h2>
    <p className="mt-1 text-sm font-semibold opacity-80">{kind === 'exact' ? 'Setu Flow prevented another copy of the same event. Use the existing event instead.' : 'The name/year looks similar but the identity is incomplete. Review the existing event before creating another record.'}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Link href={`/admin/trade-events?eventId=${encodeURIComponent(candidateId)}`} className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white">Open existing event</Link>
      {kind === 'possible' && draft?.name ? <form action={createEnrichedTradeEvent}>
        {Object.entries(draft).map(([key, value]) => <input key={key} type="hidden" name={key} value={value ?? ''} />)}
        <input type="hidden" name="allow_duplicate" value="1" />
        <button className="inline-flex min-h-10 items-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-black text-amber-900" type="submit">Create anyway</button>
      </form> : null}
      <Link href="/admin/trade-events" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">Cancel</Link>
    </div>
  </section>;
}
