import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';

async function countRows(supabase: any, table: string, organizationId: string) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  if (error) return 0;
  return count ?? 0;
}

export async function GET() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  if (!hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage')) return NextResponse.json({ error: 'Your current role cannot review catalog import history.' }, { status: 403 });
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('import_runs')
    .select('id, import_type, source_file_name, status, started_at, completed_at, rows_read, rows_valid, rows_warning, rows_blocked, rows_inserted, rows_updated, summary_payload, import_issues(id, source_row_no, field_name, severity, issue_code, issue_message, blocking_flag)')
    .eq('organization_id', workspace.organization.id)
    .order('started_at', { ascending: false })
    .limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [categoryCount, productCount, variantCount, pricingRuleCount, importRunCount] = await Promise.all([
    countRows(supabase as any, 'product_categories', workspace.organization.id),
    countRows(supabase as any, 'products', workspace.organization.id),
    countRows(supabase as any, 'product_variants', workspace.organization.id),
    countRows(supabase as any, 'product_pricing_rules', workspace.organization.id),
    countRows(supabase as any, 'import_runs', workspace.organization.id),
  ]);

  const { data: productRows } = await (supabase as any)
    .from('products')
    .select('id, product_variants(id)')
    .eq('organization_id', workspace.organization.id)
    .limit(500);
  const productsWithoutVariants = Array.isArray(productRows)
    ? productRows.filter((product) => !Array.isArray(product.product_variants) || product.product_variants.length === 0).length
    : 0;

  return NextResponse.json({
    importRuns: data ?? [],
    coverage: {
      categories: categoryCount,
      products: productCount,
      variants: variantCount,
      pricingRules: pricingRuleCount,
      importRuns: importRunCount,
      productsWithoutVariants,
    },
  });
}
