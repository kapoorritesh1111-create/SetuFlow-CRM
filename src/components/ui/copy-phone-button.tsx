'use client';

import { useState, type MouseEvent } from 'react';

export function CopyPhoneButton({
  phone,
  compact = false,
  iconOnly = false,
}: {
  phone: string;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const value = String(phone ?? '').trim();
  if (!value) return null;

  async function copyPhone(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  const label = copied ? 'Copied' : 'Copy phone';
  return (
    <button
      type="button"
      onClick={copyPhone}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 ${iconOnly ? 'h-8 w-8' : compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'}`}
    >
      {copied ? '✓' : '⧉'}{iconOnly ? '' : <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>}
    </button>
  );
}
