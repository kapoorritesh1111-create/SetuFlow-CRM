import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { buildSetuGuruLiteAnswer, isSetuGuruLiteAllowedPath } from '@/lib/setu-guru/public-site-registry';

const requestSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  pagePath: z.string().trim().min(1).max(200).default('/'),
  sessionId: z.string().trim().max(120).optional().nullable(),
});

function safePath(pathname: string) {
  if (!pathname.startsWith('/')) return '/';
  const clean = pathname.split('?')[0].split('#')[0] || '/';
  return isSetuGuruLiteAllowedPath(clean) ? clean : '/';
}

async function recordLiteQuestion(input: {
  pagePath: string;
  question: string;
  answerIntent: string;
  matchedPublicSource: string;
  answered: boolean;
  fallbackReason?: string | null;
  sessionId?: string | null;
}) {
  const supabase = createServiceClient();
  if (!supabase) return;
  await supabase.from('setu_guru_lite_questions').insert({
    page_path: input.pagePath,
    question: input.question,
    answer_intent: input.answerIntent,
    matched_public_source: input.matchedPublicSource,
    answered: input.answered,
    fallback_reason: input.fallbackReason,
    session_id: input.sessionId,
  });
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Please ask a public Setu Flow site or training question.' }, { status: 400 });
    }

    const pagePath = safePath(parsed.data.pagePath);
    const result = buildSetuGuruLiteAnswer(parsed.data.question, pagePath);

    recordLiteQuestion({
      pagePath,
      question: parsed.data.question,
      answerIntent: result.intent,
      matchedPublicSource: result.matchedPublicSource,
      answered: result.answered,
      fallbackReason: result.fallbackReason,
      sessionId: parsed.data.sessionId ?? null,
    }).catch(() => undefined);

    return NextResponse.json({
      answer: result.answer,
      actions: result.actions,
      pageTitle: result.pageTitle,
      topicId: result.topicId,
      answered: result.answered,
      policy: result.policy,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Setu Guru Lite could not answer right now.' },
      { status: 500 },
    );
  }
}
