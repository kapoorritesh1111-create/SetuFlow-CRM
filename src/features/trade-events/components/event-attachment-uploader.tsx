'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Camera, FileUp } from 'lucide-react';
import { addEventInteractionAttachments, type EventAttachmentState } from '@/features/trade-events/server/event-attachment-actions';

function UploadButton() {
  const status = useFormStatus();
  return <button type="submit" disabled={status.pending} className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-xs font-black text-white disabled:opacity-50"><FileUp className="mr-1 h-4 w-4" />{status.pending ? 'Uploading…' : 'Add files'}</button>;
}

export function EventAttachmentUploader({ entryId }: { entryId: string }) {
  const [state, action] = useFormState<EventAttachmentState | undefined, FormData>(addEventInteractionAttachments, undefined);
  return <form action={action} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
    <input type="hidden" name="trade_event_entry_id" value={entryId} />
    <p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800"><Camera className="h-4 w-4" />Add interaction evidence</p>
    <p className="mt-1 text-xs font-semibold text-slate-600">Product photo, sample, business card, or PDF spec sheet. Up to 5 files, 10 MB each.</p>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <input name="attachments" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="min-h-10 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs" />
      <UploadButton />
    </div>
    {state?.error ? <p className="mt-2 text-xs font-bold text-rose-700">{state.error}</p> : null}
    {state?.success ? <p className="mt-2 text-xs font-bold text-emerald-800">{state.success}</p> : null}
  </form>;
}
