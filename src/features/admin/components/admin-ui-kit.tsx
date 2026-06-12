import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * S24-ADMUX-21 — Admin UX V2 component kit.
 * Server-safe presentational primitives derived from the Admin Redesign HTML
 * design contract (setu-admin-complete.html). Compact 13px-base layouts:
 * section cards (.sc), tags (.tag), next-step CTAs (.nxt), overview cards
 * (.ovc), setup progress (.prog), HQ-only internal headers (.int-hd),
 * metric cards (.met-c), and compact form helpers (.fl/.fi/.fh/.frow).
 */

export type KitTone = 'ok' | 'warn' | 'info' | 'neutral' | 'purple' | 'danger';

const tagToneClass: Record<KitTone, string> = {
  ok: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  info: 'bg-blue-50 text-blue-700',
  neutral: 'bg-slate-100 text-slate-500',
  purple: 'bg-violet-50 text-violet-700',
  danger: 'bg-rose-50 text-rose-700',
};

export function KitTag({ tone = 'neutral', children, className }: { tone?: KitTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold', tagToneClass[tone], className)}>
      {children}
    </span>
  );
}

export function KitSectionCard({
  eyebrow,
  title,
  tag,
  tagTone,
  action,
  flush = false,
  warnBorder = false,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  tag?: string;
  tagTone?: KitTone;
  action?: ReactNode;
  /** Renders body without padding — for tables and tab panels. */
  flush?: boolean;
  warnBorder?: boolean;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'overflow-hidden rounded-[13px] border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
        warnBorder ? 'border-amber-300' : 'border-slate-200',
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[8.5px] font-bold uppercase tracking-[0.15em] text-slate-400">{eyebrow}</p>
          ) : null}
          <h2 className="truncate text-[13px] font-bold text-slate-950">{title}</h2>
        </div>
        {tag ? <KitTag tone={tagTone ?? 'neutral'}>{tag}</KitTag> : null}
        {action}
      </div>
      <div className={flush ? '' : 'px-4 py-3.5'}>{children}</div>
    </section>
  );
}

export function KitSectionAction({ href, onClickForm, children }: { href?: string; onClickForm?: string; children: ReactNode }) {
  const className =
    'inline-flex shrink-0 cursor-pointer items-center rounded-[7px] border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700 transition hover:bg-teal-100';
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="submit" form={onClickForm} className={className}>
      {children}
    </button>
  );
}

export function KitNextStep({
  icon,
  label,
  description,
  href,
  warn = false,
}: {
  icon: string;
  label: string;
  description: string;
  href: string;
  warn?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-[11px] border px-3.5 py-2.5 transition',
        warn ? 'border-amber-300 bg-amber-50 hover:bg-amber-100' : 'border-teal-200 bg-teal-50 hover:bg-teal-100',
      )}
    >
      <span aria-hidden="true" className="shrink-0 text-[15px]">{icon}</span>
      <span className="min-w-0">
        <span className={cn('block text-xs font-bold', warn ? 'text-amber-900' : 'text-emerald-900')}>{label}</span>
        <span className="mt-0.5 block text-[10.5px] text-slate-500">{description}</span>
      </span>
      <span aria-hidden="true" className={cn('ml-auto text-[15px]', warn ? 'text-amber-600' : 'text-teal-600')}>→</span>
    </Link>
  );
}

export function KitOverviewCard({
  eyebrow,
  title,
  meta,
  cta,
  href,
  stripClass,
  dot = 'ok',
  warnBorder = false,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  cta: string;
  href: string;
  /** Tailwind gradient classes for the 3px top strip, e.g. 'from-teal-500 to-blue-800'. */
  stripClass: string;
  dot?: 'ok' | 'warn' | 'danger';
  warnBorder?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-[12px] border bg-white px-3.5 py-3 transition hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.07)]',
        warnBorder ? 'border-amber-300' : 'border-slate-200',
      )}
    >
      <div className={cn('mb-2 h-[3px] rounded-sm bg-gradient-to-r', stripClass)} />
      <p className="text-[8.5px] font-bold uppercase tracking-[0.13em] text-slate-400">{eyebrow}</p>
      <p className="mt-0.5 text-[12.5px] font-bold text-slate-950">{title}</p>
      <p className="mt-0.5 text-[10px] leading-[1.4] text-slate-500">{meta}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className={cn('text-[10.5px] font-bold', dot === 'ok' ? 'text-blue-900' : 'text-amber-600')}>{cta} →</span>
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dot === 'ok' ? 'bg-emerald-500' : dot === 'warn' ? 'bg-amber-400' : 'bg-rose-500',
          )}
        />
      </div>
    </Link>
  );
}

export type KitProgressPhase = {
  label: string;
  steps: Array<{ label: string; done: boolean; href?: string }>;
};

export function KitSetupProgress({
  doneCount,
  totalCount,
  orgName,
  phases,
  completeHeadline,
  incompleteHeadline,
}: {
  doneCount: number;
  totalCount: number;
  orgName: string;
  phases: KitProgressPhase[];
  completeHeadline?: string;
  incompleteHeadline?: string;
}) {
  const complete = doneCount >= totalCount;
  return (
    <section className="rounded-[12px] bg-gradient-to-br from-[#13305a] to-[#1F487C] px-4 py-3 text-white">
      <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-bold">
        <span>
          {complete
            ? `✓ ${doneCount}/${totalCount} ${completeHeadline ?? 'setup steps complete'}`
            : `⚡ ${doneCount}/${totalCount} ${incompleteHeadline ?? 'steps complete — finish setup to unlock quoting'}`}
        </span>
        <span className="ml-auto text-[10px] font-semibold text-white/45">{orgName}</span>
      </div>
      {phases.map((phase) => (
        <div key={phase.label}>
          <p className="mb-0.5 mt-1.5 text-[7.5px] font-bold uppercase tracking-[0.15em] text-white/30">{phase.label}</p>
          <div className="flex flex-wrap gap-1">
            {phase.steps.map((step) => {
              const pill = (
                <span
                  className={cn(
                    'rounded-[7px] border px-2 py-0.5 text-[10px] font-semibold',
                    step.done
                      ? 'border-emerald-400/30 bg-emerald-400/20 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-white/35',
                  )}
                >
                  {step.done ? '✓' : '⊘'} {step.label}
                </span>
              );
              return step.href ? (
                <Link key={step.label} href={step.href} className="transition hover:opacity-80">
                  {pill}
                </Link>
              ) : (
                <span key={step.label}>{pill}</span>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

export function KitClientBadge({ orgName, slug, country, currency, plan = 'Managed' }: { orgName: string; slug?: string | null; country?: string | null; currency?: string | null; plan?: string }) {
  return (
    <section className="flex items-center gap-2.5 rounded-[12px] border border-violet-200 bg-violet-50 px-3.5 py-2.5">
      <span aria-hidden="true" className="text-[17px]">🌱</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-violet-700">{orgName} · {plan} workspace</p>
        <p className="truncate text-[10px] text-violet-700/70">{[slug, country, currency].filter(Boolean).join(' · ') || 'Managed by SETU Flow'}</p>
      </div>
      <span className="shrink-0 rounded-full border border-violet-300 bg-white px-2 py-0.5 text-[9px] font-bold text-violet-700">{plan}</span>
    </section>
  );
}

export function KitInternalHeader({
  icon,
  title,
  description,
  gradientClass = 'from-[#1e1b4b] to-[#312e81]',
  stats,
}: {
  icon: string;
  title: string;
  description: string;
  /** Tailwind gradient classes, e.g. 'from-[#0c4a6e] to-[#075985]'. */
  gradientClass?: string;
  stats?: Array<{ value: string; label: string }>;
}) {
  return (
    <section className={cn('flex items-center gap-3 rounded-[12px] bg-gradient-to-br px-4 py-3.5 text-white', gradientClass)}>
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white/10 text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold">{title}</p>
        <p className="mt-0.5 text-[10.5px] leading-[1.45] text-white/60">{description}</p>
      </div>
      {stats?.map((stat) => (
        <div key={stat.label} className="hidden shrink-0 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-center sm:block">
          <p className="text-[15px] font-bold leading-none">{stat.value}</p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-white/50">{stat.label}</p>
        </div>
      ))}
      <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-2.5 py-1 text-[9px] font-bold text-amber-200">HQ Only</span>
    </section>
  );
}

export function KitMetricCard({
  value,
  label,
  trend,
  trendUp = true,
  pct,
  colorClass = 'text-blue-900',
  barClass = 'bg-blue-900',
}: {
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
  pct?: number;
  colorClass?: string;
  barClass?: string;
}) {
  return (
    <div className="rounded-[11px] border border-slate-200 bg-white px-3.5 py-3">
      <p className={cn('text-[22px] font-bold leading-none tracking-[-0.5px]', colorClass)}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      {trend ? <p className={cn('mt-1 text-[10px] font-semibold', trendUp ? 'text-emerald-600' : 'text-rose-600')}>{trend}</p> : null}
      {typeof pct === 'number' ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={cn('h-full rounded-full', barClass)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/* Compact form helpers — .fl / .fi / .fh / .frow from the design contract. */
export const kitFieldLabelClass = 'mb-1 block text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400';
export const kitInputClass =
  'min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none placeholder:font-normal placeholder:italic placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
export const kitReadOnlyInputClass =
  'min-h-9 w-full rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 outline-none';
export const kitTextareaClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none placeholder:font-normal placeholder:italic placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
export const kitHelpClass = 'mt-1 block text-[9px] font-medium normal-case tracking-normal text-slate-400';
export const kitPrimaryButtonClass =
  'inline-flex min-h-8 items-center justify-center rounded-[9px] bg-[#1F487C] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#13305a]';
export const kitSecondaryButtonClass =
  'inline-flex min-h-8 items-center justify-center rounded-[9px] border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:bg-slate-50';
export const kitDangerButtonClass =
  'inline-flex min-h-8 items-center justify-center rounded-[9px] border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100';

export function KitField({ label, help, children, className }: { label: string; help?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className={kitFieldLabelClass}>{label}</span>
      {children}
      {help ? <span className={kitHelpClass}>{help}</span> : null}
    </label>
  );
}

export function KitFormRow({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2.5">{children}</div>;
}

/* Compact table classes — .tbl from the design contract. */
export const kitTableClass = 'w-full border-collapse text-xs';
export const kitThClass =
  'border-b border-slate-100 bg-slate-50 px-2.5 py-1.5 text-left text-[8px] font-bold uppercase tracking-[0.13em] text-slate-400';
export const kitTdClass = 'border-b border-slate-50 px-2.5 py-2 align-middle';

/* S24-ADMUX-31 — role badge palette per the design contract (.r-owner/.r-admin/.r-sales/.r-logi/.r-dis). */
const roleBadgePalette: Record<string, string> = {
  owner: 'bg-blue-100 text-blue-700',
  admin: 'bg-violet-100 text-violet-700',
  sales: 'bg-slate-100 text-slate-600',
  contributor: 'bg-slate-100 text-slate-600',
  manager: 'bg-teal-50 text-teal-700',
  logistics: 'bg-amber-100 text-amber-700',
  member: 'bg-slate-100 text-slate-600',
  viewer: 'bg-slate-100 text-slate-500',
  disabled: 'bg-slate-100 text-slate-400',
};

export function KitRoleBadge({ role }: { role: string }) {
  const palette = roleBadgePalette[role.trim().toLowerCase()] ?? 'bg-slate-100 text-slate-500';
  return (
    <span className={cn('inline-flex items-center rounded-[7px] px-1.5 py-0.5 text-[9px] font-bold capitalize', palette)}>
      {role}
    </span>
  );
}

/* S24-ADMUX-31 — standardized page tbar (.tbar from the design contract). */
export function KitTbar({
  eyebrow,
  title,
  chips = [],
  action,
}: {
  eyebrow: string;
  title: string;
  chips?: Array<{ label: string; tone?: KitTone }>;
  action?: ReactNode;
}) {
  const chipTone: Record<KitTone, string> = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
    purple: 'border-violet-200 bg-violet-50 text-violet-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-5 py-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
        <h1 className="truncate text-base font-bold tracking-[-0.02em] text-slate-950">{title}</h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        {chips.map((chip) => (
          <span key={chip.label} className={cn('whitespace-nowrap rounded-full border px-2 py-[3px] text-[10px] font-semibold', chipTone[chip.tone ?? 'neutral'])}>
            {chip.label}
          </span>
        ))}
        {action}
      </div>
    </div>
  );
}
