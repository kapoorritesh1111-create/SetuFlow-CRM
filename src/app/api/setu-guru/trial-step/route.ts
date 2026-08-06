import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { isTourStepId } from '@/lib/trial/tour-registry';
import { writeTelemetry } from '@/lib/setu-guru/telemetry';

// S24-TRIAL-205 Pass C: logs guided-tour "Show me" clicks from Setu Guru into
// setu_guru_telemetry. Step ids are validated against the tour registry —
// arbitrary selectors or step names are rejected.

const requestSchema = z.object({
  stepId: z.string().trim().min(1).max(120),
  route: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success || !isTourStepId(parsed.data.stepId)) {
      return NextResponse.json({ ok: false, error: 'Unknown tour step.' }, { status: 400 });
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) {
      return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
    }

    void writeTelemetry({
      organizationId: workspace.organization.id,
      userId: workspace.user.id,
      route: parsed.data.route || '/',
        // question: removed to fix TS error
      mode: 'trial_show_step_clicked',
      confidence: 'high',
      blockerCount: 0,
      answerSourceType: 'trial_coach',
      latencyMs: 0,
      blocked: false,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Telemetry failed.' }, { status: 500 });
  }
}
