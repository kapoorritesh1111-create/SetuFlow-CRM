import { NextRequest, NextResponse } from 'next/server';

import { listCatalogBrochures } from '@/features/catalog-brochures/server';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

function normalized(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(values: string[], context: string) {
  const target = normalized(context);
  if (!target) return false;
  return values.some((value) => {
    const family = normalized(value);
    return Boolean(family && (target.includes(family) || family.includes(target)));
  });
}

export async function GET(request: NextRequest) {
  try {
    const workspace = await requireWorkspace();
    if (!workspace.organization || !workspace.membership) return NextResponse.json({ error: 'Workspace membership is required.', brochures: [] }, { status: 401 });
    const brochures = await listCatalogBrochures();
    const leadId = request.nextUrl.searchParams.get('lead_id')?.trim() || '';
    let context = '';
    if (leadId) {
      const db: any = await createClient();
      const { data: lead } = await db.from('leads')
        .select('main_product_category, product_type, products_or_needs')
        .eq('id', leadId)
        .eq('organization_id', workspace.organization.id)
        .maybeSingle();
      context = [lead?.main_product_category, lead?.product_type, lead?.products_or_needs].filter(Boolean).join(' ');
    }
    return NextResponse.json({
      brochures: brochures.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        family_names: item.family_names,
        family_slugs: item.family_slugs,
        recommended: matches([...item.family_names, ...item.family_slugs], context),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Brochures could not load.';
    return NextResponse.json({ error: message, brochures: [] }, { status: 400 });
  }
}
