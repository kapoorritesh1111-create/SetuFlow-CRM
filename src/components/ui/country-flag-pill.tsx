'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type CountryFlagPillCountry = {
  id?: string | null;
  name?: string | null;
  iso2_code?: string | null;
};

type CountriesPayload = { countries?: CountryFlagPillCountry[] };

const COUNTRY_DISPLAY_ALIASES: Record<string, string> = {
  uk: 'gb',
  'u k': 'gb',
  'united kingdom': 'gb',
  britain: 'gb',
  'great britain': 'gb',
  england: 'gb',
  usa: 'us',
  'u s a': 'us',
  us: 'us',
  'u s': 'us',
  'united states': 'us',
  'united states of america': 'us',
  america: 'us',
  uae: 'ae',
  'u a e': 'ae',
  'united arab emirates': 'ae',
};

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

function normalizeIso2(value?: string | null) {
  const text = String(value ?? '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(text) ? text : '';
}

function countrySlug(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function iso2FromDisplayAlias(value?: string | null) {
  const slug = countrySlug(value);
  return COUNTRY_DISPLAY_ALIASES[slug] ?? '';
}

function localFlagCandidates(iso2: string) {
  const lower = iso2.toLowerCase();
  const upper = iso2.toUpperCase();
  return [`/flags/${lower}.svg`, `/flags/${lower}.png`, `/flags/${upper}.svg`, `/flags/${upper}.png`];
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
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    if (iso2Code || countries?.length) return;
    let mounted = true;
    void loadWorkspaceCountries().then((items) => {
      if (mounted) setWorkspaceCountries(items);
    });
    return () => {
      mounted = false;
    };
  }, [countries?.length, countryId, countryName, iso2Code]);

  const matched = useMemo(() => {
    const source = countries?.length ? countries : workspaceCountries;
    if (countryId) {
      const byId = source?.find((country) => country.id === countryId);
      if (byId) return byId;
    }
    const normalized = countrySlug(countryName);
    return normalized ? source?.find((country) => countrySlug(country.name) === normalized) ?? null : null;
  }, [countries, countryId, countryName, workspaceCountries]);

  const name = String(matched?.name ?? countryName ?? '').trim();
  const iso2 = normalizeIso2(matched?.iso2_code ?? iso2Code) || iso2FromDisplayAlias(name);
  const candidates = iso2 ? localFlagCandidates(iso2) : [];
  const src = candidates[fallbackIndex] ?? '';

  useEffect(() => {
    setFallbackIndex(0);
  }, [iso2]);

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700', className)} title={name || 'No country'}>
      {iso2 && src ? (
        <img
          src={src}
          width="16"
          height="12"
          alt=""
          aria-hidden="true"
          className="shrink-0 rounded-[2px] border border-black/10 object-cover"
          loading="lazy"
          onError={() => setFallbackIndex((current) => current + 1)}
        />
      ) : (
        <span aria-hidden="true" className="inline-flex h-3 w-4 shrink-0 items-center justify-center rounded-[2px] border border-slate-200 bg-white text-[8px] font-black text-slate-400">--</span>
      )}
      {compact ? null : <span>{name || 'No country'}</span>}
    </span>
  );
}
