'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Assignee = { value: string; label: string; email?: string | null; count?: number };

export function OwnerFilterSelect({ value = '' }: { value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [canFilterOwners, setCanFilterOwners] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selectedOwner, setSelectedOwner] = useState(value);
  const [allCount, setAllCount] = useState<number | null>(null);

  useEffect(() => {
    setSelectedOwner(value);
  }, [value]);

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
        setAllCount(Number.isFinite(Number(payload?.allCount)) ? Number(payload.allCount) : null);
      })
      .catch(() => {
        if (!cancelled) {
          setCanFilterOwners(false);
          setAssignees([]);
          setAllCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loading && !canFilterOwners) return null;

  function applyOwner(nextOwner: string) {
    setSelectedOwner(nextOwner);
    const params = new URLSearchParams(currentSearchParams.toString());
    if (nextOwner) params.set('owner', nextOwner);
    else params.delete('owner');
    params.delete('page');
    params.delete('review');
    if (!params.get('view')) params.set('view', 'review');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="text-[9px] font-bold uppercase text-slate-500">
      Owner
      <select
        name="owner"
        value={selectedOwner}
        disabled={loading}
        onChange={(event) => applyOwner(event.target.value)}
        className="mt-1 block min-w-[190px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">
          {loading ? 'Loading owners…' : `All assigned users${allCount !== null ? ` (${allCount.toLocaleString()})` : ''}`}
        </option>
        {assignees.map((assignee) => (
          <option key={`${assignee.value}|${assignee.email ?? ''}`} value={assignee.value}>
            {assignee.label}{typeof assignee.count === 'number' ? ` (${assignee.count.toLocaleString()})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
