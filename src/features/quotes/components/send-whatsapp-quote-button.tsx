'use client';

import { useState, useTransition } from 'react';
import { sendQuoteViaWhatsApp } from '@/features/quotes/server/whatsapp-delivery';

export function SendWhatsAppQuoteButton(props: { quoteId: string; leadId: string; organizationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await sendQuoteViaWhatsApp(props);
              window.open(result.url, '_blank', 'noopener,noreferrer');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to open WhatsApp delivery.');
            }
          });
        }}
        className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#0c7fff] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0966cc] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Opening WhatsApp…' : 'Send via WhatsApp'}
      </button>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
