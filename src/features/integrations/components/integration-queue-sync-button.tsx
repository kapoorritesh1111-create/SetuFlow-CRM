'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { queueGovernedIntegrationSync, type IntegrationQueueActionState } from '@/features/integrations/server/actions';

const initialState: IntegrationQueueActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Queueing sync…' : 'Queue governed sync'}
    </button>
  );
}

type Props = {
  integrationId: string;
  provider: string;
  targetType: 'contract';
  targetId: string;
  reason: string;
};

export function IntegrationQueueSyncButton({ integrationId, provider, targetType, targetId, reason }: Props) {
  const [state, formAction] = useFormState(queueGovernedIntegrationSync, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="integration_id" value={integrationId} />
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="reason" value={reason} />
      <SubmitButton />
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
