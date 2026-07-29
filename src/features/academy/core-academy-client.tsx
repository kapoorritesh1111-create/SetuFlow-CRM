'use client';

import NextImage from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  GraduationCap,
  Handshake,
  HelpCircle,
  Infinity as InfinityIcon,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Map as MapIcon,
  Monitor,
  Package,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  Trophy,
  Truck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  CORE_ACADEMY_VERSION,
  coreAcademyModules,
  coreAcademyStepCount,
  type AcademyModule,
  type AcademyStep,
} from './core-academy-content';
import { CoreAcademyScreenshot } from './core-academy-screenshot';

type ProgressRow = { step_id: string; is_complete: boolean };
type AcademyView = 'dashboard' | 'journey' | 'workflows' | 'test' | 'glossary' | 'resources' | 'whats-new';
type Journey = 'both' | 'buyers' | 'suppliers';
type TestStatus = 'pass' | 'fail' | 'blocked' | 'na';
type Props = { initialProgress: ProgressRow[]; isAuthenticated: boolean; viewerName: string };
type PhaseKey = 'foundation' | 'build' | 'execute' | 'optimize';

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

const phaseConfig: Record<PhaseKey, {
  label: string;
  dot: string;
  number: string;
  icon: string;
  border: string;
  progress: string;
  line: string;
}> = {
  foundation: {
    label: 'Foundation',
    dot: 'bg-blue-600',
    number: 'bg-blue-600 text-white shadow-blue-200',
    icon: 'bg-blue-50 text-blue-700 ring-blue-100',
    border: 'border-blue-200 hover:border-blue-300',
    progress: 'bg-blue-600',
    line: 'bg-blue-400 text-blue-500',
  },
  build: {
    label: 'Build',
    dot: 'bg-cyan-600',
    number: 'bg-cyan-600 text-white shadow-cyan-200',
    icon: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    border: 'border-cyan-200 hover:border-cyan-300',
    progress: 'bg-cyan-600',
    line: 'bg-cyan-400 text-cyan-500',
  },
  execute: {
    label: 'Execute',
    dot: 'bg-violet-600',
    number: 'bg-violet-600 text-white shadow-violet-200',
    icon: 'bg-violet-50 text-violet-700 ring-violet-100',
    border: 'border-violet-200 hover:border-violet-300',
    progress: 'bg-violet-600',
    line: 'bg-violet-400 text-violet-500',
  },
  optimize: {
    label: 'Optimize',
    dot: 'bg-orange-500',
    number: 'bg-orange-500 text-white shadow-orange-200',
    icon: 'bg-orange-50 text-orange-700 ring-orange-100',
    border: 'border-orange-200 hover:border-orange-300',
    progress: 'bg-orange-500',
    line: 'bg-orange-400 text-orange-500',
  },
};

const moduleIcons: Record<string, LucideIcon> = {
  'navigation-dashboard': LayoutDashboard,
  'growth-center': Target,
  'capture-leads': UserPlus,
  'buyer-journey': Users,
  'supplier-journey': Truck,
  'orders-execution': Package,
  'catalog-pricing': Tags,
  documents: FileText,
  'tasks-events-card': CalendarDays,
  'admin-collaboration-ai': ShieldCheck,
};

const navItems: Array<[AcademyView, string, LucideIcon]> = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['journey', 'My Journey', MapIcon],
  ['workflows', 'All Modules', BookOpen],
  ['test', 'Test Center', ClipboardCheck],
  ['glossary', 'Glossary', GraduationCap],
  ['resources', 'Resources', HelpCircle],
  ['whats-new', 'What’s New', Sparkles],
];

function moduleLabel(title: string) {
  return title.replace(/^\d+\.\s*/, '');
}

function phaseForIndex(index: number): PhaseKey {
  if (index <= 2) return 'foundation';
  if (index <= 4) return 'build';
  if (index <= 7) return 'execute';
  return 'optimize';
}

function visibleForJourney(item: AcademyStep, journey: Journey) {
  if (journey === 'both' || !item.journeys?.length) return true;
  return item.journeys.includes(journey) || item.journeys.includes('both');
}

function FeatureTile({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex min-w-[190px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-inner shadow-white/5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 text-xs font-medium text-white/55">{detail}</p>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  return (
    <div
      className="grid h-24 w-24 place-items-center rounded-full p-[9px]"
      style={{ background: `conic-gradient(#2563eb ${percent * 3.6}deg, #e2e8f0 0deg)` }}
      aria-label={`${percent}% Academy progress`}
    >
      <div className="grid h-full w-full place-items-center rounded-full bg-white shadow-inner">
        <span className="text-2xl font-black text-slate-950">{percent}%</span>
      </div>
    </div>
  );
}

function ModuleRoadmapCard({
  module,
  index,
  completed,
  showConnector,
  onOpen,
}: {
  module: AcademyModule;
  index: number;
  completed: Set<string>;
  showConnector: boolean;
  onOpen: (module: AcademyModule) => void;
}) {
  const phase = phaseForIndex(index);
  const config = phaseConfig[phase];
  const Icon = moduleIcons[module.id] ?? BookOpen;
  const done = module.steps.filter((item) => completed.has(item.id)).length;
  const modulePercent = module.steps.length ? Math.round((done / module.steps.length) * 100) : 0;

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => onOpen(module)}
        className={`group relative flex h-full min-h-[240px] w-full flex-col rounded-[1.6rem] border bg-white p-5 text-left shadow-[0_14px_32px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_rgba(15,23,42,0.10)] ${config.border}`}
      >
        <span className={`absolute -top-4 left-5 grid h-9 w-9 place-items-center rounded-full text-sm font-black shadow-lg ${config.number}`}>
          {index + 1}
        </span>
        <span className={`mt-3 grid h-12 w-12 place-items-center rounded-2xl ring-1 ${config.icon}`}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-[17px] font-black leading-6 text-slate-950">{moduleLabel(module.title)}</h3>
        <p className="mt-2 flex-1 text-sm font-medium leading-6 text-slate-600">{module.summary}</p>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{done}/{module.steps.length} completed</span>
            <span>{modulePercent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all ${config.progress}`} style={{ width: `${modulePercent}%` }} />
          </div>
        </div>
      </button>

      {showConnector ? (
        <div className="pointer-events-none absolute -right-4 top-10 z-10 hidden w-4 items-center xl:flex" aria-hidden="true">
          <span className={`h-px flex-1 ${config.line.split(' ')[0]}`} />
          <ChevronRight className={`h-4 w-4 shrink-0 ${config.line.split(' ')[1]}`} />
        </div>
      ) : null}
    </div>
  );
}

function ModuleRoadmapRow({
  modules,
  startIndex,
  completed,
  onOpen,
  tone,
}: {
  modules: AcademyModule[];
  startIndex: number;
  completed: Set<string>;
  onOpen: (module: AcademyModule) => void;
  tone: 'top' | 'bottom';
}) {
  return (
    <div
      className={`rounded-[2rem] border p-4 pt-7 sm:p-5 sm:pt-8 ${
        tone === 'top'
          ? 'border-blue-200/80 bg-gradient-to-r from-blue-50/55 via-white to-cyan-50/55'
          : 'border-violet-200/80 bg-gradient-to-r from-violet-50/55 via-white to-orange-50/55'
      }`}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {modules.map((module, rowIndex) => (
          <ModuleRoadmapCard
            key={module.id}
            module={module}
            index={startIndex + rowIndex}
            completed={completed}
            showConnector={rowIndex < modules.length - 1}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function Achievement({ icon: Icon, title, detail, tone }: { icon: LucideIcon; title: string; detail: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-center gap-4 px-4 py-3">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs font-medium leading-5 text-white/60">{detail}</p>
      </div>
    </div>
  );
}

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
  const [testResults, setTestResults] = useState<Record<string, TestStatus>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '[]');
      if (Array.isArray(local)) setCompleted((current) => new Set([...current, ...local]));
      const tests = JSON.parse(localStorage.getItem(LOCAL_TEST_KEY) || '{}');
      if (tests && typeof tests === 'object') setTestResults(tests);
    } catch {
      // Local progress is optional. The Academy remains usable when storage is unavailable.
    }
  }, []);

  const journeyModules = useMemo(
    () => coreAcademyModules
      .map((module) => ({ ...module, steps: module.steps.filter((item) => visibleForJourney(item, journey)) }))
      .filter((module) => module.steps.length),
    [journey],
  );

  const visibleModules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return journeyModules;
    return journeyModules
      .map((module) => ({
        ...module,
        steps: module.steps.filter((item) => [
          module.title,
          module.summary,
          module.outcome,
          item.title,
          item.route,
          item.startRoute,
          item.screenshot,
          ...item.shows,
          ...item.instructions,
        ].join(' ').toLowerCase().includes(needle)),
      }))
      .filter((module) => module.steps.length);
  }, [journeyModules, query]);

  const percent = Math.round((completed.size / coreAcademyStepCount) * 100);
  const allSteps = coreAcademyModules.flatMap((module) => module.steps);
  const nextStep = allSteps.find((item) => !completed.has(item.id));
  const testCount = Object.keys(testResults).length;
  const passCount = Object.values(testResults).filter((status) => status === 'pass').length;
  const badgeStatus = percent === 100 ? 'Core Platform Ready' : percent > 0 ? 'In progress' : 'Not started';

  function sync(next: Set<string>) {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify([...next]));
    if (!isAuthenticated) {
      setMessage('Progress saved on this device. Sign in to sync it to your workspace.');
      return;
    }

    const entries = coreAcademyModules.flatMap((module) => module.steps.map((item) => ({
      stepId: item.id,
      moduleId: module.id,
      moduleTitle: module.title,
      stepTitle: item.title,
      route: item.route,
      screenshotFilename: item.screenshot,
      isComplete: next.has(item.id),
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
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
    setCompleted(next);
    sync(next);
  }

  function setTestStatus(stepId: string, status: TestStatus) {
    const next = { ...testResults, [stepId]: status };
    setTestResults(next);
    localStorage.setItem(LOCAL_TEST_KEY, JSON.stringify(next));
    setMessage(`Test result saved on this device: ${status.toUpperCase()}.`);
  }

  function showView(target: AcademyView) {
    setView(target);
    if (target !== 'workflows') setQuery('');
    requestAnimationFrame(() => document.getElementById('academy-main')?.scrollIntoView({ behavior: 'smooth' }));
  }

  function openModule(module: AcademyModule) {
    setView('workflows');
    setQuery(moduleLabel(module.title));
    requestAnimationFrame(() => document.getElementById('academy-main')?.scrollIntoView({ behavior: 'smooth' }));
  }

  function renderModuleGuides() {
    return (
      <section>
        <div className="sticky top-0 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, workflows, screens, or actions"
                className="h-11 w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                {view === 'test' ? `${testCount} tests recorded` : `${completed.size}/${coreAcademyStepCount} complete`}
              </span>
              <span className="text-xs font-semibold text-slate-500">{isPending ? 'Saving…' : message}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {visibleModules.map((module, moduleIndex) => {
            const moduleComplete = module.steps.filter((item) => completed.has(item.id)).length;
            const firstIncompleteIndex = coreAcademyModules.findIndex((candidate) => candidate.steps.some((item) => !completed.has(item.id)));
            const shouldOpen = Boolean(query) || view === 'workflows' || view === 'test' || moduleIndex === Math.max(firstIncompleteIndex, 0);
            const globalIndex = coreAcademyModules.findIndex((candidate) => candidate.id === module.id);
            const phase = phaseConfig[phaseForIndex(globalIndex)];
            const ModuleIcon = moduleIcons[module.id] ?? BookOpen;

            return (
              <details key={module.id} open={shouldOpen} className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 sm:px-7">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ${phase.icon}`}>
                      <ModuleIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Module {globalIndex + 1}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{moduleComplete}/{module.steps.length}</span>
                      </div>
                      <h2 className="mt-1 text-xl font-black text-slate-950">{moduleLabel(module.title)}</h2>
                      <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-slate-600">{module.summary}</p>
                      <p className="mt-2 text-xs font-bold text-teal-700">Outcome: {module.outcome}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>

                <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-6">
                  <div className="space-y-5">
                    {module.steps.map((item, itemIndex) => {
                      const isComplete = completed.has(item.id);
                      const launchRoute = item.startRoute || item.route;
                      const testStatus = testResults[item.id];

                      return (
                        <article key={item.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${isComplete ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
                          <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
                            <div className="p-5 sm:p-6">
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggle(item.id)}
                                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition ${isComplete ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-blue-400'}`}
                                  aria-label={`Mark ${item.title} complete`}
                                >
                                  <CheckCircle2 className="h-5 w-5" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Step {itemIndex + 1}</p>
                                  <h3 className="mt-1 text-lg font-black text-slate-950">{item.title}</h3>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Link
                                      href={launchRoute}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />Open starting page
                                    </Link>
                                    <code className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-600">Start: {launchRoute}</code>
                                  </div>
                                  {item.startRoute ? (
                                    <p className="mt-2 text-xs font-medium text-slate-500">The screen being taught is <code>{item.route}</code>. Begin from the safe queue above and select a real record.</p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">Click-by-click guide</p>
                                <ol className="mt-3 space-y-3">
                                  {item.instructions.map((instruction, instructionIndex) => (
                                    <li key={`${item.id}-instruction-${instructionIndex}`} className="flex gap-3 text-sm font-medium leading-6 text-slate-700">
                                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-600 text-[11px] font-black text-white">{instructionIndex + 1}</span>
                                      <span>{instruction}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              <div className="mt-5">
                                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Confirm the screen shows</p>
                                <ul className="mt-3 grid gap-2 text-sm font-medium text-slate-600 sm:grid-cols-2">
                                  {item.shows.map((show) => (
                                    <li key={show} className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2">
                                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                                      <span>{show}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {view === 'test' ? (
                                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-sm font-black text-slate-950">Record test result</p>
                                      <p className="mt-1 text-xs font-medium text-slate-500">Repeat the workflow using clicks, then save the observed result.</p>
                                    </div>
                                    {testStatus ? <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black uppercase text-white">{testStatus}</span> : null}
                                  </div>
                                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {([
                                      ['pass', 'Pass', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
                                      ['fail', 'Fail', 'border-rose-200 bg-rose-50 text-rose-700'],
                                      ['blocked', 'Blocked', 'border-amber-200 bg-amber-50 text-amber-700'],
                                      ['na', 'N/A', 'border-slate-200 bg-slate-50 text-slate-700'],
                                    ] as Array<[TestStatus, string, string]>).map(([status, label, classes]) => (
                                      <button
                                        type="button"
                                        key={status}
                                        onClick={() => setTestStatus(item.id, status)}
                                        className={`rounded-xl border px-3 py-2.5 text-xs font-black transition hover:-translate-y-0.5 ${classes} ${testStatus === status ? 'ring-2 ring-slate-950/10' : ''}`}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 xl:border-l xl:border-t-0">
                              <CoreAcademyScreenshot filename={item.screenshot} title={item.title} />
                            </div>
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
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <header className="border-b border-white/10 bg-[#041735] text-white shadow-[0_16px_50px_rgba(4,23,53,0.18)]">
        <div className="mx-auto max-w-[1650px] px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex items-center gap-3 border-r border-white/15 pr-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-950/30">
                  <InfinityIcon className="h-8 w-8 text-white" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-lg font-black tracking-[0.14em] text-white">SETU FLOW</p>
                  <p className="text-right text-[10px] font-black tracking-[0.32em] text-cyan-300">CRM</p>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white">Core Platform Learning Journey</p>
                <p className="mt-1 text-sm font-medium text-white/65">Master every workflow. Grow every relationship.</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <FeatureTile icon={ListChecks} title="Learn by Doing" detail="Step-by-step guides" />
              <FeatureTile icon={Monitor} title="Real Screenshots" detail="Exact UI, exact steps" />
              <FeatureTile icon={BadgeCheck} title="Track Progress" detail="Completion and tests" />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-1 text-xs font-bold">
                <button type="button" onClick={() => showView('journey')} className={`rounded-lg px-4 py-2 transition ${view !== 'test' ? 'bg-white text-slate-950 shadow-sm' : 'text-white/65 hover:text-white'}`}>Learn Mode</button>
                <button type="button" onClick={() => showView('test')} className={`rounded-lg px-4 py-2 transition ${view === 'test' ? 'bg-white text-slate-950 shadow-sm' : 'text-white/65 hover:text-white'}`}>Test Mode</button>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white/70">
                <span className="hidden sm:inline">Optional filter</span>
                <select value={journey} onChange={(event) => setJourney(event.target.value as Journey)} className="h-10 bg-transparent text-xs font-bold text-white outline-none">
                  <option value="both" className="text-slate-900">All workflows</option>
                  <option value="buyers" className="text-slate-900">Buyer workflows</option>
                  <option value="suppliers" className="text-slate-900">Supplier workflows</option>
                </select>
              </label>
            </div>
            <p className="truncate text-xs font-semibold text-white/55">
              {isAuthenticated ? `Signed in as ${viewerName}` : 'Public learning mode · Sign in to sync progress'}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1650px] gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[245px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.06)] lg:sticky lg:top-5">
          <nav className="space-y-1 text-sm font-bold" aria-label="Academy navigation">
            {navItems.map(([key, label, Icon]) => (
              <button
                type="button"
                key={key}
                onClick={() => showView(key)}
                aria-current={view === key ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${view === key ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-5 border-t border-slate-100 px-2 pt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Your progress</p>
            <div className="mt-4 flex flex-col items-center">
              <ProgressRing percent={percent} />
              <p className="mt-3 text-sm font-black text-slate-950">Overall Progress</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{completed.size}/{coreAcademyStepCount} completed</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 px-2 pt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Core Platform Badge</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#041735] text-cyan-300 shadow-sm">
                <BadgeCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-950">Core Platform</p>
                <p className="mt-0.5 text-xs font-bold text-blue-700">{badgeStatus}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">Need help?</p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">Ask Setu Guru for guidance.</p>
              </div>
              <NextImage src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={58} height={58} className="h-14 w-14 rounded-2xl object-contain" />
            </div>
            <button type="button" onClick={() => showView('resources')} className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50">Open guidance</button>
          </div>
        </aside>

        <main id="academy-main" className="min-w-0">
          {!isAuthenticated ? (
            <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-blue-950">Learn freely. Sign in when you are ready to sync.</p>
                <p className="mt-1 text-sm font-medium text-blue-700">Completion and test results remain on this device until you sign in.</p>
              </div>
              <Link href="/client-login?next=%2Facademy" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-bold text-white">
                <LogIn className="h-4 w-4" />Sign in to sync
              </Link>
            </section>
          ) : null}

          {view === 'dashboard' ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Setu Flow Academy</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Your Complete Learning Journey <Sparkles className="inline h-7 w-7 text-blue-500" /></h1>
                  <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-600">Follow the recommended path to master Setu Flow CRM. Each module builds on the last—from first capture to full business execution.</p>
                </div>
                <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  {(Object.keys(phaseConfig) as PhaseKey[]).map((phase) => (
                    <span key={phase} className="inline-flex items-center gap-2 text-xs font-black text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${phaseConfig[phase].dot}`} />
                      {phaseConfig[phase].label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative">
                <ModuleRoadmapRow modules={coreAcademyModules.slice(0, 5)} startIndex={0} completed={completed} onOpen={openModule} tone="top" />
                <div className="relative mx-8 hidden h-14 xl:block" aria-hidden="true">
                  <span className="absolute right-6 top-0 h-7 w-px bg-cyan-400" />
                  <span className="absolute left-6 right-6 top-7 h-px bg-gradient-to-l from-cyan-400 via-violet-400 to-violet-400" />
                  <ChevronLeft className="absolute left-3 top-[19px] h-4 w-4 text-violet-500" />
                  <span className="absolute left-6 top-7 h-7 w-px bg-violet-400" />
                </div>
                <div className="mt-5 xl:mt-0">
                  <ModuleRoadmapRow modules={coreAcademyModules.slice(5, 10)} startIndex={5} completed={completed} onOpen={openModule} tone="bottom" />
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] bg-[#041735] shadow-[0_20px_50px_rgba(4,23,53,0.20)]">
                <div className="grid divide-y divide-white/10 lg:grid-cols-[repeat(4,minmax(0,1fr))_250px] lg:divide-x lg:divide-y-0">
                  <Achievement icon={Rocket} title="End-to-End Mastery" detail="From first capture to final execution." tone="bg-blue-500/20 text-blue-300" />
                  <Achievement icon={TrendingUp} title="Higher Productivity" detail="Work smarter with the right workflows." tone="bg-cyan-500/20 text-cyan-300" />
                  <Achievement icon={Handshake} title="Stronger Relationships" detail="Deliver better buyer and supplier experiences." tone="bg-violet-500/20 text-violet-300" />
                  <Achievement icon={Trophy} title="Core Platform Ready" detail="Complete all modules and earn your badge." tone="bg-orange-500/20 text-orange-300" />
                  <div className="bg-white/[0.06] p-5">
                    <p className="text-lg font-black text-white">Ready to start?</p>
                    <p className="mt-2 text-xs font-medium leading-5 text-white/60">Begin with Module 1 and build your foundation.</p>
                    <button type="button" onClick={() => showView('journey')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5">
                      Start Learning <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {nextStep ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-600">Continue learning</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{nextStep.title}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">Your next incomplete guided workflow.</p>
                  </div>
                  <button type="button" onClick={() => showView('journey')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Open My Journey</button>
                </div>
              ) : null}
            </section>
          ) : null}

          {view === 'journey' || view === 'workflows' || view === 'test' ? renderModuleGuides() : null}

          {view === 'glossary' ? (
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Reference</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Setu Flow Glossary</h1>
              <p className="mt-2 text-sm font-medium text-slate-600">Plain-language definitions for the core trade execution workflow.</p>
              <div className="mt-6 divide-y divide-slate-100">
                {glossary.map(([term, meaning]) => (
                  <div key={term} className="py-5">
                    <h2 className="font-black text-slate-950">{term}</h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{meaning}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {view === 'resources' ? (
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Academy resources</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">Get help without leaving the learning path.</h1>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-600">Use these resources when a workflow, route, or business rule needs more explanation.</p>
                <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <button type="button" onClick={() => showView('journey')} className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left transition hover:-translate-y-0.5"><MapIcon className="h-6 w-6 text-blue-700" /><h2 className="mt-4 font-black text-slate-950">Guided Journey</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-600">Follow modules in the recommended order.</p></button>
                  <button type="button" onClick={() => showView('test')} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 text-left transition hover:-translate-y-0.5"><ClipboardCheck className="h-6 w-6 text-violet-700" /><h2 className="mt-4 font-black text-slate-950">Test Center</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-600">Repeat workflows and record results.</p></button>
                  <Link href="/setu-guru-ai" className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 transition hover:-translate-y-0.5"><NextImage src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={28} height={28} className="h-7 w-7 rounded-lg" /><h2 className="mt-4 font-black text-slate-950">Setu Guru</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-600">Learn how contextual AI supports the workflow.</p></Link>
                  <a href="mailto:help@setugroups.com" className="rounded-2xl border border-orange-100 bg-orange-50 p-5 transition hover:-translate-y-0.5"><HelpCircle className="h-6 w-6 text-orange-700" /><h2 className="mt-4 font-black text-slate-950">Contact Support</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-600">Email help@setugroups.com for assistance.</p></a>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-black text-slate-950">How to use this Academy</h2>
                <ol className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    'Start with My Journey to see the recommended module order.',
                    'Read every numbered click before opening the CRM screen.',
                    'Open the starting page in a new tab and select a real record when required.',
                    'Mark the step complete, then repeat it in Test Mode.',
                  ].map((instruction, index) => (
                    <li key={instruction} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{index + 1}</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          ) : null}

          {view === 'whats-new' ? (
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Academy updates</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">What’s New</h1>
              <p className="mt-2 text-sm font-medium text-slate-600">Core Academy version {CORE_ACADEMY_VERSION}</p>
              <div className="mt-7 space-y-4">
                {[
                  ['Connected learning roadmap', 'All ten modules now appear as one visual path from foundation through optimization.'],
                  ['Working Test Center', 'Record Pass, Fail, Blocked, or N/A against each guided workflow.'],
                  ['Verified navigation routes', 'Growth Center and dynamic buyer, supplier, quote, and approval workflows begin from safe real routes.'],
                  ['Expanded client training', 'My Digital vCard, Documents, Catalog pricing, and Price List sharing are included as first-class workflows.'],
                ].map(([title, detail]) => (
                  <div key={title} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><Sparkles className="h-5 w-5" /></span>
                    <div><h2 className="font-black text-slate-950">{title}</h2><p className="mt-1 text-sm font-medium leading-6 text-slate-600">{detail}</p></div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1650px] flex-col gap-4 px-5 py-6 text-xs font-semibold text-slate-500 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <NextImage src="/logos/setu-flow-logo.png" alt="Setu Flow CRM" width={130} height={40} className="h-8 w-auto" />
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span>Intertwining Trade & Technology</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="mailto:help@setugroups.com" className="transition hover:text-blue-700">Need help? Contact support</a>
            <a href="https://www.setuflowcrm.com" className="transition hover:text-blue-700">www.setuflowcrm.com</a>
            <span>Academy {CORE_ACADEMY_VERSION}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
