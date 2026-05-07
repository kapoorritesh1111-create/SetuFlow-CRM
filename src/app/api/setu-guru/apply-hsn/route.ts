import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { writeAuditLog } from '@/lib/auditLog';

function asText(value: unknown) { return String(value ?? '').trim(); }
function normalizeHsn(value: unknown) { return asText(value).replace(/[^0-9]/g, ''); }
function formatHsn(value: unknown) { const clean = normalizeHsn(value); return clean.length === 8 ? `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}` : asText(value); }
function normalizeName(value: unknown) { return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

async function resolveProduct(db: any, organizationId: string, productId: string, productName: string) {
  if (productId) {
    const { data, error } = await db.from('products').select('id, name, hsn_code').eq('organization_id', organizationId).eq('is_active', true).eq('id', productId).maybeSingle();
    if (error) return { error: error.message, product: null as any, status: 500 };
    if (!data) return { error: 'I could not find that active catalog product. Rerun HSN research from the product row and try again.', product: null as any, status: 404 };
    if (productName && normalizeName(data.name) !== normalizeName(productName)) return { error: `The selected product no longer matches ${productName}. Please rerun HSN research before applying.`, product: null as any, status: 409 };
    return { error: null as string | null, product: data, status: 200 };
  }
  const { data: matches, error } = await db.from('products').select('id, name, hsn_code').eq('organization_id', organizationId).eq('is_active', true).ilike('name', productName).limit(10);
  if (error) return { error: error.message, product: null as any, status: 500 };
  const exactMatches = (matches ?? []).filter((product: any) => normalizeName(product.name) === normalizeName(productName));
  if (!exactMatches.length) return { error: `I could not find an active catalog product named ${productName}. Open Products and select the correct item before applying HSN.`, product: null as any, status: 404 };
  if (exactMatches.length > 1) return { error: `I found multiple active products named ${productName}. Rerun HSN research from the exact product row or open Products and update the exact record manually.`, product: null as any, status: 409 };
  return { error: null as string | null, product: exactMatches[0], status: 200 };
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv) return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const productId = asText(body.productId);
    const productName = asText(body.productName);
    const suggestedHsn = formatHsn(body.suggestedHsn);
    const suggestedHsnDigits = normalizeHsn(suggestedHsn);
    const expectedCurrentHsn = formatHsn(body.currentHsn);
    const approved = body.approved === true;
    const sourceQuestion = asText(body.sourceQuestion);
    const suggestedBasis = asText(body.suggestedBasis);
    if (!approved) return NextResponse.json({ error: 'Human approval is required before Setu Guru can update catalog HSN.' }, { status: 400 });
    if (!productId && !productName) return NextResponse.json({ error: 'Product identity is required.' }, { status: 400 });
    if (!suggestedHsnDigits || suggestedHsnDigits.length < 6 || suggestedHsnDigits.length > 10) return NextResponse.json({ error: 'A valid reviewed HSN/HS code is required.' }, { status: 400 });
    const workspace = await getWorkspaceAccess();
    if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Please sign in before applying catalog changes.' }, { status: 401 });
    if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Your current role cannot update catalog HSN values.' }, { status: 403 });
    const organizationId = workspace.organization.id;
    const db = (await createClient()) as any;
    const resolved = await resolveProduct(db, organizationId, productId, productName);
    if (resolved.error || !resolved.product) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    const product = resolved.product;
    const currentHsn = formatHsn(product.hsn_code ?? '');
    if (expectedCurrentHsn && normalizeHsn(expectedCurrentHsn) !== normalizeHsn(currentHsn)) return NextResponse.json({ error: `Catalog HSN changed after the research brief. Current HSN is ${currentHsn || 'not assigned'}. Please rerun HSN research before applying.` }, { status: 409 });
    if (normalizeHsn(currentHsn) === suggestedHsnDigits) return NextResponse.json({ answer: `${product.name} already has HSN ${formatHsn(suggestedHsn)}. No catalog update was needed.`, product: { id: product.id, name: product.name, hsnCode: currentHsn }, changed: false });
    const previousValue = { hsn_code: currentHsn || null };
    const nextValue = { hsn_code: formatHsn(suggestedHsn) };
    const { error: updateError } = await db.from('products').update({ hsn_code: formatHsn(suggestedHsn) }).eq('organization_id', organizationId).eq('id', product.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    await db.from('product_variants').update({ hsn_code: formatHsn(suggestedHsn), updated_by: workspace.user.id }).eq('organization_id', organizationId).eq('product_id', product.id);
    await writeAuditLog({ organizationId, action: 'product_updated', entityType: 'product', entityId: product.id, actorUserId: workspace.user.id, payload: { source: 'setu_guru_hsn_approval', product_name: product.name, previous: previousValue, new: nextValue, source_question: sourceQuestion, suggested_basis: suggestedBasis } });
    revalidatePath('/products'); revalidatePath('/leads'); revalidatePath('/admin/audit');
    return NextResponse.json({ answer: `Applied reviewed HSN ${formatHsn(suggestedHsn)} to ${product.name}. The catalog product and variants were updated after human approval.`, product: { id: product.id, name: product.name, previousHsn: currentHsn || null, hsnCode: formatHsn(suggestedHsn) }, changed: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to apply catalog HSN update.' }, { status: 500 }); }
}
