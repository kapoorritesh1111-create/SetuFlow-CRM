'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface StageSummary { id: string; name: string; count: number; value: number; overdue: number; }

export default function MobilePipelinePage() {
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch pipeline summary from API
    fetch('/api/mobile/pipeline-summary')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stages) setStages(d.stages); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
    </div>
  );

  const totalValue = stages.reduce((s, st) => s + st.value, 0);
  const totalLeads = stages.reduce((s, st) => s + st.count, 0);
  // Fixed categorical order per DESIGN-SYSTEM.md 3.2 — was a hand-copied,
  // misordered hex array that didn't line up with the stage-* domain
  // tokens used elsewhere (desktop pipeline board, charts).
  const STAGE_COLORS = [
    'var(--sf-chart-1)', 'var(--sf-chart-2)', 'var(--sf-chart-3)',
    'var(--sf-chart-4)', 'var(--sf-chart-5)', 'var(--sf-chart-6)',
  ];
  const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;

  return (
    <div className="space-y-4">
      {/* Header KPIs — .sf-field scopes the dark-navy field-capture theme to this card only; the rest of the mobile shell stays on the light theme. */}
      <section className="sf-field rounded-hero bg-surface-1 p-5 text-content-primary shadow-xl">
        <p className="text-xs font-black uppercase tracking-[.18em] text-content-accent">Pipeline</p>
        <h1 className="mt-1 text-2xl font-black">{fmt(totalValue)}</h1>
        <p className="text-xs text-content-muted mt-0.5">{totalLeads} active leads · {stages.length} stages</p>
        {/* Mini waterfall */}
        <div className="flex gap-[2px] h-1.5 rounded-full overflow-hidden mt-3">
          {stages.map((st, i) => totalValue > 0 && (
            <div key={st.id} className="rounded-full" style={{ flex: st.value / totalValue, background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
          ))}
        </div>
      </section>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage, i) => (
          <Link key={stage.id} href={`/pipeline?stage=${stage.id}`}
            className="flex items-center gap-3 rounded-2xl bg-white/90 p-4 shadow-sm active:scale-[.98] transition">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">{stage.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{stage.count} leads</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-slate-900">{fmt(stage.value)}</p>
              {stage.overdue > 0 && <p className="text-[10px] font-bold text-rose-600">{stage.overdue} overdue</p>}
            </div>
            <span className="text-slate-300 text-sm">›</span>
          </Link>
        ))}
        {stages.length === 0 && (
          <div className="rounded-2xl bg-white/90 p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">No pipeline data available</p>
            <Link href="/pipeline" className="mt-3 inline-block text-xs font-bold text-blue-600">View full pipeline →</Link>
          </div>
        )}
      </div>

      <Link href="/pipeline" className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-black text-white">
        Open full pipeline board →
      </Link>
    </div>
  );
}
