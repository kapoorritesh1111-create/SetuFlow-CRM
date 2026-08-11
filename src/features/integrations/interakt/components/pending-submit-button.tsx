'use client';

import { useFormStatus } from 'react-dom';

type PendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  disabled?: boolean;
  className?: string;
  pendingDetail?: string;
};

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  disabled = false,
  className = '',
  pendingDetail,
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const blocked = disabled || pending;

  return (
    <div className="min-w-0">
      <button
        type="submit"
        disabled={blocked}
        aria-busy={pending}
        className={`${className} relative overflow-hidden disabled:cursor-wait disabled:opacity-70`}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
          {pending ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
          {pending ? pendingLabel : idleLabel}
        </span>
        {pending ? <span className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-current/60" aria-hidden="true" /> : null}
      </button>
      {pending && pendingDetail ? <p className="mt-1 text-[9px] font-medium text-slate-500">{pendingDetail}</p> : null}
    </div>
  );
}
