'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CORE_ACADEMY_VERSION,
  coreAcademyModules,
  type AcademyModule,
  type AcademyStep,
} from './core-academy-content';

const RUN_KEY = 'setu-core-academy-test-run-id';

type StepMatch = { module: AcademyModule; step: AcademyStep };
type SaveState = { kind: 'idle' | 'saving' | 'success' | 'error'; message: string };

function findStepByTitle(title: string): StepMatch | null {
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

export function CoreAcademyPassLogger({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [state, setState] = useState<SaveState>({ kind: 'idle', message: '' });

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    async function savePass(article: HTMLElement, match: StepMatch) {
      if (!isAuthenticated) {
        setState({ kind: 'success', message: 'Pass recorded on this device. Sign in to sync testing and progress.' });
        dismissTimer = setTimeout(() => setState({ kind: 'idle', message: '' }), 5000);
        return;
      }

      setState({ kind: 'saving', message: `Saving Pass for ${match.step.title}…` });
      try {
        const form = new FormData();
        form.set('action', 'save_result');
        form.set('runId', localStorage.getItem(RUN_KEY) || '');
        form.set('moduleId', match.module.id);
        form.set('moduleTitle', match.module.title);
        form.set('stepId', match.step.id);
        form.set('stepTitle', match.step.title);
        form.set('route', match.step.route);
        form.set('startRoute', match.step.startRoute || match.step.route);
        form.set('result', 'Pass');
        form.set('expectedResult', match.step.shows.map((item) => `- ${item}`).join('\n'));
        form.set('reproductionSteps', match.step.instructions.map((item, index) => `${index + 1}. ${item}`).join('\n'));
        form.set('environment', window.location.href);
        form.set('device', deviceSummary());
        form.set('screenshotFilename', match.step.screenshot);
        form.set('academyVersion', CORE_ACADEMY_VERSION);

        const response = await fetch('/api/core-academy/tests', { method: 'POST', body: form });
        const payload = await response.json() as { error?: string; runId?: string; stepCompleted?: boolean };
        if (!response.ok) throw new Error(payload.error || 'Could not save the passed test.');
        if (payload.runId) localStorage.setItem(RUN_KEY, payload.runId);

        const completionButton = article.querySelector<HTMLButtonElement>('button[aria-label^="Mark "]');
        const alreadyComplete = article.className.includes('border-emerald-200') || completionButton?.className.includes('bg-emerald-600');
        if (completionButton && !alreadyComplete) completionButton.click();

        window.dispatchEvent(new CustomEvent('core-academy-report-refresh'));
        setState({ kind: 'success', message: 'Passed. The step is complete in both My Journey and Test Center.' });
      } catch (error) {
        setState({ kind: 'error', message: error instanceof Error ? error.message : 'Could not save the passed test.' });
      }
      dismissTimer = setTimeout(() => setState({ kind: 'idle', message: '' }), 6000);
    }

    function intercept(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.textContent?.trim() !== 'Pass') return;

      const article = target.closest('article');
      const title = article?.querySelector('h3')?.textContent?.trim();
      if (!(article instanceof HTMLElement) || !title) return;
      const match = findStepByTitle(title);
      if (!match) return;

      window.setTimeout(() => void savePass(article, match), 0);
    }

    document.addEventListener('click', intercept, true);
    return () => {
      document.removeEventListener('click', intercept, true);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [isAuthenticated]);

  if (state.kind === 'idle') return null;

  return (
    <div className={`fixed bottom-5 left-1/2 z-[130] flex w-[min(92vw,560px)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${
      state.kind === 'error'
        ? 'border-rose-200 bg-rose-50/95 text-rose-900'
        : state.kind === 'saving'
          ? 'border-blue-200 bg-blue-50/95 text-blue-900'
          : 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
    }`} role="status" aria-live="polite">
      {state.kind === 'saving' ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : state.kind === 'error' ? <XCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
      <p className="text-sm font-bold">{state.message}</p>
    </div>
  );
}
