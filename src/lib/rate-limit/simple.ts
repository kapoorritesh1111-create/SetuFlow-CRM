const hitMap = new Map<string, { count: number; ts: number }>();

export function checkRateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const current = hitMap.get(key);

  if (!current || now - current.ts > windowMs) {
    hitMap.set(key, { count: 1, ts: now });
    return { allowed: true };
  }

  if (current.count >= limit) return { allowed: false };

  current.count += 1;
  return { allowed: true };
}
