import { NextResponse } from 'next/server';
// SF-18-043: Simple health endpoint for Guru online badge
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
export async function GET() {
  return NextResponse.json({ status: 'ok', guru: 'online' });
}
