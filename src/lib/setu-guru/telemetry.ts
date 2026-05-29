import { createClient } from '@/lib/supabase/server';

export type SetuGuruTelemetryEvent = {
  organizationId: string;
  userId: string;
  route: string;
  question: string;
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
  try {
    const db = await createClient();
    await db.from('setu_guru_telemetry').insert({
      organization_id: event.organizationId,
      user_id: event.userId,
      route: event.route.slice(0, 300),
      question_length: event.question.length,
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
    // Telemetry is non-blocking — never throw
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
    const db = await createClient();
    const { data } = await db
      .from('setu_guru_telemetry')
      .select('confidence, blocked, latency_ms')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500);

    const rows = data ?? [];
    const latencies = rows.map((r: Record<string, unknown>) => Number(r.latency_ms ?? 0)).filter((n: number) => n > 0);
    return {
      totalQuestions: rows.length,
      highConfidence: rows.filter((r: Record<string, unknown>) => r.confidence === 'high').length,
      lowConfidence: rows.filter((r: Record<string, unknown>) => r.confidence === 'low').length,
      blockedActions: rows.filter((r: Record<string, unknown>) => r.blocked === true).length,
      avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length) : 0,
    };
  } catch {
    return { totalQuestions: 0, highConfidence: 0, lowConfidence: 0, blockedActions: 0, avgLatencyMs: 0 };
  }
}
