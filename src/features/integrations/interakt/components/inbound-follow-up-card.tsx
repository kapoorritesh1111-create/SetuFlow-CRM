'use client';

import { useMemo, useState } from 'react';

import { PendingSubmitButton } from '@/features/integrations/interakt/components/pending-submit-button';
import { completeInboundFollowUp, createOrRescheduleInboundFollowUp } from '@/features/integrations/interakt/review-actions';

type FollowUp = { id: string; scheduledAt: string; notes?: string | null } | null;

function localInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialLocal(followUp: FollowUp) {
  if (followUp?.scheduledAt) {
    const existing = new Date(followUp.scheduledAt);
    if (!Number.isNaN(existing.getTime())) return localInputValue(existing);
  }
  const next = new Date(Date.now() + 60 * 60 * 1000);
  next.setSeconds(0, 0);
  return localInputValue(next);
}

export function InboundFollowUpCard({
  rowId,
  customerName,
  canWork,
  followUp,
}: {
  rowId: string;
  customerName: string;
  canWork: boolean;
  followUp: FollowUp;
}) {
  const [localWhen, setLocalWhen] = useState(() => initialLocal(followUp));
  const scheduledAt = useMemo(() => {
    const parsed = new Date(localWhen);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }, [localWhen]);

  const existingDate = followUp?.scheduledAt ? new Date(followUp.scheduledAt) : null;
  const overdue = Boolean(existingDate && existingDate.getTime() < Date.now());
  const existingLabel = existingDate && !Number.isNaN(existingDate.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(existingDate)
    : null;

  const quick = (minutes: number) => {
    const date = new Date(Date.now() + minutes * 60 * 1000);
    date.setSeconds(0, 0);
    setLocalWhen(localInputValue(date));
  };
  const tomorrowMorning = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    setLocalWhen(localInputValue(date));
  };

  return <section id="inbound-follow-up" className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">⏰ Follow-up</h3>
        <p className="mt-1 text-xs font-black text-slate-950">{followUp ? (overdue ? 'Follow-up overdue' : 'Follow-up scheduled') : 'No follow-up scheduled'}</p>
        {existingLabel ? <p className={`mt-1 text-[10px] font-bold ${overdue ? 'text-rose-700' : 'text-amber-800'}`}>{existingLabel}</p> : null}
        {followUp?.notes ? <p className="mt-1 text-[10px] leading-4 text-slate-600">{followUp.notes}</p> : null}
      </div>
      {followUp ? <form action={completeInboundFollowUp}>
        <input type="hidden" name="rowId" value={rowId} />
        <input type="hidden" name="followUpId" value={followUp.id} />
        <PendingSubmitButton disabled={!canWork} idleLabel="Complete" pendingLabel="Saving…" className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-emerald-700" />
      </form> : null}
    </div>

    <form action={createOrRescheduleInboundFollowUp} className="mt-3 space-y-2">
      <input type="hidden" name="rowId" value={rowId} />
      <input type="hidden" name="scheduledAt" value={scheduledAt} />
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => quick(30)} className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[9px] font-black text-amber-800">30 min</button>
        <button type="button" onClick={() => quick(60)} className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[9px] font-black text-amber-800">1 hour</button>
        <button type="button" onClick={() => quick(120)} className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[9px] font-black text-amber-800">2 hours</button>
        <button type="button" onClick={() => quick(180)} className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[9px] font-black text-amber-800">Later today</button>
        <button type="button" onClick={tomorrowMorning} className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-[9px] font-black text-amber-800">Tomorrow 10 AM</button>
      </div>
      <input type="datetime-local" value={localWhen} onChange={(event) => setLocalWhen(event.target.value)} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800" />
      <select name="reason" defaultValue="Call customer" className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800">
        <option>Call customer</option>
        <option>Call back requested</option>
        <option>Ask for artwork</option>
        <option>Check sample decision</option>
        <option>Discuss pricing</option>
        <option>Confirm requirement</option>
      </select>
      <textarea name="notes" rows={2} placeholder={`Notes for follow-up with ${customerName}`} className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800" />
      <p className="text-[9px] leading-4 text-amber-800">Setu Flow will remind you about 15 minutes before the scheduled time and keep overdue follow-ups visible until completed.</p>
      <PendingSubmitButton disabled={!canWork || !scheduledAt} idleLabel={followUp ? 'Reschedule follow-up' : 'Set follow-up'} pendingLabel="Saving follow-up…" className="w-full rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-black text-white" />
    </form>
  </section>;
}
