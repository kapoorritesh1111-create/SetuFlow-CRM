'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Search,
} from 'lucide-react';
import { CoreAcademyScreenshot } from './core-academy-screenshot';
import { CORE_ACADEMY_VERSION, coreAcademyModules, coreAcademyStepCount } from './core-academy-content';

type ProgressRow = { step_id: string; is_complete: boolean };
type AcademyView = 'dashboard' | 'journey' | 'workflows' | 'glossary' | 'getting-started';
type Journey = 'both' | 'buyers' | 'suppliers';

type Props = {
  initialProgress: ProgressRow[];
  isAuthenticated: boolean;
  viewerName: string;
};

const LOCAL_PROGRESS_KEY = 'setu-core-academy-progress';

const glossary = [
  ['Buyer lead', 'A prospective importer, distributor, retailer, or customer being qualified for a commercial opportunity.'],
  ['Supplier lead', 'A prospective manufacturer, vendor, or service provider moving through capability, compliance, and approval checks.'],
  ['Send gate', 'The final readiness check that prevents an incomplete or unapproved quote from being sent.'],
  ['Execution stage', 'The operational step after an accepted quote, including documents, packing, freight, delivery, invoicing, and closeout.'],
  ['Setu Guru', 'Setu Flow’s contextual AI assistant. It supports research and drafting while keeping business decisions with the user.'],
];

export function CoreAcademyClient({ initialProgress, isAuthenticated, viewerName }: Props) {
  const serverProgress = useMemo(
    () => new Set(initialProgress.filter((row) => row.is_complete).map((row) => row.step_id)),
    [initialProgress],
  );
  const [completed, setCompleted] = useState<Set<string>>(serverProgress);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [view, setView] = useState<AcademyView>('dashboard');
  const [journey, setJourney] = useState<Journey>('both');
  const [role, setRole] = useState('Sales & Operations');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '[]');
      if (Array.isArray(local)) setCompleted((current) => new Set([...current, ...local]));
    } catch {}
  }, []);

  const journeyModules = useMemo(() => {
    if (journey === 'both') return coreAcademyModules;
    return coreAcademyModules
      .map((module) => ({
        ...module,
        steps: module.steps.filter((step) => {
          const haystack = `${step.title} ${step.route}`.toLowerCase();
          if (journey === 'buyers') return !haystack.includes('supplier');
          return !haystack.includes('buyer') && !haystack.includes('quote builder');
        }),
      }))
      .filter((module) => module.steps.length > 0);
  }, [journey]);

  const visibleModules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return journeyModules;
    return journeyModules
      .map((module) => ({
        ...module,
        steps: module.steps.filter((step) =>
          [module.title, module.summary, step.title, step.route, step.startRoute, step.screenshot, ...step.shows]
            .join(' ')
            .toLowerCase()
            .includes(needle),
        ),
      }))
      .filter((module) => module.steps.length > 0);
  }, [journeyModules, query]);

  const percent = Math.round((completed.size / coreAcademyStepCount) * 100);
  const nextStep = coreAcademyModules.flatMap((module) => module.steps).find((step) => !completed.has(step.id));

  function sync(next: Set<string>) {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify([...next]));
    if (!isAuthenticated) {
      setMessage('Progress saved on this device. Sign in to sync it to your workspace.');
      return;
    }

    const entries = coreAcademyModules.flatMap((module) =>
      module.steps.map((step) => ({
        stepId: step.id,
        moduleId: module.id,
        moduleTitle: module.title,
        stepTitle: step.title,
        route: step.route,
        screenshotFilename: step.screenshot,
        isComplete: next.has(step.id),
        academyVersion: CORE_ACADEMY_VERSION,
      })),
    );
    const form = new FormData();
    form.set('action', 'sync_progress');
    form.set('progress', JSON.stringify(entries));
    startTransition(() => {
      void fetch('/api/core-academy/progress', { method: 'POST', body: form })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Progress sync failed.');
          setMessage(`Progress saved for ${viewerName}.`);
        })
        .catch((error) => setMessage(error instanceof Error ? error.message : 'Progress sync failed.'));
    });
  }

  function toggle(stepId: string) {
    const next = new Set(completed);
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
    setCompleted(next);
    sync(next);
  }

  function showLearningPath(target: AcademyView) {
    setView(target);
    if (target === 'journey' || target === 'workflows') {
      requestAnimationFrame(() => document.getElementById('academy-content')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <header className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-blue-950 to-teal-900 text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><GraduationCap className="h-6 w-6 text-teal-200" /></div>
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Setu Flow Academy</p><h1 className="text-xl font-bold">Core Platform Learning Center</h1></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-white/15 bg-white/10 p-1 text-xs font-semibold"><button className="rounded-lg bg-white px-3 py-2 text-slate-950">Learn Mode</button><button disabled title="Test Mode will be added after Learn Mode validation" className="px-3 py-2 text-white/50">Test Mode</button></div>
              <select value={role} onChange={(event) => setRole(event.target.value)} className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white outline-none"><option className="text-slate-900">Sales & Operations</option><option className="text-slate-900">Workspace Admin</option><option className="text-slate-900">Leadership</option><option className="text-slate-900">Trade Show User</option></select>
              <select value={journey} onChange={(event) => setJourney(event.target.value as Journey)} className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white outline-none"><option value="both" className="text-slate-900">Buyer + Supplier</option><option value="buyers" className="text-slate-900">Buyer journey</option><option value="suppliers" className="text-slate-900">Supplier journey</option></select>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5">
          <nav className="space-y-1 text-sm font-semibold">
            {[
              ['dashboard', 'Dashboard', LayoutDashboard],
              ['journey', 'My Journey', ListChecks],
              ['workflows', 'All Workflows', BookOpen],
              ['glossary', 'Glossary', GraduationCap],
              ['getting-started', 'Getting Started', CheckCircle2],
            ].map(([key, label, Icon]) => (
              <button key={String(key)} onClick={() => showLearningPath(key as AcademyView)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${view === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{String(label)}</button>
            ))}
          </nav>
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Role: <strong className="text-slate-700">{role}</strong><br />Journey: <strong className="capitalize text-slate-700">{journey}</strong></div>
        </aside>

        <main className="min-w-0">
          {!isAuthenticated ? (
            <section className="mb-6 flex flex-col gap-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-blue-950">Learn freely. Sign in when you are ready to sync.</p><p className="mt-1 text-sm text-blue-700">Your completion progress is stored locally on this device. Live tests, evidence, and issue submission remain unavailable while signed out.</p></div>
              <Link href="/client-login?next=%2Facademy" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white"><LogIn className="h-4 w-4" />Sign in to sync</Link>
            </section>
          ) : null}

          {view === 'dashboard' ? (
            <section className="space-y-6">
              <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-teal-900 p-7 text-white shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Your learning dashboard</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Master Setu Flow from first capture to completed execution.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">Follow the platform in the same order your team works: capture, qualify, quote, approve, send, execute, and grow.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Progress</p><p className="mt-1 text-3xl font-bold">{percent}%</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Completed</p><p className="mt-1 text-3xl font-bold">{completed.size}/{coreAcademyStepCount}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-blue-100">Modules</p><p className="mt-1 text-3xl font-bold">{coreAcademyModules.length}</p></div></div>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Continue learning</p><h3 className="mt-2 text-xl font-bold">{nextStep?.title || 'Academy complete'}</h3><p className="mt-2 text-sm text-slate-600">{nextStep ? `Next guided screen: ${nextStep.screenshot}` : 'You have completed every current Core Academy step.'}</p><button onClick={() => showLearningPath('journey')} className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Open My Journey</button></div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Academy status</p><h3 className="mt-2 text-xl font-bold">Screenshot folder ready</h3><p className="mt-2 text-sm leading-6 text-slate-600">Every card now checks <code>/academy/core/screenshots/</code> for its exact PNG filename and keeps the filename placeholder when the image is missing.</p></div>
              </div>
            </section>
          ) : null}

          {view === 'glossary' ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Glossary</h2><div className="mt-5 divide-y divide-slate-100">{glossary.map(([term, meaning]) => <div key={term} className="py-4"><h3 className="font-bold">{term}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{meaning}</p></div>)}</div></section> : null}

          {view === 'getting-started' ? <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold">Getting Started</h2><ol className="mt-5 space-y-4 text-sm leading-6 text-slate-600"><li><strong className="text-slate-900">1. Choose your role and journey.</strong> This keeps the learning path relevant to how you use Setu Flow.</li><li><strong className="text-slate-900">2. Start with My Journey.</strong> Open each workflow from its safe starting page and follow the visible click path.</li><li><strong className="text-slate-900">3. Mark the screen complete.</strong> Signed-out progress stays on the device; signed-in progress also syncs to your workspace.</li><li><strong className="text-slate-900">4. Upload the exact screenshot filename.</strong> Put PNG files in <code>public/academy/core/screenshots/</code>; the Academy resolves them automatically.</li></ol></section> : null}

          {view === 'journey' || view === 'workflows' ? (
            <section id="academy-content">
              <div className="sticky top-0 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workflows, routes, screens, or screenshot filenames" className="h-11 w-full bg-transparent text-sm font-medium outline-none" /></div><div className="text-xs font-semibold text-slate-500">{isPending ? 'Saving…' : message || 'Screenshots resolve from /academy/core/screenshots/'}</div></div>
              </div>

              <div className="space-y-5">
                {visibleModules.map((module, moduleIndex) => {
                  const moduleComplete = module.steps.filter((step) => completed.has(step.id)).length;
                  return (
                    <details key={module.id} open={view === 'journey' ? moduleComplete < module.steps.length : moduleIndex < 2 || Boolean(query)} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 sm:px-7"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{String(moduleIndex + 1).padStart(2, '0')}</span><h2 className="text-xl font-bold">{module.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{moduleComplete}/{module.steps.length}</span></div><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{module.summary}</p></div><ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" /></summary>
                      <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6">
                        <div className="grid gap-4 xl:grid-cols-2">
                          {module.steps.map((step, stepIndex) => {
                            const isComplete = completed.has(step.id);
                            const launchRoute = step.startRoute || step.route;
                            return (
                              <article key={step.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition ${isComplete ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                                <div className="flex items-start gap-3">
                                  <button onClick={() => toggle(step.id)} className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${isComplete ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-blue-400'}`} aria-label={`Mark ${step.title} complete`}><CheckCircle2 className="h-5 w-5" /></button>
                                  <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Step {stepIndex + 1}</p><h3 className="mt-1 text-base font-bold text-slate-950">{step.title}</h3><div className="mt-3 flex flex-wrap items-center gap-2"><Link href={launchRoute} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" />Open starting page</Link><code className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600">Teach: {step.route}</code></div>{step.startRoute ? <p className="mt-2 text-xs text-slate-500">Start from <code>{step.startRoute}</code>, then follow the visible clicks to reach the displayed route.</p> : null}</div>
                                </div>
                                <CoreAcademyScreenshot filename={step.screenshot} title={step.title} />
                                <div className="mt-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Screenshot must show</p><ul className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">{step.shows.map((item) => <li key={item} className="flex gap-2"><span className="text-teal-600">•</span><span>{item}</span></li>)}</ul></div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
