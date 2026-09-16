'use client';

import { useState } from 'react';

export default function QuoteDecisionForm({ token, initialDecision, initialSigner, initialComment, initialReviewedAt }: { token: string; initialDecision?: string | null; initialSigner?: string | null; initialComment?: string | null; initialReviewedAt?: string | null }) {
  const [decision, setDecision] = useState<string | null>(initialDecision ?? null);
  const [signerName, setSignerName] = useState(initialSigner ?? '');
  const [comment, setComment] = useState(initialComment ?? '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState(initialReviewedAt ?? null);

  const submit = async (nextDecision: 'approved' | 'revision_requested') => {
    setSubmitting(nextDecision);
    setError(null);
    try {
      const response = await fetch('/api/public/quote-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision: nextDecision, signerName, comment, acceptedTerms }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data?.error ?? 'Could not record your response.'); return; }
      setDecision(nextDecision);
      setReviewedAt(data?.reviewedAt ?? new Date().toISOString());
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(null);
    }
  };

  if (decision) {
    return (
      <div className="mt-4 space-y-3">
        <div className={`rounded-2xl px-4 py-4 text-sm font-bold ${decision === 'approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
          {decision === 'approved' ? `Quote approved and signed${signerName ? ` by ${signerName}` : ''}.` : 'Quote revision requested.'}
          {reviewedAt ? <span className="mt-1 block text-xs font-semibold opacity-70">Recorded {new Date(reviewedAt).toLocaleString()}</span> : null}
        </div>
        {comment ? <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">{comment}</div> : null}
        <button type="button" onClick={() => setDecision(null)} className="text-xs font-bold text-slate-500 underline">Change my response</button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">Your name / authorized signer
          <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
        </label>
        <label className="text-sm font-bold text-slate-700">Comments or requested revision
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Optional for approval; required if requesting revision" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold" />
        </label>
      </div>
      <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
        <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5" />
        <span>By approving, I confirm I am authorized to accept this quote and that typing my name above serves as my electronic acknowledgement of the quoted commercial terms.</span>
      </label>
      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={submitting !== null} onClick={() => submit('approved')} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{submitting === 'approved' ? 'Recording…' : 'Approve & Sign Quote'}</button>
        <button type="button" disabled={submitting !== null} onClick={() => submit('revision_requested')} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 disabled:opacity-50">{submitting === 'revision_requested' ? 'Sending…' : 'Request Quote Revision'}</button>
      </div>
    </div>
  );
}
