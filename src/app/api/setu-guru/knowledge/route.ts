import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { listGuruLessons, submitGuruLesson, reviewGuruLesson } from '@/lib/setu-guru/organization-learning';

export const dynamic = 'force-dynamic';

const Proposal = z.object({
  question: z.string().trim().min(5).max(1200),
  answer: z.string().trim().max(6000).optional(),
  category: z.string().trim().max(100).optional(),
});
const Decision = z.object({
  id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected', 'retired']),
  answer: z.string().trim().max(6000).optional(),
});
const canManage = (roles: readonly string[]) => roles.includes('owner') || roles.includes('admin');

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const manager = canManage(workspace.currentRoles);
  try {
    const lessons = await listGuruLessons(workspace.organization.id, manager);
    return NextResponse.json({ ok: true, canManage: manager, lessons: manager ? lessons : lessons.filter((lesson) => lesson.status === 'approved') });
  } catch {
    return NextResponse.json({ error: 'Guru knowledge is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const parsed = Proposal.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid knowledge request.', details: parsed.error.flatten() }, { status: 422 });
  const manager = canManage(workspace.currentRoles);
  if (parsed.data.answer && !manager) return NextResponse.json({ error: 'Only an authorized owner or admin can teach Guru.' }, { status: 403 });
  try {
    const result = await submitGuruLesson({
      organizationId: workspace.organization.id, actorId: workspace.user.id,
      question: parsed.data.question, answer: manager ? parsed.data.answer : undefined,
      category: parsed.data.category,
    });
    await writeAuditLog({
      organizationId: workspace.organization.id, actorUserId: workspace.user.id,
      action: manager && parsed.data.answer ? 'guru_knowledge_proposed' : 'guru_answer_requested',
      entityType: 'guru_ingestion_review_queue', entityId: result.id,
      payload: { category: parsed.data.category ?? 'General', duplicate: result.existing },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: 'Unable to save the question for review.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  if (!canManage(workspace.currentRoles)) return NextResponse.json({ error: 'Owner or admin approval required.' }, { status: 403 });
  const parsed = Decision.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid Guru review decision.' }, { status: 422 });
  try {
    const result = await reviewGuruLesson({
      organizationId: workspace.organization.id, reviewerId: workspace.user.id,
      id: parsed.data.id, decision: parsed.data.decision, answer: parsed.data.answer,
    });
    await writeAuditLog({
      organizationId: workspace.organization.id, actorUserId: workspace.user.id,
      action: parsed.data.decision === 'approved' ? 'guru_knowledge_approved' : parsed.data.decision === 'retired' ? 'guru_knowledge_retired' : 'guru_knowledge_rejected',
      entityType: 'guru_ingestion_review_queue', entityId: parsed.data.id,
      payload: { decision: parsed.data.decision },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Guru review failed.' }, { status: 409 });
  }
}
