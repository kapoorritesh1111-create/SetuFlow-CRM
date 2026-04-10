export function logInfo(event: string, meta?: Record<string, unknown>) {
  console.info(JSON.stringify({ level: 'info', event, ...meta }));
}

export function logError(event: string, error: unknown, meta?: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      level: 'error',
      event,
      error: error instanceof Error ? error.message : String(error),
      ...meta
    })
  );
}
