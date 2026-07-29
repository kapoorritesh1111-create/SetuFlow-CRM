'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileImage, Loader2, X } from 'lucide-react';
import { coreAcademyModules, type AcademyModule, type AcademyStep } from './core-academy-content';

type SelectedStep = {
  module: AcademyModule;
  step: AcademyStep;
  result: 'Fail' | 'Blocked';
  sourceButton: HTMLButtonElement;
};

type SubmitResponse = {
  error?: string;
  issueRef?: string | null;
  runId?: string;
};

const RUN_KEY = 'setu-core-academy-test-run-id';

function findStepByTitle(title: string) {
  for (const module of coreAcademyModules) {
    const step = module.steps.find((item) => item.title.trim() === title.trim());
    if (step) return { module, step };
  }
  return null;
}

function deviceSummary() {
  if (typeof window === 'undefined') return '';
  return [
    navigator.userAgent,
    `Viewport ${window.innerWidth}x${window.innerHeight}`,
    `Screen ${window.screen.width}x${window.screen.height}`,
    `Pixel ratio ${window.devicePixelRatio}`,
  ].join(' | ');
}

export function CoreAcademyIssueLogger({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [selected, setSelected] = useState<SelectedStep | null>(null);
  const [actualResult, setActualResult] = useState('');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [issueRef, setIssueRef] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const expectedResult = useMemo(() => {
    if (!selected) return '';
    return selected.step.shows.map((item) => `- ${item}`).join('\n');
  }, [selected]);

  const reproductionSteps = useMemo(() => {
    if (!selected) return '';
    return selected.step.instructions.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }, [selected]);

  useEffect(() => {
    function intercept(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.dataset.issueLoggerBypass === 'true') {
        delete target.dataset.issueLoggerBypass;
        return;
      }

      const label = target.textContent?.trim();
      if (label !== 'Fail' && label !== 'Blocked') return;

      const article = target.closest('article');
      const title = article?.querySelector('h3')?.textContent?.trim();
      if (!title) return;
      const match = findStepByTitle(title);
      if (!match) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (!isAuthenticated) {
        setError('Sign in before logging a failed or blocked test.');
      } else {
        setError('');
      }
      setSelected({ ...match, result: label, sourceButton: target });
      setActualResult('');
      setNotes('');
      setEvidence(null);
      setIssueRef('');
    }

    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, [isAuthenticated]);

  function close() {
    if (saving) return;
    setSelected(null);
    setError('');
    setIssueRef('');
  }

  async function submit() {
    if (!selected || saving) return;
    if (!isAuthenticated) {
      setError('Sign in before logging a failed or blocked test.');
      return;
    }
    if (!actualResult.trim()) {
      setError('Describe what actually happened.');
      return;
    }
    if (!evidence) {
      setError('Upload screenshot evidence before submitting.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.set('action', 'save_result');
      form.set('runId', localStorage.getItem(RUN_KEY) || '');
      form.set('moduleId', selected.module.id);
      form.set('moduleTitle', selected.module.title);
      form.set('stepId', selected.step.id);
      form.set('stepTitle', selected.step.title);
      form.set('route', selected.step.route);
      form.set('startRoute', selected.step.startRoute || selected.step.route);
      form.set('result', selected.result);
      form.set('expectedResult', expectedResult);
      form.set('actualResult', actualResult);
      form.set('reproductionSteps', reproductionSteps);
      form.set('notes', notes);
      form.set('environment', window.location.href);
      form.set('device', deviceSummary());
      form.set('evidence', evidence);

      const response = await fetch('/api/core-academy/tests', { method: 'POST', body: form });
      const payload = await response.json() as SubmitResponse;
      if (!response.ok) throw new Error(payload.error || 'Could not log the Academy issue.');

      if (payload.runId) localStorage.setItem(RUN_KEY, payload.runId);
      setIssueRef(payload.issueRef || 'Issue created');

      selected.sourceButton.dataset.issueLoggerBypass = 'true';
      selected.sourceButton.click();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not log the Academy issue.');
    } finally {
      setSaving(false);
    }
  }

  if (!selected) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Log Core Academy issue">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
        <div className={`flex items-start justify-between gap-4 border-b px-6 py-5 ${selected.result === 'Blocked' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
          <div className="flex gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${selected.result === 'Blocked' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'}`}>
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">{selected.result} test</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{selected.step.title}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">Submitting creates a linked issue in the Setu Flow issue log as Test User.</p>
            </div>
          </div>
          <button type="button" onClick={close} disabled={saving} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-950 disabled:opacity-50" aria-label="Close issue form">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {!isAuthenticated ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-900">
              Sign in to the Academy before recording Fail or Blocked. This ensures the issue is linked to the real tester and client organization.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Module</p>
              <p className="mt-1 text-sm font-black text-slate-900">{selected.module.title}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Issue priority</p>
              <p className="mt-1 text-sm font-black text-slate-900">{selected.result === 'Blocked' ? 'P1 · High' : 'P2 · Medium'}</p>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-black text-slate-900">What actually happened? <span className="text-rose-600">*</span></span>
            <textarea
              value={actualResult}
              onChange={(event) => setActualResult(event.target.value)}
              rows={5}
              placeholder="Describe the incorrect behavior, error, missing action, wrong data, or point where the workflow stopped."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-black text-slate-900">Additional notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Add context, customer impact, workaround, or frequency."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div>
            <p className="text-sm font-black text-slate-900">Screenshot evidence <span className="text-rose-600">*</span></p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm"><FileImage className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900">{evidence ? evidence.name : 'Upload PNG, JPG, or WebP'}</span>
                <span className="mt-1 block text-xs font-medium text-slate-500">Required for Fail and Blocked · Maximum 10 MB</span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => setEvidence(event.target.files?.[0] || null)}
            />
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div> : null}
          {issueRef ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-900">Issue logged successfully</p>
              <p className="mt-1 font-mono text-base font-black text-emerald-700">{issueRef}</p>
              <p className="mt-1 text-xs font-medium text-emerald-700">The test result and screenshot are linked to the issue log.</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              {issueRef ? 'Close' : 'Cancel'}
            </button>
            {!issueRef ? (
              <button type="button" onClick={submit} disabled={saving || !isAuthenticated} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${selected.result === 'Blocked' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {saving ? 'Logging issue…' : `Log ${selected.result} issue`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
