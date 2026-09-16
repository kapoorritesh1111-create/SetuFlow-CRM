'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignPackagingDesign, type DesignAssignee } from '@/features/packaging/server/design-assignment-actions';

export default function DesignAssigneeControl({
  quoteLineItemId,
  assignees,
  assignedTo,
  assignedName,
  canManage,
  canClaim,
  currentUserId,
}: {
  quoteLineItemId: string;
  assignees: DesignAssignee[];
  assignedTo: string | null;
  assignedName: string | null;
  canManage: boolean;
  canClaim: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(assignedTo ?? '');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function save(next: string) {
    setError('');
    setValue(next);
    startTransition(async () => {
      const response = await assignPackagingDesign({ quoteLineItemId, assigneeUserId: next || null });
      if (!response.ok) {
        setError(response.error ?? 'Could not update assignment.');
        setValue(assignedTo ?? '');
        return;
      }
      router.refresh();
    });
  }

  if (canManage) {
    return <div className="min-w-[180px]">
      <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">Designer</label>
      <select value={value} disabled={pending} onChange={(e) => save(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-60">
        <option value="">Unassigned</option>
        {assignees.map((item) => <option key={item.userId} value={item.userId}>{item.name}</option>)}
      </select>
      {!assignees.length ? <p className="mt-1 text-[10px] font-semibold text-amber-600">No active Design-role users yet.</p> : null}
      {error ? <p className="mt-1 text-[10px] font-semibold text-rose-600">{error}</p> : null}
    </div>;
  }

  if (!assignedTo && canClaim) {
    return <button type="button" disabled={pending} onClick={() => save(currentUserId)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 disabled:opacity-60">{pending ? 'Claiming…' : 'Claim job'}</button>;
  }

  return <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">Designer: {assignedName ?? 'Unassigned'}</div>;
}
