import type { DashboardKpi } from '@/features/dashboard/types';
import { KpiCard } from './kpi-card';

export function DashboardTopStrip({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Key performance indicators">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} {...kpi} />
      ))}
    </section>
  );
}
