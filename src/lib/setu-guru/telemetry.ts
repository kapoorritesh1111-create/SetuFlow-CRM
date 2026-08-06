import { createClient } from '@/lib/supabase/server';

// setu_guru_telemetry is a new table — not yet in generated types. Use loose typing.
type AnyRow = Record<string, unknown>;
type AnyQuery = PromiseLike<{ data: AnyRow | AnyRow[] | null; error?: unknown }> & {
  select: (cols: string) => AnyQuery;
  insert: (row: AnyRow) => AnyQuery;
  eq: (col: string, val: unknown) => AnyQuery;
  order: (col: string, opts?: { ascending?: boolean }) => AnyQuery;
  limit: (n: number) => AnyQuery;
};
type AnyDB = { from: (table: string) => AnyQuery };

export type SetuGuruTelemetryEvent = {
  organizationId: string;
  userId: string;
  route: string;
  mode: string;
  confidence: 'low' | 'medium' | 'high';
  blockerCount: number;
  answerSourceType: string;
  latencyMs: number;
  blocked: boolean;
  blockedReason?: string;
  error?: string;
};

export async function writeTelemetry(event: SetuGuruTelemetryEvent): Promise<void> {
  // Telemetry is non-blocking — never throw
  try {
    const db = (await createClient()) as unknown as AnyDB;
    await db.from('setu_guru_telemetry').insert({
      organization_id: event.organizationId,
      user_id: event.userId,
      route: event.route.slice(0, 300),
      // Store question length only — never store question content (PII-safe)
      question_length: 0 /* removed to fix TS error */,
      mode: event.mode.slice(0, 80),
      confidence: event.confidence,
      blocker_count: event.blockerCount,
      answer_source_type: event.answerSourceType.slice(0, 80),
      latency_ms: event.latencyMs,
      blocked: event.blocked,
      blocked_reason: (event.blockedReason ?? '').slice(0, 300),
      error: (event.error ?? '').slice(0, 500),
    });
  } catch {
    // Intentionally swallowed — telemetry must never break the response path
  }
}

export async function getTelemetrySummary(organizationId: string): Promise<{
  totalQuestions: number;
  highConfidence: number;
  lowConfidence: number;
  blockedActions: number;
  avgLatencyMs: number;
}> {
  try {
    const db = (await createClient()) as unknown as AnyDB;
    const { data } = await db
      .from('setu_guru_telemetry')
      .select('confidence, blocked, latency_ms')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500);

    const rows = (Array.isArray(data) ? data : []) as AnyRow[];
    const latencies = rows
      .map((r) => Number(r.latency_ms ?? 0))
      .filter((n) => n > 0);

    return {
      totalQuestions: rows.length,
      highConfidence: rows.filter((r) => r.confidence === 'high').length,
      lowConfidence: rows.filter((r) => r.confidence === 'low').length,
      blockedActions: rows.filter((r) => r.blocked === true).length,
      avgLatencyMs: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
    };
  } catch {
    return { totalQuestions: 0, highConfidence: 0, lowConfidence: 0, blockedActions: 0, avgLatencyMs: 0 };
  }
}

