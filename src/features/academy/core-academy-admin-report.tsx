'use client';

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type IssueCounts = { reported: number; open: number; inProgress: number; resolved: number; deferred: number };
type TestCounts = { total: number; pass: number; fail: number; blocked: number; na: number };
type Learner = {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  testedRole: string | null;
  status: string;
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  tests: TestCounts;
  issues: IssueCounts;
  lastActivity: string | null;
};
type ReportPayload = {
  generatedAt: string;
  organization: { id: string; name: string };
  totalSteps: number;
  summary: {
    activeLearners: number;
    startedLearners: number;
    testedLearners: number;
    completedLearners: number;
    tests: TestCounts;
    issues: IssueCounts;
  };
  learners: Learner[];
  latestIssues: Array<{
    issueRef: string;
    title: string;
    status: string;
    priority: string | null;
    severity: string | null;
    reportedAt: string | null;
    resolvedAt: string | null;
    updatedAt: string | null;
  }>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes = normalized.includes('complete')
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : normalized.includes('attention')
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : normalized.includes('progress')
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${classes}`}>{status}</span>;
}

function MetricCard({ icon: Icon, label, value, detail, tone }: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{detail}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

export function CoreAcademyAdminReport({ canAccessAdmin }: { canAccessAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!canAccessAdmin) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/core-academy/report', { cache: 'no-store' });
      const payload = await response.json() as ReportPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not load the Academy report.');
      setReport(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the Academy report.');
    } finally {
      setLoading(false);
    }
  }, [canAccessAdmin]);

  useEffect(() => {
    function refresh() {
      if (isOpen) void loadReport();
    }
    window.addEventListener('core-academy-report-refresh', refresh);
    return () => window.removeEventListener('core-academy-report-refresh', refresh);
  }, [isOpen, loadReport]);

  useEffect(() => {
    if (!isOpen) return;
    void loadReport();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, loadReport]);

  const issueCompletionRate = useMemo(() => {
    const reported = report?.summary.issues.reported ?? 0;
    return reported ? Math.round(((report?.summary.issues.resolved ?? 0) / reported) * 100) : 0;
  }, [report]);

  if (!canAccessAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-3 rounded-2xl bg-[#041735] px-4 py-3 text-left text-white shadow-[0_18px_50px_rgba(4,23,53,0.35)] transition hover:-translate-y-0.5 hover:bg-blue-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/15 text-cyan-200"><BarChart3 className="h-5 w-5" /></span>
        <span>
          <span className="block text-sm font-black">Academy Report</span>
          <span className="mt-0.5 block text-[11px] font-medium text-white/60">Owners & admins</span>
        </span>
        <ChevronRight className="h-4 w-4 text-white/45" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[140] flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Core Academy organization report">
          <div className="flex h-full w-full max-w-[1180px] flex-col bg-[#f7f9fc] shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#041735] text-cyan-300"><ShieldCheck className="h-6 w-6" /></span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-600">Owner & Admin View</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Core Academy Testing Report</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">{report?.organization.name || 'Organization'} · learner progress, testing activity, and issue resolution.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void loadReport()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button type="button" onClick={() => setIsOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-slate-800" aria-label="Close Academy report"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7">
              {loading && !report ? (
                <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" /><p className="mt-3 text-sm font-bold text-slate-600">Loading organization Academy activity…</p></div></div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">{error}</div>
              ) : report ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={Users} label="Active learners" value={report.summary.activeLearners} detail={`${report.summary.startedLearners} have started the Academy`} tone="bg-blue-50 text-blue-700" />
                    <MetricCard icon={UserCheck} label="People tested" value={report.summary.testedLearners} detail={`${report.summary.tests.total} test results recorded`} tone="bg-cyan-50 text-cyan-700" />
                    <MetricCard icon={CheckCircle2} label="Completed learners" value={report.summary.completedLearners} detail={`Completed all ${report.totalSteps} steps`} tone="bg-emerald-50 text-emerald-700" />
                    <MetricCard icon={AlertTriangle} label="Issues reported" value={report.summary.issues.reported} detail={`${issueCompletionRate}% currently resolved`} tone="bg-orange-50 text-orange-700" />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Testing results</p><h3 className="mt-1 text-lg font-black text-slate-950">Pass, Fail, Blocked & N/A</h3></div><BarChart3 className="h-5 w-5 text-blue-600" /></div>
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ['Pass', report.summary.tests.pass, 'bg-emerald-50 text-emerald-700'],
                          ['Fail', report.summary.tests.fail, 'bg-rose-50 text-rose-700'],
                          ['Blocked', report.summary.tests.blocked, 'bg-amber-50 text-amber-700'],
                          ['N/A', report.summary.tests.na, 'bg-slate-100 text-slate-700'],
                        ].map(([label, value, classes]) => <div key={String(label)} className={`rounded-2xl p-4 ${classes}`}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-wide">{label}</p></div>)}
                      </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Issue log status</p><h3 className="mt-1 text-lg font-black text-slate-950">Reported through Core Academy</h3></div><AlertTriangle className="h-5 w-5 text-orange-600" /></div>
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ['Open', report.summary.issues.open, 'bg-rose-50 text-rose-700'],
                          ['In progress', report.summary.issues.inProgress, 'bg-blue-50 text-blue-700'],
                          ['Resolved', report.summary.issues.resolved, 'bg-emerald-50 text-emerald-700'],
                          ['Deferred', report.summary.issues.deferred, 'bg-slate-100 text-slate-700'],
                        ].map(([label, value, classes]) => <div key={String(label)} className={`rounded-2xl p-4 ${classes}`}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-wide">{label}</p></div>)}
                      </div>
                    </section>
                  </div>

                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4"><p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-600">Learner progress</p><h3 className="mt-1 text-lg font-black text-slate-950">Who has learned and tested</h3></div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-3">Learner</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Tests</th><th className="px-4 py-3">Issues</th><th className="px-5 py-3">Last activity</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {report.learners.length ? report.learners.map((learner) => (
                            <tr key={learner.userId} className="align-top hover:bg-slate-50/60">
                              <td className="px-5 py-4"><div className="font-black text-slate-950">{learner.name}</div><div className="mt-1 text-xs font-medium text-slate-500">{learner.email || learner.testedRole || 'Organization member'}</div></td>
                              <td className="px-4 py-4"><StatusPill status={learner.status} /></td>
                              <td className="min-w-[170px] px-4 py-4"><div className="flex items-center justify-between text-xs font-black text-slate-600"><span>{learner.completedSteps}/{learner.totalSteps}</span><span>{learner.progressPercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${learner.progressPercent}%` }} /></div></td>
                              <td className="px-4 py-4"><div className="font-black text-slate-950">{learner.tests.total}</div><div className="mt-1 text-xs font-medium text-slate-500">{learner.tests.pass} pass · {learner.tests.fail} fail · {learner.tests.blocked} blocked</div></td>
                              <td className="px-4 py-4"><div className="font-black text-slate-950">{learner.issues.reported}</div><div className="mt-1 text-xs font-medium text-slate-500">{learner.issues.open} open · {learner.issues.inProgress} in progress · {learner.issues.resolved} resolved</div></td>
                              <td className="whitespace-nowrap px-5 py-4 text-xs font-medium text-slate-500">{formatDate(learner.lastActivity)}</td>
                            </tr>
                          )) : <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">No learner activity has been recorded yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-600">Recent issue activity</p><h3 className="mt-1 text-lg font-black text-slate-950">Core Academy issues reported by this organization</h3></div><p className="text-xs font-medium text-slate-500">Updated {formatDate(report.generatedAt)}</p></div>
                    <div className="divide-y divide-slate-100">
                      {report.latestIssues.length ? report.latestIssues.map((issue) => (
                        <div key={issue.issueRef} className="grid gap-3 px-5 py-4 sm:grid-cols-[130px_minmax(0,1fr)_130px_180px] sm:items-center">
                          <div className="font-mono text-xs font-black text-blue-700">{issue.issueRef}</div>
                          <div><p className="font-black text-slate-950">{issue.title}</p><p className="mt-1 text-xs font-medium text-slate-500">{issue.priority || 'No priority'} · {issue.severity || 'No severity'}</p></div>
                          <StatusPill status={issue.status || 'Open'} />
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Clock3 className="h-4 w-4" />{formatDate(issue.updatedAt || issue.reportedAt)}</div>
                        </div>
                      )) : <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500">No Core Academy issues have been reported by this organization.</div>}
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
