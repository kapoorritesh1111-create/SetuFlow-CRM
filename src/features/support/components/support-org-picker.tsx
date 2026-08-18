'use client';

import { useMemo, useState } from 'react';
import { switchSupportOrganization } from '@/features/support/server/actions';

export type SupportOrganization = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  demo_mode: boolean | null;
  provisioning_status: string | null;
};

export function SupportOrgPicker({ organizations }: { organizations: SupportOrganization[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return organizations;
    return organizations.filter((organization) =>
      [organization.name, organization.slug, organization.website]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [organizations, query]);

  return (
    <>
      <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
        <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400" htmlFor="support-org-search">Search organizations</label>
        <input
          id="support-org-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by organization name, slug, or website"
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400"
        />
        <p className="mt-2 text-xs text-slate-500">Showing {filtered.length} of {organizations.length} organizations.</p>
      </div>

      {!filtered.length ? (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-6 text-amber-100">No organizations match your search.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((organization) => (
            <form key={organization.id} action={switchSupportOrganization} className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-teal-400/40 hover:bg-white/[0.07]">
              <input type="hidden" name="organization_id" value={organization.id} />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-white">{organization.name}</h2>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-400">/{organization.slug}</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-300">Owner support</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                <span className="rounded-full bg-white/5 px-2.5 py-1">{organization.demo_mode ? 'Demo' : 'Client'}</span>
                <span className="rounded-full bg-white/5 px-2.5 py-1">{organization.provisioning_status ?? 'Workspace'}</span>
                {organization.website ? <span className="max-w-[15rem] truncate rounded-full bg-white/5 px-2.5 py-1">{organization.website}</span> : null}
              </div>
              <button type="submit" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-teal-400 px-4 text-sm font-black text-slate-950 transition hover:bg-teal-300">Enter organization</button>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
