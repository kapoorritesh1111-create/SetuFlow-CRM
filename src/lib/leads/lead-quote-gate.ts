/**
 * lead-quote-gate.ts — canonical lead quote readiness check.
 *
 * A Lead can start quote work once it has at least one captured product
 * requirement. That interest may already be mapped to a catalog product, or it
 * may be a text-only requirement captured from Inbound. Catalog mapping and
 * pricing can be completed inside quote preparation; the gate must not force
 * Sales to invent a SKU or price just to open the workspace.
 */

import { createClient } from '@/lib/supabase/server';

export interface LeadQuoteGateResult {
  allowed: boolean;
  reason: string;
  productInterestCount: number;
  leadExists: boolean;
  leadDisqualified: boolean;
}

export async function checkLeadQuoteGate(
  organizationId: string,
  leadId: string,
  actorUserId?: string
): Promise<LeadQuoteGateResult> {
  const db = (await createClient()) as any;

  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('id, lead_type, qualification_status, status')
    .eq('organization_id', organizationId)
    .eq('id', leadId)
    .maybeSingle();

  if (leadError || !lead) {
    const result: LeadQuoteGateResult = {
      allowed: false,
      reason: 'lead-not-found',
      productInterestCount: 0,
      leadExists: false,
      leadDisqualified: false,
    };
    await logGateCheck(db, organizationId, leadId, actorUserId, result);
    return result;
  }

  const isDisqualified =
    String(lead.qualification_status ?? '').toLowerCase() === 'disqualified' ||
    String(lead.status ?? '').toLowerCase() === 'disqualified';

  if (isDisqualified) {
    const result: LeadQuoteGateResult = {
      allowed: false,
      reason: 'lead-disqualified',
      productInterestCount: 0,
      leadExists: true,
      leadDisqualified: true,
    };
    await logGateCheck(db, organizationId, leadId, actorUserId, result);
    return result;
  }

  const { data: interests, error: interestError } = await db
    .from('lead_product_interests')
    .select('id, product_id, label')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .limit(25);

  if (interestError) {
    const result: LeadQuoteGateResult = {
      allowed: false,
      reason: 'coverage-read-error',
      productInterestCount: 0,
      leadExists: true,
      leadDisqualified: false,
    };
    await logGateCheck(db, organizationId, leadId, actorUserId, result);
    return result;
  }

  const count = (interests ?? []).length;
  if (count === 0) {
    const result: LeadQuoteGateResult = {
      allowed: false,
      reason: 'missing-product-interest',
      productInterestCount: 0,
      leadExists: true,
      leadDisqualified: false,
    };
    await logGateCheck(db, organizationId, leadId, actorUserId, result);
    return result;
  }

  const hasMappedCatalogProduct = (interests ?? []).some((interest: any) => Boolean(interest.product_id));
  const result: LeadQuoteGateResult = {
    allowed: true,
    reason: hasMappedCatalogProduct ? 'gate-passed' : 'gate-passed-captured-requirement',
    productInterestCount: count,
    leadExists: true,
    leadDisqualified: false,
  };
  await logGateCheck(db, organizationId, leadId, actorUserId, result);
  return result;
}

async function logGateCheck(
  db: any,
  organizationId: string,
  leadId: string,
  actorUserId: string | undefined,
  result: LeadQuoteGateResult
) {
  try {
    await db.from('lead_quote_gate_log').insert({
      organization_id: organizationId,
      lead_id: leadId,
      actor_user_id: actorUserId ?? null,
      gate_result: result.reason,
      gate_reason: result.allowed ? 'Quote creation allowed' : `Blocked: ${result.reason}`,
      product_interest_count: result.productInterestCount,
      coverage_source: 'db_check',
    });
  } catch {
    // Gate logging must never block the gate result.
  }
}
