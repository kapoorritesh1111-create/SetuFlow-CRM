import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const DOCS_WORKSPACE_HREF = '/internal/setuflow-docs.html#overview';
export const E2E_WORKSPACE_HREF = '/internal/setuflow-e2e-testing.html';
export const DEMO_CHECKLIST_HREF = '/internal/setuflow-demo-checklist.html';

export type SmcIconName = 'mission' | 'board' | 'sprint' | 'agent' | 'client' | 'docs' | 'qa' | 'demo' | 'risk' | 'bug' | 'trend' | 'shield' | 'target' | 'clock' | 'deploy';

const iconPaths: Record<SmcIconName, string[]> = {
  mission: ['M12 3a9 9 0 1 0 9 9', 'M12 12 20 4', 'M15 4h5v5'],
  board: ['M4 4h16v16H4z', 'M9 4v16', 'M15 4v16', 'M4 10h16'],
  sprint: ['M4 19h16', 'M7 16V8', 'M12 16V5', 'M17 16v-6', 'M6 8h3', 'M11 5h3', 'M16 10h3'],
  agent: ['M12 3l1.9 5.8L20 10l-5 3.6L16.5 20 12 16.4 7.5 20 9 13.6 4 10l6.1-1.2L12 3Z', 'M12 8.5l.8 2.3 2.4.4-2 1.4.6 2.4-1.8-1.4-1.8 1.4.6-2.4-2-1.4 2.4-.4.8-2.3Z'],
  client: ['M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z', 'M5 21a7 7 0 0 1 14 0', 'M18 9a3 3 0 0 1 0 6'],
  docs: ['M14 3H7a2 2 0 0 0-2 2v14h14V8z', 'M14 3v5h5', 'M8 13h8', 'M8 17h6'],
  qa: ['M9 12l2 2 4-5', 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  demo: ['M4 5h16v11H4z', 'M8 21h8', 'M12 16v5', 'M9 10l2 2 4-5'],
  risk: ['M12 9v4', 'M12 17h.01', 'M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z'],
  bug: ['M8 8a4 4 0 0 1 8 0', 'M7 8h10v12H7z', 'M3 13h4', 'M17 13h4', 'M4 19l3-2', 'M20 19l-3-2'],
  trend: ['M4 19V5', 'M4 19h16', 'm6 15 4-4 3 3 6-7', 'M16 7h3v3'],
  shield: ['M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'm9 12 2 2 4-5'],
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z', 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  deploy: ['M12 3v12', 'm7 8 5-5 5 5', 'M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3'],
};

export function displayIssueStatus(status?: string | null) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'in_review' || normalized === 'in-review' || normalized === 'review' || normalized === 'in review') return 'In Review';
  if (!status) return 'Open';
  return status;
}

export function SmcIcon({ name, className }: { name: SmcIconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cn('h-4 w-4 shrink-0', className)}>
      {iconPaths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export function SmcHeader({
  eyebrow = 'Setu Mission Control',
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(30,64,175,0.10)] ring-1 ring-slate-950/[0.03] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#0c7fff] dark:text-violet-300">
            <span className="grid h-8 w-8 place-items-center rounded-2xl bg-[#0c7fff]/10 text-[#0c7fff] dark:bg-violet-500/15 dark:text-violet-200"><SmcIcon name="mission" /></span>
            {eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SmcMetricCard({ icon, label, value, sub, tone = 'text-slate-950 dark:text-white' }: { icon: SmcIconName; label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/70 bg-white/90 p-4 shadow-sm ring-1 ring-slate-950/[0.03] dark:border-white/10 dark:bg-slate-950/55">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <span className={cn('grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 dark:bg-white/[0.06]', tone)}><SmcIcon name={icon} /></span>
      </div>
      <p className={cn('mt-3 text-3xl font-black tracking-tight', tone)}>{value}</p>
      {sub ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  );
}

export function SmcActionLink({ href, icon, label, external = false }: { href: string; icon: SmcIconName; label: string; external?: boolean }) {
  return (
    <Link href={href} target={external ? '_blank' : undefined} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0c7fff]/30 hover:text-[#0c7fff] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-violet-300/40 dark:hover:text-white">
      <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#0c7fff]/10 text-[#0c7fff] dark:bg-violet-500/15 dark:text-violet-200"><SmcIcon name={icon} /></span>
      {label}
    </Link>
  );
}

export function SmcProofLinks() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SmcActionLink href={DOCS_WORKSPACE_HREF} icon="docs" label="Docs Workspace" external />
      <SmcActionLink href={E2E_WORKSPACE_HREF} icon="qa" label="E2E Testing" external />
      <SmcActionLink href={DEMO_CHECKLIST_HREF} icon="demo" label="Demo Checklist" external />
    </div>
  );
}

export function isClosedIssue(status?: string | null) {
  return ['Resolved', "Won't Fix", 'Deferred'].includes(displayIssueStatus(status));
}

export function daysOld(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}
