import type { CountryCoverageDatum } from '@/features/dashboard/types';
import type { WorkspaceMode } from '@/features/workspace/types';
import { WorldCoverageMap } from './world-coverage-map';

export function DashboardWorldMapSection({ countries, selectedCountryCode, onSelectCountry, mode = 'all' }: { countries: CountryCoverageDatum[]; selectedCountryCode?: string; onSelectCountry: (countryCode: string) => void; mode?: WorkspaceMode }) {
  return <WorldCoverageMap countries={countries} selectedCountryCode={selectedCountryCode} onSelectCountry={onSelectCountry} mode={mode} className="border-none p-0 shadow-none" />;
}
