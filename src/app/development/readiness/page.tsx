export const dynamic = 'force-dynamic';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { ReadinessBoard } from '@/components/planning/readiness-board';
import { sprintProgress, readinessSummary } from '@/components/planning/development-status';

export default function ReadinessPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Product readiness</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Live deployment status and sprint delivery confidence.
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">
            Readiness is verified against the deployed baseline — not estimated. Build status, sprint completion, and buyer-facing gap are tracked here so leadership has an accurate view of where the product stands at any point in the delivery cycle.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              {readinessSummary.status}
            </span>
            <span className="rounded-full bg-sky-50 px-4 py-1.5 text-sm font-semibold text-sky-700">
              {sprintProgress.percentLabel}
            </span>
          </div>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>
        <section className="mt-10"><ReadinessBoard /></section>
      </main>
    </SiteShell>
  );
}
