import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const FeedbackRequestSchema = z.object({
  label: z.enum(['helpful', 'missing']),
  lastMessage: z.string().max(8000).optional(),
  pathname: z.string().max(300).optional(),
  routeTitle: z.string().max(160).optional(),
  helpFile: z.string().max(300).optional(),
  createdAt: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  if (!hasSupabaseEnv) {
    return NextResponse.json({ ok: false, error: 'Missing Supabase environment variables.' }, { status: 500 });
  }

  const parsed = FeedbackRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid Setu Guru feedback payload.', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) {
    return NextResponse.json({ ok: false, error: 'Please sign in before saving Setu Guru feedback.' }, { status: 401 });
  }

  const feedback = parsed.data;
  await writeAuditLog({
    organizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    action: 'setu_guru_feedback_saved',
    entityType: 'setu_guru_feedback',
    payload: {
      label: feedback.label,
      last_message: feedback.lastMessage ?? '',
      pathname: feedback.pathname ?? '',
      route_title: feedback.routeTitle ?? '',
      help_file: feedback.helpFile ?? '',
      submitted_at: feedback.createdAt ?? new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
