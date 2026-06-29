'use client';

import { useEffect, useMemo, useState } from 'react';
import { iso2ToFlagEmoji } from '@/lib/geo/flags';
import { cn } from '@/lib/utils';

export type CountryFlagPillCountry = {
  id?: string | null;
  name?: string | null;
  iso2_code?: string | null;
};

type CountriesPayload = { countries?: CountryFlagPillCountry[] };

let cachedCountries: CountryFlagPillCountry[] | null = null;
let countriesPromise: Promise<CountryFlagPillCountry[]> | null = null;

async function loadWorkspaceCountries() {
  if (cachedCountries) return cachedCountries;
  if (!countriesPromise) {
    countriesPromise = fetch('/api/workspace/countries', { credentials: 'same-origin' })
      .then((response) => response.json() as Promise<CountriesPayload>)
      .then((payload) => {
        cachedCountries = Array.isArray(payload.countries) ? payload.countries : [];
        return cachedCountries;
      })
      .catch(() => {
        cachedCountries = [];
        return cachedCountries;
      });
  }
  return countriesPromise;
}

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
  const [workspaceCountries, setWorkspaceCountries] = useState<CountryFlagPillCountry[] | null>(cachedCountries);

  useEffect(() => {
    if (!countryId || iso2Code || countries?.length) return;
    let mounted = true;
    void loadWorkspaceCountries().then((items) => {
      if (mounted) setWorkspaceCountries(items);
    });
    return () => {
      mounted = false;
    };
  }, [countries?.length, countryId, iso2Code]);

  const matched = useMemo(() => {
    const source = countries?.length ? countries : workspaceCountries;
    if (countryId) {
      const byId = source?.find((country) => country.id === countryId);
      if (byId) return byId;
    }
    const normalized = String(countryName ?? '').trim().toLowerCase();
    return normalized ? source?.find((country) => String(country.name ?? '').trim().toLowerCase() === normalized) ?? null : null;
  }, [countries, countryId, countryName, workspaceCountries]);

  const name = String(matched?.name ?? countryName ?? '').trim();
  const iso2 = String(matched?.iso2_code ?? iso2Code ?? '').trim();
  const flag = iso2ToFlagEmoji(iso2);

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700', className)} title={name || 'No country'}>
      <span aria-hidden="true">{flag}</span>
      {compact ? null : <span>{name || 'No country'}</span>}
    </span>
  );
}
