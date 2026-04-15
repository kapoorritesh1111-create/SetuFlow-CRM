import type { CountryCoverageDatum } from '@/features/dashboard/types';
import { WorldCoverageMap } from './world-coverage-map';

export function DashboardWorldMapSection({
  countries,
  selectedCountryCode,
  onSelectCountry,
}: {
  countries: CountryCoverageDatum[];
  selectedCountryCode?: string;
  onSelectCountry: (countryCode: string) => void;
}) {
  return (
    <WorldCoverageMap
      countries={countries}
      selectedCountryCode={selectedCountryCode}
      onSelectCountry={onSelectCountry}
    />
  );
}
