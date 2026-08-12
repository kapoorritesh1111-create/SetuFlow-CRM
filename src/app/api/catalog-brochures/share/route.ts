import { NextRequest, NextResponse } from 'next/server';

import { createCatalogBrochureShare } from '@/features/catalog-brochures/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const brochureId = String(body.brochure_id ?? '').trim();
    const leadId = String(body.lead_id ?? '').trim() || null;
    const channel = String(body.channel ?? '').trim() || null;
    if (!brochureId) return NextResponse.json({ error: 'Brochure is required.' }, { status: 400 });
    const share = await createCatalogBrochureShare({ brochureId, leadId, channel });
    return NextResponse.json({ share });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brochure link could not be created.';
    const status = /permission|membership|required/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
