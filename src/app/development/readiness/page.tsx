import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { ReadinessBoard } from '@/components/planning/readiness-board';
import { sprintProgress } from '@/components/planning/development-status';

export default function ReadinessPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Readiness view</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Sprint 2 readiness is shown against the restored planning operating system, with Sprint 1 preserved as complete and future sprints still visible but inactive.</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">This is the blunt implementation status for the locked development workplace. It should be reviewed before and after every real code step so drift never creeps back in and later sprint work stays visible without becoming accidental active scope.</p>
          <div className="mt-8"><DevelopmentNav /></div>
        </section>
        <section className="mt-10">
          <ReadinessBoard />
        </section>
      </main>
    </SiteShell>
  );
}
