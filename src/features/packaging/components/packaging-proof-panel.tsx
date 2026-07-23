'use client';

import { useState, useTransition } from 'react';
import type { PackagingProof } from '@/lib/packaging/types';
import { listPackagingProofs, uploadPackagingProof } from '@/features/packaging/server/actions';

/**
 * S27-STARK-D3 — Artwork proof panel, embedded per packaging line. Self-contained:
 * fetches its own proof list on open rather than threading through the whole
 * quote-page prop chain, since it's an optional, occasionally-used panel.
 */

function statusTone(status: string) {
  if (status === 'approved') return 'bg-success-bg text-success-fg';
  if (status === 'rejected') return 'bg-danger-bg text-danger-fg';
  return 'bg-warning-bg text-warning-fg';
}

export default function PackagingProofPanel({ quoteLineItemId, leadId }: { quoteLineItemId: string; leadId: string }) {
  const [open, setOpen] = useState(false);
  const [proofs, setProofs] = useState<PackagingProof[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const response = await listPackagingProofs(quoteLineItemId);
      setLoading(false);
      if (!response.ok) { setError(response.error ?? 'Could not load proofs.'); return; }
      setProofs(response.proofs ?? []);
    });
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && proofs === null) load();
  };

  const handleUpload = (formData: FormData) => {
    formData.set('quoteLineItemId', quoteLineItemId);
    formData.set('leadId', leadId);
    setError(null);
    startTransition(async () => {
      const response = await uploadPackagingProof(formData);
      if (!response.ok) { setError(response.error ?? 'Upload failed.'); return; }
      load();
    });
  };

  const copyLink = (proof: PackagingProof) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/proof-approval/${proof.approval_token}`;
    navigator.clipboard?.writeText(url);
    setCopiedFor(proof.id);
    setTimeout(() => setCopiedFor(null), 2000);
  };

  return (
    <div className="mt-2">
      <button onClick={toggle} className="flex items-center gap-1.5 rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-xs font-semibold text-content-primary hover:border-brand-200">
        <span aria-hidden="true">🖼️</span> {open ? 'Hide artwork proofs' : 'Artwork proofs — upload or review'}
      </button>
      {open ? (
        <div className="mt-2 rounded-ctl border border-line bg-surface-app p-3">
          {loading ? <p className="text-xs text-content-muted">Loading…</p> : null}
          {error ? <p className="mb-2 rounded-ctl bg-danger-bg px-2 py-1.5 text-xs font-medium text-danger-fg">{error}</p> : null}
          {proofs?.length ? (
            <ul className="space-y-2">
              {proofs.map((proof) => (
                <li key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-ctl border border-line bg-surface-1 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-content-primary">v{proof.version} — {proof.file_name}</p>
                    <p className="text-[11px] text-content-muted">{new Date(proof.uploaded_at).toLocaleDateString()}{proof.review_comment ? ` · "${proof.review_comment}"` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(proof.status)}`}>{proof.status}</span>
                    <button onClick={() => copyLink(proof)} className="rounded-ctl border border-line bg-surface-app px-2 py-1 text-[11px] font-semibold text-content-primary">
                      {copiedFor === proof.id ? 'Copied!' : 'Copy approval link'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (!loading ? <p className="text-xs text-content-muted">No proofs uploaded yet.</p> : null)}

          <form action={handleUpload} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="text-xs" />
            <button type="submit" disabled={pending} className="rounded-ctl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {pending ? 'Uploading…' : 'Upload new version'}
            </button>
          </form>
          <p className="mt-1 text-[11px] text-content-muted">PDF, PNG, JPEG, or WEBP, up to 15MB. Uploading creates a fresh approval link.</p>
        </div>
      ) : null}
    </div>
  );
}
