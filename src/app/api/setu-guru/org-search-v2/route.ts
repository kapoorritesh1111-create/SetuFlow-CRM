import { POST as legacyOrgSearchPost } from '../org-search/route';

const text = (value: unknown) => String(value ?? '').trim();
const wantsOrderStatus = (question: string, mode: string) =>
  mode === 'workflow_status' ||
  /order status|order state|order readiness|check this order|check order/.test(question.toLowerCase());

function buildWorkflowStatusRequest(request: Request, body: Record<string, unknown>) {
  const headers = new Headers(request.headers);
  headers.set('content-type', 'application/json');
  headers.delete('content-length');

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify({
      ...body,
      mode: 'workflow_status',
    }),
  });
}

export async function POST(request: Request) {
  const body = await request.clone().json().catch(() => ({}));
  if (wantsOrderStatus(text(body.question), text(body.mode))) {
    return legacyOrgSearchPost(buildWorkflowStatusRequest(request, body));
  }
  return legacyOrgSearchPost(request);
}
