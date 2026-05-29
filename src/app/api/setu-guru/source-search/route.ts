import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { runSetuGuruSourceSearch } from '@/lib/setu-guru/source-search';

const SourceSearchSchema = z.object({
  mode: z.enum(['hsn_enrichment', 'document_requirements', 'margin_benchmark']),
  question: z.string().trim().min(1).max(2000),
  product: z.string().trim().max(160).optional(),
  country: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = SourceSearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        answer: 'Choose a supported Setu Guru research mode and ask a specific source-backed research question.',
        confidence: 'low',
        results: [],
      }, { status: 400 });
    }

    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) {
      return NextResponse.json({
        answer: 'Please sign in to Setu Flow before asking Setu Guru to search trusted research sources.',
        confidence: 'low',
        results: [],
      }, { status: 401 });
    }

    const result = await runSetuGuruSourceSearch(parsed.data);
    return NextResponse.json({
      ...result,
      organizationId: workspace.organization.id,
      answer: 'I searched the trusted Setu Guru research source list and prepared draft source previews. No CRM values were saved.',
    });
  } catch (error) {
    return NextResponse.json({
      answer: error instanceof Error ? error.message : 'Setu Guru trusted source search failed.',
      confidence: 'low',
      results: [],
    }, { status: 500 });
  }
}
