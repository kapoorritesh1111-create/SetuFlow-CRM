import Link from 'next/link';
import { FileText, Paperclip, UserRound } from 'lucide-react';
import { EventAttachmentUploader } from './event-attachment-uploader';
import { entryFollowUpSla, entryProductInterest } from '@/lib/trade-events/command-center';
import type { TradeCommandAttachment, TradeCommandEntry } from '@/lib/trade-events/query';

function capturedLabel(entry: TradeCommandEntry) {
  const date = entry.captured_at ? new Date(entry.captured_at) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Captured at event';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function interactionName(entry: TradeCommandEntry) {
  return entry.captured_contact_name || entry.captured_company_name || 'Event contact';
}

export function EventInteractionsPanel({
  eventId,
  entries,
  attachments,
  attachmentStorageReady,
}: {
  eventId: string;
  entries: TradeCommandEntry[];
  attachments: TradeCommandAttachment[];
  attachmentStorageReady: boolean;
}) {
  const visible = entries
    .filter((entry) => String(entry.trade_event_id ?? '') === eventId)
    .slice(0, 6);
  const attachmentCount = new Map<string, number>();
  for (const item of attachments) attachmentCount.set(item.trade_event_entry_id, (attachmentCount.get(item.trade_event_entry_id) ?? 0) + 1);

  if (!visible.length) return null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Recent booth interactions</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Conversation evidence</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Keep photos, samples, cards and specification files attached to the event interaction that created the follow-up.</p>
        </div>
        <Link href={`/leads?view=trade-event&eventId=${encodeURIComponent(eventId)}`} className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-700">Review all leads</Link>
      </div>

      {!attachmentStorageReady ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
          Attachment upload is staged and will activate automatically after the approved Trade Event database/storage migration. Current event interactions remain fully usable.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {visible.map((entry) => {
          const interest = entryProductInterest(entry);
          const sla = entryFollowUpSla(entry);
          const count = attachmentCount.get(entry.id) ?? 0;
          return (
            <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><UserRound className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{interactionName(entry)}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{entry.captured_company_name || 'Company not captured'} · {capturedLabel(entry)}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-700">{interest || 'Product interest still needs review'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.08em]">
                  {sla.heat === 'hot' ? <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Hot</span> : null}
                  {sla.overdue ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">SLA overdue</span> : null}
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-1 text-slate-600"><Paperclip className="mr-1 h-3 w-3" />{count}</span>
                  {entry.converted_lead_id ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">CRM linked</span> : <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-600">Needs review</span>}
                </div>
              </div>

              {entry.captured_notes ? <p className="mt-3 flex items-start gap-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{entry.captured_notes}</p> : null}
              {attachmentStorageReady ? <div className="mt-3"><EventAttachmentUploader entryId={entry.id} /></div> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
