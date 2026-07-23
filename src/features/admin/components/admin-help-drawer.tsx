"use client";

import { useState } from "react";

type HelpSection = {
  title: string;
  body: string;
  items?: string[];
};

export function AdminHelpDrawer({
  title,
  intro,
  sections,
  buttonLabel = "Help",
}: {
  title: string;
  intro: string;
  sections: HelpSection[];
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-xs text-white">?</span>
        {buttonLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close help" onClick={() => setOpen(false)} />
          <section className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-hero border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">SETU Flow help</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{intro}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-950"
                aria-label="Close help"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="max-h-[64vh] space-y-3 overflow-y-auto p-5">
              {sections.map((section) => (
                <section key={section.title} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
                  {section.items?.length ? (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                      {section.items.map((item) => <li key={item}>{item}</li>)}
                    </ol>
                  ) : null}
                </section>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
