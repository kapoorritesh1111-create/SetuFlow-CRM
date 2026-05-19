/**
 * lead-quote-gate.ts — Sprint 12
 * Canonical lead quote gate check.
 *
 * PROBLEM FIXED: The gate check and UI coverage display were reading from
 * different state sources, causing the gate to appear "ready" when the DB
 * had no lead_product_interests rows (or vice versa).
 *
 * FIX: This module is the single source of truth for lead quote readiness.
 * Both the UI coverage display AND the gate enforcement must call this.
 * Every gate check is logged to lead_quote_gate_log for debugging.
 */

import { createClient } from '@/lib/supabase/server';

export interface LeadQuoteGateResult {
  allowed: boolean;
  reason: string;
  productInterestCount: number;
  leadExists: boolean;
  leadDisqualified: boolean;
}

/**
 * Check whether a lead can proceed to quote creation.
 * Reads directly from DB — no cached/optimistic state.
 * Logs every check to lead_quote_gate_log for production debugging.
 */
export async function checkLeadQuoteGate(
  organizationId: string,
  leadId: string,
  actorUserId?: string
): Promise<LeadQuoteGateResult> {
  const db = (await createClient()) as any;

  // Direct DB read — same source as UI must use
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

  // Read product interests from SAME table the UI displays — lead_product_interests
  const { data: interests, error: interestError } = await db
    .from('lead_product_interests')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .eq('status', 'active')
    .limit(1);

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

  const result: LeadQuoteGateResult = {
    allowed: true,
    reason: 'gate-passed',
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
    // Gate logging must never block the gate result
  }
}
