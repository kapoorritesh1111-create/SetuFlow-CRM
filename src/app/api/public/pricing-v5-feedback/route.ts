import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';

type FeedbackBody = {
  reviewer_name?: unknown;
  review_mode?: unknown;
  step_key?: unknown;
  rating?: unknown;
  priority?: unknown;
  feedback?: unknown;
  page_path?: unknown;
};

function text(value: unknown, max = 2000) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(publicRateLimitKey('pricing-v5-feedback', request), 20, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: 'too_many_submissions' }, { status: 429 });

  let body: FeedbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const feedback = text(body.feedback, 5000);
  if (!feedback) return NextResponse.json({ ok: false, error: 'feedback_required' }, { status: 400 });

  const reviewMode = text(body.review_mode, 20);
  if (!reviewMode || !['admin', 'sales'].includes(reviewMode)) {
    return NextResponse.json({ ok: false, error: 'invalid_review_mode' }, { status: 400 });
  }

  const parsedRating = Number(body.rating);
  const rating = Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : null;
  const priority = text(body.priority, 20) ?? 'normal';
  if (!['normal', 'important', 'blocker'].includes(priority)) {
    return NextResponse.json({ ok: false, error: 'invalid_priority' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 });

  const { error } = await (admin as any).from('pricing_v5_review_feedback').insert({
    reviewer_name: text(body.reviewer_name, 120) ?? 'Anonymous',
    review_mode: reviewMode,
    step_key: text(body.step_key, 80),
    rating,
    priority,
    feedback,
    page_path: text(body.page_path, 255),
    user_agent: text(request.headers.get('user-agent'), 500),
  });

  if (error) return NextResponse.json({ ok: false, error: 'storage_failed' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
