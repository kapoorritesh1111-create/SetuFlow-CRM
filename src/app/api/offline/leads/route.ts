import { NextResponse } from 'next/server';
import { saveLead } from '@/features/leads/server/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await saveLead(undefined, formData);
  if (result?.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ success: result?.success ?? 'Offline lead synced.' });
}
