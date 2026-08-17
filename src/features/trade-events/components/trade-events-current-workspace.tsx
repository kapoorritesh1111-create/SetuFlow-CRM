import Link from 'next/link';
import { QrCode, UserPlus, UsersRound } from 'lucide-react';
import { EventGuruInsight } from './event-guru-insight';
import { EventLifecycleStrip } from './event-lifecycle-strip';
import { EventReadinessPanel } from './event-readiness-panel';
import { eventBooth, getEventTimingLabel } from '@/lib/trade-events/command-center';
import { buildTradeEventsViewModel } from '@/lib/trade-events/view-model';

type Model = ReturnType<typeof buildTradeEventsViewModel>;

function guruFor(model: Model) {
  if (!model.current) return { title: 'Add your first event', body: 'Once an event exists, Setu Guru can prioritize real event work.', href: '/admin/trade-events', action: 'Add event' };
  if (model.entrySummary.overdue > 0) return { title: `${model.entrySummary.overdue} event follow-ups are overdue`, body: 'These booth conversations have crossed their response target. Prioritize them before lower-risk event work.', href: `/leads?view=trade-event&eventId=${model.current.id}`, action: 'Review overdue' };
  if (model.status === 'upcoming' && model.readiness && model.readiness.score < 100) return { title: `${model.readiness.score}% event readiness`, body: `${model.readiness.checks.filter((item) => !item.done).length} setup items still need attention before capture starts.`, href: `/admin/trade-events?eventId=${model.current.id}`, action: 'Finish setup' };
  if (model.entrySummary.incomplete > 0) return { title: `${model.entrySummary.incomplete} captures need product interest`, body: 'Add the requirement signal before qualification and follow-up.', href: `/leads?view=trade-event&eventId=${model.current.id}`, action: 'Review captures' };
  if (model.unassigned > 0) return { title: `${model.unassigned} event leads are unassigned`, body: 'Assign an owner so event conversations do not sit without accountability.', href: `/leads?view=trade-event&eventId=${model.current.id}`, action: 'Assign leads' };
  if (model.noNextAction > 0) return { title: `${model.noNextAction} leads have no next action`, body: 'Add a follow-up, sample, catalog, pricing or meeting task.', href: `/leads?view=trade-event&eventId=${model.current.id}`, action: 'Create next actions' };
  return { title: `${model.openTasks.length} event follow-ups in motion`, body: 'This insight is based on current event entries, CRM leads and tasks.', href: '/tasks', action: 'Open follow-ups' };
}

export function TradeEventsCurrentWorkspace({ model }: { model: Model }) {
  const guru = guruFor(model);
  return <>
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {[[model.captured,'Captured'],[model.qualified,'Qualified'],[model.openTasks.length,'Follow-ups'],[model.entrySummary.hot,'Hot'],[model.pipeline,'Pipeline'],[model.meetings,'Meetings']].map(([value,label]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm"><p className="text-xl font-black">{value}</p><p className="text-[10px] font-bold text-slate-500">{label}</p></div>)}
    </section>
    {model.current ? <EventLifecycleStrip captured={model.captured} qualified={model.qualified} followUps={model.openTasks.length} converted={model.leads.length} pipelineLabel={model.pipeline} /> : null}
    <section className="hidden gap-4 lg:grid xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-[30px] bg-[linear-gradient(135deg,#06172e,#0b3f7f_65%,#0f766e)] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">{model.current ? getEventTimingLabel(model.current) : 'Next event'}</p>
        <h2 className="mt-2 text-3xl font-black">{model.current?.name ?? 'Add your first trade event'}</h2>
        <p className="mt-2 text-sm font-semibold text-blue-100">{model.current ? [model.current.city, model.current.country].filter(Boolean).join(', ') || 'Location TBD' : 'No event selected'}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-white/10 p-4"><div><small>BOOTH</small><b className="mt-1 block">{model.current ? eventBooth(model.current) : '—'}</b></div><div><small>CAPTURED</small><b className="mt-1 block">{model.captured}</b></div><div><small>PIPELINE</small><b className="mt-1 block">{model.pipeline}</b></div></div>
        <div className="mt-4 flex gap-2"><Link href={model.captureHref} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950"><UserPlus className="mr-2 inline h-4 w-4" />Capture lead</Link><Link href={model.scanHref} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black"><QrCode className="mr-2 inline h-4 w-4" />Scan card</Link><Link href="/leads?view=trade-event" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black"><UsersRound className="mr-2 inline h-4 w-4" />Review leads</Link></div>
      </div>
      <EventGuruInsight {...guru} />
    </section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Needs attention</p><div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-rose-50 p-4"><p className="text-2xl font-black">{model.entrySummary.overdue}</p><p className="text-xs font-bold text-rose-700">Overdue SLA</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black">{model.entrySummary.incomplete}</p><p className="text-xs font-bold text-slate-500">Missing interest</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black">{model.unassigned}</p><p className="text-xs font-bold text-slate-500">No owner</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black">{model.noNextAction}</p><p className="text-xs font-bold text-slate-500">No next action</p></div></div></div>{model.current ? <EventReadinessPanel event={model.current} /> : <EventGuruInsight {...guru} />}</section>
    <section className="lg:hidden"><EventGuruInsight {...guru} /></section>
  </>;
}
