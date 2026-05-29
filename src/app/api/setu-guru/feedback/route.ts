import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasSupabaseEnv } from '@/lib/env';
import { writeAuditLog } from '@/lib/auditLog';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { writeFeedback } from '@/lib/setu-guru/feedback-store';

const FeedbackRequestSchema = z.object({
  label: z.enum(['helpful', 'missing']),
  lastMessage: z.string().max(8000).optional(),
  pathname: z.string().max(300).optional(),
  routeTitle: z.string().max(160).optional(),
  helpFile: z.string().max(300).optional(),
  createdAt: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ ok: false, error: 'Missing Supabase environment variables.' }, { status: 500 });

  const parsed = FeedbackRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid Setu Guru feedback payload.', details: parsed.error.flatten() }, { status: 422 });

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ ok: false, error: 'Please sign in before saving Setu Guru feedback.' }, { status: 401 });

  const feedback = parsed.data;

  // Primary: write to dedicated setu_guru_feedback table
  const { ok: tableOk } = await writeFeedback({
    organizationId: workspace.organization.id,
    userId: workspace.user.id,
    label: feedback.label,
    lastMessage: feedback.lastMessage,
    pathname: feedback.pathname,
    routeTitle: feedback.routeTitle,
    helpFile: feedback.helpFile,
    submittedAt: feedback.createdAt,
  });

  // Fallback: always write to audit_logs (belt-and-suspenders)
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
      table_write_ok: tableOk,
    },
  });

  return NextResponse.json({ ok: true, persisted: tableOk });
}

export async function GET(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ ok: false, error: 'Missing Supabase configuration.' }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
  if (!workspace.currentRoles.includes('admin')) return NextResponse.json({ ok: false, error: 'Admin role required to view feedback summary.' }, { status: 403 });

  const { getFeedbackSummary } = await import('@/lib/setu-guru/feedback-store');
  const summary = await getFeedbackSummary(workspace.organization.id);
  return NextResponse.json({ ok: true, summary });
}
