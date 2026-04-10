"use client";

import { useEffect } from 'react';

/**
 * QuotePrintButton renders a button that triggers `window.print()` when clicked.  It
 * accepts an optional `label` prop to customize the button text.  This component
 * must be client-side so that `window` is available.  Use it on pages where the
 * user can print a generated quote.
 */
export default function QuotePrintButton({ label = 'Print quote' }: { label?: string }) {
  useEffect(() => {
    // no-op to satisfy lint that window exists only on client
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}