'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, ExternalLink, GraduationCap, LayoutDashboard, ListChecks, LogIn, Map, Search } from 'lucide-react';
import { CORE_ACADEMY_VERSION, coreAcademyModules, coreAcademyStepCount, type AcademyStep } from './core-academy-content';
import { CoreAcademyScreenshot } from './core-academy-screenshot';

type ProgressRow = { step_id: string; is_complete: boolean };
type AcademyView = 'dashboard' | 'journey' | 'workflows' | 'test' | 'glossary' | 'getting-started';
type Journey = 'both' | 'buyers' | 'suppliers';
type TestStatus = 'pass' | 'fail' | 'blocked' | 'na';
type Props = { initialProgress: ProgressRow[]; isAuthenticated: boolean; viewerName: string };

const LOCAL_PROGRESS_KEY = 'setu-core-academy-progress';
const LOCAL_TEST_KEY = 'setu-core-academy-test-results';
const glossary = [
  ['Buyer lead', 'A prospective importer, distributor, retailer, or customer being qualified for a commercial opportunity.'],
  ['Supplier lead', 'A prospective manufacturer, vendor, or service provider moving through capability, compliance, cost request, and approval.'],
  ['Send gate', 'The final readiness control that prevents an incomplete or unapproved quote from being sent.'],
  ['Execution stage', 'An operational order step such as documents, packing, freight, delivery, invoicing, and closeout.'],
  ['Price list', 'A governed, shareable selection of catalog products and prices for a market or specific buyer.'],
  ['Setu Guru', 'Setu Flow’s contextual AI drawer. It supports research and drafting while keeping approval with the user.'],
];

function visibleForJourney(item: AcademyStep, journey: Journey) {
  if (journey === 'both' || !item.journeys?.length) return true;
  return item.journeys.includes(journey) || item.journeys.includes('both');
}

export function CoreAcademyClient({ initialProgress, isAuthenticated, viewerName }: Props) {
  const serverProgress = useMemo(() => new Set(initialProgress.filter((row) => row.is_complete).map((row) => row.step_id)), [initialProgress]);
  const [completed, setCompleted] = useState<Set<string>>(serverProgress);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [view, setView] = useState<AcademyView>('dashboard');
  const [journey, setJourney] = useState<Journey>('both');
  const [testResults, setTestResults] = useState<Record<string, TestStatus>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '[]');
      if (Array.isArray(local)) setCompleted((current) => new Set([...current, ...local]));
      const tests = JSON.parse(localStorage.getItem(LOCAL_TEST_KEY) || '{}');
      if (tests && typeof tests === 'object') setTestResults(tests);
    } catch {}
  }, []);

  const journeyModules = useMemo(() => coreAcademyModules.map((module) => ({ ...module, steps: module.steps.filter((item) => visibleForJourney(item, journey)) })).filter((module) => module.steps.length), [journey]);
  const visibleModules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return journeyModules;
    return journeyModules.map((module) => ({ ...module, steps: module.steps.filter((item) => [module.title, module.summary, module.outcome, item.title, item.route, item.startRoute, item.screenshot, ...item.shows, ...item.instructions].join(' ').toLowerCase().includes(needle)) })).filter((module) => module.steps.length);
  }, [journeyModules, query]);

  const percent = Math.round((completed.size / coreAcademyStepCount) * 100);
  const allSteps = coreAcademyModules.flatMap((module) => module.steps);
  const nextStep = allSteps.find((item) => !completed.has(item.id));
  const testCount = Object.keys(testResults).length;
  const passCount = Object.values(testResults).filter((status) => status === 'pass').length;

  function sync(next: Set<string>) {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify([...next]));
    if (!isAuthenticated) { setMessage('Progress saved on this device. Sign in to sync it to your workspace.'); return; }
    const entries = coreAcademyModules.flatMap((module) => module.steps.map((item) => ({ stepId: item.id, moduleId: module.id, moduleTitle: module.title, stepTitle: item.title, route: item.route, screenshotFilename: item.screenshot, isComplete: next.has(item.id), academyVersion: CORE_ACADEMY_VERSION })));
    const form = new FormData();
    form.set('action', 'sync_progress');
    form.set('progress', JSON.stringify(entries));
    startTransition(() => { void fetch('/api/core-academy/progress', { method: 'POST', body: form }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Progress sync failed.'); setMessage(`Progress saved for ${viewerName}.`); }).catch((error) => setMessage(error instanceof Error ? error.message : 'Progress sync failed.')); });
  }

  function toggle(stepId: string) { const next = new Set(completed); if (next.has(stepId)) next.delete(stepId); else next.add(stepId); setCompleted(next); sync(next); }
  function setTestStatus(stepId: string, status: TestStatus) { const next = { ...testResults, [stepId]: status }; setTestResults(next); localStorage.setItem(LOCAL_TEST_KEY, JSON.stringify(next)); setMessage(`Test result saved on this device: ${status.toUpperCase()}.`); }
  function showView(target: AcademyView) { setView(target); requestAnimationFrame(() => document.getElementById('academy-main')?.scrollIntoView({ behavior: 'smooth' })); }

  const navItems: Array<[AcademyView, string, typeof LayoutDashboard]> = [['dashboard', 'Dashboard', LayoutDashboard], ['journey', 'My Journey', Map], ['workflows', 'All Modules', BookOpen], ['test', 'Test Center', ClipboardCheck], ['glossary', 'Glossary', GraduationCap], ['getting-started', 'Getting Started', ListChecks]];

  return <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
    <header className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-teal-900 text-white"><div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><GraduationCap className="h-6 w-6 text-teal-200" /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Setu Flow Academy</p><h1 className="text-xl font-bold">Core Platform Learning Center</h1></div></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => showView('journey')} className={`rounded-xl px-4 py-2 text-xs font-semibold ${view !== 'test' ? 'bg-white text-slate-950' : 'border border-white/15 bg-white/10 text-white'}`}>Learn Mode</button><button onClick={() => showView('test')} className={`rounded-xl px-4 py-2 text-xs font-semibold ${view === 'test' ? 'bg-white text-slate-950' : 'border border-white/15 bg-white/10 text-white'}`}>Test Mode</button><select value={journey} onChange={(event) => setJourney(event.target.value as Journey)} className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white outline-none"><option value="both" className="text-slate-900">All workflows</option><option value="buyers" className="text-slate-900">Buyer workflows</option><option value="suppliers" className="text-slate-900">Supplier workflows</option></select></div></div></div></header>

    <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5"><nav className="space-y-1 text-sm font-semibold">{navItems.map(([key, label, Icon]) => <button key={key} onClick={() => showView(key)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${view === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav><div className="mt-4 border-t border-slate-100 pt-4"><p className="px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Learning path</p><ol className="mt-2 space-y-1 text-xs font-semibold text-slate-600">{coreAcademyModules.map((module, index) => <li key={module.id}><button onClick={() => { setView('workflows'); setQuery(module.title.replace(/^\d+\.\s*/, '')); }} className="w-full rounded-xl px-2 py-2 text-left hover:bg-slate-50">{index + 1}. {module.title.replace(/^\d+\.\s*/, '')}</button></li>)}</ol></div></aside>

      <main id="academy-main" className="min-w-0">
        {!isAuthenticated ? <section className="mb-6 flex flex-col gap-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-blue-950">Learn freely. Sign in when you are ready to sync.</p><p className="mt-1 text-sm text-blue-700">Completion and test results remain on this device until signed in. Live evidence and issue submission will be added separately.</p></div><Link href="/client-login?next=%2Facademy" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white"><LogIn className="h-4 w-4" />Sign in to sync</Link></section> : null}

        {view === 'dashboard' ? <section className="space-y-6"><div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-teal-900 p-7 text-white shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Your learning dashboard</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Follow the real Setu Flow navigation path, step by step.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">Home → Growth → Capture → Buyer or Supplier workflow → Quote → Approval → Order → Catalog → Documents → Tasks, Events and My Card → Admin and Setu Guru.</p><div className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Progress</p><p className="mt-1 text-3xl font-bold">{percent}%</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Completed</p><p className="mt-1 text-3xl font-bold">{completed.size}/{coreAcademyStepCount}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Modules</p><p className="mt-1 text-3xl font-bold">{coreAcademyModules.length}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Tests passed</p><p className="mt-1 text-3xl font-bold">{passCount}/{testCount || 0}</p></div></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coreAcademyModules.map((module, index) => { const done = module.steps.filter((item) => completed.has(item.id)).length; return <button key={module.id} onClick={() => { setView('workflows'); setQuery(module.title.replace(/^\d+\.\s*/, '')); }} className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Module {index + 1}</p><h3 className="mt-2 text-lg font-bold">{module.title.replace(/^\d+\.\s*/, '')}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{module.summary}</p><p className="mt-4 text-xs font-semibold text-slate-500">{done}/{module.steps.length} completed</p></button>; })}</div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Continue learning</p><h3 className="mt-2 text-xl font-bold">{nextStep?.title || 'Academy complete'}</h3><p className="mt-2 text-sm text-slate-600">{nextStep ? `Next guided screen: ${nextStep.screenshot}` : 'You have completed every current step.'}</p><button onClick={() => showView('journey')} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Open My Journey</button></div></section> : null}

        {view === 'getting-started' ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Getting Started</h2><ol className="mt-5 space-y-4 text-sm leading-6 text-slate-600"><li><strong className="text-slate-900">1. Start with My Journey.</strong> It shows the recommended module order and your next incomplete step.</li><li><strong className="text-slate-900">2. Read every click.</strong> Each workflow card includes numbered instructions, the real starting route, and the destination being taught.</li><li><strong className="text-slate-900">3. Open the starting page.</strong> Dynamic record screens begin from a safe queue such as Buyers or Suppliers.</li><li><strong className="text-slate-900">4. Mark completion.</strong> Completion syncs to your workspace when signed in.</li><li><strong className="text-slate-900">5. Run Test Mode.</strong> Reperform the workflow and record Pass, Fail, Blocked, or N/A.</li></ol></section> : null}
        {view === 'glossary' ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Glossary</h2><div className="mt-5 divide-y divide-slate-100">{glossary.map(([term, meaning]) => <div key={term} className="py-4"><h3 className="font-bold">{term}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{meaning}</p></div>)}</div></section> : null}

        {view === 'journey' || view === 'workflows' || view === 'test' ? <section><div className="sticky top-0 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search modules, clicks, routes, or screenshot filenames" className="h-11 w-full bg-transparent text-sm font-medium outline-none" /></div><div className="text-xs font-semibold text-slate-500">{isPending ? 'Saving…' : message || `${coreAcademyStepCount} guided steps · real routes validated`}</div></div></div><div className="space-y-5">{visibleModules.map((module, moduleIndex) => { const moduleComplete = module.steps.filter((item) => completed.has(item.id)).length; return <details key={module.id} open={view === 'journey' ? moduleComplete < module.steps.length : moduleIndex < 1 || Boolean(query)} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{String(moduleIndex + 1).padStart(2, '0')}</span><h2 className="text-xl font-bold">{module.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{moduleComplete}/{module.steps.length}</span></div><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{module.summary}</p><p className="mt-1 text-xs font-semibold text-teal-700">Outcome: {module.outcome}</p></div><ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" /></summary><div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6"><div className="grid gap-5 xl:grid-cols-2">{module.steps.map((item, stepIndex) => { const isComplete = completed.has(item.id); const launchRoute = item.startRoute || item.route; const result = testResults[item.id]; return <article key={item.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${isComplete ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}><div className="flex items-start gap-3"><button onClick={() => toggle(item.id)} className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${isComplete ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-blue-400'}`} aria-label={`Mark ${item.title} complete`}><CheckCircle2 className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Step {stepIndex + 1}</p><h3 className="mt-1 text-base font-bold">{item.title}</h3><div className="mt-3 flex flex-wrap gap-2"><Link href={launchRoute} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" />Open starting page</Link><code className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600">Teach: {item.route}</code></div></div></div><div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Click-by-click</p><ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">{item.instructions.map((instruction, index) => <li key={instruction} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{index + 1}</span><span>{instruction}</span></li>)}</ol></div><CoreAcademyScreenshot filename={item.screenshot} title={item.title} /><div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Screenshot must show</p><ul className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">{item.shows.map((show) => <li key={show} className="flex gap-2"><span className="text-teal-600">•</span><span>{show}</span></li>)}</ul></div>{view === 'test' ? <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs font-bold text-violet-900">Reperform this workflow and record the result.</p><div className="mt-3 flex flex-wrap gap-2">{(['pass', 'fail', 'blocked', 'na'] as TestStatus[]).map((status) => <button key={status} onClick={() => setTestStatus(item.id, status)} className={`rounded-xl px-3 py-2 text-xs font-bold uppercase ${result === status ? 'bg-violet-900 text-white' : 'border border-violet-200 bg-white text-violet-800'}`}>{status === 'na' ? 'N/A' : status}</button>)}</div></div> : null}</article>; })}</div></div></details>; })}</div></section> : null}
      </main>
    </div>
  </div>;
}
