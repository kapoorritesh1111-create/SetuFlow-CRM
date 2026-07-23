'use client';

import Link from 'next/link';
import { useState } from 'react';

type QuoteSentConfirmationProps = {
  quoteRef: string;
  buyerName: string;
  trackedLink: string;
  whatsappLink: string | null;
  quoteHref: string;
};

export function QuoteSentConfirmation({ quoteRef, buyerName, trackedLink, whatsappLink, quoteHref }: QuoteSentConfirmationProps) {
  const [copied, setCopied] = useState(false);

  async function copyTrackedLink() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(trackedLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <section className="rounded-hero border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-emerald-500 text-3xl font-black text-white">OK</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Quote sent</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Quote {quoteRef} sent to {buyerName}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                The quote is marked sent and the execution handoff is ready. Share or copy the tracked quote link below for manual follow-up.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Buyer not opened yet
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tracked quote link</p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="break-all text-sm font-medium text-slate-700">{trackedLink}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={copyTrackedLink} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {copied ? 'Copied link' : 'Copy tracked link'}
              </button>
              <a href={trackedLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Open tracked link
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              The buyer has not opened this yet. You will be able to follow up from the quote and order workflow once they respond.
            </p>
          </section>

          <aside className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600">
                Open WhatsApp
              </a>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Add a WhatsApp number on the lead to open WhatsApp delivery.
              </div>
            )}
            <Link href={quoteHref} className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">View quote</Link>
            <Link href="/quotes" className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to quotes</Link>
            <Link href="/orders" className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open orders</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
