import type { ReactNode } from 'react';

export function PreviewPanel({ title, subtitle, children, badge }: { title: string; subtitle?: string; badge?: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        </div>
        {badge ? <span className="rounded-full bg-[#359F91]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#279491]">{badge}</span> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_100%)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#359F91]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </div>
  );
}

export function SectionList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">{item}</li>
      ))}
    </ul>
  );
}
