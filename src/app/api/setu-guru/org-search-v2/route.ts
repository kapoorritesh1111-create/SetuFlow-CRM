import { NextResponse } from 'next/server';
import { POST as legacyOrgSearchPost } from '../org-search/route';

const text = (value: unknown) => String(value ?? '').trim();
const wantsOrderStatus = (question: string, mode: string) =>
  mode === 'workflow_status' ||
  /order status|order state|order readiness|check this order|check order/.test(question.toLowerCase());

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  if (wantsOrderStatus(text(body.question), text(body.mode))) {
    return legacyOrgSearchPost(request);
  }
  return legacyOrgSearchPost(request);
}
