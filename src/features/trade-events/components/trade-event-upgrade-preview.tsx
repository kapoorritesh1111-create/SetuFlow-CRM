'use client';

import { useState } from 'react';
import {
  TRIAL_UPGRADE_MODULES,
  formatTrialIntentAction,
  getTrialUpgradeModule,
  type TrialUpgradeIntentAction,
  type TrialUpgradeModuleKey,
} from '@/lib/trial/upgrade-intent';

type IntentStatus = {
  tone: 'idle' | 'success' | 'error';
  message: string;
};

function intentStatusKey(moduleKey: TrialUpgradeModuleKey, action: TrialUpgradeIntentAction) {
  return `${moduleKey}:${action}`;
}

export function TradeEventUpgradePreview() {
  const [activeModuleKey, setActiveModuleKey] = useState<TrialUpgradeModuleKey | null>(null);
  const [statuses, setStatuses] = useState<Record<string, IntentStatus>>({});
  const activeModule = activeModuleKey ? getTrialUpgradeModule(activeModuleKey) : null;

  async function trackIntent(moduleKey: TrialUpgradeModuleKey, action: TrialUpgradeIntentAction) {
    const statusKey = intentStatusKey(moduleKey, action);
    setStatuses((current) => ({
      ...current,
      [statusKey]: { tone: 'idle', message: 'Saving engagement signal…' },
    }));

    try {
      const response = await fetch('/api/trial/upgrade-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleKey, action }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; deduped?: boolean };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not record upgrade intent.');
      }

      const label = formatTrialIntentAction(action);
      setStatuses((current) => ({
        ...current,
        [statusKey]: {
          tone: 'success',
          message: payload.deduped ? `${label} was already captured.` : `${label} sent to Setu Flow.` ,
        },
      }));
    } catch (error) {
      setStatuses((current) => ({
        ...current,
        [statusKey]: {
          tone: 'error',
          message: error instanceof Error ? error.message : 'Could not record upgrade intent.',
        },
      }));
    }
  }

  function openPreview(moduleKey: TrialUpgradeModuleKey) {
    setActiveModuleKey(moduleKey);
    void trackIntent(moduleKey, 'preview_viewed');
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Preview Full Platform</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">See what unlocks after the trade show trial</h2>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            These modules are preview-only in the guided trial. They use Available after upgrade language, open static previews, and never deep-link into locked live workspaces.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
          🔒 Available after upgrade
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {TRIAL_UPGRADE_MODULES.map((module) => {
          const requestStatus = statuses[intentStatusKey(module.key, 'upgrade_requested')];
          return (
            <article key={module.key} className="flex min-h-full flex-col rounded-[1.45rem] border border-slate-200 bg-slate-50 p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">{module.icon}</div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Locked</span>
              </div>
              <h3 className="mt-4 text-base font-black text-slate-950">{module.label}</h3>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">Available after upgrade</p>
              <p className="mt-3 flex-1 text-sm font-medium leading-6 text-slate-600">{module.description}</p>
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-black text-slate-950">{module.previewLabel}</p>
                {module.sampleMetrics.slice(0, 2).map((metric) => (
                  <p key={metric} className="text-xs font-semibold text-slate-600">• {metric}</p>
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                <button type="button" onClick={() => openPreview(module.key)} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800">
                  Preview
                </button>
                <button type="button" onClick={() => void trackIntent(module.key, 'upgrade_requested')} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">
                  Request upgrade
                </button>
              </div>
              {requestStatus?.message ? (
                <p className={`mt-3 rounded-2xl px-3 py-2 text-xs font-bold ${requestStatus.tone === 'error' ? 'bg-red-50 text-red-700' : requestStatus.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  {requestStatus.message}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      {activeModule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${activeModule.label} preview`}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_34px_100px_rgba(15,23,42,0.34)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Preview only</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{activeModule.headline}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{activeModule.description}</p>
              </div>
              <button type="button" onClick={() => setActiveModuleKey(null)} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-black text-slate-600 hover:bg-slate-50" aria-label="Close preview">
                ×
              </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">{activeModule.previewLabel}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Static sample only — the locked live {activeModule.label} module stays closed during trial.</p>
                </div>
                <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Available after upgrade</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {activeModule.sampleMetrics.map((metric) => (
                  <div key={metric} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-lg font-black text-slate-950">{metric}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Preview metric</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                {activeModule.previewBullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-slate-500">Preview views and upgrade requests are sent to the internal Setu Flow trial lead.</p>
              <button type="button" onClick={() => void trackIntent(activeModule.key, 'upgrade_requested')} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-blue-700 px-5 text-sm font-black text-white transition hover:bg-blue-800">
                Request upgrade
              </button>
            </div>
            {statuses[intentStatusKey(activeModule.key, 'preview_viewed')]?.message ? (
              <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{statuses[intentStatusKey(activeModule.key, 'preview_viewed')].message}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
