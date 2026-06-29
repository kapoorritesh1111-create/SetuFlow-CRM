import { iso2ToFlagEmoji } from '@/lib/geo/flags';
import { cn } from '@/lib/utils';

export type CountryFlagPillCountry = {
  id?: string | null;
  name?: string | null;
  iso2_code?: string | null;
};

export function CountryFlagPill({
  countryName,
  iso2Code,
  countries,
  countryId,
  compact = false,
  className,
}: {
  countryName?: string | null;
  iso2Code?: string | null;
  countries?: CountryFlagPillCountry[];
  countryId?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const matched = countryId ? countries?.find((country) => country.id === countryId) : null;
  const name = String(matched?.name ?? countryName ?? '').trim();
  const iso2 = String(matched?.iso2_code ?? iso2Code ?? '').trim();
  const flag = iso2ToFlagEmoji(iso2);

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700', className)}>
      <span aria-hidden="true">{flag}</span>
      {compact ? null : <span>{name || 'No country'}</span>}
    </span>
  );
}
