'use client';

import { useEffect, useState } from 'react';

type SystemTimeProps = {
  timestamp?: string | null;
  fallback?: string;
  includeZone?: boolean;
  compact?: boolean;
};

export function SystemTime({ timestamp, fallback = '—', includeZone = false, compact = false }: SystemTimeProps) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    if (!timestamp) {
      setText(fallback);
      return;
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      setText(fallback);
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const formatted = new Intl.DateTimeFormat(undefined, compact
      ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone }
      : { dateStyle: 'medium', timeStyle: 'short', timeZone }
    ).format(date);

    setText(includeZone ? `${formatted} · ${timeZone}` : formatted);
  }, [compact, fallback, includeZone, timestamp]);

  return <span suppressHydrationWarning>{text}</span>;
}

export function SystemTimeZone({ fallback = 'System timezone' }: { fallback?: string }) {
  const [timeZone, setTimeZone] = useState(fallback);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, []);

  return <span suppressHydrationWarning>{timeZone}</span>;
}
