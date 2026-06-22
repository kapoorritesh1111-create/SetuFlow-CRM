import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

export const dynamic = 'force-dynamic';

async function ensureOwner(sb: any, orgId: string, id: string) {
  const { data } = await sb
    .from('catalog_shares')
    .select('id, use_count, status')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle();
  return data;
}

// PATCH /api/catalog-shares/[id]
// body: { action: 'revoke' } | { action: 'extend', days: number } | editable share fields
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const ws = await getWorkspaceAccess();
  if (!ws.membership || !ws.organization) return NextResponse.json({ error: 'No workspace' }, { status: 401 });
  if (!hasWorkspaceCapability(ws.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });

  const sb = (await createClient()) as any;
  const orgId = ws.organization.id;
  const existing = await ensureOwner(sb, orgId, params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.action === 'revoke') {
    patch.status = 'revoked';
  } else if (body.action === 'extend') {
    const days = Number(body.days) > 0 ? Number(body.days) : 7;
    patch.valid_until = new Date(Date.now() + days * 864e5).toISOString();
    patch.status = 'active';
  } else {
    for (const k of [
      'status',
      'valid_until',
      'pdf_download_allowed',
      'tracking_enabled',
      'pin_code',
      'share_channel',
      'buyer_company',
      'buyer_name',
      'buyer_email',
      'buyer_phone',
      'price_list_id',
      'currency',
      'incoterm',
    ]) {
      if (k in body) patch[k] = body[k];
    }
  }

  const { data, error } = await sb
    .from('catalog_shares')
    .update(patch)
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ share: data });
}
