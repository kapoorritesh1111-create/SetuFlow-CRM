import type { Json } from '@/types/database';
import type { AuditRepository, PricingSupabaseClient } from './types';

type AuditInsertRow = {
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Json;
};

export class SupabaseAuditRepository implements AuditRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async recordPricingEvent(input: {
    organizationId: string;
    actorUserId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    payload?: Record<string, Json>;
  }): Promise<void> {
    const insertRow: AuditInsertRow = {
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      payload: (input.payload ?? {}) as Json,
    };

    const { error } = await this.db.from('audit_logs').insert(insertRow);

    if (error) {
      throw new Error(`Failed to write pricing audit event ${input.action}: ${error.message}`);
    }
  }
}
