'use client';

import { useEffect, useRef } from 'react';

type GuruFeedbackPayload = {
  label?: unknown;
  lastMessage?: unknown;
  pathname?: unknown;
  routeTitle?: unknown;
  helpFile?: unknown;
  createdAt?: unknown;
};

const FEEDBACK_STORAGE_KEY = 'setu-guru-feedback-log';
const SYNC_INTERVAL_MS = 1500;

function safeParseFeedback(value: string | null): GuruFeedbackPayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed) || !parsed.length || !parsed[0] || typeof parsed[0] !== 'object') return null;
    return parsed[0] as GuruFeedbackPayload;
  } catch {
    return null;
  }
}

function toFeedbackBody(payload: GuruFeedbackPayload) {
  return {
    label: payload.label === 'missing' ? 'missing' : 'helpful',
    lastMessage: typeof payload.lastMessage === 'string' ? payload.lastMessage : '',
    pathname: typeof payload.pathname === 'string' ? payload.pathname : '',
    routeTitle: typeof payload.routeTitle === 'string' ? payload.routeTitle : '',
    helpFile: typeof payload.helpFile === 'string' ? payload.helpFile : '',
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
  };
}

export function SetuGuruFeedbackBridge() {
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function persistLatestFeedback() {
      if (cancelled) return;
      const feedback = safeParseFeedback(window.localStorage.getItem(FEEDBACK_STORAGE_KEY));
      if (!feedback) return;

      const body = toFeedbackBody(feedback);
      const signature = JSON.stringify(body);
      if (lastSyncedRef.current === signature) return;
      lastSyncedRef.current = signature;

      try {
        await fetch('/api/setu-guru/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: signature,
          keepalive: true,
        });
      } catch {
        // Keep localStorage as a fallback; feedback persistence should never break the widget.
      }
    }

    void persistLatestFeedback();
    const intervalId = window.setInterval(() => {
      void persistLatestFeedback();
    }, SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
