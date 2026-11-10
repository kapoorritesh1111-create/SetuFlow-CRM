import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const KNOWLEDGE_TYPE = 'organization_lesson';
const QUESTION_TYPE = 'organization_question';
const MIN_SCORE = 0.7;

export type GuruLesson = {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
};

type QueueRow = {
  id: string;
  organization_id: string;
  source_type: string;
  content: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};
type StoredLesson = { question?: unknown; answer?: unknown; category?: unknown };

function parseLesson(row: QueueRow): GuruLesson | null {
  let parsed: StoredLesson;
  try { parsed = JSON.parse(row.content) as StoredLesson; } catch { return null; }
  const question = typeof parsed.question === 'string' ? parsed.question : '';
  const answer = typeof parsed.answer === 'string' ? parsed.answer : '';
  if (!question) return null;
  return {
    id: row.id, organizationId: row.organization_id, question, answer,
    category: typeof parsed.category === 'string' ? parsed.category : 'General',
    status: row.status as GuruLesson['status'],
    createdAt: row.created_at, reviewedAt: row.reviewed_at,
  };
}

function tokens(value: string) {
  const stop = new Set(['what', 'when', 'where', 'which', 'with', 'this', 'that', 'from', 'your', 'about', 'does', 'have', 'please', 'tell', 'should', 'could', 'would', 'there', 'their', 'them', 'into', 'how', 'the', 'and', 'our', 'for', 'are', 'can']);
  return [...new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((word) => word.length > 2 && !stop.has(word)))];
}

export function isOrganizationPolicyQuestion(question: string): boolean {
  return /\b(our policy|company policy|our process|our procedure|we normally|we usually|do we allow|are we allowed|how do we handle|what is our rule|what do we do when|at stark packmate|at starkpackmate)\b/i.test(question);
}

export function matchApprovedLesson(question: string, lessons: GuruLesson[]): GuruLesson | null {
  const qt = tokens(question);
  if (qt.length < 2) return null;
  const ranked = lessons.filter((lesson) => lesson.status === 'approved').map((lesson) => {
    const lt = tokens(lesson.question);
    const overlap = qt.filter((token) => lt.includes(token)).length;
    const score = overlap / Math.max(qt.length, lt.length, 1);
    return { lesson, score };
  }).sort((a, b) => b.score - a.score);
  return ranked[0] && ranked[0].score >= MIN_SCORE ? ranked[0].lesson : null;
}

// Reuse the deployed Guru ingestion/review queue; no second AI engine or embeddings service.
export async function listGuruLessons(organizationId: string, includePending = false): Promise<GuruLesson[]> {
  const db = await createClient();
  let query = db.from('guru_ingestion_review_queue')
    .select('id, organization_id, source_type, content, status, created_at, reviewed_at')
    .eq('organization_id', organizationId)
    .in('source_type', includePending ? [KNOWLEDGE_TYPE, QUESTION_TYPE] : [KNOWLEDGE_TYPE])
    .order('created_at', { ascending: false }).limit(200);
  if (!includePending) query = query.eq('status', 'approved');
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => parseLesson(row as QueueRow)).filter((row): row is GuruLesson => Boolean(row));
}

export async function answerFromApprovedLessons(organizationId: string, question: string) {
  const lessons = await listGuruLessons(organizationId);
  const lesson = matchApprovedLesson(question, lessons);
  return lesson ? {
    answer: lesson.answer, confidence: 'high' as const, mode: 'organization_knowledge',
    source: { type: 'approved_organization_knowledge', id: lesson.id, category: lesson.category, reviewedAt: lesson.reviewedAt },
    rows: [], actions: ['Ask another question'],
  } : null;
}

export async function submitGuruLesson(input: {
  organizationId: string; actorId: string; question: string; answer?: string; category?: string;
}) {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Guru review service is unavailable.');
  const sourceType = input.answer ? KNOWLEDGE_TYPE : QUESTION_TYPE;
  const { data: existing, error: readError } = await db.from('guru_ingestion_review_queue')
    .select('id, content').eq('organization_id', input.organizationId)
    .eq('source_type', sourceType).eq('status', 'pending').limit(100);
  if (readError) throw readError;
  const duplicate = (existing ?? []).find((row) => {
    try {
      const saved = JSON.parse(row.content) as StoredLesson;
      return String(saved.question ?? '').trim().toLowerCase() === input.question.trim().toLowerCase();
    } catch { return false; }
  });
  if (duplicate) return { id: duplicate.id, existing: true };
  const { data, error } = await db.from('guru_ingestion_review_queue')
    .insert({
      organization_id: input.organizationId, source_type: sourceType,
      source_id: crypto.randomUUID(), chunk_index: 0,
      content: JSON.stringify({ question: input.question, answer: input.answer ?? '', category: input.category ?? 'General', submittedBy: input.actorId }),
      confidence: 1, status: 'pending',
    }).select('id').single();
  if (error) throw error;
  return { id: data.id, existing: false };
}

export async function reviewGuruLesson(input: {
  organizationId: string; reviewerId: string; id: string;
  decision: 'approved' | 'rejected'; answer?: string;
}) {
  const db = createAdminSupabaseClient();
  if (!db) throw new Error('Guru review service is unavailable.');
  const { data: row, error: readError } = await db.from('guru_ingestion_review_queue')
    .select('id, source_type, content, status')
    .eq('organization_id', input.organizationId).eq('id', input.id).single();
  if (readError || !row) throw new Error('Review item not found.');
  if (row.status !== 'pending') throw new Error('This item has already been reviewed.');
  if (row.source_type !== KNOWLEDGE_TYPE && row.source_type !== QUESTION_TYPE) throw new Error('Not an organization knowledge item.');
  const parsed = JSON.parse(row.content) as StoredLesson;
  const answer = input.answer?.trim() || String(parsed.answer ?? '').trim();
  if (input.decision === 'approved' && !answer) throw new Error('Add the correct answer before approval.');
  const { error } = await db.from('guru_ingestion_review_queue').update({
    source_type: KNOWLEDGE_TYPE,
    content: JSON.stringify({ ...parsed, answer }),
    status: input.decision, reviewed_by: input.reviewerId, reviewed_at: new Date().toISOString(),
  }).eq('id', input.id).eq('organization_id', input.organizationId).eq('status', 'pending');
  if (error) throw error;
  return { ok: true };
}
