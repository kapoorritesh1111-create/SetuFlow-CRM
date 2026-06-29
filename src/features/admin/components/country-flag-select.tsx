'use client';

import { useMemo, useState } from 'react';
import { CountryFlagPill } from '@/components/ui/country-flag-pill';

export type CountryFlagSelectCountry = {
  id: string;
  name: string;
  iso2_code?: string | null;
};

export function CountryFlagSelect({
  name,
  countries,
  defaultValue,
}: {
  name: string;
  countries: CountryFlagSelectCountry[];
  defaultValue?: string | null;
}) {
  const [selectedId, setSelectedId] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = countries.find((country) => country.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return countries;
    return countries.filter((country) => `${country.name} ${country.iso2_code ?? ''}`.toLowerCase().includes(needle));
  }, [countries, query]);

  return (
    <div className="relative mt-1">
      <input type="hidden" name={name} value={selectedId} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        {selected ? (
          <CountryFlagPill countryName={selected.name} iso2Code={selected.iso2_code} className="bg-transparent px-0 py-0" />
        ) : (
          <span className="text-slate-400">Select default country</span>
        )}
        <span className="text-xs font-black text-slate-400">▾</span>
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40">
          <div className="border-b border-slate-100 p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or ISO2"
              className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => { setSelectedId(''); setOpen(false); }}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              No default country
            </button>
            {filtered.map((country) => (
              <button
                key={country.id}
                type="button"
                onClick={() => { setSelectedId(country.id); setOpen(false); }}
                className="flex w-full items-center rounded-xl px-3 py-2 text-left hover:bg-blue-50"
              >
                <CountryFlagPill countryName={country.name} iso2Code={country.iso2_code} className="bg-transparent px-0 py-0" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
