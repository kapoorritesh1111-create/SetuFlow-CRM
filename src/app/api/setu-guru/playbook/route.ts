import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildPlaybookGuidance } from '@/lib/setu-guru/playbook-guidance';

const PlaybookSchema = z.object({
  question: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  if (!hasSupabaseEnv) return NextResponse.json({ answer: 'Supabase configuration missing.', confidence: 'low', rows: [] }, { status: 500 });
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ answer: 'Sign in before using Setu Guru playbooks.', confidence: 'low', rows: [] }, { status: 401 });

  const parsed = PlaybookSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ answer: 'Ask a workflow or onboarding question.', confidence: 'low', rows: [] }, { status: 400 });

  const { answer, rows } = await buildPlaybookGuidance(workspace.organization.id, parsed.data.question);
  return NextResponse.json({ answer, confidence: 'high', rows, actions: ['Open setup checklist', 'Check live blockers'] });
}
