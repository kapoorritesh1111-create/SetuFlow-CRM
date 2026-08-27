'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  PencilLine,
  PhoneCall,
  PlusCircle,
  ShieldCheck,
  ShoppingCart,
  Tags,
  UserRound,
  Users,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { dayLessons, dayRoleFlow, type DayLessonKey, type DayRole } from './day-in-life-data';

const icons: Record<DayLessonKey, LucideIcon> = {
  start: LayoutDashboard,
  add: PlusCircle,
  edit: PencilLine,
  quote: FileText,
  followup: PhoneCall,
  approval: ShieldCheck,
  catalog: Tags,
  order: ShoppingCart,
  track: PackageCheck,
};

const roleCopy: Record<DayRole, { title: string; subtitle: string; icon: LucideIcon }> = {
  sales: { title: 'Sales Day', subtitle: 'Capture, qualify, quote, follow up, and convert accepted business.', icon: Users },
  owner: { title: 'Owner Day', subtitle: 'Add leads, review activity, approve changes, manage Catalog, and track orders.', icon: UserRound },
};

export function DayInLifeBuyerLeads() {
  const [role, setRole] = useState<DayRole>('sales');
  const [selected, setSelected] = useState<DayLessonKey>('add');
  const flow = dayRoleFlow[role];
  const lesson = dayLessons[selected];
  const activeIndex = flow.indexOf(selected);
  const LessonIcon = icons[selected];

  function changeRole(nextRole: DayRole) {
    setRole(nextRole);
    if (!dayRoleFlow[nextRole].includes(selected)) setSelected(dayRoleFlow[nextRole][0]);
  }

  function move(offset: number) {
    const next = flow[activeIndex + offset];
    if (next) setSelected(next);
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <header className="bg-[#041735] text-white shadow-lg">
        <div className="mx-auto flex max-w-[1650px] flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/academy" className="inline-flex items-center gap-2 text-sm font-black text-cyan-200 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Setu Flow Academy</Link>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-white/50">New learning section</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">Day in the Life</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/65">Buyer Leads · Learn Setu Flow by the exact work an owner or salesperson is doing during the day.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(roleCopy) as DayRole[]).map((key) => {
              const RoleIcon = roleCopy[key].icon;
              const active = role === key;
              return (
                <button key={key} type="button" onClick={() => changeRole(key)} className={`flex min-w-[230px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-cyan-300 bg-cyan-300 text-[#041735]' : 'border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.1]'}`}>
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-white/70' : 'bg-white/10'}`}><RoleIcon className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-black">{roleCopy[key].title}</span><span className={`mt-0.5 block text-xs font-semibold ${active ? 'text-[#041735]/65' : 'text-white/55'}`}>{key === 'sales' ? 'Salesperson workflow' : 'Owner workflow'}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1650px] space-y-6 px-5 py-7 sm:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">{roleCopy[role].title}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Buyer Lead Walkthrough</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{roleCopy[role].subtitle}</p>
          </div>
          <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-700" /><p className="font-black text-blue-950">How this works</p></div>
            <p className="mt-2 text-sm font-medium leading-6 text-blue-800">Click the part of the day you are in. The detailed walkthrough below changes to that exact CRM workflow.</p>
          </div>
        </section>

        <section className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid min-w-[880px] gap-3" style={{ gridTemplateColumns: `repeat(${flow.length}, minmax(0, 1fr))` }}>
            {flow.map((key, index) => {
              const item = dayLessons[key];
              const Icon = icons[key];
              const active = key === selected;
              return (
                <button key={key} type="button" onClick={() => setSelected(key)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-teal-300 bg-teal-50 ring-1 ring-teal-100' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></span><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-[11px] font-black text-white">{index + 1}</span></div>
                  <p className="mt-3 text-sm font-black text-slate-950">{item.shortTitle}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{item.roles}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><LessonIcon className="h-6 w-6" /></span>
                <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">{lesson.roles}</span><span className="text-xs font-bold text-slate-400">Lesson {activeIndex >= 0 ? activeIndex + 1 : 1} of {flow.length}</span></div><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{lesson.title}</h2><p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-600">{lesson.description}</p></div>
              </div>
              <Link href={lesson.route} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"><ExternalLink className="h-4 w-4" />Open starting page</Link>
            </div>
          </div>

          <div className="grid xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-3"><ListChecks className="h-5 w-5 text-blue-700" /><h3 className="text-xl font-black text-slate-950">Detailed click-by-click walkthrough</h3></div>
              <ol className="mt-5 space-y-3">
                {lesson.instructions.map((text, index) => <li key={`${selected}-${index}`} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm font-medium leading-6 text-slate-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{index + 1}</span><span>{text}</span></li>)}
              </ol>
            </div>
            <aside className="border-t border-slate-100 bg-slate-50/75 p-5 sm:p-7 xl:border-l xl:border-t-0">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-700" /><h3 className="font-black text-slate-950">Confirm before leaving this step</h3></div>
                <ul className="mt-4 space-y-2.5">{lesson.confirms.map((item) => <li key={item} className="flex gap-2 text-sm font-medium text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{item}</li>)}</ul>
              </div>
              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-violet-700" /><h3 className="font-black text-slate-950">What happens next</h3></div>
                <ul className="mt-4 space-y-2.5">{lesson.next.map((item) => <li key={item} className="flex gap-2 text-sm font-medium text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />{item}</li>)}</ul>
              </div>
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Starting route</p><code className="mt-2 block text-sm font-black text-blue-950">{lesson.route}</code><p className="mt-2 text-xs font-medium leading-5 text-blue-800">For dynamic lead records, start from the list and click the real buyer instead of typing a record URL.</p></div>
            </aside>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <button type="button" onClick={() => move(-1)} disabled={activeIndex <= 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-35"><ArrowLeft className="h-4 w-4" />Previous</button>
            <Link href="/academy" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700"><BookOpen className="h-4 w-4" />Back to Academy</Link>
            <button type="button" onClick={() => move(1)} disabled={activeIndex < 0 || activeIndex >= flow.length - 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-35">Next<ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-[#041735] p-6 text-white shadow-lg"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Buyer Leads first</p><h2 className="mt-1 text-2xl font-black">The existing Academy stays intact.</h2><p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-white/65">Day in the Life is an additional role-based training layer. The existing module-based Academy remains available exactly as before.</p></section>
      </main>
    </div>
  );
}
