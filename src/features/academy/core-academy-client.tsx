'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { CheckCircle2, ChevronDown, ExternalLink, Image, Search } from 'lucide-react';
import { CORE_ACADEMY_VERSION, coreAcademyModules, coreAcademyStepCount } from './core-academy-content';

type ProgressRow = { step_id: string; is_complete: boolean };

type Props = {
  initialProgress: ProgressRow[];
  viewerName: string;
};

export function CoreAcademyClient({ initialProgress, viewerName }: Props) {
  const initial = useMemo(() => new Set(initialProgress.filter((row) => row.is_complete).map((row) => row.step_id)), [initialProgress]);
  const [completed, setCompleted] = useState<Set<string>>(initial);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem('setu-core-academy-progress') || '[]');
      if (Array.isArray(local)) setCompleted((current) => new Set([...current, ...local]));
    } catch {}
  }, []);

  const visibleModules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return coreAcademyModules;
    return coreAcademyModules.map((module) => ({
      ...module,
      steps: module.steps.filter((step) => [module.title, module.summary, step.title, step.route, step.screenshot, ...step.shows].join(' ').toLowerCase().includes(needle)),
    })).filter((module) => module.steps.length > 0);
  }, [query]);

  const percent = Math.round((completed.size / coreAcademyStepCount) * 100);

  function sync(next: Set<string>) {
    localStorage.setItem('setu-core-academy-progress', JSON.stringify([...next]));
    const entries = coreAcademyModules.flatMap((module) => module.steps.map((step) => ({
      stepId: step.id,
      moduleId: module.id,
      moduleTitle: module.title,
      stepTitle: step.title,
      route: step.route,
      screenshotFilename: step.screenshot,
      isComplete: next.has(step.id),
      academyVersion: CORE_ACADEMY_VERSION,
    })));
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
    if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
    setCompleted(next);
    sync(next);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-teal-900 text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-200">Setu Flow Academy</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Core Platform Learning Center</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">A click-by-click learning path for exporters, importers, manufacturers, distributors, sales teams, operations teams, and workspace administrators.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{coreAcademyModules.length} modules</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">{coreAcademyStepCount} guided screens</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Version {CORE_ACADEMY_VERSION}</span>
              </div>
            </div>
            <div className="min-w-[290px] rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-sm font-semibold"><span>Your progress</span><span>{completed.size}/{coreAcademyStepCount}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-teal-300 transition-all" style={{ width: `${percent}%` }} /></div>
              <p className="mt-2 text-right text-2xl font-bold">{percent}%</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="sticky top-0 z-20 -mx-2 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workflows, routes, screens, or screenshot filenames" className="h-11 w-full bg-transparent text-sm font-medium outline-none" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Screenshot status: filename placeholders active</span>
              {message ? <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{isPending ? 'Saving…' : message}</span> : null}
            </div>
          </div>
        </section>

        <div className="space-y-5">
          {visibleModules.map((module, moduleIndex) => {
            const moduleComplete = module.steps.filter((step) => completed.has(step.id)).length;
            return (
              <details key={module.id} open={moduleIndex < 2 || Boolean(query)} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 sm:px-7">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">{String(moduleIndex + 1).padStart(2, '0')}</span><h2 className="text-xl font-bold">{module.title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{moduleComplete}/{module.steps.length}</span></div>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{module.summary}</p>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>

                <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    {module.steps.map((step, stepIndex) => {
                      const isComplete = completed.has(step.id);
                      return (
                        <article key={step.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition ${isComplete ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggle(step.id)} className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${isComplete ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-blue-400'}`} aria-label={`Mark ${step.title} complete`}><CheckCircle2 className="h-5 w-5" /></button>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Step {stepIndex + 1}</p>
                              <h3 className="mt-1 text-base font-bold text-slate-950">{step.title}</h3>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Link href={step.route.replace('[buyerLeadId]', '').replace('[supplierLeadId]', '').replace('[quoteId]', '') || '/'} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" />Open workflow</Link>
                                <code className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600">{step.route}</code>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-4">
                            <div className="flex items-center gap-2 text-blue-800"><Image className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Screenshot placeholder</p></div>
                            <p className="mt-2 break-all font-mono text-sm font-bold text-blue-950">{step.screenshot}</p>
                            <p className="mt-2 text-xs leading-5 text-blue-700">Replace this placeholder with the captured image using the exact filename above.</p>
                          </div>

                          <div className="mt-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Screenshot must show</p>
                            <ul className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">{step.shows.map((item) => <li key={item} className="flex gap-2"><span className="text-teal-600">•</span><span>{item}</span></li>)}</ul>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </main>
    </div>
  );
}
