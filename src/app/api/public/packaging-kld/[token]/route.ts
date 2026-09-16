import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkRateLimit, publicRateLimitKey } from '@/lib/rate-limit/simple';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const limit = await checkRateLimit(publicRateLimitKey('public-kld', request), 30, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

  const token = String(params.token || '').trim();
  const admin = createAdminSupabaseClient() as any;
  if (!admin || !token) return NextResponse.json({ error: 'KLD not available.' }, { status: 404 });

  const { data: kld, error } = await admin
    .from('packaging_kld_files')
    .select('id,file_path,file_name,mime_type,is_active')
    .eq('public_token', token)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !kld?.file_path) return NextResponse.json({ error: 'KLD not available.' }, { status: 404 });

  const { data: file, error: downloadError } = await admin.storage.from('compliance-docs').download(kld.file_path);
  if (downloadError || !file) return NextResponse.json({ error: 'KLD file could not be loaded.' }, { status: 404 });
  const bytes = await file.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': kld.mime_type || 'application/pdf',
      'Content-Disposition': `inline; filename="${String(kld.file_name || 'sample-kld.pdf').replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
