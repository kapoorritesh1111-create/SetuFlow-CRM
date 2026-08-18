'use client';

import { deleteEnrichedTradeEvent } from '@/features/admin/server/trade-event-actions';

export function TradeEventDeleteButton({ eventName }: { eventId: string; eventName: string }) {
  return (
    <button
      type="submit"
      formAction={deleteEnrichedTradeEvent}
      formNoValidate
      onClick={(event) => {
        if (!window.confirm(`Delete ${eventName}? This is only allowed when the event has no linked CRM leads, captured interactions, or trial workspace.`)) {
          event.preventDefault();
        }
      }}
      className="inline-flex min-h-8 items-center justify-center rounded-ctl border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-50"
    >
      Delete event
    </button>
  );
}
