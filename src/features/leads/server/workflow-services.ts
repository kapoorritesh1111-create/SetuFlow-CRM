import { safeUserError, logServerError } from '@/lib/safe-error';

export type LeadWorkflowServiceResult<T = unknown> = {
  data?: T | null;
  error?: string | null;
};

export type LeadRelationReplacementInput = {
  db: any;
  organizationId: string;
  leadId: string;
  marketIds: string[];
  productIds: string[];
  sourceContext?: Record<string, unknown> | null;
  productInsertExtras?: Record<string, Record<string, unknown>>;
};

export type LeadFollowUpReplacementInput = {
  db: any;
  organizationId: string;
  leadId: string;
  scheduledAt: string;
  actorUserId: string;
};

export type LeadTimelineFanoutInput = {
  db: any;
  organizationId: string;
  leadId: string;
  actorUserId: string | null;
  kind: string;
  message: string;
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type LeadAuditInput = {
  writeAuditLog: (input: any) => Promise<unknown>;
  organizationId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  previous?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export function leadWorkflowError(scope: string, error: unknown, fallback = 'The lead workflow could not be saved. Please refresh and try again.') {
  logServerError(scope, error);
  return safeUserError(error, fallback);
}

export async function replaceLeadCoverageRelations({ db, organizationId, leadId, marketIds, productIds, sourceContext, productInsertExtras }: LeadRelationReplacementInput): Promise<LeadWorkflowServiceResult> {
  const [{ error: deleteMarketsError }, { error: deleteProductsError }] = await Promise.all([
    db.from('lead_markets').delete().eq('lead_id', leadId),
    db.from('lead_product_interests').delete().eq('lead_id', leadId),
  ]);
  if (deleteMarketsError) return { error: leadWorkflowError('lead-coverage.delete-markets', deleteMarketsError, 'Coverage markets could not be refreshed.') };
  if (deleteProductsError) return { error: leadWorkflowError('lead-coverage.delete-products', deleteProductsError, 'Coverage products could not be refreshed.') };

  if (marketIds.length) {
    const { error } = await db.from('lead_markets').insert(marketIds.map((marketId) => ({ organization_id: organizationId, lead_id: leadId, market_id: marketId })));
    if (error) return { error: leadWorkflowError('lead-coverage.insert-markets', error, 'Coverage markets could not be saved.') };
  }

  if (productIds.length) {
    const { error } = await db.from('lead_product_interests').insert(productIds.map((productId) => ({
      organization_id: organizationId,
      lead_id: leadId,
      product_id: productId,
      interest_type: 'confirmed_product',
      source_context: sourceContext ?? { source: 'lead_workspace' },
      ...(productInsertExtras?.[productId] ?? {}),
    })));
    if (error) return { error: leadWorkflowError('lead-coverage.insert-products', error, 'Coverage products could not be saved.') };
  }

  return { data: { leadId, marketCount: marketIds.length, productCount: productIds.length }, error: null };
}

export async function replaceLeadFollowUp({ db, organizationId, leadId, scheduledAt, actorUserId }: LeadFollowUpReplacementInput): Promise<LeadWorkflowServiceResult<{ id?: string | null }>> {
  const cancelResult = await db
    .from('lead_follow_ups')
    .update({ status: 'cancelled' })
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .in('status', ['pending', 'scheduled']);
  if (cancelResult.error) return { error: leadWorkflowError('lead-follow-up.cancel-open', cancelResult.error, 'Existing follow-ups could not be refreshed.') };

  const { data, error } = await db
    .from('lead_follow_ups')
    .insert({ organization_id: organizationId, lead_id: leadId, scheduled_at: scheduledAt, status: 'scheduled', assigned_user_id: actorUserId, created_by: actorUserId })
    .select('id')
    .single();
  if (error) return { error: leadWorkflowError('lead-follow-up.insert', error, 'Follow-up could not be scheduled.') };

  return { data, error: null };
}

export async function recordLeadTimelineFanout({ db, organizationId, leadId, actorUserId, kind, message, subject, body, summary, metadata }: LeadTimelineFanoutInput): Promise<LeadWorkflowServiceResult> {
  const nowIso = new Date().toISOString();
  const activity = await db.from('lead_activities').insert({ organization_id: organizationId, lead_id: leadId, actor_user_id: actorUserId, kind, message, occurred_at: nowIso });
  if (activity.error) return { error: leadWorkflowError('lead-timeline.activity', activity.error, 'Lead activity could not be recorded.') };

  const communication = await db.from('communications').insert({
    organization_id: organizationId,
    lead_id: leadId,
    related_entity: 'lead',
    related_id: leadId,
    communication_type: 'system_note',
    direction: 'internal',
    channel: 'system',
    subject: subject ?? message,
    body: body ?? message,
    summary: summary ?? subject ?? message,
    draft_source: 'system',
    status: 'sent',
    sent_at: nowIso,
    created_by: actorUserId,
    provider_payload: {},
    metadata: metadata ?? {},
  });
  if (communication.error) return { error: leadWorkflowError('lead-timeline.communication', communication.error, 'Lead timeline note could not be recorded.') };

  return { data: { leadId }, error: null };
}

export async function recordLeadAudit({ writeAuditLog, organizationId, actorUserId, action, entityType, entityId, previous, next, metadata }: LeadAuditInput): Promise<LeadWorkflowServiceResult> {
  try {
    await writeAuditLog({
      organizationId,
      actorUserId,
      action,
      entityType,
      entityId: entityId ?? null,
      payload: { previous: previous ?? null, new: next ?? null, metadata: metadata ?? {} },
    });
    return { data: { entityId: entityId ?? null }, error: null };
  } catch (error) {
    return { error: leadWorkflowError('lead-audit.write', error, 'Lead audit event could not be recorded.') };
  }
}
