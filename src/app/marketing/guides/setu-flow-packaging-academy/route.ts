import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GUIDE_URL = '/marketing/guides/setu_flow_packaging_workspace_guide.html';

export async function GET(request: Request) {
  const url = new URL(GUIDE_URL, request.url);
  return NextResponse.redirect(url, 307);
}
