'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  ExternalLink,
  Eye,
  FileText,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  PackageCheck,
  PencilLine,
  PhoneCall,
  PlusCircle,
  Route,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { dayLessons, type DayRole } from './day-in-life-data';
import { ownerAttention, salesApprovalSendLesson, salesFlow, type DayStepKey } from './day-in-life-role-guidance';

const icons: Record<DayStepKey, LucideIcon> = {
  start: LayoutDashboard,
  add: PlusCircle,
  edit: PencilLine,
  quote: FileText,
  'approval-send': ShieldCheck,
  followup: PhoneCall,
  approval: ShieldCheck,
  catalog: Tags,
  order: ShoppingCart,
  track: PackageCheck,
};

const roleCopy: Record<DayRole, { title: string; subtitle: string; icon: LucideIcon }> = {
  sales: { title: 'Sales Day', subtitle: 'Move one buyer from first contact through an accepted order.', icon: Users },
  owner: { title: 'Owner Day', subtitle: 'Start with the dashboard, then go where the business needs your attention.', icon: UserRound },
};

function SectionTitle({ icon: Icon, title, detail, tone = 'blue' }: { icon: LucideIcon; title: string; detail?: string; tone?: 'blue' | 'teal' | 'violet' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="flex items-start gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      <div><h3 className="text-lg font-black text-slate-950">{title}</h3>{detail ? <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{detail}</p> : null}</div>
    </div>
  );
}

export function DayInLifeBuyerLeads() {
  const [role, setRole] = useState<DayRole>('sales');
  const [selected, setSelected] = useState<DayStepKey>('add');
  const flow = role === 'sales' ? salesFlow : (['start', ...ownerAttention.map((item) => item.key)] as DayStepKey[]);
  const lesson = selected === 'approval-send' ? salesApprovalSendLesson : dayLessons[selected];
  const activeIndex = flow.indexOf(selected);
  const LessonIcon = icons[selected];

  function changeRole(nextRole: DayRole) {
    setRole(nextRole);
    setSelected(nextRole === 'sales' ? 'add' : 'start');
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
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Day in the Life</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">Buyer Leads</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/70">Learn Setu Flow through the work you actually do during the day.</p>
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
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">{roleCopy[role].title}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{role === 'sales' ? 'From Buyer Lead to Order' : 'What Needs My Attention?'}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{roleCopy[role].subtitle}</p>
          </div>
          <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-700" /><p className="font-black text-blue-950">Use the guide as you work</p></div>
            <p className="mt-2 text-sm font-medium leading-6 text-blue-800">Choose where you are in the day. Each lesson explains the situation, the clicks, what to look for, and the decision that comes next.</p>
          </div>
        </section>

        {role === 'sales' ? (
          <section className="overflow-x-auto rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid min-w-[1040px] gap-3" style={{ gridTemplateColumns: `repeat(${salesFlow.length}, minmax(0, 1fr))` }}>
              {salesFlow.map((key, index) => {
                const item = key === 'approval-send' ? salesApprovalSendLesson : dayLessons[key];
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
        ) : (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <button type="button" onClick={() => setSelected('start')} className={`w-full rounded-2xl border p-5 text-left transition ${selected === 'start' ? 'border-teal-300 bg-teal-50 ring-1 ring-teal-100' : 'border-slate-200 bg-slate-50 hover:border-blue-200'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${selected === 'start' ? 'bg-teal-600 text-white' : 'bg-white text-slate-700'}`}><LayoutDashboard className="h-5 w-5" /></span><div><p className="text-sm font-black text-slate-950">Start with the Dashboard</p><p className="mt-1 text-sm font-medium text-slate-600">See what needs your attention before opening individual records.</p></div></div>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Start here</span>
              </div>
            </button>

            <div className="mx-auto h-7 w-px bg-slate-200" />
            <div className="mb-4 text-center"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Then go where the business needs you</p></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {ownerAttention.map((item) => {
                const Icon = icons[item.key];
                const active = selected === item.key;
                return (
                  <button key={item.key} type="button" onClick={() => setSelected(item.key)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active ? 'border-teal-300 bg-teal-50 ring-1 ring-teal-100' : 'border-slate-200 bg-white'}`}>
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></span>
                    <p className="mt-3 text-sm font-black leading-5 text-slate-950">{item.title}</p>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{item.prompt}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><LessonIcon className="h-6 w-6" /></span>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">{lesson.roles}</span>{role === 'sales' ? <span className="text-xs font-bold text-slate-400">Step {activeIndex + 1} of {salesFlow.length}</span> : <span className="text-xs font-bold text-slate-400">Owner guidance</span>}</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{lesson.title}</h2>
                  <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-600">{lesson.description}</p>
                </div>
              </div>
              <Link href={lesson.route} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800"><ExternalLink className="h-4 w-4" />Open in Setu Flow</Link>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-5">
                <SectionTitle icon={BookOpen} title="Why you are doing this" detail="The business reason before the clicks." tone="blue" />
                <p className="mt-4 text-sm font-medium leading-7 text-slate-700">{lesson.businessContext}</p>
              </div>
              <div className="rounded-[1.5rem] border border-teal-100 bg-teal-50/70 p-5">
                <SectionTitle icon={Users} title={lesson.scenario.heading} detail="Follow the same buyer story through the journey." tone="teal" />
                <p className="mt-4 text-sm font-medium leading-7 text-slate-700">{lesson.scenario.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">{lesson.scenario.facts.map((fact) => <span key={fact} className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-800">{fact}</span>)}</div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionTitle icon={ListChecks} title="Click-by-click" detail="Follow these steps in Setu Flow." />
                <ol className="mt-5 space-y-3">
                  {lesson.instructions.map((text, index) => <li key={`${selected}-${index}`} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm font-medium leading-6 text-slate-700"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{index + 1}</span><span>{text}</span></li>)}
                </ol>
              </div>

              <aside className="space-y-5">
                <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/70 p-5">
                  <SectionTitle icon={Eye} title="Understand this screen" detail="What the important areas mean." tone="violet" />
                  <div className="mt-4 space-y-3">{lesson.annotations.map((item, index) => <div key={item.label} className="rounded-2xl border border-violet-100 bg-white p-3.5"><div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-[10px] font-black text-white">{index + 1}</span><p className="text-sm font-black text-slate-950">{item.label}</p></div><p className="mt-2 text-xs font-medium leading-5 text-slate-600">{item.meaning}</p></div>)}</div>
                </div>
              </aside>
            </div>

            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[1.5rem] border border-teal-100 bg-white p-5 shadow-sm">
                <SectionTitle icon={ClipboardCheck} title="What good looks like" detail="Before you move on, these should be true." tone="teal" />
                <ul className="mt-4 space-y-2.5">{lesson.confirms.map((item) => <li key={item} className="flex gap-2 text-sm font-medium text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />{item}</li>)}</ul>
              </div>
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/60 p-5">
                <SectionTitle icon={Lightbulb} title="Best practices" detail="Keep the CRM clean and useful." tone="amber" />
                <ul className="mt-4 space-y-3">{lesson.bestPractices.map((item) => <li key={item} className="flex gap-2 text-sm font-medium leading-6 text-slate-700"><BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-amber-600" />{item}</li>)}</ul>
              </div>
              <div className="rounded-[1.5rem] border border-violet-100 bg-violet-50/60 p-5 lg:col-span-2 xl:col-span-1">
                <SectionTitle icon={BadgeCheck} title="What happens in Setu Flow" detail="What changes after this step." tone="violet" />
                <ul className="mt-4 space-y-2.5">{lesson.next.map((item) => <li key={item} className="flex gap-2 text-sm font-medium text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />{item}</li>)}</ul>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
              <SectionTitle icon={CircleHelp} title="Common questions" detail="When the buyer conversation does not follow the perfect path." />
              <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{lesson.exceptions.map((item) => <div key={item.question} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" /><p className="text-sm font-black leading-5 text-slate-950">{item.question}</p></div><p className="mt-3 text-sm font-medium leading-6 text-slate-600">{item.answer}</p></div>)}</div>
            </div>

            <div className="rounded-[1.5rem] bg-[#041735] p-5 text-white shadow-lg sm:p-6">
              <SectionTitle icon={Route} title="What should I do next?" detail="Choose the next action from the buyer situation." tone="teal" />
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{lesson.decisions.map((item) => <div key={item.when} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-300">If</p><p className="mt-1 text-sm font-bold leading-6 text-white">{item.when}</p><div className="my-3 h-px bg-white/10" /><p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-300">Then</p><p className="mt-1 text-sm font-medium leading-6 text-white/75">{item.action}</p></div>)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            {role === 'sales' ? (
              <>
                <button type="button" onClick={() => move(-1)} disabled={activeIndex <= 0} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-35"><ArrowLeft className="h-4 w-4" />Previous</button>
                <Link href="/academy" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700"><BookOpen className="h-4 w-4" />Back to Academy</Link>
                <button type="button" onClick={() => move(1)} disabled={activeIndex < 0 || activeIndex >= salesFlow.length - 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-35">Next<ArrowRight className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <Link href="/academy" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700"><BookOpen className="h-4 w-4" />Back to Academy</Link>
                <button type="button" onClick={() => setSelected('start')} disabled={selected === 'start'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-35"><LayoutDashboard className="h-4 w-4" />Back to Owner Overview</button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
