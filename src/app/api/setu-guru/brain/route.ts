import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { buildSetuGuruBrainAnswer } from '@/lib/setu-guru/brain-layer';

const BrainRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  route: z.string().trim().max(300).optional(),
  pageText: z.string().trim().max(6000).optional(),
  pageContext: z.object({
    routeKey: z.string().optional(),
    helpTopicId: z.string().optional(),
    helpFile: z.string().optional(),
    summary: z.string().optional(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = BrainRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        answer: 'Data Not Found - Ask Setu Guru a specific product, workflow, or page question.', 
        confidence: 'low', 
        rows: [] 
      }, { status: 400 });
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) {
      return NextResponse.json({ 
        answer: 'Data Not Found - Please sign in to Setu Flow before asking Setu Guru.', 
        confidence: 'low', 
        rows: [] 
      }, { status: 401 });
    }

    const payload = parsed.data;
    
    // Call the brain-layer implementation which handles zero-overlap / out-of-scope gracefully
    const result = buildSetuGuruBrainAnswer({
      question: payload.question,
      route: payload.route,
      pageText: payload.pageText,
      organizationName: workspace.organization.name,
      roleLabel: workspace.currentRoles.join(', '),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ 
      answer: 'Data Not Found - Setu Guru brain layer encountered an error.', 
      confidence: 'low', 
      rows: [] 
    }, { status: 500 });
  }
}