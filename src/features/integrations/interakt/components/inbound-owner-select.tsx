'use client';

import { useEffect, useState } from 'react';

type AssigneeOption = { value: string; label: string; email?: string | null };

export function InboundOwnerSelect({ value = '' }: { value?: string }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);

  useEffect(() => {
    let active = true;
    void fetch('/api/interakt/assignees', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        setAllowed(Boolean(payload?.canFilterOwners));
        setAssignees(Array.isArray(payload?.assignees) ? payload.assignees : []);
      })
      .catch(() => {
        if (active) {
          setAllowed(false);
          setAssignees([]);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <label className="text-[9px] font-bold uppercase text-slate-500">Owner<select disabled className="mt-1 block min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs normal-case text-slate-400"><option>Loading…</option></select></label>;
  }

  if (!allowed) return null;

  return <label className="text-[9px] font-bold uppercase text-slate-500">Owner<select name="owner" defaultValue={value} className="mt-1 block min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs normal-case text-slate-900"><option value="">All assigned users</option>{assignees.map((assignee) => <option key={assignee.value || assignee.label} value={assignee.value || assignee.label}>{assignee.label}{assignee.email ? ` · ${assignee.email}` : ''}</option>)}</select></label>;
}
