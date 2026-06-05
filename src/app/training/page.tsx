"use client";

import { useState } from "react";
import { SiteShell } from "@/components/marketing/site-shell";

type Tab = "workflow" | "lessons" | "videos" | "progress";
type Group = "Capture" | "Convert" | "Execute";

type Module = {
  id: string;
  no: string;
  group: Group;
  title: string;
  text: string;
  action: string;
};

const modules: Module[] = [
  { id: "dashboard", no: "01", group: "Capture", title: "Dashboard", text: "See queue health, overdue work, and the next priority.", action: "Open Dashboard" },
  { id: "lead", no: "02", group: "Capture", title: "Lead Capture", text: "Create a clean buyer inquiry with owner and next action.", action: "Add / Capture Lead" },
  { id: "trade", no: "03", group: "Capture", title: "Trade Show", text: "Turn event conversations into follow-up-ready records.", action: "Open Event / Pipeline" },
  { id: "mobile", no: "04", group: "Capture", title: "Mobile / vCard", text: "Capture buyer interest fast from phone, then clean it later.", action: "Quick Lead / Scan" },
  { id: "tasks", no: "05", group: "Capture", title: "Tasks", text: "Keep every lead, quote, order, and dispatch item moving.", action: "New Task / Open Task" },
  { id: "guru", no: "06", group: "Convert", title: "Setu Guru", text: "Resolve blockers, check defaults, and get next-step guidance.", action: "Ask Setu Guru" },
  { id: "quote", no: "07", group: "Convert", title: "Quote", text: "Move from draft to approval, send, outcome, and order.", action: "Create / Send Quote" },
  { id: "documents", no: "08", group: "Convert", title: "Documents", text: "Confirm packing, freight, and order documents before handoff.", action: "Open Documents" },
  { id: "dispatch", no: "09", group: "Execute", title: "Dispatch", text: "Track shipment movement, carrier details, and follow-up.", action: "Update Dispatch" },
];

const groups: Group[] = ["Capture", "Convert", "Execute"];
const groupText: Record<Group, string> = {
  Capture: "Capture buyer intent",
  Convert: "Prepare the commercial offer",
  Execute: "Complete shipment handoff",
};

function Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <path d="M14 15h6M14 19h4" />
    </svg>
  );
}

function WorkflowCard({ module, done, onOpen }: { module: Module; done: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group flex min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700"><Icon /></span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"}`}>{done ? "Done" : module.no}</span>
      </div>
      <h3 className="mt-4 text-base font-bold tracking-tight text-slate-950">{module.title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{module.text}</p>
      <div className="mt-auto pt-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">First action</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{module.action}</p>
        </div>
        <p className="mt-3 text-xs font-bold text-teal-700 group-hover:text-teal-800">Open lesson -&gt;</p>
      </div>
    </button>
  );
}

export default function TrainingWorkspacePage() {
  const [tab, setTab] = useState<Tab>("workflow");
  const [active, setActive] = useState(modules[0].id);
  const [done, setDone] = useState<string[]>([]);
  const activeModule = modules.find((m) => m.id === active) ?? modules[0];
  const completedCount = modules.filter((m) => done.includes(m.id)).length;

  const openLesson = (id: string) => {
    setActive(id);
    setTab("lessons");
  };

  return (
    <SiteShell>
      <main className="min-h-screen bg-white text-slate-950">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white to-teal-50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Product overview</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Setu Flow - learn the system</h1>
            <p className="mt-1 text-sm text-slate-500">Sales owner · {completedCount}/{modules.length} modules complete</p>
          </div>
        </div>

        <div className="sticky top-[65px] z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto">
              {[
                ["workflow", "SETU Workflow"],
                ["lessons", "Lessons"],
                ["videos", "Video Walkthroughs"],
                ["progress", "My Progress"],
              ].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id as Tab)} className={`relative shrink-0 px-5 py-3.5 text-sm font-semibold transition ${tab === id ? "text-teal-700" : "text-slate-500 hover:text-slate-800"}`}>
                  {label}
                  {tab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-teal-600" />}
                  {id === "progress" && completedCount > 0 && <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">{completedCount}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === "workflow" && (
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,.06)]">
              <div className="grid gap-5 border-b border-slate-100 bg-gradient-to-r from-white via-white to-teal-50 px-5 py-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-7">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">SETU Workflow</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">From inquiry to dispatch</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">A compact learning path for the complete Setu Flow operating rhythm.</p>
                </div>
                <div className="rounded-2xl border border-teal-100 bg-white/85 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">What you&apos;ll achieve</p>
                  <div className="mt-3 flex max-w-xl flex-wrap gap-2 text-[11px] font-semibold">
                    {["Inquiry captured", "Follow-up assigned", "Quote approved", "Documents ready", "Dispatch tracked"].map((item) => (
                      <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-700"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white">✓</span>{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-6 lg:px-7">
                <div className="grid gap-5 xl:grid-cols-[5fr_3fr_1fr]">
                  {groups.map((group) => {
                    const groupModules = modules.filter((m) => m.group === group);
                    return (
                      <section key={group} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="mb-4 flex items-end justify-between gap-3">
                          <div>
                            <p className={`text-sm font-black uppercase tracking-[0.28em] ${group === "Capture" ? "text-teal-700" : group === "Convert" ? "text-blue-700" : "text-orange-700"}`}>{group}</p>
                            <p className="mt-1 text-xs text-slate-400">{groupText[group]}</p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">{groupModules.length} step{groupModules.length > 1 ? "s" : ""}</span>
                        </div>
                        <div className={`grid gap-3 ${group === "Capture" ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : group === "Convert" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
                          {groupModules.map((module) => <WorkflowCard key={module.id} module={module} done={done.includes(module.id)} onOpen={() => openLesson(module.id)} />)}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === "lessons" && (
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
            <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-32 lg:self-start">
              {modules.map((module) => <button key={module.id} onClick={() => setActive(module.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active === module.id ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${done.includes(module.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{done.includes(module.id) ? "✓" : module.no}</span>{module.title}</button>)}
            </aside>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{activeModule.group} / lesson {activeModule.no}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{activeModule.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{activeModule.text}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {["Open the right workspace.", "Confirm the business context.", "Record the next owner and next step."].map((step, index) => <div key={step} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Step {index + 1}</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{step}</p></div>)}
              </div>
              <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">First action</p><p className="mt-2 text-base font-semibold text-slate-950">{activeModule.action}</p></div>
              <button onClick={() => !done.includes(activeModule.id) && setDone([...done, activeModule.id])} className={`mt-6 rounded-full px-5 py-2.5 text-sm font-semibold transition ${done.includes(activeModule.id) ? "bg-emerald-50 text-emerald-700" : "bg-teal-600 text-white hover:bg-teal-700"}`}>{done.includes(activeModule.id) ? "✓ Completed" : "Mark complete"}</button>
            </section>
          </div>
        )}

        {tab === "videos" && <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Video walkthroughs</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Watch before you work.</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.slice(0,6).map((m) => <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Coming soon</span><p className="mt-3 text-sm font-semibold text-slate-950">{m.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{m.text}</p></div>)}</div></div>}

        {tab === "progress" && <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">My progress</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Your training status</h2><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Modules done</p><p className="mt-2 text-3xl font-semibold text-slate-950">{completedCount}<span className="text-xl text-slate-300">/{modules.length}</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.round((completedCount / modules.length) * 100)}%` }} /></div></div></div>}
      </main>
    </SiteShell>
  );
}
