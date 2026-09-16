'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDesignRequestQuoteState, requestPackagingDesign } from '@/features/packaging/server/design-request-actions';
import { sendPackagingDesignCollaborationEmail, sendPackagingQuoteCustomerPackage } from '@/features/packaging/server/customer-review-actions';

export default function QuoteDesignRequestLauncher({ leadId }: { leadId: string }) {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openLineId, setOpenLineId] = useState<string | null>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [copiedDesign, setCopiedDesign] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    setError('');
    startTransition(async () => {
      const response = await getDesignRequestQuoteState(leadId, quoteId);
      setState(response);
      if (!response.ok) setError(response.error ?? 'Could not load design request state.');
    });
  };

  useEffect(() => { load(); }, [leadId, quoteId]);

  const lines = useMemo(() => state?.lines ?? [], [state]);
  if (!state || !state.quote || !lines.length) return null;

  const token = String(state.quote?.industry_metadata?.customer_review_token || '');
  const quoteReviewUrl = token && typeof window !== 'undefined' ? `${window.location.origin}/public/quote-review/${token}` : '';

  const sendCustomerPackage = () => {
    setError(''); setSuccess('');
    startTransition(async () => {
      const response = await sendPackagingQuoteCustomerPackage({ leadId, quoteId: state.quote.id });
      if (!response.ok) {
        setError(('error' in response ? response.error : null) ?? 'Could not send the customer quote package.');
        return;
      }
      if (!('email' in response)) { setError('Could not confirm customer delivery.'); return; }
      setSuccess(`Quote Review sent to ${response.email}. The commercial review link remains available below for viewing, copying or resharing.`);
      load();
    });
  };

  const sendDesignCollaboration = (line: any) => {
    setError(''); setSuccess('');
    startTransition(async () => {
      const response = await sendPackagingDesignCollaborationEmail({ quoteLineItemId: line.id });
      if (!response.ok) {
        setError(('error' in response ? response.error : null) ?? 'Could not send the Design Collaboration link.');
        return;
      }
      if (!('email' in response)) { setError('Could not confirm customer delivery.'); return; }
      setSuccess(`Design Collaboration sent to ${response.email}. This same customer link stays active through all design revisions.`);
    });
  };

  const copyQuoteLink = async () => {
    if (!quoteReviewUrl) return;
    await navigator.clipboard?.writeText(quoteReviewUrl);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 1800);
  };

  const copyDesignLink = async (line: any) => {
    const designToken = String(line.designRequest?.customer_review_token || '');
    if (!designToken || typeof window === 'undefined') return;
    await navigator.clipboard?.writeText(`${window.location.origin}/public/design-review/${designToken}`);
    setCopiedDesign(line.id);
    setTimeout(() => setCopiedDesign(null), 1800);
  };

  return (
    <section className="mb-4 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-emerald-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Quote Review + Design Collaboration</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Two separate customer links for two separate decisions</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">Quote Review is for commercial approval. Design Collaboration is the persistent customer workspace for artwork, KLD, proof revisions and final design approval — and can start before or after the quote is approved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={sendCustomerPackage} disabled={pending} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm disabled:opacity-50">{pending ? 'Sending…' : token ? 'Resend Quote Review' : 'Send Quote Review'}</button>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right"><div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Quote</div><div className="text-sm font-black text-slate-800">{state.quote.quote_number ?? 'Current quote'}</div></div>
        </div>
      </div>

      {token ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-white p-3">
          <div className="mr-auto min-w-0"><div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Quote Review link · commercial approval</div><div className="truncate text-xs font-semibold text-slate-500">{quoteReviewUrl || 'Secure link available'}</div></div>
          <a href={`/public/quote-review/${token}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">View quote link ↗</a>
          <button type="button" onClick={copyQuoteLink} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">{copiedQuote ? 'Copied!' : 'Copy quote link'}</button>
        </div>
      ) : null}

      {error ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
      {success ? <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{success}</div> : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {lines.map((line: any) => {
          const requested = Boolean(line.designRequest?.requested);
          const expanded = openLineId === line.id;
          const status = String(line.designRequest?.status || '').replaceAll('_', ' ');
          const designToken = String(line.designRequest?.customer_review_token || '');
          const designReviewUrl = designToken && typeof window !== 'undefined' ? `${window.location.origin}/public/design-review/${designToken}` : '';
          return (
            <div key={line.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-slate-900">{line.specSummary}</p>{requested ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">{status || 'Design requested'}</span> : <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black text-cyan-700">Ready to hand off</span>}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500"><span>{line.quantity ? `${line.quantity.toLocaleString()} pcs` : 'Quantity on quote'}</span><span>Artwork: {String(line.artworkStatus ?? 'not confirmed').replaceAll('_', ' ')}</span><span>{line.kldFileId ? 'KLD selected' : 'KLD not selected'}</span></div>
                </div>
                <button type="button" onClick={() => setOpenLineId(expanded ? null : line.id)} disabled={!state.canRequest} className="shrink-0 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{requested ? 'Update request' : 'Request Design'}</button>
              </div>

              {requested ? <div className="mt-2 rounded-xl bg-slate-50 p-2 text-[11px] font-semibold text-slate-600">Status: {status || 'requested'}{line.designRequest.requested_at ? ` · Requested ${new Date(line.designRequest.requested_at).toLocaleString()}` : ''}{line.designRequest.due_date ? ` · Due ${line.designRequest.due_date}` : ''}{line.designRequest.notes ? ` · ${line.designRequest.notes}` : ''}</div> : null}

              {requested && designToken ? (
                <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <div className="text-[10px] font-black uppercase tracking-wide text-violet-700">Design Collaboration link · artwork & proof workflow</div>
                  <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{designReviewUrl || 'Secure design link available'}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => sendDesignCollaboration(line)} disabled={pending} className="rounded-xl bg-violet-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{pending ? 'Sending…' : 'Send / resend to customer'}</button>
                    <a href={`/public/design-review/${designToken}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-800">Open design workspace ↗</a>
                    <button type="button" onClick={() => copyDesignLink(line)} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-800">{copiedDesign === line.id ? 'Copied!' : 'Copy / reshare design link'}</button>
                  </div>
                </div>
              ) : null}

              {expanded ? (
                <form className="mt-3 grid gap-2 border-t border-slate-100 pt-3" action={(formData) => {
                  setError(''); setSuccess('');
                  startTransition(async () => {
                    const response = await requestPackagingDesign({ leadId, quoteId: state.quote.id, quoteLineItemId: line.id, dueDate: String(formData.get('dueDate') ?? ''), notes: String(formData.get('notes') ?? '') });
                    if (!response.ok) { setError(response.error ?? 'Could not request design.'); return; }
                    setSuccess('Design request sent. A separate persistent Design Collaboration link is now available for the customer, independent of quote approval.');
                    setOpenLineId(null); load();
                  });
                }}>
                  <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]"><label className="text-xs font-black text-slate-600">Target date<input name="dueDate" type="date" defaultValue={line.designRequest?.due_date ?? ''} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" /></label><label className="text-xs font-black text-slate-600">Design note<input name="notes" defaultValue={line.designRequest?.notes ?? ''} placeholder="e.g. Use customer artwork; finalize on selected KLD" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" /></label></div>
                  <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpenLineId(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Cancel</button><button type="submit" disabled={pending} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{pending ? 'Sending…' : 'Send to Design'}</button></div>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
