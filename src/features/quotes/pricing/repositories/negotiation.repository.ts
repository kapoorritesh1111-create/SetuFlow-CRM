import type { NegotiationEventInput } from '../types';
import type { NegotiationRepository, PricingSupabaseClient } from './types';
import type { Json } from '@/types/database';

type NegotiationEventInsertRow = {
  quote_id: string;
  quote_version_id: string | null;
  event_type: NegotiationEventInput['eventType'];
  actor_type: NegotiationEventInput['actorType'];
  actor_user_id: string | null;
  actor_name: string | null;
  message: string | null;
  payload: Json;
};

export class SupabaseNegotiationRepository implements NegotiationRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async recordEvent(input: NegotiationEventInput): Promise<void> {
    const insertRow: NegotiationEventInsertRow = {
      quote_id: input.quoteId,
      quote_version_id: input.quoteVersionId ?? null,
      event_type: input.eventType,
      actor_type: input.actorType,
      actor_user_id: input.actorUserId ?? null,
      actor_name: input.actorName ?? null,
      message: input.message ?? null,
      payload: (input.payload ?? {}) as Json,
    };

    const { error } = await this.db.from('quote_negotiation_events').insert(insertRow);

    if (error) {
      throw new Error(
        `Failed to persist negotiation event ${input.eventType} for quote ${input.quoteId}: ${error.message}`,
      );
    }
  }
}
