'use client';

import { useState } from 'react';
import type { PackagingProofStatus } from '@/lib/packaging/types';

export default function ProofDecisionForm({
  token,
  initialStatus,
  initialComment,
  reviewedAt,
}: {
  token: string;
  initialStatus: PackagingProofStatus;
  initialComment: string | null;
  reviewedAt: string | null;
}) {
  const [status, setStatus] = useState<PackagingProofStatus>(initialStatus);
  const [comment, setComment] = useState(initialComment ?? '');
  const [submitting, setSubmitting] = useState<PackagingProofStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastReviewedAt, setLastReviewedAt] = useState(reviewedAt);

  const submit = async (decision: 'approved' | 'rejected') => {
    setSubmitting(decision);
    setError(null);
    try {
      const response = await fetch('/api/public/proof-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision, comment }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Could not record your decision.');
        return;
      }
      setStatus(decision);
      setLastReviewedAt(new Date().toISOString());
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(null);
    }
  };

  if (status !== 'pending') {
    return (
      <div className="mt-5 space-y-3">
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {status === 'approved' ? 'You approved this artwork' : 'You requested changes to this artwork'}
          {lastReviewedAt ? <span className="block text-xs font-normal opacity-80">{new Date(lastReviewedAt).toLocaleString()}</span> : null}
        </div>
        {comment ? <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">"{comment}"</p> : null}
        <button onClick={() => setStatus('pending')} className="text-xs font-semibold text-slate-400 underline">Change my decision</button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Optional: add a comment (e.g. what needs to change)"
        rows={3}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="flex gap-3">
        <button
          onClick={() => submit('approved')}
          disabled={submitting !== null}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting === 'approved' ? 'Recording…' : '✓ Approve'}
        </button>
        <button
          onClick={() => submit('rejected')}
          disabled={submitting !== null}
          className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          {submitting === 'rejected' ? 'Recording…' : '✕ Request changes'}
        </button>
      </div>
    </div>
  );
}
