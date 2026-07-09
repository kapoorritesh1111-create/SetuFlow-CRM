import Link from 'next/link';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export type PremiumChipTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

const chipToneClass: Record<PremiumChipTone, string> = {
  slate: 'border-slate-200 bg-white text-slate-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

export function PremiumCommandBar({
  label = 'Filters',
  summary,
  children,
  activeChips,
  reset,
}: {
  label?: string;
  summary?: ReactNode;
  children: ReactNode;
  activeChips?: ReactNode;
  reset?: ReactNode;
}) {
  return (
    <section className="rounded-hero border border-slate-200/90 bg-white px-3 py-3 shadow-[0_18px_46px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.02] sm:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <div className="grid gap-2 md:flex md:flex-wrap md:items-end">{children}</div>
        </div>
        {summary ? <div className="text-[12px] font-bold text-slate-500 xl:pb-2">{summary}</div> : null}
      </div>
      {(activeChips || reset) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {activeChips}
          {reset}
        </div>
      ) : null}
    </section>
  );
}

export function PremiumField({ label, icon, children, className = '' }: { label: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`group min-w-0 rounded-card border border-slate-200 bg-slate-50/80 px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-slate-300 hover:bg-white md:min-w-[170px] ${className}`}>
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
        {icon ? <span aria-hidden="true" className="text-[12px] leading-none">{icon}</span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

export function PremiumSelect({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${props.className ?? ''}`}
    >
      {children}
    </select>
  );
}

export function PremiumInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${props.className ?? ''}`}
    />
  );
}

export function PremiumActiveChip({ label, tone = 'slate', href, onClick }: { label: ReactNode; tone?: PremiumChipTone; href?: string; onClick?: () => void }) {
  const className = `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:-translate-y-px ${chipToneClass[tone]}`;
  const content = <><span>{label}</span><span aria-hidden="true" className="text-sm leading-none opacity-60">×</span></>;
  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}
