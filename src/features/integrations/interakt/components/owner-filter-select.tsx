'use client';

import { useEffect, useState } from 'react';

type Assignee = { value: string; label: string; email?: string | null };

export function OwnerFilterSelect({ value = '' }: { value?: string }) {
  const [loading, setLoading] = useState(true);
  const [canFilterOwners, setCanFilterOwners] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/interakt/assignees', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load assignees');
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setCanFilterOwners(Boolean(payload?.canFilterOwners));
        setAssignees(Array.isArray(payload?.assignees) ? payload.assignees : []);
      })
      .catch(() => {
        if (!cancelled) {
          setCanFilterOwners(false);
          setAssignees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && !canFilterOwners) return null;

  return (
    <label className="text-[9px] font-bold uppercase text-slate-500">
      Owner
      <select
        name="owner"
        defaultValue={value}
        disabled={loading}
        className="mt-1 block min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">{loading ? 'Loading owners…' : 'All assigned users'}</option>
        {assignees.map((assignee) => (
          <option key={`${assignee.value}|${assignee.email ?? ''}`} value={assignee.value}>{assignee.label}</option>
        ))}
      </select>
    </label>
  );
}
