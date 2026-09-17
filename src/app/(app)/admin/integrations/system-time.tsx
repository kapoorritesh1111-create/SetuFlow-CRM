'use client';

import { useEffect, useState } from 'react';

type Props = {
  timestamp?: string | null;
  fallback?: string;
  includeZone?: boolean;
};

export function SystemTime({ timestamp, fallback = 'No activity yet', includeZone = false }: Props) {
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
    const formatted = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);

    setText(includeZone ? `${formatted} · ${timeZone}` : formatted);
  }, [fallback, includeZone, timestamp]);

  return <span suppressHydrationWarning>{text}</span>;
}

export function SystemTimeZone() {
  const [timeZone, setTimeZone] = useState('System timezone');

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  }, []);

  return <span suppressHydrationWarning>{timeZone}</span>;
}
