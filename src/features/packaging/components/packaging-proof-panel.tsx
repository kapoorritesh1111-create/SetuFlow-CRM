'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import {
  packagingDesignSourceLabel,
  type PackagingDesignProof,
  type PackagingDesignSource,
} from '@/lib/packaging/design-proof';
import {
  listPackagingDesignProofs,
  uploadPackagingDesignProof,
} from '@/features/packaging/server/design-workflow-actions';
import { sendPackagingProofReviewEmail } from '@/features/packaging/server/customer-review-actions';

function statusTone(status: string) {
  if (status === 'approved') return 'bg-success-bg text-success-fg';
  if (status === 'rejected') return 'bg-danger-bg text-danger-fg';
  return 'bg-warning-bg text-warning-fg';
}

function reviewUrl(proof: PackagingDesignProof) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/public/proof-approval/${proof.approval_token}`;
}

export default function PackagingProofPanel({ quoteLineItemId, leadId }: { quoteLineItemId: string; leadId: string }) {
  const [open, setOpen] = useState(false);
  const [proofs, setProofs] = useState<PackagingDesignProof[] | null>(null);
  const [designSource, setDesignSource] = useState<PackagingDesignSource>('design_team');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      const response = await listPackagingDesignProofs(quoteLineItemId);
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
    formData.set('designSource', designSource);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const response = await uploadPackagingDesignProof(formData);
      if (!response.ok) { setError(response.error ?? 'Upload failed.'); return; }
      setSuccess('Proof uploaded. Send this version to the customer for approval before Printing.');
      load();
    });
  };

  const copyLink = async (proof: PackagingDesignProof) => {
    const url = reviewUrl(proof);
    await navigator.clipboard?.writeText(url);
    setCopiedFor(proof.id);
    setTimeout(() => setCopiedFor(null), 2000);
  };

  const shareReview = async (proof: PackagingDesignProof) => {
    setError(null); setSuccess(null);
    startTransition(async () => {
      const response = await sendPackagingProofReviewEmail({ quoteLineItemId, proofId: proof.id });
      if (!response.ok) {
        setError(('error' in response ? response.error : null) ?? 'Could not send the design review.');
        return;
      }
      if (!('email' in response)) { setError('Could not confirm customer delivery.'); return; }
      setSuccess(`Design proof v${proof.version} sent to ${response.email}. The customer can approve it or request changes from the secure review page.`);
    });
  };

  const emailReview = (proof: PackagingDesignProof) => {
    const url = reviewUrl(proof);
    const subject = encodeURIComponent('Your packaging design is ready for review');
    const body = encodeURIComponent(`Your Stark Packmate packaging proof v${proof.version} is ready.\n\nPlease review, approve, or request changes here:\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const whatsappReview = (proof: PackagingDesignProof) => {
    const url = reviewUrl(proof);
    const text = encodeURIComponent(`Your Stark Packmate packaging proof v${proof.version} is ready for review. Approve it or request changes here: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-2">
      <button onClick={toggle} className="flex items-center gap-1.5 rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-xs font-semibold text-content-primary hover:border-brand-200">
        <span aria-hidden="true">🖼️</span> {open ? 'Hide design files' : 'Design files — upload or review'}
      </button>
      {open ? (
        <div className="mt-2 rounded-ctl border border-line bg-surface-app p-3">
          {loading ? <p className="text-xs text-content-muted">Loading…</p> : null}
          {error ? <p className="mb-2 rounded-ctl bg-danger-bg px-2 py-1.5 text-xs font-medium text-danger-fg">{error}</p> : null}
          {success ? <p className="mb-2 rounded-ctl bg-success-bg px-2 py-1.5 text-xs font-medium text-success-fg">{success}</p> : null}
          {proofs?.length ? (
            <ul className="space-y-2">
              {proofs.map((proof, index) => (
                <li key={proof.id} className="rounded-ctl border border-line bg-surface-1 p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-semibold text-content-primary">v{proof.version} — {proof.file_name}</p>
                        {index === 0 ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Current</span> : null}
                      </div>
                      <p className="text-[11px] text-content-muted">
                        {packagingDesignSourceLabel(proof.design_source)} · {new Date(proof.uploaded_at).toLocaleDateString()}
                        {proof.review_comment ? ` · “${proof.review_comment}”` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(proof.status)}`}>{proof.status}</span>
                  </div>
                  {index === 0 && proof.status !== 'approved' ? (
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-2">
                      <button onClick={() => shareReview(proof)} disabled={pending} className="rounded-ctl bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">{pending ? 'Sending…' : 'Send for review'}</button>
                      <button onClick={() => emailReview(proof)} className="rounded-ctl border border-line bg-surface-app px-2 py-1 text-[11px] font-semibold text-content-primary">Open Email</button>
                      <button onClick={() => whatsappReview(proof)} className="rounded-ctl border border-line bg-surface-app px-2 py-1 text-[11px] font-semibold text-content-primary">WhatsApp</button>
                      <button onClick={() => copyLink(proof)} className="rounded-ctl border border-line bg-surface-app px-2 py-1 text-[11px] font-semibold text-content-primary">{copiedFor === proof.id ? 'Copied!' : 'Copy link'}</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (!loading ? <p className="text-xs text-content-muted">No design file uploaded yet.</p> : null)}

          <form action={handleUpload} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[190px_minmax(0,1fr)_auto] sm:items-end">
            <label className="text-[11px] font-semibold text-content-muted">
              Artwork source
              <select value={designSource} onChange={(event: ChangeEvent<HTMLSelectElement>) => setDesignSource(event.target.value as PackagingDesignSource)} className="mt-1 w-full rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-xs text-content-primary">
                <option value="design_team">Design Team proof</option>
                <option value="customer_provided">Customer artwork / adapted proof</option>
              </select>
            </label>
            <input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="text-xs" />
            <button type="submit" disabled={pending} className="rounded-ctl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Uploading…' : 'Upload proof'}</button>
          </form>
          <p className="mt-2 text-[11px] text-content-muted">Every final proof requires customer approval before Printing. “Send for review” now emails the secure review link directly to the customer; WhatsApp and copy-link remain available as alternate channels.</p>
        </div>
      ) : null}
    </div>
  );
}
