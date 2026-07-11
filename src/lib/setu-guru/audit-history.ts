import { createClient } from '@/lib/supabase/server';

export type SetuGuruAuditItem = {
  id: string;
  kind: 'recommendation' | 'draft' | 'approved_action';
  title: string;
  detail: string;
  actor: string;
  entity_type: string | null;
  entity_id: string | null;
  outcome: string;
  occurred_at: string;
  reason?: string | null;
  source_context?: string | null;
};

function actorLabel(profile