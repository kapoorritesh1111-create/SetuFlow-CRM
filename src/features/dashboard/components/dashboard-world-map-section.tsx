import { WidgetEmptyState, WidgetShell } from '@/components/ui/widget-shell';
import type { CountryCoverageDatum } from '@/features/dashboard/types';
import { WorldCoverageMap } from './world-coverage-map';
import { DashboardWidgetErrorBoundary } from './dashboard-widget-error-boundary';

export function DashboardWorldMapSection({ countries, selectedCountryCode, onSelectCountry }: { countries: CountryCoverageDatum[]; selectedCountryCode?: string; onSelectCountry: (countryCode: string) => void }) {
  const highlightedCountries = countries.length;
  const totalLeads = countries.reduce((sum, item) => sum + item.activeLeadCount, 0);

  return (
    <DashboardWidgetErrorBoundary
      title="World Map"
      description="Only countries with active, non-lost leads are highlighted."
      eyebrow="Global view"
      fallbackTitle="World Map unavailable"
      fallbackDescription="The coverage map hit a runtime issue. The rest of the dashboard is still available."
    >
    <WidgetShell title="World Map" description="Only countries with active, non-lost leads are highlighted." eyebrow="Global view" contentClassName="space-y-5">
      <div className="grid gap-3 rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 md:grid-cols-3">
        <div><span className="font-semibold text-slate-950">{highlightedCountries}</span> countries highlighted</div>
        <div><span className="font-semibold text-slate-950">{totalLeads}</span> active leads mapped</div>
        <div><span className="font-semibold text-slate-950">Click a country</span> to open the right drawer</div>
      </div>
      {countries.length ? <WorldCoverageMap countries={countries} selectedCountryCode={selectedCountryCode} onSelectCountry={onSelectCountry} /> : <WidgetEmptyState title="No country coverage yet" description="The map lights up once active leads are assigned to countries." />}
    </WidgetShell>
    </DashboardWidgetErrorBoundary>
  );
}
