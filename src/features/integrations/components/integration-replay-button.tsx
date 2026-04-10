'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestIntegrationReplay, type IntegrationReplayActionState } from '@/features/integrations/server/actions';

const initialState: IntegrationReplayActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Logging replay…' : 'Log replay request'}
    </button>
  );
}

type Props = {
  integrationId: string;
  eventId: string;
  provider: string;
  reason: string;
};

export function IntegrationReplayButton({ integrationId, eventId, provider, reason }: Props) {
  const [state, formAction] = useFormState(requestIntegrationReplay, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="integration_id" value={integrationId} />
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="reason" value={reason} />
      <SubmitButton />
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
